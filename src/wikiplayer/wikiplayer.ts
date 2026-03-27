import { AnmPlayer, WebGLOverlay, type CostumeInfo } from "../player/player"
import { Anm2Recorder } from "../recorder/recorder"
import { C_SECTION_FRAME_MAP } from "./datas/datas"
import type { HtmlRule, HtmlRuleConstructor } from "./htmlRule"
import { HuijiDatabaseRequester, huijiUrlBuilder } from "./huiji"

enum PlayerPatch {
    Neptunus = "neptunus",
    csection = "csection",
    tApollyon = "tApollyon",
    noCharge = 'nocharge',
    randomIdle = "rndIdle",
    blueFilter = "blueFilter",
    noAttack = "noAttack",
    moveChara = "moveChara",
    shadowBody = "shadowBody",
    adrenaline_level = "adrenaline_level",
}

enum RenderMode {
    Normal,
    Costume
}

export class WikiPlayer {
    players: WikiPlayerSingleAnm2[]
    isFlying: boolean = false

    buttonDiv: HTMLDivElement | undefined = undefined
    buttons = new Map<string, WikiPlayerButton>()


    canvasContainer: HTMLElement
    canvasElement?: HTMLCanvasElement
    htmlRuleConstructor?: HtmlRuleConstructor
    htmlRule?: HtmlRule

    backendCanvas?: HTMLCanvasElement
    webglOverlay?: WebGLOverlay

    colorDiv?: HTMLDivElement
    BACKGROUND_COLORS = [
        /* 按键0：透明 */
        '',
        /* 按键1：灰色 */
        'background-color:gray',
        /* 按键2：棋盘格 */
        'background-image:url("data:image/svg+xml,' + encodeURIComponent('<svg viewBox="0 0 2 2" width="14" height="14" xmlns="http://www.w3.org/2000/svg">' +
            '    <rect width="1" height="1" fill="#dcdcdc"/>' +
            '    <rect x="1" y="1" width="1" height="1" fill="#dcdcdc"/>' +
            '    <rect y="1" width="1" height="1" fill="white"/>' +
            '    <rect x="1" width="1" height="1" fill="white"/>' +
            '</svg>') + '")',
        /* 按键3：绿色 */
        'background-color:#0F0',
        /* 按键4：白色 */
        'background-color:white',
        /* 按键5：黑色 */
        'background-color:black',
    ]

    renderMode: RenderMode

    commonFps: number = 30
    currentFps = 0

    waiting_for_click: boolean

    overwriteColor: number | undefined = undefined

    //================


    gameFrameCount: number

    // costumeA: AnmPlayer[] = []  /* head */
    // costume_B: AnmPlayer[] = [] /* body */
    // costume_C: AnmPlayer[] = [] /* overlay */
    costumeInfosA: CostumeInfo[] = [] /* head */
    costumeInfosB: CostumeInfo[] = [] /* body */
    costumeInfosC: CostumeInfo[] = [] /* overlay */

    costumealt: string
    costume_status: string
    costume_leg_dir: string
    is_pausing: boolean
    is_out_of_webbrowser_view: boolean
    suggest_moving: boolean
    layer_stack_exploded_x: number
    layer_stack_exploding: boolean
    spritesheet_canvas_map = new Map<string, CanvasRenderingContext2D>()
    costume_status_reset: boolean
    costume_head_dir: string
    costume_shooting: { u: boolean; d: boolean; l: boolean; r: boolean }
    costume_walking: { u: boolean; d: boolean; l: boolean; r: boolean }
    costume_shooting_frame: number
    costume_walking_frame: number
    layer_stack_exploded_y: number


    adrenaline_level: number

    is_flying: boolean
    random_idle_last_update: number
    random_idle_anm?: AnmPlayer
    random_idle_is_playing: boolean
    tapollyon_ring_frame: number

    patch: Set<PlayerPatch>


    recorder?: Anm2Recorder

    constructor(canvasdiv: HTMLElement) {

        this.canvasContainer = canvasdiv;

        //players存储页面描述
        this.players = []

        this.gameFrameCount = 0 // 用于某些效果渲染（肾上腺素）

        this.waiting_for_click = canvasdiv.getAttribute("data-waitkey") == "true"
        this.renderMode = canvasdiv.getAttribute("data-costume") == "true" ? RenderMode.Costume : RenderMode.Normal
        this.costumealt = (canvasdiv.getAttribute("data-costume-alt") || "") + ""
        this.costume_status = 'Walk'
        this.costume_status_reset = false
        this.costume_leg_dir = 'Down'
        this.costume_head_dir = 'Down'
        this.costume_shooting = { u: false, d: false, l: false, r: false }
        this.costume_walking = { u: false, d: false, l: false, r: false }
        this.costume_shooting_frame = 0
        this.costume_walking_frame = 0

        this.is_pausing = false
        this.is_out_of_webbrowser_view = false
        this.suggest_moving = false; //控制器的建议移动方向

        this.layer_stack_exploded_x = 0
        this.layer_stack_exploded_y = 0

        this.layer_stack_exploding = false

        this.is_flying = false

        this.random_idle_last_update = 0
        // this.random_idle_anm = undefined
        this.random_idle_is_playing = false

        this.patch = new Set<PlayerPatch>()
        this.tapollyon_ring_frame = 0

        for (let patch of (canvasdiv.getAttribute("data-patch") || '').split(',')) {
            this.patch.add(patch as PlayerPatch)
        }

        this.adrenaline_level = 0
        if (this.hasPatch(PlayerPatch.adrenaline_level))
            this.adrenaline_level = 6

        //在控制台中执行window.enableMoveChara以启用角色移动
        {
            let oldFunc = window.enableMoveChara;
            window.enableMoveChara = () => {
                this.addPatch(PlayerPatch.moveChara);
                if (oldFunc)
                    oldFunc();
            }

            let today = new Date()
            if (today.getMonth() == 3 && today.getDate() == 1) {
                this.addPatch(PlayerPatch.moveChara)
            }
        }


        //加载htmlrule
        {
            let html_rule_attr = canvasdiv.getAttribute('data-html-rule')
            if (html_rule_attr && html_rule_attr.length > 0 && window.anm2Rule && window.anm2Rule.has(html_rule_attr)) {
                this.htmlRuleConstructor = window.anm2Rule.get(html_rule_attr)!
            }
        }

        for (let i = 0; i < canvasdiv.children.length; i++) {
            let anm = canvasdiv.children[i]
            if (!anm || !anm.hasAttribute("data-anm2")) {
                continue
            }
            this.players.push(new WikiPlayerSingleAnm2(this, anm, this.players.length));
        }

        let dbRequester = new HuijiDatabaseRequester()

        for (let p of this.players) {
            dbRequester.addAnm2File(p.anm2WikiPath)
        }

        dbRequester.downloadJson(
            (resources) => {
                this.init_canvasDiv();
                this.init_anm(resources);
            },
            () => {
                this.canvasContainer.innerHTML = "动画加载失败"
            }
        );
    }

    hasConfirm = false
    async tryCreateRecorder() {
        if(this.hasConfirm)
            return

        window.$dialog.warning({
            title: "你正在启用播放器的录制功能，请仔细阅读以下内容",
            content: `你需要创建一个新的文件夹，并选择它。接下来就可以使用shift+R开关播放器的录制功能。
请注意，当录制开启时，结果会实时保存刚刚的文件夹。文件夹内同名内容【会被覆盖】。
可以使用screentogif(https://www.screentogif.com/)等软件对图像序列进行后期合成。
警告：在录制期间，我们会在你接下来选择的文件夹中生成大量无损帧序列（取决于动画FPS），请避免长时间录制。
是否继续？
`,
            positiveText: "是，选择一个新文件夹",
            closable:false,
            closeOnEsc:false,
            maskClosable:false,
            style:"white-space:pre-line",
            onPositiveClick:async (e)=>{
                this.hasConfirm = false

                try {
                    if (window.showDirectoryPicker == undefined) {
                        window.$notification.error({
                            content: "您的浏览器不支持目录相关api（showDirectoryPicker），本功能为浏览器限定功能，请使用其它浏览器。"
                        })
                        return
                    }

                    let dir = await window.showDirectoryPicker({
                        mode: "readwrite",
                        startIn: "pictures"
                    });
                    this.recorder = new Anm2Recorder(this, dir)
                } catch (e) {
                    console.error(e);
                    window.$notification.error({
                        content: "失败或操作已经被取消，请查看控制台。如果是权限问题，可以尝试重试。"
                    })
                }

                return true
            },

            negativeText: "取消",
            onNegativeClick:(e)=>{
                this.hasConfirm = false
                return true
            }
        })
    }

    hasPatch(patch: PlayerPatch) {
        return this.patch.has(patch)
    }
    removePatch(patch: PlayerPatch) {
        this.patch.delete(patch)
    }
    addPatch(patch: PlayerPatch) {
        this.patch.add(patch)
    }

    adrenaline_leven_change_notification: any = undefined
    handleAdrenalineKey(key: string) {
        if (!this.hasPatch(PlayerPatch.adrenaline_level))
            return false
        if (key != '.')
            return false
        this.adrenaline_level++;
        if (this.adrenaline_level >= 24) {
            this.adrenaline_level = 1
        }

        let notification = "空白心之容器数量：" + this.adrenaline_level
        if (this.adrenaline_leven_change_notification) {
            this.adrenaline_leven_change_notification.content = notification
        } else {
            this.adrenaline_leven_change_notification = window.$notification.create(
                {
                    title: '肾上腺素角色形象',
                    content: notification,
                    onClose: () => {
                        this.adrenaline_leven_change_notification = undefined
                        return true
                    }
                }
            )
        }
    }

    init_canvasDiv() {
        this.canvasContainer.innerHTML = ""
        this.colorDiv = document.createElement("div")
        this.canvasContainer.appendChild(this.colorDiv)
        if (isLayerStackExploded()) {
            /* 按键6：layer_stack_exploded限定背景色 */
            this.BACKGROUND_COLORS.push('background-image:url("data:image/svg+xml,' + encodeURIComponent('<svg viewBox="0 0 2 2" width="' + (4 * +this.canvasContainer.getAttribute("data-width")!) + '" height="' + (4 * +this.canvasContainer.getAttribute("data-height")!) + '" xmlns="http://www.w3.org/2000/svg">' +
                '    <rect width="1" height="1" fill="#dcdcdc"/>' +
                '    <rect x="1" y="1" width="1" height="1" fill="#dcdcdc"/>' +
                '    <rect y="1" width="1" height="1" fill="white"/>' +
                '    <rect x="1" width="1" height="1" fill="white"/>' +
                '</svg>') + '")')
        }
        this.setBackgroundColor()
        this.UpdateCharaTransform()

        this.canvasElement = document.createElement("canvas")
        this.canvasElement.tabIndex = 1 // make the canvas focusable
        this.canvasElement.width = +(this.canvasContainer.getAttribute("data-width") ?? 64)
        this.canvasElement.height = +(this.canvasContainer.getAttribute("data-height") ?? 64)
        if (isLayerStackExploded()) {
            this.canvasElement.width *= 8
            this.canvasElement.height *= 2
        }
        this.colorDiv.appendChild(this.canvasElement)

        let canvas_style = "max-width:100%;vertical-align:middle;"
        if (this.canvasContainer.getAttribute("data-scale")) {
            let scale = +(this.canvasContainer.getAttribute("data-scale") ?? 1)
            canvas_style += "transform:scale(" + scale + ");margin:" + (this.canvasElement.height * (scale - 1) / 2) + "px " + (this.canvasElement.width * (scale - 1) / 2) + "px;"
        }

        if (this.canvasContainer.hasAttribute("data-shader")) {
            AnmPlayer.setCrossOrigin("anonymous")
            let gl = this.canvasElement.getContext("webgl")
            if (gl) {
                this.backendCanvas = document.createElement("canvas")
                this.backendCanvas.width = this.canvasElement.width
                this.backendCanvas.height = this.canvasElement.height
                this.webglOverlay = new WebGLOverlay(this.backendCanvas, this.canvasElement, this.canvasContainer.getAttribute("data-shader") || "")
                this.webglOverlay.init()
            }
        }

        if (this.hasPatch(PlayerPatch.blueFilter)) {
            canvas_style += "filter:url(#" + AnmPlayer.createSvgFilterElement(1.5, 1.7, 2, 1, 0.05, 0.12, 0.2) + ");"
        }
        this.canvasElement.style.cssText = canvas_style

        if (this.buttonDiv) {
            let btnContainer = document.createElement("div")
            btnContainer.style.cssText = "text-align:center"
            btnContainer.append(this.buttonDiv)
            this.colorDiv.appendChild(btnContainer)
        }
    }


    setBackgroundColor(color?: string) {
        if (color) {
            this.colorDiv!.style.cssText = 'margin:0;padding:0;' + color
        } else {
            this.colorDiv!.style.cssText = 'margin:0;padding:0;'
        }
    }

    moveChara_x: number = 0
    moveChara_y: number = 0
    UpdateCharaTransform() {
        this.canvasContainer.style.transform = 'translate(' + this.moveChara_x + 'px,' + this.moveChara_y + 'px)'
    }

    handleColorKey(key: any) {
        if (typeof (key) == 'string' && key.match("^[0-9]$")) {
            this.setBackgroundColor(this.BACKGROUND_COLORS[+key] || '')
            return true
        }
    }

    init_anm(resources: Map<string, Actor>) {
        if (this.renderMode == RenderMode.Costume) {
            for (let player of this.players) {
                if (player.skincolor)
                    this.overwriteColor = player.skincolor
            }
        }

        for (let player of this.players) {
            player.init(resources)
        }


        let commonFps = 1
        if (this.renderMode == RenderMode.Costume) {
            commonFps = 30
        } else {
            for (let player of this.players) {
                if (commonFps < player.anm!.getFps()) {
                    commonFps = player.anm!.getFps()
                }
            }

            for (; ;) {
                let passed = true
                for (let player of this.players) {
                    if (commonFps % player.anm!.getFps() != 0) {
                        passed = false
                        break
                    }
                }
                if (passed) {
                    break
                }
                commonFps++
            }
        }
        this.commonFps = commonFps


        if (this.renderMode == RenderMode.Normal) {
            this.canvasElement!.onclick = () => {
                if (this.waiting_for_click) {
                    this.waiting_for_click = false
                    this.startDraw()
                }
                //window.luaPostMessage && window.luaPostMessage("Anm2:event:click:" + my_start_player_lua_id,"","");

                for (let player of this.players) {
                    if (!player.apply_rule("click")) {
                        player.canvasClicked = true
                    }
                }

                if (this.htmlRule && this.htmlRule.onclick) {
                    this.htmlRule.onclick()
                }
            }

            this.canvasElement!.onkeydown = (e) => {
                if (this.recorder == undefined && e.key == "R") {
                    this.tryCreateRecorder()
                }
                if (this.recorder && this.recorder.handleKey(e.key)) {
                    e.preventDefault()
                    return
                }

                if (this.htmlRule?.onkeydown && this.htmlRule?.onkeydown(e.key)) {
                    e.preventDefault()
                    return
                }

                if (this.handleColorKey(e.key))
                    e.preventDefault()
            }

            this.canvasElement!.onkeyup = (e) => {
                if (this.htmlRule?.onkeyup && this.htmlRule?.onkeyup(e.key)) {
                    e.preventDefault()
                    return
                }
            }

            if (this.htmlRuleConstructor) {
                this.htmlRule = this.htmlRuleConstructor(this.players.map(p => p.anm!), this.canvasElement!, this.webglOverlay)
            }
        } else {
            if (this.waiting_for_click) {
                let activeWaitForClick = () => {
                    this.waiting_for_click = false
                    this.startDraw();
                    this.canvasElement!.removeEventListener("click", activeWaitForClick)
                }
                this.canvasElement!.addEventListener("click", activeWaitForClick)
            }

            this.canvasElement!.onkeydown = (e)=>{
                // if(e.type == 'click'){
                //     return
                // }
                if (this.recorder == undefined && e.key == "R") {
                    this.tryCreateRecorder()
                }
                if (this.recorder && this.recorder.handleKey(e.key)) {
                    e.preventDefault()
                    return
                }
                if (this.onCostumKeyDown(e.key))
                    e.preventDefault()

                if (this.handleColorKey(e.key))
                    e.preventDefault()
            };

            this.canvasElement!.onkeyup = (e)=>{
                // e.preventDefault()

                if (this.onCostumKeyUp(e.key)) {
                    e.preventDefault()
                }
            };
            
            this.canvasElement!.addEventListener('touchstart', (ev) => {
                this.onCostumeTouchStart(ev)
            })
            this.canvasElement!.addEventListener('touchmove', ev => {
                this.onCostomeTouchMove(ev)
            })
            this.canvasElement!.addEventListener('touchend', ev => {
                this.onCostumeTouchEnd(ev)
            })
        }

        if (IntersectionObserver) {
            (new IntersectionObserver((entrys) => {
                for (let entry of entrys) {
                    if (entry.target != this.canvasElement!)
                        continue
                    if (entry.isIntersecting) {
                        this.is_out_of_webbrowser_view = false
                        this.startDraw()
                    } else {
                        this.is_out_of_webbrowser_view = true
                        if (!this.hasPatch(PlayerPatch.moveChara))
                            this.stopDraw()
                    }
                }
            })).observe(this.canvasElement!)
        }

        if (!this.waiting_for_click) {
            this.startDraw()
        }

        this.canvasContainer.AnmCostumeController = {
            StartDrawAnm: () => {
                this.startDraw();
            },
            StopDrawAnm: () => {
                this.stopDraw()
            },
            SuggestMoveLeft: () => {
                this.suggest_moving = true
                this.costume_leg_dir = 'Left'
            },
            SuggestMoveRight: () => {
                this.suggest_moving = true
                this.costume_leg_dir = 'Right'
            },
            SuggestNoMove: () => {
                this.suggest_moving = false
                this.costume_leg_dir = 'Down'
            },
        }
    }

    getFps() {
        return this.commonFps;
    }
    drawInterval: NodeJS.Timeout | undefined
    startDraw(forceRestart = false) {
        if (this.drawInterval != undefined) {
            if (!forceRestart)
                return
            this.stopDraw()
        }
        this.drawInterval = setInterval(() => {
            this.draw(false)
        }, 1000 / this.getFps())

    }
    stopDraw() {
        if (this.drawInterval != undefined) {
            clearInterval(this.drawInterval)
            this.drawInterval = undefined
        }
    }

    init_event_emitted = false
    updateNormal() {
        if (!this.init_event_emitted) {
            this.init_event_emitted = true
            for (let player of this.players) {
                player.apply_rule("init")
            }
        }

        for (let player of this.players) {
            if (this.currentFps % (this.commonFps / player.anm!.getFps()) != 0)
                continue;

            if (player.sleeping_rule) {
                player.sleep_remains--
                if (player.sleep_remains <= 0) {
                    player.execute_rule(player.sleeping_event_name!, player.sleeping_rule)
                    player.sleeping_rule = undefined
                }
            }

            if (this.htmlRule?.update) {
                this.htmlRule?.update(player.index)
            } else {
                player.anm!.update()
            }
            player.playedFrame++
        }

        this.currentFps = (this.currentFps + 1) % this.commonFps
    }
    drawNormal() {
        //apply shader
        let drawing_canvas = this.backendCanvas || this.canvasElement!;
        let ctx = drawing_canvas.getContext("2d")
        if (!ctx)
            return
        ctx.imageSmoothingEnabled = false

        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.clearRect(0, 0, drawing_canvas.width, drawing_canvas.height)
        for (let i = this.players.length - 1; i >= 0; i--) {
            this.players[i]!.anm!.drawCanvas(ctx, drawing_canvas, this.players[i]!.x, this.players[i]!.y, 1)
        }

        this.webglOverlay?.render()
    }

    render_random_idle = false
    updateCostume() {
        let is_head_idle = false
        if (this.random_idle_is_playing) {
            this.random_idle_anm!.update()
        }
        this.render_random_idle = this.random_idle_is_playing

        if (this.hasPatch(PlayerPatch.csection)) {
            this.costume_leg_dir = this.costume_head_dir
        }
        if (this.hasPatch(PlayerPatch.tApollyon)) {
            this.tapollyon_ring_frame += 0.5
        }
        if (this.layer_stack_exploding) {
            if (this.layer_stack_exploded_x < this.canvasElement!.width / 8) this.layer_stack_exploded_x += 2;
            if (this.layer_stack_exploded_x > this.canvasElement!.width / 8) this.layer_stack_exploded_x = this.canvasElement!.width / 8;
            if (this.layer_stack_exploded_y < this.canvasElement!.height / 2) this.layer_stack_exploded_y += 2;
            if (this.layer_stack_exploded_y > this.canvasElement!.height / 2) this.layer_stack_exploded_y = this.canvasElement!.height / 2;
        } else {
            if (this.layer_stack_exploded_x > 0) this.layer_stack_exploded_x -= 2;
            if (this.layer_stack_exploded_x < 0) this.layer_stack_exploded_x = 0;
            if (this.layer_stack_exploded_y > 0) this.layer_stack_exploded_y -= 2;
            if (this.layer_stack_exploded_y < 0) this.layer_stack_exploded_y = 0;
        }


        if (this.costume_status == "Walk") {
            if (this.costume_shooting.u || this.costume_shooting.d || this.costume_shooting.l || this.costume_shooting.r) {
                if (this.hasPatch(PlayerPatch.Neptunus)) {
                    this.costume_shooting_frame -= 0.5
                } else {
                    this.costume_shooting_frame += 0.5
                }
            } else {
                if (this.hasPatch(PlayerPatch.Neptunus)) {
                    if (this.costume_shooting_frame < 17) {
                        this.costume_shooting_frame += 0.5
                    } else {
                        //do nothing
                    }
                    is_head_idle = true
                } else {
                    this.costume_shooting_frame = is_head_idle ? (this.costume_shooting_frame + 1) % 2 : 0
                    is_head_idle = true
                }
            }
            if (this.suggest_moving || this.is_flying || this.costume_walking.u || this.costume_walking.d || this.costume_walking.l || this.costume_walking.r ||
                (this.hasPatch(PlayerPatch.csection) && (this.costume_shooting.u || this.costume_shooting.d || this.costume_shooting.l || this.costume_shooting.r))
            ) {
                this.costume_walking_frame++
            } else {
                this.costume_walking_frame = 0
            }
        }
        for (let player of this.players) {
            if (this.costume_status == 'Walk') {
                let target_anm_name_A = 'Head' + this.costume_head_dir
                if (is_head_idle && player.costumeInfoA!.head_has_idle) {
                    target_anm_name_A += '_Idle'
                }

                if (player.costumeInfoA!.is_tapollyon) {
                    player.costumeA!.sheet_offsets[2]!.y = (Math.floor(this.tapollyon_ring_frame) % 8) * 32
                }

                if (this.hasPatch(PlayerPatch.Neptunus)) {
                    if (is_head_idle) {
                        player.costumeA!.setFrame(target_anm_name_A + "Charge", this.costume_shooting_frame)
                    } else {
                        player.costumeA!.setFrame(target_anm_name_A + "Shoot", this.costume_shooting_frame)
                    }
                } else if (!is_head_idle && player.costumeInfoA!.head_has_charge) {
                    let head_charge_frame = player.costumeInfoA!.head_charge_frame!
                    if (this.costume_shooting_frame >= head_charge_frame) {
                        player.costumeA!.setFrame(target_anm_name_A + "ChargeFull", Math.floor(this.costume_shooting_frame - head_charge_frame))
                    } else {
                        player.costumeA!.setFrame(target_anm_name_A + "Charge", this.costume_shooting_frame)
                    }
                } else /* original logic */ if (player.costumeA!.getCurrentAnmName() != (target_anm_name_A)) {
                    player.costumeA!.setFrame(target_anm_name_A, 0)
                } else {
                    player.costumeA!.update()
                }



                if (player.costumeInfoB!.is_csection) {
                    player.costumeB!.sheet_offsets[0]!.y = C_SECTION_FRAME_MAP[Math.floor(this.costume_shooting_frame * 1.5) % C_SECTION_FRAME_MAP.length]! * 96
                }
                if (player.costumeB!.getCurrentAnmName() != ('Walk' + this.costume_leg_dir)) {
                    player.costumeB!.setFrame('Walk' + this.costume_leg_dir, 0)
                } else {
                    player.costumeB!.update()
                }
                if (player.costumeC!.getCurrentAnmName() != ('Head' + this.costume_head_dir + '_Overlay')) {
                    player.costumeC!.setFrame('Head' + this.costume_head_dir + '_Overlay', 0)
                } else {
                    player.costumeC!.update()
                }
            } else {
                if (player.costumeA!.getCurrentAnmName() != this.costume_status) {
                    player.costumeA!.setFrame(this.costume_status, 0)
                }
                if (this.costume_status_reset) {
                    this.costume_status_reset = false
                    player.costumeA!.play(0)
                }
                player.costumeA!.update()
            }
        }



        if (this.hasPatch(PlayerPatch.randomIdle)) {
            let now = new Date().getTime()
            if (now > this.random_idle_last_update) {
                this.random_idle_last_update = now + 1000 * 5
                this.random_idle_anm?.setFrame("Idle", 0)
                this.random_idle_is_playing = true
            }
        }

        if (this.hasPatch(PlayerPatch.moveChara) && this.costume_status == 'Walk') {
            if (this.costume_walking.u || this.costume_walking.d || this.costume_walking.l || this.costume_walking.r) {
                let speed = 4
                if (this.costume_walking.u) {
                    this.moveChara_y -= speed
                }
                if (this.costume_walking.d) {
                    this.moveChara_y += speed
                }
                if (this.costume_walking.r) {
                    this.moveChara_x += speed
                }
                if (this.costume_walking.l) {
                    this.moveChara_x -= speed
                }

                let rectA = this.canvasContainer.getBoundingClientRect()
                let rectB = document.body.getBoundingClientRect()

                this.UpdateCharaTransform()
                let reUpdate = false
                if (rectA.x < rectB.x) {
                    this.moveChara_x += rectB.x - rectA.x
                    reUpdate = true
                }
                if (rectA.right > rectB.right) {
                    this.moveChara_x -= rectA.right - rectB.right
                    reUpdate = true
                }
                if (rectA.y < rectB.y) {
                    this.moveChara_y += rectB.y - rectA.y
                    reUpdate = true
                }
                if (rectA.bottom > rectB.bottom) {
                    this.moveChara_y -= rectA.bottom - rectB.bottom
                    reUpdate = true
                }
                if (reUpdate) {
                    this.UpdateCharaTransform()
                }
            }
        }

    }

    drawCostume() {
        let ctx = this.canvasElement!.getContext("2d")!
        ctx.imageSmoothingEnabled = false
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.clearRect(0, 0, this.canvasElement!.width, this.canvasElement!.height)
        if (this.spritesheet_canvas_map) {
            for (let elem of this.spritesheet_canvas_map) {
                elem[1].clearRect(0, 0, 100000, 100000)
            }
        }
        if (this.costume_status == 'Walk') {
            if (this.hasPatch(PlayerPatch.csection)) {
                AnmPlayer.renderCostume(this.costumeInfosB, this.costumeInfosA, this.costumeInfosC, ctx, this.canvasElement!, this.players[0]!.x, this.players[0]!.y, 1, 0, Math.floor(this.costume_walking_frame),
                    this.hasPatch(PlayerPatch.shadowBody), this.gameFrameCount, this.adrenaline_level,
                    [this.layer_stack_exploded_x, this.layer_stack_exploded_y])
            } else if (this.render_random_idle) {
                //this.hasPatch(PlayerPatch.randomIdle)
                AnmPlayer.renderCostume(this.costumeInfosB, undefined, undefined, ctx, this.canvasElement!, this.players[0]!.x, this.players[0]!.y, 1, Math.floor(this.costume_shooting_frame), Math.floor(this.costume_walking_frame),
                    this.hasPatch(PlayerPatch.shadowBody), this.gameFrameCount, this.adrenaline_level,
                    [this.layer_stack_exploded_x, this.layer_stack_exploded_y])
                this.random_idle_anm?.drawCanvas(ctx, this.canvasElement!, this.players[0]!.x, this.players[0]!.y - 17, 1)
            } else {
                AnmPlayer.renderCostume(this.costumeInfosB, this.costumeInfosA, this.costumeInfosC, ctx, this.canvasElement!, this.players[0]!.x, this.players[0]!.y, 1, Math.floor(this.costume_shooting_frame), Math.floor(this.costume_walking_frame),
                    this.hasPatch(PlayerPatch.shadowBody), this.gameFrameCount, this.adrenaline_level,
                    [this.layer_stack_exploded_x, this.layer_stack_exploded_y])
            }
        } else {
            AnmPlayer.renderCostume(this.costumeInfosA, undefined, undefined, ctx, this.canvasElement!, this.players[0]!.x, this.players[0]!.y, 1, Math.floor(this.costume_shooting_frame), Math.floor(this.costume_walking_frame),
                this.hasPatch(PlayerPatch.shadowBody), this.gameFrameCount, this.adrenaline_level,
                [this.layer_stack_exploded_x, this.layer_stack_exploded_y])
        }
        this.gameFrameCount++

    }
    draw(noUpdate: boolean) {
        if (this.waiting_for_click)
            noUpdate = true
        if (this.renderMode == RenderMode.Costume) {
            if (noUpdate) {

            } else {
                this.updateCostume()
                this.recorder?.update()
            }
            this.drawCostume()
        } else {
            if (noUpdate) {

            } else {
                this.updateNormal()
                this.recorder?.update()
            }
            this.drawNormal()
        }

        if (this.waiting_for_click && this.drawInterval)
            this.stopDraw()
    }

    ////////////////// costume //////////////

    COSTUMEANM_KEYS = new Map<string, string>([
        ['p', 'Pickup'],
        ['h', 'Hit'],
        //['A','Appear'],
        ['k', 'Death'],
        ['b', 'Sad'],
        ['o', 'Happy'],
        //['t','TeleportUp'],
        //['T','TeleportDown'],
        ['t', 'Trapdoor'],
        //['M','MinecartEnter'],
        ['j', 'Jump'],
        //['G','Glitch'],
        //['l','LiftItem'],
        //['H','HideItem'],
        //['u','UseItem'],
        //['L','LostDeath'],
        //['f','FallIn'],
        //['','HoleDeath'],
        //['','JumpOut'],
        //['','LightTravel'],
        //['','LeapUp'],
        //['','SuperLeapUp'],
        //['','LeapDown'],
        //['','SuperLeapDown'],
        //['F','ForgottenDeath'],
        //['','DeathTeleport'],
    ]);

    onCostumKeyDown(key: string): boolean {
        let catched = false
        if (key.length == 1) {
            key = key.toLowerCase()
        }
        if (key == 'ArrowUp') {
            this.costume_head_dir = 'Up'
            this.costume_shooting.u = true
            catched = true
        }
        if (key == 'ArrowDown') {
            this.costume_head_dir = 'Down'
            this.costume_shooting.d = true
            catched = true
        }
        if (key == 'ArrowLeft') {
            this.costume_head_dir = 'Left'
            this.costume_shooting.l = true
            catched = true
        }
        if (key == 'ArrowRight') {
            this.costume_head_dir = 'Right'
            this.costume_shooting.r = true
            catched = true
        }
        if (this.hasPatch(PlayerPatch.noAttack)) {
            this.costume_shooting.u = false
            this.costume_shooting.d = false
            this.costume_shooting.l = false
            this.costume_shooting.r = false
        }

        if (key == 'w') {
            this.costume_status = 'Walk'
            this.costume_leg_dir = 'Up'
            this.costume_walking.u = true
            catched = true
            if (!(this.costume_shooting.u || this.costume_shooting.d || this.costume_shooting.l || this.costume_shooting.r)) {
                this.costume_head_dir = 'Up'
            }
        }
        if (key == 's') {
            this.costume_leg_dir = 'Down'
            this.costume_walking.d = true
            catched = true
            if (!(this.costume_shooting.u || this.costume_shooting.d || this.costume_shooting.l || this.costume_shooting.r)) {
                this.costume_head_dir = 'Down'
            }
        }
        if (key == 'a') {
            this.costume_leg_dir = 'Left'
            this.costume_walking.l = true
            catched = true
            if (!(this.costume_shooting.u || this.costume_shooting.d || this.costume_shooting.l || this.costume_shooting.r)) {
                this.costume_head_dir = 'Left'
            }
        }
        if (key == 'd') {
            this.costume_leg_dir = 'Right'
            this.costume_walking.r = true
            catched = true
            if (!(this.costume_shooting.u || this.costume_shooting.d || this.costume_shooting.l || this.costume_shooting.r)) {
                this.costume_head_dir = 'Right'
            }
        }
        if (key == 'r') {
            this.costume_status = 'Walk'
            catched = true
        }
        if (key == '`' && isLayerStackExploded()) {
            this.layer_stack_exploding = !this.layer_stack_exploding
            catched = true
        }
        if (this.COSTUMEANM_KEYS.has(key)) {
            let target_anm = this.COSTUMEANM_KEYS.get(key)!
            this.costume_status = target_anm
            this.costume_status_reset = true
            catched = true
        }
        if (key == 'x') {
            if (this.drawInterval == undefined)
                this.startDraw()
            else
                this.stopDraw()
            catched = true
        }
        if (this.handleColorKey(key)) {
            catched = true
        }
        if (this.handleAdrenalineKey(key)) {
            catched = true
        }
        return catched
    }
    onCostumKeyUp(key: string): boolean {
        let catched = false
        if (key.length == 1) {
            key = key.toLowerCase()
        }
        if (key == 'ArrowUp') {
            this.costume_shooting.u = false
            catched = true
        }
        if (key == 'ArrowDown') {
            this.costume_shooting.d = false
            catched = true
        }
        if (key == 'ArrowLeft') {
            this.costume_shooting.l = false
            catched = true
        }
        if (key == 'ArrowRight') {
            this.costume_shooting.r = false
            catched = true
        }
        if (key == 'w') {
            this.costume_walking.u = false
            catched = true
        }
        if (key == 's') {
            this.costume_walking.d = false
            catched = true
        }
        if (key == 'a') {
            this.costume_walking.l = false
            catched = true
        }
        if (key == 'd') {
            this.costume_walking.r = false
            catched = true
        }
        return catched
    }
    touchData: {
        x: number,
        y: number
    }[] = []
    onCostumeTouchStart(ev: TouchEvent) {
        this.startDraw()

        let touch = ev.touches[0]
        if (touch) {
            ev.preventDefault()
            let id = touch.identifier
            if (id == undefined) {
                id = -1
            }
            let x = touch.pageX, y = touch.pageY
            this.touchData[id] = { x: x, y: y }
            if (!this.hasPatch(PlayerPatch.noAttack)) {
                this.costume_shooting.u = (this.costume_head_dir == "Up")
                this.costume_shooting.l = (this.costume_head_dir == "Left")
                this.costume_shooting.r = (this.costume_head_dir == "Right")
                this.costume_shooting.d = (this.costume_head_dir == "Down")
            }
        }
    }
    onCostomeTouchMove(ev: TouchEvent) {
        let touch = ev.touches[0]
        if (touch) {
            ev.preventDefault()
            let id = touch.identifier
            if (id == undefined) {
                id = -1
            }
            let x = touch.pageX, y = touch.pageY
            let axis = this.touchData[id]
            if (axis == undefined)
                return
            let dx = x - axis.x
            let dy = y - axis.y
            let len = dx * dx + dy * dy
            if (len > 4) {
                this.costume_shooting.d = false
                this.costume_shooting.r = false
                this.costume_shooting.u = false
                this.costume_shooting.l = false
                this.costume_walking.u = false
                this.costume_walking.l = false
                this.costume_walking.r = false
                this.costume_walking.d = false

                if (dx > dy) {
                    if (dx > -dy) {
                        this.costume_head_dir = 'Right'
                        this.costume_leg_dir = 'Right'
                        this.costume_walking.r = true
                    } else {
                        this.costume_head_dir = 'Up'
                        this.costume_leg_dir = 'Up'
                        this.costume_walking.u = true
                    }
                } else {
                    if (dx > -dy) {
                        this.costume_head_dir = 'Down'
                        this.costume_leg_dir = 'Down'
                        this.costume_walking.d = true
                    } else {
                        this.costume_head_dir = 'Left'
                        this.costume_leg_dir = 'Left'
                        this.costume_walking.l = true
                    }
                }
            }
        }

    }
    onCostumeTouchEnd(ev: TouchEvent) {
        ev.preventDefault()
        this.costume_shooting.d = false
        this.costume_shooting.r = false
        this.costume_shooting.u = false
        this.costume_shooting.l = false
        this.costume_walking.u = false
        this.costume_walking.l = false
        this.costume_walking.r = false
        this.costume_walking.d = false
    }
}

class WikiPlayerSingleAnm2 {
    parent: WikiPlayer

    rule: Map<string, string>[] = []
    skincolor: number | undefined

    anm2WikiPath: string

    anmName: string
    x: number
    y: number

    playedFrame = 0 /* 当前动画已经播放过多少帧，在因规则切换动画时会重置 */
    hasAltSkin: boolean

    replaceSheetMap = new Map<number, string>()

    // for mode Costume
    costumeA?: AnmPlayer
    costumeB?: AnmPlayer
    costumeC?: AnmPlayer

    costumeInfoA?: CostumeInfo
    costumeInfoB?: CostumeInfo
    costumeInfoC?: CostumeInfo

    // for mode Normal
    anm?: AnmPlayer

    layerAdjustParameters = new Array<LayerAdjuster>()

    // for events
    canvasClicked: boolean = false

    index: number

    sleeping_rule: Map<string, string> | undefined
    sleeping_event_name: string | undefined
    sleep_remains: number = -1



    constructor(parent: WikiPlayer, anm: Element, index: number) {
        this.parent = parent
        this.index = index

        if (!anm.hasAttribute("data-anm2"))
            throw new Error("Not supported.");


        let skincolor = anm.getAttribute("data-skincolor")
        if (skincolor != undefined && skincolor.length > 0) {
            this.skincolor = +skincolor
        } else {
            this.skincolor = undefined
        }

        this.parent.isFlying ||= anm.getAttribute("data-isflying") == "true";

        //parse rule
        for (let j = 0; j < anm.children.length; j++) {
            let rules_str = anm.children[j]!.getAttribute("data-rule")
            if (rules_str && rules_str.length > 0) {
                for (let rule_str of rules_str.split('|')) {
                    // rule_str->   xxx:xxx,xxx:xxx
                    let newrule = new Map<string, string>()
                    if (rule_str.length > 0) {
                        for (let rule_kv of rule_str.split(",")) {
                            if (rule_kv.length > 0) {
                                // rule_kv->   xxx:xxx
                                let rule_kv_split = rule_kv.split(':')
                                if (rule_kv_split.length == 2) {
                                    let rule_k = rule_kv_split[0]!, rule_v = rule_kv_split[1]!
                                    if (rule_k.length > 0 && rule_v.length > 0) {
                                        newrule.set(rule_k, rule_v)
                                    }
                                }
                            }
                        }
                    }
                    this.rule.push(newrule)
                }
            }
            //parse br
            if (anm.children[j]!.getAttribute("data-break") == "true") {
                if (this.parent.buttonDiv != undefined) {
                    this.parent.buttonDiv.appendChild(document.createElement("br"))
                }
            }
            //parse button
            let btnname_str = anm.children[j]!.getAttribute("data-btnname")
            if (btnname_str && btnname_str.length > 0) {
                if (this.parent.buttonDiv == undefined) {
                    this.parent.buttonDiv = document.createElement("div")
                    // btndiv.style="margin-bottom:3px"
                }
                if (!this.parent.buttons.has(btnname_str)) {
                    let button = new WikiPlayerButton(anm.children[j]!, parent)
                    this.parent.buttons.set(btnname_str, button)

                    this.parent.buttonDiv.appendChild(button.nbtn)
                }
            }
            //parse replacesheet
            let replace_sheet_id = anm.children[j]!.getAttribute("data-replacesheet-id")
            let replace_sheet = anm.children[j]!.getAttribute("data-replacesheet")
            if (replace_sheet_id && replace_sheet_id.length > 0 && replace_sheet && replace_sheet.length > 0) {
                this.replaceSheetMap.set(+replace_sheet_id, replace_sheet)
            }
            //parse layer adjuster
            if (isFinite(+(anm.children[j]!.getAttribute("data-layer-adj") ?? NaN))) {
                let adjuster = new LayerAdjuster(anm.children[j]!)
                this.layerAdjustParameters[adjuster.layerId] = adjuster
            }
        }

        this.anm2WikiPath = "Data:" + (anm.getAttribute("data-anm2")!.replace(new RegExp("[&\\?]", "g"), "") || "")
        this.anmName = anm.getAttribute("data-name") || ""
        this.x = +anm.getAttribute("data-x")!
        this.y = +anm.getAttribute("data-y")!

        this.hasAltSkin = anm.getAttribute("data-has-skin-alt") == "true"
    }

    init(resources: Map<string, Actor>) {
        if (this.parent.renderMode == RenderMode.Costume) {
            let target: Actor | undefined = resources.get(this.anm2WikiPath)
            if (!target)
                return;

            if (this.parent.overwriteColor != undefined && this.index == 0) {
                AnmPlayer.processSkinAlt(target, this.parent.overwriteColor, true)
            }

            if (this.parent.overwriteColor != undefined && this.hasAltSkin) {
                AnmPlayer.processSkinAltAndCostumeAlt(target, this.parent.overwriteColor, this.parent.costumealt)
            } else {
                AnmPlayer.processCostumeAlt(target, this.parent.costumealt)
            }



            /* 此处ABC共用同一份json，注意确保它们没问题 */
            this.costumeA = new AnmPlayer(target, this.replaceSheetMap, () => { this.parent.draw(true) })
            this.costumeB = new AnmPlayer(target, this.replaceSheetMap)
            this.costumeC = new AnmPlayer(target, this.replaceSheetMap)

            if (isLayerStackExploded()) {
                this.costumeA.layer_frame_color = "red"
                this.costumeB.layer_frame_color = "green"
                this.costumeC.layer_frame_color = "yellow"

                let last_line_width = 0
                let spritesheetProvicer = (spritesheed: Spritesheet, url: string, width: number, height: number) => {
                    if (!this.parent.spritesheet_canvas_map.has(url)) {
                        if (last_line_width + width > this.parent.canvasElement!.width) {
                            this.parent.canvasContainer.appendChild(document.createElement("br"))
                            last_line_width = width
                        } else {
                            last_line_width += width
                        }

                        let cvs = document.createElement("canvas")
                        cvs.style.backgroundImage = "url(" + url + ")"
                        cvs.width = width
                        cvs.height = height
                        this.parent.canvasContainer.appendChild(cvs)
                        let ctx = cvs.getContext('2d')
                        if (ctx) {
                            this.parent.spritesheet_canvas_map.set(url, ctx)
                        }
                    }
                    return this.parent.spritesheet_canvas_map.get(url)!
                }
                this.costumeA.setSpritesheetCanvas(spritesheetProvicer)
                this.costumeB.setSpritesheetCanvas(spritesheetProvicer)
                this.costumeC.setSpritesheetCanvas(spritesheetProvicer)
            }


            if (this.parent.hasPatch(PlayerPatch.randomIdle)) {
                this.parent.random_idle_anm = new AnmPlayer(target, this.replaceSheetMap)
                this.parent.random_idle_anm.setEndEventListener(() => { this.parent.random_idle_is_playing = false })
            }

            this.costumeA.forceLoop = true
            this.costumeB.forceLoop = true
            this.costumeC.forceLoop = true

            let head_has_idle = false
            let head_has_charge = false
            let head_charge_frame = 0

            for (let anm_name of this.costumeA.getAnmNames()) {
                if (anm_name.startsWith("Head") && anm_name.endsWith("_Idle")) {
                    head_has_idle = true
                }
                if (!this.parent.hasPatch(PlayerPatch.noCharge)) {
                    if (!head_has_charge && anm_name.startsWith("Head") && anm_name.endsWith("Charge")) {
                        head_has_charge = true
                        this.costumeA.setFrame(anm_name, 0)
                        head_charge_frame = this.costumeA.currentAnm!.FrameNum
                    }
                }
            }

            this.costumeInfoA = {
                player: this.costumeA,
                head_has_idle: head_has_idle,
                head_has_charge: head_has_charge,
                head_charge_frame: head_charge_frame
            }
            this.costumeInfoB = {
                player: this.costumeB
            }
            this.costumeInfoC = {
                player: this.costumeC
            }

            this.parent.costumeInfosA.push(this.costumeInfoA)
            this.parent.costumeInfosB.push(this.costumeInfoB)
            this.parent.costumeInfosC.push(this.costumeInfoC)

            if (this.parent.hasPatch(PlayerPatch.csection) && this.costumeB.getAnmNames().indexOf("SubAnim_Shoot") != -1) {
                this.costumeB.sheet_offsets[0] = { x: 0, y: 0 }
                this.costumeInfoB.is_csection = true
            }

            if (this.parent.hasPatch(PlayerPatch.tApollyon) && this.costumeA.getAnmNames().indexOf("SubAnim") != -1) {
                this.costumeA.sheet_offsets[2] = { x: 0, y: 0 }
                this.costumeInfoA.is_tapollyon = true
            }


            this.costumeA.setFrame("HeadDown", 0)
            this.costumeB.setFrame("WalkDown", 0)
            this.costumeC.setFrame("WalkDown_Overlay", 0)

        } else {
            this.anm = new AnmPlayer(resources.get(this.anm2WikiPath)!, this.replaceSheetMap, () => {
                this.parent.draw(true)
            })
            this.anm.layerAdjustParameters = this.layerAdjustParameters
            this.anm.setFrame((this.anmName || '').split('.')[0] || "", 0)
            this.anm.setEndEventListener(() => {
                this.onAnmEnd()
            })
            this.anm.eventListener = (eventName) => {
                this.onEvent(eventName)
            }
        }
    }

    onEvent(eventName: string) {
        this.apply_rule("e_" + eventName)
        if (this.parent.htmlRule?.onevent) {
            this.parent.htmlRule.onevent(this.index, eventName)
        }
    }

    onAnmEnd() {
        let clicked = this.canvasClicked
        if (this.canvasClicked) {
            this.canvasClicked = false
            if (this.apply_rule("clicknext"))
                return
        }
        this.apply_rule("next")

        if (this.parent.htmlRule?.onend) {
            this.parent.htmlRule.onend(this.index, clicked)
        }
    }

    execute_rule(ename: string, r: Map<string, string>) {
        let target = this as WikiPlayerSingleAnm2
        if (r.has("target")) {
            target = this.parent.players[+(r.get("target") ?? -1)] || target;
        }
        let rename = r.get(ename)
        if (rename) {
            target.anmName = rename
            if (target.anm?.getAnmNames().indexOf(rename.split('.')[0]!) != -1) {
                let frame = 0
                if (r.has("frame")) {
                    frame = +r.get("frame")!
                    if (isNaN(frame)) {
                        frame = 0
                    }
                }
                target.anm!.setFrame(rename.split('.')[0]!, frame)
            }
        }
        target.playedFrame = 0

        if (r.has("whenbtn")) {
            let btn_names = r.get("whenbtn")!.split("&&&")
            for (let btn_name of btn_names) {
                let btn = this.parent.buttons.get(btn_name)
                if (!btn)
                    continue
                btn.clear(this.index)
            }
        }

        if (window.mw.config.get("debug")) {
            console.log("apply rule", r)
        }

        target.anm!.flipX = r.has("flipX") && r.get("flipX") == "true"
        target.anm!.revert = r.has("revert") && r.get("revert") == "true"
        if (target.anm!.revert) {
            target.anm!.play(target.anm!.currentAnm!.FrameNum - 1)
        }

        if (r.has("setbtn")) {
            let btnnames = r.get("setbtn")!.split("&&&")
            for (let btn_name of btnnames) {
                let btn = this.parent.buttons.get(btn_name)
                if (!btn)
                    continue
                btn.set_btn_status(ButtonStatus.Pressed)
            }
        }
        if (r.has("resetbtn")) {
            let btnnames = r.get("resetbtn")!.split("&&&")
            for (let btn_name of btnnames) {
                let btn = this.parent.buttons.get(btn_name)
                if (!btn)
                    continue
                btn.set_btn_status(ButtonStatus.NotPressed)
            }
        }
        if (r.has("pause") && r.get("pause") == "true") {
            this.parent.waiting_for_click = true
            this.parent.stopDraw()
        }

        if (r.has("shaderparam") && this.parent.webglOverlay) {
            let params = r.get("shaderparam")!.split("\\")
            for (let i = 0; i < params.length; i += 2) {
                let name = params[i]!
                let value = params[i + 1]
                if (value != undefined) {
                    this.parent.webglOverlay.shaderController.setParam(name, value)
                }
            }
        }
        if (r.has("also")) {
            let arg = r.get("also")!.split(".")
            if (arg.length % 2 != 0) {
                console.log("invalid also:", r)
            } else {
                for (let j = 0; j < arg.length; j += 2) {
                    let _pid = +arg[j]!
                    let _player = this.parent.players[_pid]
                    let _event_name = arg[j + 1]
                    if (_pid == undefined || _event_name == undefined)
                        continue
                    if (!_event_name.startsWith("event_")) {
                        console.log("自定义事件名必须以event_开头:", _event_name)
                    }
                    else if (_player == undefined) {
                        console.log("player not found for also:", r)
                    } else {
                        try {
                            _player.apply_rule(_event_name)
                        } catch (e) {
                            console.error("anm2播放器规则错误，also可能出现死递归", e)
                        }
                    }
                }
            }
        }
    }

    apply_rule(ename: string) {
        let rule_index = -1
        for (let r of this.rule) {
            rule_index++

            if (r.has("when") && r.get("when") != this.anmName)
                continue
            if (r.has("whendelay") && this.playedFrame < +(r.get("whendelay") ?? -1)) {
                continue
            }

            if (r.has("rate") && Math.random() > +(r.get("rate") ?? 1))
                continue
            if (r.has("whenbtn")) {
                let block = false
                let btn_names = (r.get("whenbtn") ?? "").split("&&&")
                for (let btn_name of btn_names) {
                    let btn = this.parent.buttons.get(btn_name)
                    if (!btn)
                        continue
                    if (btn.peek(this.index) == ButtonStatus.NotPressed) {
                        block = true
                        break
                    }
                }

                if (block) {
                    continue
                }
            }
            if (r.has("whenbtnN")) {
                let block = false
                let btn_names = (r.get("whenbtnN") ?? "").split("&&&")
                for (let btn_name of btn_names) {
                    let btn = this.parent.buttons.get(btn_name)
                    if (!btn)
                        continue
                    if (btn.peek(this.index) == ButtonStatus.Pressed) {
                        block = true
                        break
                    }
                }

                if (block) {
                    continue
                }
            }
            if (r.has(ename)) {
                //注意：我们依赖外侧for循环不再继续，来满足action的闭包合法性
                if (r.has("sleep")/* && !r.has("pause") */) {
                    if (this.sleeping_rule && r == this.sleeping_rule) {
                        //don't set rule
                    } else {
                        this.sleeping_rule = r
                        this.sleep_remains = +(r.get("sleep") ?? 1)
                        this.sleeping_event_name = ename
                    }
                } else {
                    this.execute_rule(ename, r)
                }
                return true
            }
        }
        return false
    }


}

enum ButtonStatus {
    Pressed,
    NotPressed
}

class WikiPlayerButton {
    nbtn: HTMLAnchorElement
    btnreset_count: number

    btn_istoggle: boolean

    btn_groupname: string

    btn_hide: boolean

    btn_initial_status: boolean
    parent: WikiPlayer
    constructor(buttonDesc: Element, parent: WikiPlayer) {
        this.parent = parent
        this.btnreset_count = +(buttonDesc.getAttribute("data-reset") ?? 1)
        this.btn_istoggle = buttonDesc.getAttribute("data-toggle") == "true"
        this.btn_groupname = (buttonDesc.getAttribute("data-group") ?? "")
        this.btn_initial_status = buttonDesc.getAttribute("data-init") == "true"
        this.btn_hide = buttonDesc.getAttribute("data-hide") == "true"

        this.nbtn = document.createElement("a")
        this.nbtn.href = 'javascript:void(0)'
        this.nbtn.innerText = buttonDesc.getAttribute("data-btnname")!

        if (this.btn_hide) {
            this.nbtn.style.cssText = "display:none"
        } else {
            this.nbtn.style.cssText = 'text-decoration:none;border-radius:4px;'
        }

        this.nbtn.onclick = () => {
            this.onClick()
        }
    }

    active_handled_by_anm: boolean[] = []

    is_active = false
    private set_active(target: boolean) {
        this.is_active = target
        this.active_handled_by_anm = []
        if (this.btn_hide)
            return
        if (this.is_active) {
            this.nbtn.style.cssText = 'text-decoration:none;border-radius:4px;background-color:#d5d4c963'
        } else {
            this.nbtn.style.cssText = 'text-decoration:none;border-radius:4px;'
        }
    }

    onClick() {
        if (this.parent.waiting_for_click) {
            this.parent.waiting_for_click = false
            this.parent.startDraw()
        }
        if (this.btn_groupname == undefined) {
            if (this.btn_istoggle) {
                this.set_active(!this.is_active)
            } else {
                this.set_active(true)
            }
        } else {
            for (let btn of this.parent.buttons.values()) {
                if (btn.btn_groupname != this.btn_groupname)
                    continue
                if (btn == this) {
                    btn.set_active(true)
                } else {
                    btn.set_active(false)
                }
            }
        }
    }

    peek(playerIndex: number): ButtonStatus {
        if (this.btn_istoggle) {
            return this.is_active ? ButtonStatus.Pressed : ButtonStatus.NotPressed
        } else {
            if (this.is_active) {
                if (this.active_handled_by_anm[playerIndex])
                    return ButtonStatus.NotPressed
                return ButtonStatus.Pressed
            } else {
                return ButtonStatus.NotPressed
            }
        }
    }
    clear(playerIndex: number) {
        this.active_handled_by_anm[playerIndex] = true
    }
    set_btn_status(status: ButtonStatus) {
        if (status == ButtonStatus.Pressed) {
            if (this.btn_groupname == undefined) {
                this.set_active(true)
            } else {
                for (let btn of this.parent.buttons.values()) {
                    if (btn.btn_groupname != this.btn_groupname)
                        continue
                    if (btn == this) {
                        btn.set_active(true)
                    } else {
                        btn.set_active(false)
                    }
                }
            }
        } else {
            this.set_active(false)
        }
    }
}

class LayerAdjuster {
    layerId: number

    red: number | undefined
    green: number | undefined
    blue: number | undefined
    alpha: number | undefined
    redOffset: number | undefined
    greenOffset: number | undefined
    blueOffset: number | undefined
    xscale: number | undefined
    yscale: number | undefined

    hide: boolean
    constructor(descElem: Element) {
        this.layerId = +(descElem.getAttribute("data-layer-adj")!);

        function getAttr(attr: string) {
            let v = +(descElem.getAttribute("data-" + attr)!)
            if (v && isFinite(v))
                return v
            return undefined
        }
        this.red = getAttr("r")
        this.green = getAttr("g")
        this.blue = getAttr("b")
        this.alpha = getAttr("a")
        this.redOffset = getAttr("ro")
        this.greenOffset = getAttr("go")
        this.blueOffset = getAttr("bo")
        this.xscale = getAttr("xs")
        this.yscale = getAttr("ys")
        this.hide = descElem.getAttribute("data-hide") == "1"
    }
}

function isLayerStackExploded(): boolean {
    let layer_stack_exploded = new RegExp("[&?]anm2Exploded=([^&]+)").exec(window.location.href)
    return !!(layer_stack_exploded && layer_stack_exploded[1] == "1")

}

interface AnmCostumeController {
    StartDrawAnm: () => void,
    StopDrawAnm: () => void
}