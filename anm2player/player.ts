class FrameStatus implements Frame {
    XPivot: number = 0
    YPivot: number = 0
    XCrop: number = 0
    YCrop: number = 0
    Width: number = 0
    Height: number = 0
    XPosition: number = 0
    YPosition: number = 0
    Delay: number = 0
    Visible: boolean = true
    XScale: number = 0
    YScale: number = 0
    RedTint: number = 0
    GreenTint: number = 0
    BlueTint: number = 0
    AlphaTint: number = 0
    RedOffset: number = 0
    GreenOffset: number = 0
    BlueOffset: number = 0
    Rotation: number = 0
    Interpolated: boolean = false

    //通过SVG Filter实现颜色偏移
    filterGenerated: boolean = false
    filterId?: string

    copyFrom(other: Frame) {
        this.XPivot = other.XPivot
        this.YPivot = other.YPivot
        this.XCrop = other.XCrop
        this.YCrop = other.YCrop
        this.Width = other.Width
        this.Height = other.Height
        this.XPosition = other.XPosition
        this.YPosition = other.YPosition
        this.Delay = other.Delay
        this.Visible = other.Visible
        this.XScale = other.XScale
        this.YScale = other.YScale
        this.RedTint = other.RedTint
        this.GreenTint = other.GreenTint
        this.BlueTint = other.BlueTint
        this.AlphaTint = other.AlphaTint
        this.RedOffset = other.RedOffset
        this.GreenOffset = other.GreenOffset
        this.BlueOffset = other.BlueOffset
        this.Rotation = other.Rotation
        this.Interpolated = other.Interpolated
    }

    public static Interp(a: Frame, b: Frame, r: number): FrameStatus {
        let ret = new FrameStatus()
        ret.XPivot = a.XPivot
        ret.YPivot = a.YPivot
        ret.XCrop = a.XCrop
        ret.YCrop = a.YCrop
        ret.Width = a.Width
        ret.Height = a.Height
        ret.XPosition = (b.XPosition - a.XPosition) * r + a.XPosition
        ret.YPosition = (b.YPosition - a.YPosition) * r + a.YPosition
        ret.Delay = (b.Delay - a.Delay) * r + a.Delay
        ret.Visible = a.Visible
        ret.XScale = (b.XScale - a.XScale) * r + a.XScale
        ret.YScale = (b.YScale - a.YScale) * r + a.YScale
        ret.RedTint = (b.RedTint - a.RedTint) * r + a.RedTint
        ret.GreenTint = (b.GreenTint - a.GreenTint) * r + a.GreenTint
        ret.BlueTint = (b.BlueTint - a.BlueTint) * r + a.BlueTint
        ret.AlphaTint = (b.AlphaTint - a.AlphaTint) * r + a.AlphaTint
        ret.RedOffset = (b.RedOffset - a.RedOffset) * r + a.RedOffset
        ret.GreenOffset = (b.GreenOffset - a.GreenOffset) * r + a.GreenOffset
        ret.BlueOffset = (b.BlueOffset - a.BlueOffset) * r + a.BlueOffset
        ret.Rotation = (b.Rotation - a.Rotation) * r + a.Rotation
        ret.Interpolated = a.Interpolated
        return ret
    }
}

class LayerStatus {
    LayerId: number = 0
    Visible: boolean = false
    frames: FrameStatus[/* frame id */] = []
}
interface LoadedAnms {
    rootframes: FrameStatus[/* frame id */], frames: LayerStatus[/* layer id */], Loop: boolean,
    FrameNum: number
    events: (string | null)[]
    name: string

    nullFrames: LayerStatus[]
}

interface LayerAdjustParameter {
    red?: number
    green?: number
    blue?: number
    alpha?: number
    redOffset?: number
    greenOffset?: number
    blueOffset?: number

    xscale?: number
    yscale?: number

    xoffset?: number
    yoffset?: number

    hide?: boolean
}

class AnmPlayer {
    static svgfilter_incrid: number = 0
    static crossOrigin?: string = undefined

    anm2: Actor

    sprites: string[] = new Array() /* spriteid -> sprite path */
    sprites_htmlimg: HTMLImageElement[] = new Array()
    layers: Layer[/* layer id */] = new Array()
    events: string[/* event id */] = new Array()

    layerAdjustParameters: LayerAdjustParameter[/* layer id */] = new Array()

    currentFrame: number = -1
    currentAnm?: LoadedAnms

    frames: Map</* anim name */string, LoadedAnms> = new Map()

    forceLoop: boolean = false
    flipX: boolean = false
    //倒放
    revert: boolean = false
    visible: boolean = true

    sheet_offsets: { x: number, y: number }[/* sheet id */] = []


    eventListener?: (eventName: string) => void
    anmEndEventListener?: () => void
    imgLoadListener?: () => void

    layer_frame_color?: string

    constructor(json: Actor, img_url_builder: (url: string, replaced: boolean) => string, spritesheet_overwrite: (sprite_id: number) => string, onloadimg: () => void) {
        this.anm2 = json

        for (let sheet of this.anm2.content?.Spritesheets || []) {
            this.sprites[sheet.Id] = sheet.Path || 'unknown'
        }

        for (let layer of this.anm2.content?.Layers || []) {
            this.layers[layer.Id] = layer
        }

        for (let evt of this.anm2.content?.Events || []) {
            this.events[evt.Id] = evt.Name
        }


        for (let anm of this.anm2.animations?.animation || []) {
            this.loadAnmObject(anm)
        }
        this.setFrame(this.anm2.animations?.DefaultAnimation || '', 0)

        this.img_url_builder = img_url_builder
        for (let i = 0; i < (this.anm2.content?.Spritesheets?.length || 0); i++) {
            this.loadSpritesheet(i, spritesheet_overwrite)
        }

        this.imgLoadListener = onloadimg

    }

    private loadAnimationFrames(anms: Frame[], length: number): FrameStatus[] {
        let ret = new Array(length)
        let fi = 0
        for (let findex = 0; findex < anms.length; findex++) {
            let frame = anms[findex]
            if (frame.Interpolated && findex + 1 < anms.length) {
                for (let d = 0; d < frame.Delay; d++) {
                    ret[fi++] = FrameStatus.Interp(frame, anms[findex + 1], d / frame.Delay)
                }
            } else {
                let temp = new FrameStatus()
                temp.copyFrom(frame)
                for (let d = 0; d < frame.Delay; d++) {
                    ret[fi++] = temp
                }
            }
        }
        while (fi > 0 && fi < length) {
            ret[fi] = ret[fi - 1]
            fi++
        }
        return ret
    }

    static svgRoot?: Element
    public static createSvgFilterElement(R: number, G: number, B: number, A: number, RO: number, GO: number, BO: number) {
        let NS = "http://www.w3.org/2000/svg"
        if (AnmPlayer.svgRoot == undefined) {
            AnmPlayer.svgRoot = document.createElementNS(NS, "svg")
            AnmPlayer.svgRoot.setAttribute("style", "display:none")
            document.body.appendChild(AnmPlayer.svgRoot)
        }
        let filter = document.createElementNS(NS, "filter")
        let id = "AnmPlayerSvgFilter_" + (AnmPlayer.svgfilter_incrid++)
        filter.setAttribute("id", id)
        let colormat = document.createElementNS(NS, "feColorMatrix")
        colormat.setAttribute("in", "SourceGraphic")
        colormat.setAttribute("type", "matrix")
        colormat.setAttribute("color-interpolation-filters", "sRGB")
        let mat = ""
        mat += R + " 0 0 0 " + RO + "\n"
        mat += "0 " + G + " 0 0 " + GO + "\n"
        mat += "0 0 " + B + " 0 " + BO + "\n"
        mat += "0 0 0 " + A + " 0"
        colormat.setAttribute("values", mat)
        filter.appendChild(colormat)
        AnmPlayer.svgRoot.appendChild(filter)
        return id
    }

    private loadAnmObject(anm: PAnimation) {
        let rootframes = this.loadAnimationFrames(anm.RootAnimation, anm.FrameNum)
        let layerframes: LayerStatus[] = new Array(anm.LayerAnimations.length)
        for (let j = 0; j < anm.LayerAnimations.length; j++) {
            let layer = new LayerStatus()
            layer.Visible = anm.LayerAnimations[j].Visible
            layer.frames = this.loadAnimationFrames(anm.LayerAnimations[j].frames, anm.FrameNum)
            layer.LayerId = anm.LayerAnimations[j].LayerId
            layerframes[j] = layer
        }

        let nullframes: LayerStatus[] = new Array(anm.NullAnimations.length)
        for (let j = 0; j < anm.NullAnimations.length; j++) {
            let layer = new LayerStatus()
            layer.Visible = anm.NullAnimations[j].Visible
            layer.frames = this.loadAnimationFrames(anm.NullAnimations[j].frames, anm.FrameNum)
            layer.LayerId = anm.NullAnimations[j].NullId
            nullframes[j] = layer
        }

        let events: (string | null)[] = new Array(anm.FrameNum)
        for (let trig of anm.Triggers) {
            events[trig.AtFrame] = this.events[trig.EventId]
        }

        this.frames.set(anm.Name || "", {
            rootframes: rootframes,
            frames: layerframes,
            Loop: anm.Loop,
            FrameNum: anm.FrameNum,
            events: events,
            name: anm.Name || '',
            nullFrames: nullframes
        })
    }

    private loadAnm(name: string) {
        if (!this.frames.has(name)) {
            let anms = this.anm2.animations?.animation
            if (anms) {
                for (let i = 0; i < anms.length; i++) {
                    if (anms[i].Name == name) {
                        // load
                        this.loadAnmObject(anms[i])
                    }
                }
            }
        }
    }

    public setFrame(name: string, frame: number) {
        this.currentAnm = this.frames.get(name)
        this.play(frame)
    }

    public play(frame: number) {
        if (this.currentAnm) {
            this.currentFrame = frame
            if (this.currentFrame < 0) {
                this.currentFrame = 0
            }
            if (this.currentFrame >= this.currentAnm.FrameNum) {
                if (this.currentAnm.Loop) {
                    this.currentFrame %= this.currentAnm.FrameNum
                } else {
                    this.currentFrame = this.currentAnm.FrameNum - 1
                }
            }
        }
    }

    public setEndEventListener(listener: () => void) {
        this.anmEndEventListener = listener
    }

    spritesheet_canvas?: Array<CanvasRenderingContext2D>
    spritesheetCanvasProvider?: (spritesheed: Spritesheet, url: String, width: number, height: number) => CanvasRenderingContext2D
    public setSpritesheetCanvas(canvasProvider: (spritesheed: Spritesheet, url: String, width: number, height: number) => CanvasRenderingContext2D) {
        this.spritesheetCanvasProvider = canvasProvider
    }

    public update() {
        if (this.currentAnm) {
            if (this.revert) {
                this.currentFrame--
                if (this.currentFrame < 0) {
                    if (this.currentAnm.Loop || this.forceLoop) {
                        this.currentFrame = this.currentAnm.FrameNum - 1
                    } else {
                        this.currentFrame = 0
                    }
                    if (this.anmEndEventListener) {
                        this.anmEndEventListener()
                    }
                }
            } else {
                this.currentFrame++
                if (this.currentFrame >= this.currentAnm.FrameNum) {
                    if (this.currentAnm.Loop || this.forceLoop) {
                        this.currentFrame = 0
                    } else {
                        this.currentFrame--
                    }
                    if (this.anmEndEventListener) {
                        this.anmEndEventListener()
                    }
                }
            }
        } else {
            return
        }

        //handle event
        let eventname = this.currentAnm?.events[this.currentFrame]
        if (eventname) {
            this.eventListener?.call(undefined, eventname)
        }
    }

    img_url_builder: (name: string, replaced: boolean) => string

    private loadSpritesheet(i: number, overwiter?: (id: number) => string) {
        let img = this.sprites_htmlimg[i]
        if (img == undefined) {
            let replaced_url = overwiter && overwiter(i)
            let imgpath = replaced_url || this.sprites[i]
            img = document.createElement("img")
            img.setAttribute('style', "image-rendering: pixelated; display:none;")
            if (AnmPlayer.crossOrigin != undefined) {
                img.setAttribute('crossorigin', AnmPlayer.crossOrigin)
            }
            img.src = this.img_url_builder(imgpath, replaced_url != undefined)

            img.onload = () => {
                img.setAttribute("img_loaded", "true")
                if (this.imgLoadListener) {
                    this.imgLoadListener()
                }
                if (this.spritesheetCanvasProvider) {
                    this.spritesheet_canvas = this.spritesheet_canvas || []
                    let sprite = this.anm2.content?.Spritesheets
                    if (sprite && sprite[i]) {
                        this.spritesheet_canvas[i] = this.spritesheetCanvasProvider(sprite[i], img.src, img.width, img.height)
                    }
                }
            }

            this.sprites_htmlimg[i] = img
        }
        return img
    }

    public replaceSpriteSheet(i: number, img: HTMLImageElement) {
        this.sprites_htmlimg[i] = img
    }

    debug_anchor: boolean = false


    public drawCanvas(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, centerX?: number, centerY?: number, rootScale?: number, layer_name?: string, transformFrame?: FrameStatus, blackPatch?: boolean /* 用于渲染犹大之影的身体 */, extraScaleX?: number, extraScaleY?: number, extraOffsetY?: number) {
        ctx.save()

        ctx.setTransform(1, 0, 0, 1, 0, 0)
        // ctx.clearRect(0,0,canvas.width, canvas.height)
        // ctx.beginPath()
        // ctx.strokeRect(0,0,canvas.width,canvas.height)

        //root transform
        if (centerX == undefined) {
            centerX = canvas.width / 2
        }
        if (centerY == undefined) {
            centerY = canvas.height / 2
        }
        if (rootScale == undefined) {
            rootScale = 1
        }
        if (extraScaleX == undefined) {
            extraScaleX = 1
        }
        if (extraScaleY == undefined) {
            extraScaleY = 1
        }
        if (extraOffsetY == undefined) {
            extraOffsetY = 0
        }


        let rootframe = this.currentAnm?.rootframes[this.currentFrame]

        ctx.translate(centerX, centerY)

        ctx.scale(this.flipX ? -rootScale : rootScale, rootScale)

        ctx.translate(0, extraOffsetY)

        ctx.scale(extraScaleX, extraScaleY)

        if (rootframe) {
            ctx.translate(rootframe.XPosition, rootframe.YPosition)
            ctx.rotate(rootframe.Rotation * Math.PI / 180)
            ctx.scale(rootframe.XScale / 100, rootframe.YScale / 100)
        }

        if (transformFrame) {
            ctx.translate(transformFrame.XPosition, transformFrame.YPosition)
            ctx.rotate(transformFrame.Rotation * Math.PI / 180)
            ctx.scale(transformFrame.XScale / 100, transformFrame.YScale / 100)
        }


        if (this.debug_anchor) {
            ctx.beginPath()
            ctx.arc(0, 0, 5, 0, Math.PI / 2)
            ctx.fillStyle = 'blue'
            ctx.fill()
        }


        //layer transform
        for (let i = 0; this.visible && i < (this.currentAnm?.frames.length || 0); i++) {

            let layer = this.currentAnm?.frames[i]
            if (layer_name) {
                if (this.getLayerName(layer ? layer.LayerId : -1) != layer_name) {
                    continue
                }
            }
            if (layer?.Visible) {
                let layerAdjuster = this.layerAdjustParameters[layer.LayerId]

                let frame = layer.frames[this.currentFrame]
                if (frame && frame.Visible && !(layerAdjuster && layerAdjuster.hide)) {
                    ctx.save()

                    let sprite_sheet_id = this.layers[layer.LayerId].SpritesheetId

                    let img = this.loadSpritesheet(sprite_sheet_id)


                    ctx.translate(frame.XPosition, frame.YPosition)
                    ctx.rotate(frame.Rotation * Math.PI / 180)
                    // ctx.translate(-canvas.width/2,-canvas.height/2)
                    ctx.scale(frame.XScale / 100, frame.YScale / 100)
                    if (layerAdjuster) {
                        ctx.translate(layerAdjuster.xoffset ?? 0, layerAdjuster.yoffset ?? 0)
                        ctx.scale((layerAdjuster.xscale ?? 100) / 100, (layerAdjuster.yscale ?? 100) / 100)
                    }
                    // ctx.translate(canvas.width/2,canvas.height/2)

                    ctx.translate(-frame.XPivot, -frame.YPivot)

                    //apply root transform

                    //draw frame
                    if (!frame.filterGenerated) {
                        frame.filterGenerated = true
                        if (layerAdjuster) {
                            frame.filterId = 'url(#' + AnmPlayer.createSvgFilterElement(
                                (rootframe?.RedTint || 255) * frame.RedTint * ((layerAdjuster.red || 255) / 255) / (255 * 255),
                                (rootframe?.GreenTint || 255) * frame.GreenTint * ((layerAdjuster.green || 255) / 255) / (255 * 255),
                                (rootframe?.BlueTint || 255) * frame.BlueTint * ((layerAdjuster.blue || 255) / 255) / (255 * 255),
                                ((layerAdjuster.alpha || 255) / 255), //(rootframe?.AlphaTint || 255) * frame.AlphaTint     /(255*255),
                                frame.RedOffset + (layerAdjuster.redOffset || 0) / 255,
                                frame.GreenOffset + (layerAdjuster.greenOffset || 0) / 255,
                                frame.BlueOffset + (layerAdjuster.blueOffset || 0) / 255
                            ) + ')'
                        } else if (blackPatch) {
                            frame.filterId = 'url(#' + AnmPlayer.createSvgFilterElement(
                                (rootframe?.RedTint || 255) * frame.RedTint / (255 * 255),
                                (rootframe?.GreenTint || 255) * frame.GreenTint / (255 * 255),
                                (rootframe?.BlueTint || 255) * frame.BlueTint / (255 * 255),
                                1, //(rootframe?.AlphaTint || 255) * frame.AlphaTint     /(255*255),
                                -255 / 255,
                                -255 / 255,
                                -255 / 255
                            ) + ')'
                        } else {
                            frame.filterId = 'url(#' + AnmPlayer.createSvgFilterElement(
                                (rootframe?.RedTint || 255) * frame.RedTint / (255 * 255),
                                (rootframe?.GreenTint || 255) * frame.GreenTint / (255 * 255),
                                (rootframe?.BlueTint || 255) * frame.BlueTint / (255 * 255),
                                1, //(rootframe?.AlphaTint || 255) * frame.AlphaTint     /(255*255),
                                frame.RedOffset / 255,
                                frame.GreenOffset / 255,
                                frame.BlueOffset / 255
                            ) + ')'
                        }
                    }

                    ctx.filter = frame.filterId || 'none'
                    ctx.globalAlpha = (rootframe?.AlphaTint || 255) * frame.AlphaTint / (255 * 255)

                    let sheet_offset_x = 0, sheet_offset_y = 0
                    let sheet_offset = this.sheet_offsets[sprite_sheet_id]
                    if (sheet_offset != undefined) {
                        sheet_offset_x = sheet_offset.x
                        sheet_offset_y = sheet_offset.y
                    }

                    ctx.drawImage(img, frame.XCrop + sheet_offset_x, frame.YCrop + sheet_offset_y, frame.Width, frame.Height, 0, 0, frame.Width, frame.Height)
                    if (this.layer_frame_color) {
                        ctx.beginPath()
                        ctx.strokeStyle = this.layer_frame_color
                        ctx.lineWidth = 1
                        ctx.strokeRect(0, 0, frame.Width, frame.Height)
                        ctx.fillStyle = this.layer_frame_color
                        ctx.arc(frame.XPivot, frame.YPivot, 1, 0, Math.PI / 2)
                        ctx.fill()

                        //draw spritesheet canvas
                        let spritesheet_canvas = this.spritesheet_canvas && this.spritesheet_canvas[sprite_sheet_id]
                        if (spritesheet_canvas) {
                            spritesheet_canvas.beginPath()
                            spritesheet_canvas.strokeStyle = this.layer_frame_color
                            spritesheet_canvas.lineWidth = 1
                            spritesheet_canvas.strokeRect(frame.XCrop + sheet_offset_x, frame.YCrop + sheet_offset_y, frame.Width, frame.Height)
                            spritesheet_canvas.fillStyle = this.layer_frame_color
                            spritesheet_canvas.fill()
                        }
                    }

                    if (this.debug_anchor) {
                        ctx.beginPath()
                        ctx.arc(frame.XPivot, frame.YPivot, 5, 0, Math.PI / 2)
                        ctx.fillStyle = 'green'
                        ctx.fill()
                    }
                    ctx.restore()
                }
            }

        }
        ctx.restore()
    }

    public getAnmNames(): string[] {
        let ret: string[] = []

        for (let anm of this.anm2.animations?.animation || []) {
            ret.push(anm.Name || '')
        }
        return ret
    }
    public getCurrentAnmName(): string {
        return this.currentAnm?.name || ''
    }
    public getFps(): number {
        return this.anm2.info?.Fps || 30
    }

    public getDefaultAnmName(): string {
        return this.anm2.animations?.DefaultAnimation || ''
    }
    public getLayerName(layerId: number): string | undefined {
        for (let layer of this.anm2.content?.Layers || []) {
            if (layer.Id == layerId) {
                return layer.Name || undefined
            }
        }
        return undefined
    }

    public getLayerByName(name: string): LayerStatus | undefined {
        let layer_id = undefined
        for (let layer of this.anm2.content?.Layers || []) {
            if (layer.Name == name) {
                layer_id = layer.Id
                break
            }
        }
        if (layer_id != undefined) {
            for (let frame of this.currentAnm?.frames || []) {
                if (frame.LayerId == layer_id) {
                    return frame
                }
            }
        }
        return undefined
    }
    public static expandActor(target: any, keymap: any) {
        if (typeof (target) != "object") {
            return
        }
        for (let i = 0; i < target.length; i++) {
            this.expandActor(target[i], keymap)
        }

        for (let k in keymap) {
            if (k.length == 1 && typeof (keymap[k]) == "string" && target[k] != undefined) {
                this.expandActor(target[k], keymap)
                target[keymap[k]] = target[k]
                target[k] = undefined
            }
        }
    }

    public static setCrossOrigin(origin?: string) {
        AnmPlayer.crossOrigin = origin
    }
    private static SKIN_ALT_NAME = ['_white', '_black', '_blue', '_red', '_green', '_grey']
    public static processSkinAlt(target: Actor, skinAlt: number, firstOnly: boolean = false) {
        if (skinAlt >= 0 && skinAlt < AnmPlayer.SKIN_ALT_NAME.length) {
            for (let sprite of target.content?.Spritesheets || []) {
                if (firstOnly && sprite.Id != 0) {
                    continue
                }
                if (sprite.Path && sprite.Path.endsWith('.png')) {
                    sprite.Path = sprite.Path.substring(0, sprite.Path.length - 4) + this.SKIN_ALT_NAME[skinAlt] + '.png'
                }
            }
        }
    }

    // COSTUME_ALT_DICT is generated by "anm2parser/skin_alt_gen.py"
    public static COSTUME_ALT_DICT: Map<string, Map<string, string>> = new Map([["apollyon", new Map([["resources/gfx/characters/costumes/costume_002_bookofbelial.png", "resources/gfx/characters/costumes_apollyon/costume_002_bookofbelial.png"], ["resources/gfx/characters/costumes/costume_002_bookofbelial_black.png", "resources/gfx/characters/costumes_apollyon/costume_002_bookofbelial_black.png"], ["resources/gfx/characters/costumes/costume_002_bookofbelial_blue.png", "resources/gfx/characters/costumes_apollyon/costume_002_bookofbelial_blue.png"], ["resources/gfx/characters/costumes/costume_002_bookofbelial_green.png", "resources/gfx/characters/costumes_apollyon/costume_002_bookofbelial_green.png"], ["resources/gfx/characters/costumes/costume_002_bookofbelial_grey.png", "resources/gfx/characters/costumes_apollyon/costume_002_bookofbelial_grey.png"], ["resources/gfx/characters/costumes/costume_002_bookofbelial_red.png", "resources/gfx/characters/costumes_apollyon/costume_002_bookofbelial_red.png"], ["resources/gfx/characters/costumes/costume_002_bookofbelial_white.png", "resources/gfx/characters/costumes_apollyon/costume_002_bookofbelial_white.png"], ["resources/gfx/characters/costumes/costume_004_gamekid.png", "resources/gfx/characters/costumes_apollyon/costume_004_gamekid.png"], ["resources/gfx/characters/costumes/costume_004_gamekid_black.png", "resources/gfx/characters/costumes_apollyon/costume_004_gamekid_black.png"], ["resources/gfx/characters/costumes/costume_004_gamekid_blue.png", "resources/gfx/characters/costumes_apollyon/costume_004_gamekid_blue.png"], ["resources/gfx/characters/costumes/costume_004_gamekid_green.png", "resources/gfx/characters/costumes_apollyon/costume_004_gamekid_green.png"], ["resources/gfx/characters/costumes/costume_004_gamekid_grey.png", "resources/gfx/characters/costumes_apollyon/costume_004_gamekid_grey.png"], ["resources/gfx/characters/costumes/costume_004_gamekid_red.png", "resources/gfx/characters/costumes_apollyon/costume_004_gamekid_red.png"], ["resources/gfx/characters/costumes/costume_004_gamekid_white.png", "resources/gfx/characters/costumes_apollyon/costume_004_gamekid_white.png"], ["resources/gfx/characters/costumes/costume_006_mylittleunicorn.png", "resources/gfx/characters/costumes_apollyon/costume_006_mylittleunicorn.png"], ["resources/gfx/characters/costumes/costume_006_mylittleunicorn_black.png", "resources/gfx/characters/costumes_apollyon/costume_006_mylittleunicorn_black.png"], ["resources/gfx/characters/costumes/costume_006_mylittleunicorn_blue.png", "resources/gfx/characters/costumes_apollyon/costume_006_mylittleunicorn_blue.png"], ["resources/gfx/characters/costumes/costume_006_mylittleunicorn_green.png", "resources/gfx/characters/costumes_apollyon/costume_006_mylittleunicorn_green.png"], ["resources/gfx/characters/costumes/costume_006_mylittleunicorn_grey.png", "resources/gfx/characters/costumes_apollyon/costume_006_mylittleunicorn_grey.png"], ["resources/gfx/characters/costumes/costume_006_mylittleunicorn_red.png", "resources/gfx/characters/costumes_apollyon/costume_006_mylittleunicorn_red.png"], ["resources/gfx/characters/costumes/costume_006_mylittleunicorn_white.png", "resources/gfx/characters/costumes_apollyon/costume_006_mylittleunicorn_white.png"], ["resources/gfx/characters/costumes/costume_011_shoopdawhoop.png", "resources/gfx/characters/costumes_apollyon/costume_011_shoopdawhoop.png"], ["resources/gfx/characters/costumes/costume_011_shoopdawhoop_black.png", "resources/gfx/characters/costumes_apollyon/costume_011_shoopdawhoop_black.png"], ["resources/gfx/characters/costumes/costume_011_shoopdawhoop_blue.png", "resources/gfx/characters/costumes_apollyon/costume_011_shoopdawhoop_blue.png"], ["resources/gfx/characters/costumes/costume_011_shoopdawhoop_green.png", "resources/gfx/characters/costumes_apollyon/costume_011_shoopdawhoop_green.png"], ["resources/gfx/characters/costumes/costume_011_shoopdawhoop_grey.png", "resources/gfx/characters/costumes_apollyon/costume_011_shoopdawhoop_grey.png"], ["resources/gfx/characters/costumes/costume_011_shoopdawhoop_red.png", "resources/gfx/characters/costumes_apollyon/costume_011_shoopdawhoop_red.png"], ["resources/gfx/characters/costumes/costume_011_shoopdawhoop_white.png", "resources/gfx/characters/costumes_apollyon/costume_011_shoopdawhoop_white.png"], ["resources/gfx/characters/costumes/costume_019_brimstone.png", "resources/gfx/characters/costumes_apollyon/costume_019_brimstone.png"], ["resources/gfx/characters/costumes/costume_021_charmofthevampire.png", "resources/gfx/characters/costumes_apollyon/costume_021_charmofthevampire.png"], ["resources/gfx/characters/costumes/costume_021_charmofthevampire_black.png", "resources/gfx/characters/costumes_apollyon/costume_021_charmofthevampire_black.png"], ["resources/gfx/characters/costumes/costume_021_charmofthevampire_blue.png", "resources/gfx/characters/costumes_apollyon/costume_021_charmofthevampire_blue.png"], ["resources/gfx/characters/costumes/costume_021_charmofthevampire_green.png", "resources/gfx/characters/costumes_apollyon/costume_021_charmofthevampire_green.png"], ["resources/gfx/characters/costumes/costume_021_charmofthevampire_grey.png", "resources/gfx/characters/costumes_apollyon/costume_021_charmofthevampire_grey.png"], ["resources/gfx/characters/costumes/costume_021_charmofthevampire_red.png", "resources/gfx/characters/costumes_apollyon/costume_021_charmofthevampire_red.png"], ["resources/gfx/characters/costumes/costume_021_charmofthevampire_white.png", "resources/gfx/characters/costumes_apollyon/costume_021_charmofthevampire_white.png"], ["resources/gfx/characters/costumes/costume_029_theinnereye.png", "resources/gfx/characters/costumes_apollyon/costume_029_theinnereye.png"], ["resources/gfx/characters/costumes/costume_037_maxshead.png", "resources/gfx/characters/costumes_apollyon/costume_037_maxshead.png"], ["resources/gfx/characters/costumes/costume_037_maxshead_black.png", "resources/gfx/characters/costumes_apollyon/costume_037_maxshead_black.png"], ["resources/gfx/characters/costumes/costume_037_maxshead_blue.png", "resources/gfx/characters/costumes_apollyon/costume_037_maxshead_blue.png"], ["resources/gfx/characters/costumes/costume_037_maxshead_green.png", "resources/gfx/characters/costumes_apollyon/costume_037_maxshead_green.png"], ["resources/gfx/characters/costumes/costume_037_maxshead_grey.png", "resources/gfx/characters/costumes_apollyon/costume_037_maxshead_grey.png"], ["resources/gfx/characters/costumes/costume_037_maxshead_red.png", "resources/gfx/characters/costumes_apollyon/costume_037_maxshead_red.png"], ["resources/gfx/characters/costumes/costume_037_maxshead_white.png", "resources/gfx/characters/costumes_apollyon/costume_037_maxshead_white.png"], ["resources/gfx/characters/costumes/costume_040_momseye.png", "resources/gfx/characters/costumes_apollyon/costume_040_momseye.png"], ["resources/gfx/characters/costumes/costume_040_momseye_black.png", "resources/gfx/characters/costumes_apollyon/costume_040_momseye_black.png"], ["resources/gfx/characters/costumes/costume_040_momseye_blue.png", "resources/gfx/characters/costumes_apollyon/costume_040_momseye_blue.png"], ["resources/gfx/characters/costumes/costume_040_momseye_green.png", "resources/gfx/characters/costumes_apollyon/costume_040_momseye_green.png"], ["resources/gfx/characters/costumes/costume_040_momseye_grey.png", "resources/gfx/characters/costumes_apollyon/costume_040_momseye_grey.png"], ["resources/gfx/characters/costumes/costume_040_momseye_red.png", "resources/gfx/characters/costumes_apollyon/costume_040_momseye_red.png"], ["resources/gfx/characters/costumes/costume_040_momseye_white.png", "resources/gfx/characters/costumes_apollyon/costume_040_momseye_white.png"], ["resources/gfx/characters/costumes/costume_046_mrmega.png", "resources/gfx/characters/costumes_apollyon/costume_046_mrmega.png"], ["resources/gfx/characters/costumes/costume_046_mrmega_black.png", "resources/gfx/characters/costumes_apollyon/costume_046_mrmega_black.png"], ["resources/gfx/characters/costumes/costume_046_mrmega_blue.png", "resources/gfx/characters/costumes_apollyon/costume_046_mrmega_blue.png"], ["resources/gfx/characters/costumes/costume_046_mrmega_green.png", "resources/gfx/characters/costumes_apollyon/costume_046_mrmega_green.png"], ["resources/gfx/characters/costumes/costume_046_mrmega_grey.png", "resources/gfx/characters/costumes_apollyon/costume_046_mrmega_grey.png"], ["resources/gfx/characters/costumes/costume_046_mrmega_red.png", "resources/gfx/characters/costumes_apollyon/costume_046_mrmega_red.png"], ["resources/gfx/characters/costumes/costume_046_mrmega_white.png", "resources/gfx/characters/costumes_apollyon/costume_046_mrmega_white.png"], ["resources/gfx/characters/costumes/costume_048_numberone.png", "resources/gfx/characters/costumes_apollyon/costume_048_numberone.png"], ["resources/gfx/characters/costumes/costume_048_numberone_black.png", "resources/gfx/characters/costumes_apollyon/costume_048_numberone_black.png"], ["resources/gfx/characters/costumes/costume_048_numberone_blue.png", "resources/gfx/characters/costumes_apollyon/costume_048_numberone_blue.png"], ["resources/gfx/characters/costumes/costume_048_numberone_green.png", "resources/gfx/characters/costumes_apollyon/costume_048_numberone_green.png"], ["resources/gfx/characters/costumes/costume_048_numberone_grey.png", "resources/gfx/characters/costumes_apollyon/costume_048_numberone_grey.png"], ["resources/gfx/characters/costumes/costume_048_numberone_red.png", "resources/gfx/characters/costumes_apollyon/costume_048_numberone_red.png"], ["resources/gfx/characters/costumes/costume_048_numberone_white.png", "resources/gfx/characters/costumes_apollyon/costume_048_numberone_white.png"], ["resources/gfx/characters/costumes/costume_051_ouijaboard.png", "resources/gfx/characters/costumes_apollyon/costume_051_ouijaboard.png"], ["resources/gfx/characters/costumes/costume_052_thepact.png", "resources/gfx/characters/costumes_apollyon/costume_052_thepact.png"], ["resources/gfx/characters/costumes/costume_056_roidrage.png", "resources/gfx/characters/costumes_apollyon/costume_056_roidrage.png"], ["resources/gfx/characters/costumes/costume_056_roidrage_black.png", "resources/gfx/characters/costumes_apollyon/costume_056_roidrage_black.png"], ["resources/gfx/characters/costumes/costume_056_roidrage_blue.png", "resources/gfx/characters/costumes_apollyon/costume_056_roidrage_blue.png"], ["resources/gfx/characters/costumes/costume_056_roidrage_green.png", "resources/gfx/characters/costumes_apollyon/costume_056_roidrage_green.png"], ["resources/gfx/characters/costumes/costume_056_roidrage_grey.png", "resources/gfx/characters/costumes_apollyon/costume_056_roidrage_grey.png"], ["resources/gfx/characters/costumes/costume_056_roidrage_red.png", "resources/gfx/characters/costumes_apollyon/costume_056_roidrage_red.png"], ["resources/gfx/characters/costumes/costume_056_roidrage_white.png", "resources/gfx/characters/costumes_apollyon/costume_056_roidrage_white.png"], ["resources/gfx/characters/costumes/costume_065_spoonbender.png", "resources/gfx/characters/costumes_apollyon/costume_065_spoonbender.png"], ["resources/gfx/characters/costumes/costume_065_spoonbender_black.png", "resources/gfx/characters/costumes_apollyon/costume_065_spoonbender_black.png"], ["resources/gfx/characters/costumes/costume_065_spoonbender_blue.png", "resources/gfx/characters/costumes_apollyon/costume_065_spoonbender_blue.png"], ["resources/gfx/characters/costumes/costume_065_spoonbender_green.png", "resources/gfx/characters/costumes_apollyon/costume_065_spoonbender_green.png"], ["resources/gfx/characters/costumes/costume_065_spoonbender_grey.png", "resources/gfx/characters/costumes_apollyon/costume_065_spoonbender_grey.png"], ["resources/gfx/characters/costumes/costume_065_spoonbender_red.png", "resources/gfx/characters/costumes_apollyon/costume_065_spoonbender_red.png"], ["resources/gfx/characters/costumes/costume_065_spoonbender_white.png", "resources/gfx/characters/costumes_apollyon/costume_065_spoonbender_white.png"], ["resources/gfx/characters/costumes/costume_067_steven.png", "resources/gfx/characters/costumes_apollyon/costume_067_steven.png"], ["resources/gfx/characters/costumes/costume_067_steven_black.png", "resources/gfx/characters/costumes_apollyon/costume_067_steven_black.png"], ["resources/gfx/characters/costumes/costume_067_steven_blue.png", "resources/gfx/characters/costumes_apollyon/costume_067_steven_blue.png"], ["resources/gfx/characters/costumes/costume_067_steven_green.png", "resources/gfx/characters/costumes_apollyon/costume_067_steven_green.png"], ["resources/gfx/characters/costumes/costume_067_steven_grey.png", "resources/gfx/characters/costumes_apollyon/costume_067_steven_grey.png"], ["resources/gfx/characters/costumes/costume_067_steven_red.png", "resources/gfx/characters/costumes_apollyon/costume_067_steven_red.png"], ["resources/gfx/characters/costumes/costume_067_steven_white.png", "resources/gfx/characters/costumes_apollyon/costume_067_steven_white.png"], ["resources/gfx/characters/costumes/costume_069_technology.png", "resources/gfx/characters/costumes_apollyon/costume_069_technology.png"], ["resources/gfx/characters/costumes/costume_069_technology_black.png", "resources/gfx/characters/costumes_apollyon/costume_069_technology_black.png"], ["resources/gfx/characters/costumes/costume_069_technology_blue.png", "resources/gfx/characters/costumes_apollyon/costume_069_technology_blue.png"], ["resources/gfx/characters/costumes/costume_069_technology_green.png", "resources/gfx/characters/costumes_apollyon/costume_069_technology_green.png"], ["resources/gfx/characters/costumes/costume_069_technology_grey.png", "resources/gfx/characters/costumes_apollyon/costume_069_technology_grey.png"], ["resources/gfx/characters/costumes/costume_069_technology_red.png", "resources/gfx/characters/costumes_apollyon/costume_069_technology_red.png"], ["resources/gfx/characters/costumes/costume_069_technology_white.png", "resources/gfx/characters/costumes_apollyon/costume_069_technology_white.png"], ["resources/gfx/characters/costumes/costume_071_virus.png", "resources/gfx/characters/costumes_apollyon/costume_071_virus.png"], ["resources/gfx/characters/costumes/costume_071_virus_black.png", "resources/gfx/characters/costumes_apollyon/costume_071_virus_black.png"], ["resources/gfx/characters/costumes/costume_071_virus_blue.png", "resources/gfx/characters/costumes_apollyon/costume_071_virus_blue.png"], ["resources/gfx/characters/costumes/costume_071_virus_green.png", "resources/gfx/characters/costumes_apollyon/costume_071_virus_green.png"], ["resources/gfx/characters/costumes/costume_071_virus_grey.png", "resources/gfx/characters/costumes_apollyon/costume_071_virus_grey.png"], ["resources/gfx/characters/costumes/costume_071_virus_red.png", "resources/gfx/characters/costumes_apollyon/costume_071_virus_red.png"], ["resources/gfx/characters/costumes/costume_071_virus_white.png", "resources/gfx/characters/costumes_apollyon/costume_071_virus_white.png"], ["resources/gfx/characters/costumes/costume_073_whoreofbabylon.png", "resources/gfx/characters/costumes_apollyon/costume_073_whoreofbabylon.png"], ["resources/gfx/characters/costumes/costume_078_3dollarbill.png", "resources/gfx/characters/costumes_apollyon/costume_078_3dollarbill.png"], ["resources/gfx/characters/costumes/costume_078_3dollarbill_black.png", "resources/gfx/characters/costumes_apollyon/costume_078_3dollarbill_black.png"], ["resources/gfx/characters/costumes/costume_078_3dollarbill_blue.png", "resources/gfx/characters/costumes_apollyon/costume_078_3dollarbill_blue.png"], ["resources/gfx/characters/costumes/costume_078_3dollarbill_green.png", "resources/gfx/characters/costumes_apollyon/costume_078_3dollarbill_green.png"], ["resources/gfx/characters/costumes/costume_078_3dollarbill_grey.png", "resources/gfx/characters/costumes_apollyon/costume_078_3dollarbill_grey.png"], ["resources/gfx/characters/costumes/costume_078_3dollarbill_red.png", "resources/gfx/characters/costumes_apollyon/costume_078_3dollarbill_red.png"], ["resources/gfx/characters/costumes/costume_078_3dollarbill_white.png", "resources/gfx/characters/costumes_apollyon/costume_078_3dollarbill_white.png"], ["resources/gfx/characters/costumes/costume_082_bobscurse.png", "resources/gfx/characters/costumes_apollyon/costume_082_bobscurse.png"], ["resources/gfx/characters/costumes/costume_087_chemicalpeel.png", "resources/gfx/characters/costumes_apollyon/costume_087_chemicalpeel.png"], ["resources/gfx/characters/costumes/costume_087_chemicalpeel_black.png", "resources/gfx/characters/costumes_apollyon/costume_087_chemicalpeel_black.png"], ["resources/gfx/characters/costumes/costume_087_chemicalpeel_blue.png", "resources/gfx/characters/costumes_apollyon/costume_087_chemicalpeel_blue.png"], ["resources/gfx/characters/costumes/costume_087_chemicalpeel_green.png", "resources/gfx/characters/costumes_apollyon/costume_087_chemicalpeel_green.png"], ["resources/gfx/characters/costumes/costume_087_chemicalpeel_grey.png", "resources/gfx/characters/costumes_apollyon/costume_087_chemicalpeel_grey.png"], ["resources/gfx/characters/costumes/costume_087_chemicalpeel_red.png", "resources/gfx/characters/costumes_apollyon/costume_087_chemicalpeel_red.png"], ["resources/gfx/characters/costumes/costume_087_chemicalpeel_white.png", "resources/gfx/characters/costumes_apollyon/costume_087_chemicalpeel_white.png"], ["resources/gfx/characters/costumes/costume_088_deaddove.png", "resources/gfx/characters/costumes_apollyon/costume_088_deaddove.png"], ["resources/gfx/characters/costumes/costume_095_ipecac.png", "resources/gfx/characters/costumes_apollyon/costume_095_ipecac.png"], ["resources/gfx/characters/costumes/costume_096_jesusjuice.png", "resources/gfx/characters/costumes_apollyon/costume_096_jesusjuice.png"], ["resources/gfx/characters/costumes/costume_098_meat.png", "resources/gfx/characters/costumes_apollyon/costume_098_meat.png"], ["resources/gfx/characters/costumes/costume_102_mulligan.png", "resources/gfx/characters/costumes_apollyon/costume_102_mulligan.png"], ["resources/gfx/characters/costumes/costume_102_mulligan_black.png", "resources/gfx/characters/costumes_apollyon/costume_102_mulligan_black.png"], ["resources/gfx/characters/costumes/costume_102_mulligan_blue.png", "resources/gfx/characters/costumes_apollyon/costume_102_mulligan_blue.png"], ["resources/gfx/characters/costumes/costume_102_mulligan_green.png", "resources/gfx/characters/costumes_apollyon/costume_102_mulligan_green.png"], ["resources/gfx/characters/costumes/costume_102_mulligan_grey.png", "resources/gfx/characters/costumes_apollyon/costume_102_mulligan_grey.png"], ["resources/gfx/characters/costumes/costume_102_mulligan_red.png", "resources/gfx/characters/costumes_apollyon/costume_102_mulligan_red.png"], ["resources/gfx/characters/costumes/costume_102_mulligan_white.png", "resources/gfx/characters/costumes_apollyon/costume_102_mulligan_white.png"], ["resources/gfx/characters/costumes/costume_103_mutantspider.png", "resources/gfx/characters/costumes_apollyon/costume_103_mutantspider.png"], ["resources/gfx/characters/costumes/costume_106_polyphemus.png", "resources/gfx/characters/costumes_apollyon/costume_106_polyphemus.png"], ["resources/gfx/characters/costumes/costume_106_polyphemus_black.png", "resources/gfx/characters/costumes_apollyon/costume_106_polyphemus_black.png"], ["resources/gfx/characters/costumes/costume_106_polyphemus_blue.png", "resources/gfx/characters/costumes_apollyon/costume_106_polyphemus_blue.png"], ["resources/gfx/characters/costumes/costume_106_polyphemus_green.png", "resources/gfx/characters/costumes_apollyon/costume_106_polyphemus_green.png"], ["resources/gfx/characters/costumes/costume_106_polyphemus_grey.png", "resources/gfx/characters/costumes_apollyon/costume_106_polyphemus_grey.png"], ["resources/gfx/characters/costumes/costume_106_polyphemus_red.png", "resources/gfx/characters/costumes_apollyon/costume_106_polyphemus_red.png"], ["resources/gfx/characters/costumes/costume_106_polyphemus_white.png", "resources/gfx/characters/costumes_apollyon/costume_106_polyphemus_white.png"], ["resources/gfx/characters/costumes/costume_108_sacredheart.png", "resources/gfx/characters/costumes_apollyon/costume_108_sacredheart.png"], ["resources/gfx/characters/costumes/costume_110_smbsuperfan.png", "resources/gfx/characters/costumes_apollyon/costume_110_smbsuperfan.png"], ["resources/gfx/characters/costumes/costume_111_speedball.png", "resources/gfx/characters/costumes_apollyon/costume_111_speedball.png"], ["resources/gfx/characters/costumes/costume_111_speedball_black.png", "resources/gfx/characters/costumes_apollyon/costume_111_speedball_black.png"], ["resources/gfx/characters/costumes/costume_111_speedball_blue.png", "resources/gfx/characters/costumes_apollyon/costume_111_speedball_blue.png"], ["resources/gfx/characters/costumes/costume_111_speedball_green.png", "resources/gfx/characters/costumes_apollyon/costume_111_speedball_green.png"], ["resources/gfx/characters/costumes/costume_111_speedball_grey.png", "resources/gfx/characters/costumes_apollyon/costume_111_speedball_grey.png"], ["resources/gfx/characters/costumes/costume_111_speedball_red.png", "resources/gfx/characters/costumes_apollyon/costume_111_speedball_red.png"], ["resources/gfx/characters/costumes/costume_111_speedball_white.png", "resources/gfx/characters/costumes_apollyon/costume_111_speedball_white.png"], ["resources/gfx/characters/costumes/costume_117_toothpicks.png", "resources/gfx/characters/costumes_apollyon/costume_117_toothpicks.png"], ["resources/gfx/characters/costumes/costume_118_toughlove.png", "resources/gfx/characters/costumes_apollyon/costume_118_toughlove.png"], ["resources/gfx/characters/costumes/costume_118_toughlove_black.png", "resources/gfx/characters/costumes_apollyon/costume_118_toughlove_black.png"], ["resources/gfx/characters/costumes/costume_118_toughlove_blue.png", "resources/gfx/characters/costumes_apollyon/costume_118_toughlove_blue.png"], ["resources/gfx/characters/costumes/costume_118_toughlove_green.png", "resources/gfx/characters/costumes_apollyon/costume_118_toughlove_green.png"], ["resources/gfx/characters/costumes/costume_118_toughlove_grey.png", "resources/gfx/characters/costumes_apollyon/costume_118_toughlove_grey.png"], ["resources/gfx/characters/costumes/costume_118_toughlove_red.png", "resources/gfx/characters/costumes_apollyon/costume_118_toughlove_red.png"], ["resources/gfx/characters/costumes/costume_118_toughlove_white.png", "resources/gfx/characters/costumes_apollyon/costume_118_toughlove_white.png"], ["resources/gfx/characters/costumes/costume_148_infestationface.png", "resources/gfx/characters/costumes_apollyon/costume_148_infestationface.png"], ["resources/gfx/characters/costumes/costume_159_spiritofthenight head.png", "resources/gfx/characters/costumes_apollyon/costume_159_spiritofthenight head.png"], ["resources/gfx/characters/costumes/costume_203_humblingbundle.png", "resources/gfx/characters/costumes_apollyon/costume_203_humblingbundle.png"], ["resources/gfx/characters/costumes/costume_203_humblingbundle_black.png", "resources/gfx/characters/costumes_apollyon/costume_203_humblingbundle_black.png"], ["resources/gfx/characters/costumes/costume_203_humblingbundle_blue.png", "resources/gfx/characters/costumes_apollyon/costume_203_humblingbundle_blue.png"], ["resources/gfx/characters/costumes/costume_203_humblingbundle_green.png", "resources/gfx/characters/costumes_apollyon/costume_203_humblingbundle_green.png"], ["resources/gfx/characters/costumes/costume_203_humblingbundle_grey.png", "resources/gfx/characters/costumes_apollyon/costume_203_humblingbundle_grey.png"], ["resources/gfx/characters/costumes/costume_203_humblingbundle_red.png", "resources/gfx/characters/costumes_apollyon/costume_203_humblingbundle_red.png"], ["resources/gfx/characters/costumes/costume_203_humblingbundle_white.png", "resources/gfx/characters/costumes_apollyon/costume_203_humblingbundle_white.png"], ["resources/gfx/characters/costumes/costume_223_pyromaniac.png", "resources/gfx/characters/costumes_apollyon/costume_223_pyromaniac.png"], ["resources/gfx/characters/costumes/costume_224_crickets body.png", "resources/gfx/characters/costumes_apollyon/costume_224_crickets body.png"], ["resources/gfx/characters/costumes/costume_230_abaddon.png", "resources/gfx/characters/costumes_apollyon/costume_230_abaddon.png"], ["resources/gfx/characters/costumes/costume_235_taurus.png", "resources/gfx/characters/costumes_apollyon/costume_235_taurus.png"], ["resources/gfx/characters/costumes/costume_235_taurus_black.png", "resources/gfx/characters/costumes_apollyon/costume_235_taurus_black.png"], ["resources/gfx/characters/costumes/costume_235_taurus_blue.png", "resources/gfx/characters/costumes_apollyon/costume_235_taurus_blue.png"], ["resources/gfx/characters/costumes/costume_235_taurus_green.png", "resources/gfx/characters/costumes_apollyon/costume_235_taurus_green.png"], ["resources/gfx/characters/costumes/costume_235_taurus_grey.png", "resources/gfx/characters/costumes_apollyon/costume_235_taurus_grey.png"], ["resources/gfx/characters/costumes/costume_235_taurus_red.png", "resources/gfx/characters/costumes_apollyon/costume_235_taurus_red.png"], ["resources/gfx/characters/costumes/costume_235_taurus_white.png", "resources/gfx/characters/costumes_apollyon/costume_235_taurus_white.png"], ["resources/gfx/characters/costumes/costume_240_experimentaltreatment.png", "resources/gfx/characters/costumes_apollyon/costume_240_experimentaltreatment.png"], ["resources/gfx/characters/costumes/costume_240_experimentaltreatment_black.png", "resources/gfx/characters/costumes_apollyon/costume_240_experimentaltreatment_black.png"], ["resources/gfx/characters/costumes/costume_240_experimentaltreatment_blue.png", "resources/gfx/characters/costumes_apollyon/costume_240_experimentaltreatment_blue.png"], ["resources/gfx/characters/costumes/costume_240_experimentaltreatment_green.png", "resources/gfx/characters/costumes_apollyon/costume_240_experimentaltreatment_green.png"], ["resources/gfx/characters/costumes/costume_240_experimentaltreatment_grey.png", "resources/gfx/characters/costumes_apollyon/costume_240_experimentaltreatment_grey.png"], ["resources/gfx/characters/costumes/costume_240_experimentaltreatment_red.png", "resources/gfx/characters/costumes_apollyon/costume_240_experimentaltreatment_red.png"], ["resources/gfx/characters/costumes/costume_240_experimentaltreatment_white.png", "resources/gfx/characters/costumes_apollyon/costume_240_experimentaltreatment_white.png"], ["resources/gfx/characters/costumes/costume_304_libra_head.png", "resources/gfx/characters/costumes_apollyon/costume_304_libra_head.png"], ["resources/gfx/characters/costumes/costume_304_libra_head_black.png", "resources/gfx/characters/costumes_apollyon/costume_304_libra_head_black.png"], ["resources/gfx/characters/costumes/costume_304_libra_head_blue.png", "resources/gfx/characters/costumes_apollyon/costume_304_libra_head_blue.png"], ["resources/gfx/characters/costumes/costume_304_libra_head_green.png", "resources/gfx/characters/costumes_apollyon/costume_304_libra_head_green.png"], ["resources/gfx/characters/costumes/costume_304_libra_head_grey.png", "resources/gfx/characters/costumes_apollyon/costume_304_libra_head_grey.png"], ["resources/gfx/characters/costumes/costume_304_libra_head_red.png", "resources/gfx/characters/costumes_apollyon/costume_304_libra_head_red.png"], ["resources/gfx/characters/costumes/costume_304_libra_head_white.png", "resources/gfx/characters/costumes_apollyon/costume_304_libra_head_white.png"], ["resources/gfx/characters/costumes/costume_305_scorpio.png", "resources/gfx/characters/costumes_apollyon/costume_305_scorpio.png"], ["resources/gfx/characters/costumes/costume_305_scorpio_black.png", "resources/gfx/characters/costumes_apollyon/costume_305_scorpio_black.png"], ["resources/gfx/characters/costumes/costume_305_scorpio_blue.png", "resources/gfx/characters/costumes_apollyon/costume_305_scorpio_blue.png"], ["resources/gfx/characters/costumes/costume_305_scorpio_green.png", "resources/gfx/characters/costumes_apollyon/costume_305_scorpio_green.png"], ["resources/gfx/characters/costumes/costume_305_scorpio_grey.png", "resources/gfx/characters/costumes_apollyon/costume_305_scorpio_grey.png"], ["resources/gfx/characters/costumes/costume_305_scorpio_red.png", "resources/gfx/characters/costumes_apollyon/costume_305_scorpio_red.png"], ["resources/gfx/characters/costumes/costume_305_scorpio_white.png", "resources/gfx/characters/costumes_apollyon/costume_305_scorpio_white.png"], ["resources/gfx/characters/costumes/costume_309_pisces_head.png", "resources/gfx/characters/costumes_apollyon/costume_309_pisces_head.png"], ["resources/gfx/characters/costumes/costume_329_theludovicotreatment.png", "resources/gfx/characters/costumes_apollyon/costume_329_theludovicotreatment.png"], ["resources/gfx/characters/costumes/costume_340_caffeinepill_head.png", "resources/gfx/characters/costumes_apollyon/costume_340_caffeinepill_head.png"], ["resources/gfx/characters/costumes/costume_340_caffeinepill_head_black.png", "resources/gfx/characters/costumes_apollyon/costume_340_caffeinepill_head_black.png"], ["resources/gfx/characters/costumes/costume_340_caffeinepill_head_blue.png", "resources/gfx/characters/costumes_apollyon/costume_340_caffeinepill_head_blue.png"], ["resources/gfx/characters/costumes/costume_340_caffeinepill_head_green.png", "resources/gfx/characters/costumes_apollyon/costume_340_caffeinepill_head_green.png"], ["resources/gfx/characters/costumes/costume_340_caffeinepill_head_grey.png", "resources/gfx/characters/costumes_apollyon/costume_340_caffeinepill_head_grey.png"], ["resources/gfx/characters/costumes/costume_340_caffeinepill_head_red.png", "resources/gfx/characters/costumes_apollyon/costume_340_caffeinepill_head_red.png"], ["resources/gfx/characters/costumes/costume_340_caffeinepill_head_white.png", "resources/gfx/characters/costumes_apollyon/costume_340_caffeinepill_head_white.png"], ["resources/gfx/characters/costumes/costume_341_tornphoto.png", "resources/gfx/characters/costumes_apollyon/costume_341_tornphoto.png"], ["resources/gfx/characters/costumes/costume_341_tornphoto_black.png", "resources/gfx/characters/costumes_apollyon/costume_341_tornphoto_black.png"], ["resources/gfx/characters/costumes/costume_341_tornphoto_blue.png", "resources/gfx/characters/costumes_apollyon/costume_341_tornphoto_blue.png"], ["resources/gfx/characters/costumes/costume_341_tornphoto_green.png", "resources/gfx/characters/costumes_apollyon/costume_341_tornphoto_green.png"], ["resources/gfx/characters/costumes/costume_341_tornphoto_grey.png", "resources/gfx/characters/costumes_apollyon/costume_341_tornphoto_grey.png"], ["resources/gfx/characters/costumes/costume_341_tornphoto_red.png", "resources/gfx/characters/costumes_apollyon/costume_341_tornphoto_red.png"], ["resources/gfx/characters/costumes/costume_341_tornphoto_white.png", "resources/gfx/characters/costumes_apollyon/costume_341_tornphoto_white.png"], ["resources/gfx/characters/costumes/costume_342_bluecap.png", "resources/gfx/characters/costumes_apollyon/costume_342_bluecap.png"], ["resources/gfx/characters/costumes/costume_342_bluecap_black.png", "resources/gfx/characters/costumes_apollyon/costume_342_bluecap_black.png"], ["resources/gfx/characters/costumes/costume_342_bluecap_blue.png", "resources/gfx/characters/costumes_apollyon/costume_342_bluecap_blue.png"], ["resources/gfx/characters/costumes/costume_342_bluecap_green.png", "resources/gfx/characters/costumes_apollyon/costume_342_bluecap_green.png"], ["resources/gfx/characters/costumes/costume_342_bluecap_grey.png", "resources/gfx/characters/costumes_apollyon/costume_342_bluecap_grey.png"], ["resources/gfx/characters/costumes/costume_342_bluecap_red.png", "resources/gfx/characters/costumes_apollyon/costume_342_bluecap_red.png"], ["resources/gfx/characters/costumes/costume_342_bluecap_white.png", "resources/gfx/characters/costumes_apollyon/costume_342_bluecap_white.png"], ["resources/gfx/characters/costumes/costume_358_thewiz.png", "resources/gfx/characters/costumes_apollyon/costume_358_thewiz.png"], ["resources/gfx/characters/costumes/costume_358_thewiz_black.png", "resources/gfx/characters/costumes_apollyon/costume_358_thewiz_black.png"], ["resources/gfx/characters/costumes/costume_358_thewiz_blue.png", "resources/gfx/characters/costumes_apollyon/costume_358_thewiz_blue.png"], ["resources/gfx/characters/costumes/costume_358_thewiz_green.png", "resources/gfx/characters/costumes_apollyon/costume_358_thewiz_green.png"], ["resources/gfx/characters/costumes/costume_358_thewiz_grey.png", "resources/gfx/characters/costumes_apollyon/costume_358_thewiz_grey.png"], ["resources/gfx/characters/costumes/costume_358_thewiz_red.png", "resources/gfx/characters/costumes_apollyon/costume_358_thewiz_red.png"], ["resources/gfx/characters/costumes/costume_358_thewiz_white.png", "resources/gfx/characters/costumes_apollyon/costume_358_thewiz_white.png"], ["resources/gfx/characters/costumes/costume_368_epiphora.png", "resources/gfx/characters/costumes_apollyon/costume_368_epiphora.png"], ["resources/gfx/characters/costumes/costume_369_continuum.png", "resources/gfx/characters/costumes_apollyon/costume_369_continuum.png"], ["resources/gfx/characters/costumes/costume_369_continuum_black.png", "resources/gfx/characters/costumes_apollyon/costume_369_continuum_black.png"], ["resources/gfx/characters/costumes/costume_369_continuum_blue.png", "resources/gfx/characters/costumes_apollyon/costume_369_continuum_blue.png"], ["resources/gfx/characters/costumes/costume_369_continuum_green.png", "resources/gfx/characters/costumes_apollyon/costume_369_continuum_green.png"], ["resources/gfx/characters/costumes/costume_369_continuum_grey.png", "resources/gfx/characters/costumes_apollyon/costume_369_continuum_grey.png"], ["resources/gfx/characters/costumes/costume_369_continuum_red.png", "resources/gfx/characters/costumes_apollyon/costume_369_continuum_red.png"], ["resources/gfx/characters/costumes/costume_369_continuum_white.png", "resources/gfx/characters/costumes_apollyon/costume_369_continuum_white.png"], ["resources/gfx/characters/costumes/costume_379_pupuladuplex.png", "resources/gfx/characters/costumes_apollyon/costume_379_pupuladuplex.png"], ["resources/gfx/characters/costumes/costume_393_serpentskiss.png", "resources/gfx/characters/costumes_apollyon/costume_393_serpentskiss.png"], ["resources/gfx/characters/costumes/costume_398_godsflesh.png", "resources/gfx/characters/costumes_apollyon/costume_398_godsflesh.png"], ["resources/gfx/characters/costumes/costume_398_godsflesh_black.png", "resources/gfx/characters/costumes_apollyon/costume_398_godsflesh_black.png"], ["resources/gfx/characters/costumes/costume_398_godsflesh_blue.png", "resources/gfx/characters/costumes_apollyon/costume_398_godsflesh_blue.png"], ["resources/gfx/characters/costumes/costume_398_godsflesh_green.png", "resources/gfx/characters/costumes_apollyon/costume_398_godsflesh_green.png"], ["resources/gfx/characters/costumes/costume_398_godsflesh_grey.png", "resources/gfx/characters/costumes_apollyon/costume_398_godsflesh_grey.png"], ["resources/gfx/characters/costumes/costume_398_godsflesh_red.png", "resources/gfx/characters/costumes_apollyon/costume_398_godsflesh_red.png"], ["resources/gfx/characters/costumes/costume_398_godsflesh_white.png", "resources/gfx/characters/costumes_apollyon/costume_398_godsflesh_white.png"], ["resources/gfx/characters/costumes/costume_402_chaos.png", "resources/gfx/characters/costumes_apollyon/costume_402_chaos.png"], ["resources/gfx/characters/costumes/costume_402_chaos_black.png", "resources/gfx/characters/costumes_apollyon/costume_402_chaos_black.png"], ["resources/gfx/characters/costumes/costume_402_chaos_blue.png", "resources/gfx/characters/costumes_apollyon/costume_402_chaos_blue.png"], ["resources/gfx/characters/costumes/costume_402_chaos_green.png", "resources/gfx/characters/costumes_apollyon/costume_402_chaos_green.png"], ["resources/gfx/characters/costumes/costume_402_chaos_grey.png", "resources/gfx/characters/costumes_apollyon/costume_402_chaos_grey.png"], ["resources/gfx/characters/costumes/costume_402_chaos_red.png", "resources/gfx/characters/costumes_apollyon/costume_402_chaos_red.png"], ["resources/gfx/characters/costumes/costume_402_chaos_white.png", "resources/gfx/characters/costumes_apollyon/costume_402_chaos_white.png"], ["resources/gfx/characters/costumes/costume_418_fruitcake.png", "resources/gfx/characters/costumes_apollyon/costume_418_fruitcake.png"], ["resources/gfx/characters/costumes/costume_418_fruitcake_black.png", "resources/gfx/characters/costumes_apollyon/costume_418_fruitcake_black.png"], ["resources/gfx/characters/costumes/costume_418_fruitcake_blue.png", "resources/gfx/characters/costumes_apollyon/costume_418_fruitcake_blue.png"], ["resources/gfx/characters/costumes/costume_418_fruitcake_green.png", "resources/gfx/characters/costumes_apollyon/costume_418_fruitcake_green.png"], ["resources/gfx/characters/costumes/costume_418_fruitcake_grey.png", "resources/gfx/characters/costumes_apollyon/costume_418_fruitcake_grey.png"], ["resources/gfx/characters/costumes/costume_418_fruitcake_red.png", "resources/gfx/characters/costumes_apollyon/costume_418_fruitcake_red.png"], ["resources/gfx/characters/costumes/costume_418_fruitcake_white.png", "resources/gfx/characters/costumes_apollyon/costume_418_fruitcake_white.png"], ["resources/gfx/characters/costumes/costume_457_conehead.png", "resources/gfx/characters/costumes_apollyon/costume_457_conehead.png"], ["resources/gfx/characters/costumes/costume_457_conehead_black.png", "resources/gfx/characters/costumes_apollyon/costume_457_conehead_black.png"], ["resources/gfx/characters/costumes/costume_457_conehead_blue.png", "resources/gfx/characters/costumes_apollyon/costume_457_conehead_blue.png"], ["resources/gfx/characters/costumes/costume_457_conehead_green.png", "resources/gfx/characters/costumes_apollyon/costume_457_conehead_green.png"], ["resources/gfx/characters/costumes/costume_457_conehead_grey.png", "resources/gfx/characters/costumes_apollyon/costume_457_conehead_grey.png"], ["resources/gfx/characters/costumes/costume_457_conehead_red.png", "resources/gfx/characters/costumes_apollyon/costume_457_conehead_red.png"], ["resources/gfx/characters/costumes/costume_457_conehead_white.png", "resources/gfx/characters/costumes_apollyon/costume_457_conehead_white.png"], ["resources/gfx/characters/costumes/costume_465_analogstick.png", "resources/gfx/characters/costumes_apollyon/costume_465_analogstick.png"], ["resources/gfx/characters/costumes/costume_495_ghostpepper.png", "resources/gfx/characters/costumes_apollyon/costume_495_ghostpepper.png"], ["resources/gfx/characters/costumes/costume_496_euthanasia.png", "resources/gfx/characters/costumes_apollyon/costume_496_euthanasia.png"], ["resources/gfx/characters/costumes/costume_496_euthanasia_black.png", "resources/gfx/characters/costumes_apollyon/costume_496_euthanasia_black.png"], ["resources/gfx/characters/costumes/costume_496_euthanasia_blue.png", "resources/gfx/characters/costumes_apollyon/costume_496_euthanasia_blue.png"], ["resources/gfx/characters/costumes/costume_496_euthanasia_green.png", "resources/gfx/characters/costumes_apollyon/costume_496_euthanasia_green.png"], ["resources/gfx/characters/costumes/costume_496_euthanasia_grey.png", "resources/gfx/characters/costumes_apollyon/costume_496_euthanasia_grey.png"], ["resources/gfx/characters/costumes/costume_496_euthanasia_red.png", "resources/gfx/characters/costumes_apollyon/costume_496_euthanasia_red.png"], ["resources/gfx/characters/costumes/costume_496_euthanasia_white.png", "resources/gfx/characters/costumes_apollyon/costume_496_euthanasia_white.png"], ["resources/gfx/characters/costumes/costume_525_leprosy.png", "resources/gfx/characters/costumes_apollyon/costume_525_leprosy.png"], ["resources/gfx/characters/costumes/costume_525_leprosy_black.png", "resources/gfx/characters/costumes_apollyon/costume_525_leprosy_black.png"], ["resources/gfx/characters/costumes/costume_525_leprosy_blue.png", "resources/gfx/characters/costumes_apollyon/costume_525_leprosy_blue.png"], ["resources/gfx/characters/costumes/costume_525_leprosy_green.png", "resources/gfx/characters/costumes_apollyon/costume_525_leprosy_green.png"], ["resources/gfx/characters/costumes/costume_525_leprosy_grey.png", "resources/gfx/characters/costumes_apollyon/costume_525_leprosy_grey.png"], ["resources/gfx/characters/costumes/costume_525_leprosy_red.png", "resources/gfx/characters/costumes_apollyon/costume_525_leprosy_red.png"], ["resources/gfx/characters/costumes/costume_525_leprosy_white.png", "resources/gfx/characters/costumes_apollyon/costume_525_leprosy_white.png"], ["resources/gfx/characters/costumes/costume_529_pop.png", "resources/gfx/characters/costumes_apollyon/costume_529_pop.png"], ["resources/gfx/characters/costumes/costume_529_pop_black.png", "resources/gfx/characters/costumes_apollyon/costume_529_pop_black.png"], ["resources/gfx/characters/costumes/costume_529_pop_blue.png", "resources/gfx/characters/costumes_apollyon/costume_529_pop_blue.png"], ["resources/gfx/characters/costumes/costume_529_pop_green.png", "resources/gfx/characters/costumes_apollyon/costume_529_pop_green.png"], ["resources/gfx/characters/costumes/costume_529_pop_grey.png", "resources/gfx/characters/costumes_apollyon/costume_529_pop_grey.png"], ["resources/gfx/characters/costumes/costume_529_pop_red.png", "resources/gfx/characters/costumes_apollyon/costume_529_pop_red.png"], ["resources/gfx/characters/costumes/costume_529_pop_white.png", "resources/gfx/characters/costumes_apollyon/costume_529_pop_white.png"], ["resources/gfx/characters/costumes/costume_chocolate milk.png", "resources/gfx/characters/costumes_apollyon/costume_chocolate milk.png"], ["resources/gfx/characters/costumes/costume_chocolate milk_black.png", "resources/gfx/characters/costumes_apollyon/costume_chocolate milk_black.png"], ["resources/gfx/characters/costumes/costume_chocolate milk_blue.png", "resources/gfx/characters/costumes_apollyon/costume_chocolate milk_blue.png"], ["resources/gfx/characters/costumes/costume_chocolate milk_green.png", "resources/gfx/characters/costumes_apollyon/costume_chocolate milk_green.png"], ["resources/gfx/characters/costumes/costume_chocolate milk_grey.png", "resources/gfx/characters/costumes_apollyon/costume_chocolate milk_grey.png"], ["resources/gfx/characters/costumes/costume_chocolate milk_red.png", "resources/gfx/characters/costumes_apollyon/costume_chocolate milk_red.png"], ["resources/gfx/characters/costumes/costume_chocolate milk_white.png", "resources/gfx/characters/costumes_apollyon/costume_chocolate milk_white.png"], ["resources/gfx/characters/costumes/costume_dead onion.png", "resources/gfx/characters/costumes_apollyon/costume_dead onion.png"], ["resources/gfx/characters/costumes/costume_dead onion_black.png", "resources/gfx/characters/costumes_apollyon/costume_dead onion_black.png"], ["resources/gfx/characters/costumes/costume_dead onion_blue.png", "resources/gfx/characters/costumes_apollyon/costume_dead onion_blue.png"], ["resources/gfx/characters/costumes/costume_dead onion_green.png", "resources/gfx/characters/costumes_apollyon/costume_dead onion_green.png"], ["resources/gfx/characters/costumes/costume_dead onion_grey.png", "resources/gfx/characters/costumes_apollyon/costume_dead onion_grey.png"], ["resources/gfx/characters/costumes/costume_dead onion_red.png", "resources/gfx/characters/costumes_apollyon/costume_dead onion_red.png"], ["resources/gfx/characters/costumes/costume_dead onion_white.png", "resources/gfx/characters/costumes_apollyon/costume_dead onion_white.png"], ["resources/gfx/characters/costumes/costume_guppyhead.png", "resources/gfx/characters/costumes_apollyon/costume_guppyhead.png"], ["resources/gfx/characters/costumes/costume_i found pills.png", "resources/gfx/characters/costumes_apollyon/costume_i found pills.png"], ["resources/gfx/characters/costumes/costume_mind head.png", "resources/gfx/characters/costumes_apollyon/costume_mind head.png"], ["resources/gfx/characters/costumes/costume_mind head_black.png", "resources/gfx/characters/costumes_apollyon/costume_mind head_black.png"], ["resources/gfx/characters/costumes/costume_mind head_blue.png", "resources/gfx/characters/costumes_apollyon/costume_mind head_blue.png"], ["resources/gfx/characters/costumes/costume_mind head_green.png", "resources/gfx/characters/costumes_apollyon/costume_mind head_green.png"], ["resources/gfx/characters/costumes/costume_mind head_grey.png", "resources/gfx/characters/costumes_apollyon/costume_mind head_grey.png"], ["resources/gfx/characters/costumes/costume_mind head_red.png", "resources/gfx/characters/costumes_apollyon/costume_mind head_red.png"], ["resources/gfx/characters/costumes/costume_mind head_white.png", "resources/gfx/characters/costumes_apollyon/costume_mind head_white.png"], ["resources/gfx/characters/costumes/costume_monstros lung.png", "resources/gfx/characters/costumes_apollyon/costume_monstros lung.png"], ["resources/gfx/characters/costumes/costume_monstros lung_black.png", "resources/gfx/characters/costumes_apollyon/costume_monstros lung_black.png"], ["resources/gfx/characters/costumes/costume_monstros lung_blue.png", "resources/gfx/characters/costumes_apollyon/costume_monstros lung_blue.png"], ["resources/gfx/characters/costumes/costume_monstros lung_green.png", "resources/gfx/characters/costumes_apollyon/costume_monstros lung_green.png"], ["resources/gfx/characters/costumes/costume_monstros lung_grey.png", "resources/gfx/characters/costumes_apollyon/costume_monstros lung_grey.png"], ["resources/gfx/characters/costumes/costume_monstros lung_red.png", "resources/gfx/characters/costumes_apollyon/costume_monstros lung_red.png"], ["resources/gfx/characters/costumes/costume_monstros lung_white.png", "resources/gfx/characters/costumes_apollyon/costume_monstros lung_white.png"], ["resources/gfx/characters/costumes/emptyvessel head.png", "resources/gfx/characters/costumes_apollyon/emptyvessel head.png"], ["resources/gfx/characters/costumes/ruawizard.png", "resources/gfx/characters/costumes_apollyon/ruawizard.png"], ["resources/gfx/characters/costumes/ruawizard_black.png", "resources/gfx/characters/costumes_apollyon/ruawizard_black.png"], ["resources/gfx/characters/costumes/ruawizard_blue.png", "resources/gfx/characters/costumes_apollyon/ruawizard_blue.png"], ["resources/gfx/characters/costumes/ruawizard_green.png", "resources/gfx/characters/costumes_apollyon/ruawizard_green.png"], ["resources/gfx/characters/costumes/ruawizard_grey.png", "resources/gfx/characters/costumes_apollyon/ruawizard_grey.png"], ["resources/gfx/characters/costumes/ruawizard_red.png", "resources/gfx/characters/costumes_apollyon/ruawizard_red.png"], ["resources/gfx/characters/costumes/ruawizard_white.png", "resources/gfx/characters/costumes_apollyon/ruawizard_white.png"], ["resources/gfx/characters/costumes/transformation_baby.png", "resources/gfx/characters/costumes_apollyon/transformation_baby.png"], ["resources/gfx/characters/costumes/transformation_baby_black.png", "resources/gfx/characters/costumes_apollyon/transformation_baby_black.png"], ["resources/gfx/characters/costumes/transformation_baby_blue.png", "resources/gfx/characters/costumes_apollyon/transformation_baby_blue.png"], ["resources/gfx/characters/costumes/transformation_baby_green.png", "resources/gfx/characters/costumes_apollyon/transformation_baby_green.png"], ["resources/gfx/characters/costumes/transformation_baby_grey.png", "resources/gfx/characters/costumes_apollyon/transformation_baby_grey.png"], ["resources/gfx/characters/costumes/transformation_baby_red.png", "resources/gfx/characters/costumes_apollyon/transformation_baby_red.png"], ["resources/gfx/characters/costumes/transformation_baby_white.png", "resources/gfx/characters/costumes_apollyon/transformation_baby_white.png"], ["resources/gfx/characters/costumes/transformation_drugs_head.png", "resources/gfx/characters/costumes_apollyon/transformation_drugs_head.png"], ["resources/gfx/characters/costumes/transformation_drugs_head_black.png", "resources/gfx/characters/costumes_apollyon/transformation_drugs_head_black.png"], ["resources/gfx/characters/costumes/transformation_drugs_head_blue.png", "resources/gfx/characters/costumes_apollyon/transformation_drugs_head_blue.png"], ["resources/gfx/characters/costumes/transformation_drugs_head_green.png", "resources/gfx/characters/costumes_apollyon/transformation_drugs_head_green.png"], ["resources/gfx/characters/costumes/transformation_drugs_head_grey.png", "resources/gfx/characters/costumes_apollyon/transformation_drugs_head_grey.png"], ["resources/gfx/characters/costumes/transformation_drugs_head_red.png", "resources/gfx/characters/costumes_apollyon/transformation_drugs_head_red.png"], ["resources/gfx/characters/costumes/transformation_drugs_head_white.png", "resources/gfx/characters/costumes_apollyon/transformation_drugs_head_white.png"], ["resources/gfx/characters/costumes/x_overdose.png", "resources/gfx/characters/costumes_apollyon/x_overdose.png"], ["resources/gfx/characters/costumes/x_overdose_black.png", "resources/gfx/characters/costumes_apollyon/x_overdose_black.png"], ["resources/gfx/characters/costumes/x_overdose_blue.png", "resources/gfx/characters/costumes_apollyon/x_overdose_blue.png"], ["resources/gfx/characters/costumes/x_overdose_green.png", "resources/gfx/characters/costumes_apollyon/x_overdose_green.png"], ["resources/gfx/characters/costumes/x_overdose_grey.png", "resources/gfx/characters/costumes_apollyon/x_overdose_grey.png"], ["resources/gfx/characters/costumes/x_overdose_red.png", "resources/gfx/characters/costumes_apollyon/x_overdose_red.png"], ["resources/gfx/characters/costumes/x_overdose_white.png", "resources/gfx/characters/costumes_apollyon/x_overdose_white.png"], ["resources-dlc3/gfx/characters/costumes/costume_001x_2spooky.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_001x_2spooky.png"], ["resources-dlc3/gfx/characters/costumes/costume_005x_eyesore.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_005x_eyesore.png"], ["resources-dlc3/gfx/characters/costumes/costume_005x_eyesore_black.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_005x_eyesore_black.png"], ["resources-dlc3/gfx/characters/costumes/costume_005x_eyesore_blue.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_005x_eyesore_blue.png"], ["resources-dlc3/gfx/characters/costumes/costume_005x_eyesore_green.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_005x_eyesore_green.png"], ["resources-dlc3/gfx/characters/costumes/costume_005x_eyesore_grey.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_005x_eyesore_grey.png"], ["resources-dlc3/gfx/characters/costumes/costume_005x_eyesore_red.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_005x_eyesore_red.png"], ["resources-dlc3/gfx/characters/costumes/costume_005x_eyesore_white.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_005x_eyesore_white.png"], ["resources-dlc3/gfx/characters/costumes/costume_007x_ithurts2.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_007x_ithurts2.png"], ["resources-dlc3/gfx/characters/costumes/costume_007x_ithurts2_black.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_007x_ithurts2_black.png"], ["resources-dlc3/gfx/characters/costumes/costume_007x_ithurts2_blue.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_007x_ithurts2_blue.png"], ["resources-dlc3/gfx/characters/costumes/costume_007x_ithurts2_green.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_007x_ithurts2_green.png"], ["resources-dlc3/gfx/characters/costumes/costume_007x_ithurts2_grey.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_007x_ithurts2_grey.png"], ["resources-dlc3/gfx/characters/costumes/costume_007x_ithurts2_red.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_007x_ithurts2_red.png"], ["resources-dlc3/gfx/characters/costumes/costume_007x_ithurts2_white.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_007x_ithurts2_white.png"], ["resources-dlc3/gfx/characters/costumes/costume_008x_almondmilk.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_008x_almondmilk.png"], ["resources-dlc3/gfx/characters/costumes/costume_008x_almondmilk_black.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_008x_almondmilk_black.png"], ["resources-dlc3/gfx/characters/costumes/costume_008x_almondmilk_blue.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_008x_almondmilk_blue.png"], ["resources-dlc3/gfx/characters/costumes/costume_008x_almondmilk_green.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_008x_almondmilk_green.png"], ["resources-dlc3/gfx/characters/costumes/costume_008x_almondmilk_grey.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_008x_almondmilk_grey.png"], ["resources-dlc3/gfx/characters/costumes/costume_008x_almondmilk_red.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_008x_almondmilk_red.png"], ["resources-dlc3/gfx/characters/costumes/costume_008x_almondmilk_white.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_008x_almondmilk_white.png"], ["resources-dlc3/gfx/characters/costumes/costume_009x_rockbottom.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_009x_rockbottom.png"], ["resources-dlc3/gfx/characters/costumes/costume_009x_rockbottom_black.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_009x_rockbottom_black.png"], ["resources-dlc3/gfx/characters/costumes/costume_009x_rockbottom_blue.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_009x_rockbottom_blue.png"], ["resources-dlc3/gfx/characters/costumes/costume_009x_rockbottom_green.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_009x_rockbottom_green.png"], ["resources-dlc3/gfx/characters/costumes/costume_009x_rockbottom_grey.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_009x_rockbottom_grey.png"], ["resources-dlc3/gfx/characters/costumes/costume_009x_rockbottom_red.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_009x_rockbottom_red.png"], ["resources-dlc3/gfx/characters/costumes/costume_009x_rockbottom_white.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_009x_rockbottom_white.png"], ["resources-dlc3/gfx/characters/costumes/costume_011x_soap.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_011x_soap.png"], ["resources-dlc3/gfx/characters/costumes/costume_011x_soap_black.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_011x_soap_black.png"], ["resources-dlc3/gfx/characters/costumes/costume_011x_soap_blue.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_011x_soap_blue.png"], ["resources-dlc3/gfx/characters/costumes/costume_011x_soap_green.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_011x_soap_green.png"], ["resources-dlc3/gfx/characters/costumes/costume_011x_soap_grey.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_011x_soap_grey.png"], ["resources-dlc3/gfx/characters/costumes/costume_011x_soap_red.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_011x_soap_red.png"], ["resources-dlc3/gfx/characters/costumes/costume_011x_soap_white.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_011x_soap_white.png"], ["resources-dlc3/gfx/characters/costumes/costume_017x_playdohcookie.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_017x_playdohcookie.png"], ["resources-dlc3/gfx/characters/costumes/costume_017x_playdohcookie_black.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_017x_playdohcookie_black.png"], ["resources-dlc3/gfx/characters/costumes/costume_017x_playdohcookie_blue.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_017x_playdohcookie_blue.png"], ["resources-dlc3/gfx/characters/costumes/costume_017x_playdohcookie_green.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_017x_playdohcookie_green.png"], ["resources-dlc3/gfx/characters/costumes/costume_017x_playdohcookie_grey.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_017x_playdohcookie_grey.png"], ["resources-dlc3/gfx/characters/costumes/costume_017x_playdohcookie_red.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_017x_playdohcookie_red.png"], ["resources-dlc3/gfx/characters/costumes/costume_017x_playdohcookie_white.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_017x_playdohcookie_white.png"], ["resources-dlc3/gfx/characters/costumes/costume_029x_wavycap.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_029x_wavycap.png"], ["resources-dlc3/gfx/characters/costumes/costume_029x_wavycap_black.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_029x_wavycap_black.png"], ["resources-dlc3/gfx/characters/costumes/costume_029x_wavycap_blue.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_029x_wavycap_blue.png"], ["resources-dlc3/gfx/characters/costumes/costume_029x_wavycap_green.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_029x_wavycap_green.png"], ["resources-dlc3/gfx/characters/costumes/costume_029x_wavycap_grey.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_029x_wavycap_grey.png"], ["resources-dlc3/gfx/characters/costumes/costume_029x_wavycap_red.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_029x_wavycap_red.png"], ["resources-dlc3/gfx/characters/costumes/costume_029x_wavycap_white.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_029x_wavycap_white.png"], ["resources-dlc3/gfx/characters/costumes/costume_036x_luna.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_036x_luna.png"], ["resources-dlc3/gfx/characters/costumes/costume_036x_luna2.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_036x_luna2.png"], ["resources-dlc3/gfx/characters/costumes/costume_038x_venus.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_038x_venus.png"], ["resources-dlc3/gfx/characters/costumes/costume_038x_venus_black.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_038x_venus_black.png"], ["resources-dlc3/gfx/characters/costumes/costume_038x_venus_blue.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_038x_venus_blue.png"], ["resources-dlc3/gfx/characters/costumes/costume_038x_venus_green.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_038x_venus_green.png"], ["resources-dlc3/gfx/characters/costumes/costume_038x_venus_grey.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_038x_venus_grey.png"], ["resources-dlc3/gfx/characters/costumes/costume_038x_venus_red.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_038x_venus_red.png"], ["resources-dlc3/gfx/characters/costumes/costume_038x_venus_white.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_038x_venus_white.png"], ["resources-dlc3/gfx/characters/costumes/costume_041x_jupiter.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_041x_jupiter.png"], ["resources-dlc3/gfx/characters/costumes/costume_041x_jupiter_black.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_041x_jupiter_black.png"], ["resources-dlc3/gfx/characters/costumes/costume_041x_jupiter_blue.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_041x_jupiter_blue.png"], ["resources-dlc3/gfx/characters/costumes/costume_041x_jupiter_green.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_041x_jupiter_green.png"], ["resources-dlc3/gfx/characters/costumes/costume_041x_jupiter_grey.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_041x_jupiter_grey.png"], ["resources-dlc3/gfx/characters/costumes/costume_041x_jupiter_red.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_041x_jupiter_red.png"], ["resources-dlc3/gfx/characters/costumes/costume_041x_jupiter_white.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_041x_jupiter_white.png"], ["resources-dlc3/gfx/characters/costumes/costume_045x_pluto.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_045x_pluto.png"], ["resources-dlc3/gfx/characters/costumes/costume_045x_pluto_black.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_045x_pluto_black.png"], ["resources-dlc3/gfx/characters/costumes/costume_045x_pluto_blue.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_045x_pluto_blue.png"], ["resources-dlc3/gfx/characters/costumes/costume_045x_pluto_green.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_045x_pluto_green.png"], ["resources-dlc3/gfx/characters/costumes/costume_045x_pluto_grey.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_045x_pluto_grey.png"], ["resources-dlc3/gfx/characters/costumes/costume_045x_pluto_red.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_045x_pluto_red.png"], ["resources-dlc3/gfx/characters/costumes/costume_045x_pluto_white.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_045x_pluto_white.png"], ["resources-dlc3/gfx/characters/costumes/costume_052x_thescooper.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_052x_thescooper.png"], ["resources-dlc3/gfx/characters/costumes/costume_065x_rottentomato.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_065x_rottentomato.png"], ["resources-dlc3/gfx/characters/costumes/costume_065x_rottentomato_black.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_065x_rottentomato_black.png"], ["resources-dlc3/gfx/characters/costumes/costume_065x_rottentomato_blue.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_065x_rottentomato_blue.png"], ["resources-dlc3/gfx/characters/costumes/costume_065x_rottentomato_green.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_065x_rottentomato_green.png"], ["resources-dlc3/gfx/characters/costumes/costume_065x_rottentomato_grey.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_065x_rottentomato_grey.png"], ["resources-dlc3/gfx/characters/costumes/costume_065x_rottentomato_red.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_065x_rottentomato_red.png"], ["resources-dlc3/gfx/characters/costumes/costume_065x_rottentomato_white.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_065x_rottentomato_white.png"], ["resources-dlc3/gfx/characters/costumes/costume_069x_sosig.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_069x_sosig.png"], ["resources-dlc3/gfx/characters/costumes/costume_069x_sosig_black.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_069x_sosig_black.png"], ["resources-dlc3/gfx/characters/costumes/costume_069x_sosig_blue.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_069x_sosig_blue.png"], ["resources-dlc3/gfx/characters/costumes/costume_069x_sosig_green.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_069x_sosig_green.png"], ["resources-dlc3/gfx/characters/costumes/costume_069x_sosig_grey.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_069x_sosig_grey.png"], ["resources-dlc3/gfx/characters/costumes/costume_069x_sosig_red.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_069x_sosig_red.png"], ["resources-dlc3/gfx/characters/costumes/costume_069x_sosig_white.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_069x_sosig_white.png"], ["resources-dlc3/gfx/characters/costumes/costume_084x_knockout.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_084x_knockout.png"], ["resources-dlc3/gfx/characters/costumes/costume_084x_knockout_black.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_084x_knockout_black.png"], ["resources-dlc3/gfx/characters/costumes/costume_084x_knockout_blue.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_084x_knockout_blue.png"], ["resources-dlc3/gfx/characters/costumes/costume_084x_knockout_green.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_084x_knockout_green.png"], ["resources-dlc3/gfx/characters/costumes/costume_084x_knockout_grey.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_084x_knockout_grey.png"], ["resources-dlc3/gfx/characters/costumes/costume_084x_knockout_red.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_084x_knockout_red.png"], ["resources-dlc3/gfx/characters/costumes/costume_084x_knockout_white.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_084x_knockout_white.png"], ["resources-dlc3/gfx/characters/costumes/costume_101x_falsephd.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_101x_falsephd.png"], ["resources-dlc3/gfx/characters/costumes/costume_101x_falsephd_black.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_101x_falsephd_black.png"], ["resources-dlc3/gfx/characters/costumes/costume_101x_falsephd_blue.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_101x_falsephd_blue.png"], ["resources-dlc3/gfx/characters/costumes/costume_101x_falsephd_green.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_101x_falsephd_green.png"], ["resources-dlc3/gfx/characters/costumes/costume_101x_falsephd_grey.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_101x_falsephd_grey.png"], ["resources-dlc3/gfx/characters/costumes/costume_101x_falsephd_red.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_101x_falsephd_red.png"], ["resources-dlc3/gfx/characters/costumes/costume_101x_falsephd_white.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_101x_falsephd_white.png"], ["resources-dlc3/gfx/characters/costumes/costume_105x_giantcell.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_105x_giantcell.png"], ["resources-dlc3/gfx/characters/costumes/costume_105x_giantcell_black.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_105x_giantcell_black.png"], ["resources-dlc3/gfx/characters/costumes/costume_105x_giantcell_blue.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_105x_giantcell_blue.png"], ["resources-dlc3/gfx/characters/costumes/costume_105x_giantcell_green.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_105x_giantcell_green.png"], ["resources-dlc3/gfx/characters/costumes/costume_105x_giantcell_grey.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_105x_giantcell_grey.png"], ["resources-dlc3/gfx/characters/costumes/costume_105x_giantcell_red.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_105x_giantcell_red.png"], ["resources-dlc3/gfx/characters/costumes/costume_105x_giantcell_white.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_105x_giantcell_white.png"], ["resources-dlc3/gfx/characters/costumes/costume_703_esau_jr.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_703_esau_jr.png"], ["resources-dlc3/gfx/characters/costumes/costume_704_berserk.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_704_berserk.png"], ["resources-dlc3/gfx/characters/costumes/costume_704_berserk_black.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_704_berserk_black.png"], ["resources-dlc3/gfx/characters/costumes/costume_704_berserk_blue.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_704_berserk_blue.png"], ["resources-dlc3/gfx/characters/costumes/costume_704_berserk_green.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_704_berserk_green.png"], ["resources-dlc3/gfx/characters/costumes/costume_704_berserk_grey.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_704_berserk_grey.png"], ["resources-dlc3/gfx/characters/costumes/costume_704_berserk_red.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_704_berserk_red.png"], ["resources-dlc3/gfx/characters/costumes/costume_704_berserk_white.png", "resources-dlc3/gfx/characters/costumes_apollyon/costume_704_berserk_white.png"],])], ["bluebaby", new Map([["resources/gfx/characters/costumes/costume_002_bookofbelial.png", "resources/gfx/characters/costumes_bluebaby/costume_002_bookofbelial.png"], ["resources/gfx/characters/costumes/costume_006_mylittleunicorn.png", "resources/gfx/characters/costumes_bluebaby/costume_006_mylittleunicorn.png"], ["resources/gfx/characters/costumes/costume_009_razorblade.png", "resources/gfx/characters/costumes_bluebaby/costume_009_razorblade.png"], ["resources/gfx/characters/costumes/costume_021_charmofthevampire.png", "resources/gfx/characters/costumes_bluebaby/costume_021_charmofthevampire.png"], ["resources/gfx/characters/costumes/costume_029_theinnereye.png", "resources/gfx/characters/costumes_bluebaby/costume_029_theinnereye.png"], ["resources/gfx/characters/costumes/costume_037_maxshead.png", "resources/gfx/characters/costumes_bluebaby/costume_037_maxshead.png"], ["resources/gfx/characters/costumes/costume_040_momseye.png", "resources/gfx/characters/costumes_bluebaby/costume_040_momseye.png"], ["resources/gfx/characters/costumes/costume_043_momslipstick.png", "resources/gfx/characters/costumes_bluebaby/costume_043_momslipstick.png"], ["resources/gfx/characters/costumes/costume_046_mrmega.png", "resources/gfx/characters/costumes_bluebaby/costume_046_mrmega.png"], ["resources/gfx/characters/costumes/costume_048_numberone.png", "resources/gfx/characters/costumes_bluebaby/costume_048_numberone.png"], ["resources/gfx/characters/costumes/costume_051_ouijaboard.png", "resources/gfx/characters/costumes_bluebaby/costume_051_ouijaboard.png"], ["resources/gfx/characters/costumes/costume_056_roidrage.png", "resources/gfx/characters/costumes_bluebaby/costume_056_roidrage.png"], ["resources/gfx/characters/costumes/costume_065_spoonbender.png", "resources/gfx/characters/costumes_bluebaby/costume_065_spoonbender.png"], ["resources/gfx/characters/costumes/costume_067_steven.png", "resources/gfx/characters/costumes_bluebaby/costume_067_steven.png"], ["resources/gfx/characters/costumes/costume_069_technology.png", "resources/gfx/characters/costumes_bluebaby/costume_069_technology.png"], ["resources/gfx/characters/costumes/costume_071_virus.png", "resources/gfx/characters/costumes_bluebaby/costume_071_virus.png"], ["resources/gfx/characters/costumes/costume_078_3dollarbill.png", "resources/gfx/characters/costumes_bluebaby/costume_078_3dollarbill.png"], ["resources/gfx/characters/costumes/costume_087_chemicalpeel.png", "resources/gfx/characters/costumes_bluebaby/costume_087_chemicalpeel.png"], ["resources/gfx/characters/costumes/costume_088_deaddove.png", "resources/gfx/characters/costumes_bluebaby/costume_088_deaddove.png"], ["resources/gfx/characters/costumes/costume_102_mulligan.png", "resources/gfx/characters/costumes_bluebaby/costume_102_mulligan.png"], ["resources/gfx/characters/costumes/costume_103_mutantspider.png", "resources/gfx/characters/costumes_bluebaby/costume_103_mutantspider.png"], ["resources/gfx/characters/costumes/costume_106_polyphemus.png", "resources/gfx/characters/costumes_bluebaby/costume_106_polyphemus.png"], ["resources/gfx/characters/costumes/costume_110_smbsuperfan.png", "resources/gfx/characters/costumes_bluebaby/costume_110_smbsuperfan.png"], ["resources/gfx/characters/costumes/costume_111_speedball.png", "resources/gfx/characters/costumes_bluebaby/costume_111_speedball.png"], ["resources/gfx/characters/costumes/costume_118_toughlove.png", "resources/gfx/characters/costumes_bluebaby/costume_118_toughlove.png"], ["resources/gfx/characters/costumes/costume_203_humblingbundle.png", "resources/gfx/characters/costumes_bluebaby/costume_203_humblingbundle.png"], ["resources/gfx/characters/costumes/costume_222_antigravity.png", "resources/gfx/characters/costumes_bluebaby/costume_222_antigravity.png"], ["resources/gfx/characters/costumes/costume_223_pyromaniac.png", "resources/gfx/characters/costumes_bluebaby/costume_223_pyromaniac.png"], ["resources/gfx/characters/costumes/costume_231_balloftar_head.png", "resources/gfx/characters/costumes_bluebaby/costume_231_balloftar_head.png"], ["resources/gfx/characters/costumes/costume_235_taurus.png", "resources/gfx/characters/costumes_bluebaby/costume_235_taurus.png"], ["resources/gfx/characters/costumes/costume_240_experimentaltreatment.png", "resources/gfx/characters/costumes_bluebaby/costume_240_experimentaltreatment.png"], ["resources/gfx/characters/costumes/costume_304_libra_head.png", "resources/gfx/characters/costumes_bluebaby/costume_304_libra_head.png"], ["resources/gfx/characters/costumes/costume_307_capricorn.png", "resources/gfx/characters/costumes_bluebaby/costume_307_capricorn.png"], ["resources/gfx/characters/costumes/costume_309_pisces_head.png", "resources/gfx/characters/costumes_bluebaby/costume_309_pisces_head.png"], ["resources/gfx/characters/costumes/costume_330_soymilk.png", "resources/gfx/characters/costumes_bluebaby/costume_330_soymilk.png"], ["resources/gfx/characters/costumes/costume_340_caffeinepill_head.png", "resources/gfx/characters/costumes_bluebaby/costume_340_caffeinepill_head.png"], ["resources/gfx/characters/costumes/costume_358_thewiz.png", "resources/gfx/characters/costumes_bluebaby/costume_358_thewiz.png"], ["resources/gfx/characters/costumes/costume_369_continuum.png", "resources/gfx/characters/costumes_bluebaby/costume_369_continuum.png"], ["resources/gfx/characters/costumes/costume_398_godsflesh.png", "resources/gfx/characters/costumes_bluebaby/costume_398_godsflesh.png"], ["resources/gfx/characters/costumes/costume_402_chaos.png", "resources/gfx/characters/costumes_bluebaby/costume_402_chaos.png"], ["resources/gfx/characters/costumes/costume_418_fruitcake.png", "resources/gfx/characters/costumes_bluebaby/costume_418_fruitcake.png"], ["resources/gfx/characters/costumes/costume_457_conehead.png", "resources/gfx/characters/costumes_bluebaby/costume_457_conehead.png"], ["resources/gfx/characters/costumes/costume_496_euthanasia.png", "resources/gfx/characters/costumes_bluebaby/costume_496_euthanasia.png"], ["resources/gfx/characters/costumes/costume_525_leprosy.png", "resources/gfx/characters/costumes_bluebaby/costume_525_leprosy.png"], ["resources/gfx/characters/costumes/costume_529_pop.png", "resources/gfx/characters/costumes_bluebaby/costume_529_pop.png"], ["resources/gfx/characters/costumes/costume_dead onion.png", "resources/gfx/characters/costumes_bluebaby/costume_dead onion.png"], ["resources-dlc3/gfx/characters/costumes/costume_041x_jupiter.png", "resources-dlc3/gfx/characters/costumes_bluebaby/costume_041x_jupiter.png"], ["resources-dlc3/gfx/characters/costumes/costume_703_esau_jr.png", "resources-dlc3/gfx/characters/costumes_bluebaby/costume_703_esau_jr.png"],])], ["forgotten", new Map([["resources/gfx/characters/costumes/costume_000_blank.png", "resources/gfx/characters/costumes_forgotten/costume_000_blank.png"], ["resources/gfx/characters/costumes/costume_002_bookofbelial.png", "resources/gfx/characters/costumes_forgotten/costume_002_bookofbelial.png"], ["resources/gfx/characters/costumes/costume_006_mylittleunicorn.png", "resources/gfx/characters/costumes_forgotten/costume_006_mylittleunicorn.png"], ["resources/gfx/characters/costumes/costume_007_thenail.png", "resources/gfx/characters/costumes_forgotten/costume_007_thenail.png"], ["resources/gfx/characters/costumes/costume_009_razorblade.png", "resources/gfx/characters/costumes_forgotten/costume_009_razorblade.png"], ["resources/gfx/characters/costumes/costume_009_razorblade_body.png", "resources/gfx/characters/costumes_forgotten/costume_009_razorblade_body.png"], ["resources/gfx/characters/costumes/costume_011_shoopdawhoop.png", "resources/gfx/characters/costumes_forgotten/costume_011_shoopdawhoop.png"], ["resources/gfx/characters/costumes/costume_016_blood-bag.png", "resources/gfx/characters/costumes_forgotten/costume_016_blood-bag.png"], ["resources/gfx/characters/costumes/costume_019_brimstone.png", "resources/gfx/characters/costumes_forgotten/costume_019_brimstone.png"], ["resources/gfx/characters/costumes/costume_019_brimstone2.png", "resources/gfx/characters/costumes_forgotten/costume_019_brimstone2.png"], ["resources/gfx/characters/costumes/costume_021_charmofthevampire.png", "resources/gfx/characters/costumes_forgotten/costume_021_charmofthevampire.png"], ["resources/gfx/characters/costumes/costume_023_commoncold.png", "resources/gfx/characters/costumes_forgotten/costume_023_commoncold.png"], ["resources/gfx/characters/costumes/costume_029_theinnereye.png", "resources/gfx/characters/costumes_forgotten/costume_029_theinnereye.png"], ["resources/gfx/characters/costumes/costume_033_lumpofcoal.png", "resources/gfx/characters/costumes_forgotten/costume_033_lumpofcoal.png"], ["resources/gfx/characters/costumes/costume_037_maxshead.png", "resources/gfx/characters/costumes_forgotten/costume_037_maxshead.png"], ["resources/gfx/characters/costumes/costume_040_momseye.png", "resources/gfx/characters/costumes_forgotten/costume_040_momseye.png"], ["resources/gfx/characters/costumes/costume_043_momslipstick.png", "resources/gfx/characters/costumes_forgotten/costume_043_momslipstick.png"], ["resources/gfx/characters/costumes/costume_046_mrmega.png", "resources/gfx/characters/costumes_forgotten/costume_046_mrmega.png"], ["resources/gfx/characters/costumes/costume_048_numberone.png", "resources/gfx/characters/costumes_forgotten/costume_048_numberone.png"], ["resources/gfx/characters/costumes/costume_051_ouijaboard.png", "resources/gfx/characters/costumes_forgotten/costume_051_ouijaboard.png"], ["resources/gfx/characters/costumes/costume_052_thepact.png", "resources/gfx/characters/costumes_forgotten/costume_052_thepact.png"], ["resources/gfx/characters/costumes/costume_056_roidrage.png", "resources/gfx/characters/costumes_forgotten/costume_056_roidrage.png"], ["resources/gfx/characters/costumes/costume_065_spoonbender.png", "resources/gfx/characters/costumes_forgotten/costume_065_spoonbender.png"], ["resources/gfx/characters/costumes/costume_067_steven.png", "resources/gfx/characters/costumes_forgotten/costume_067_steven.png"], ["resources/gfx/characters/costumes/costume_069_technology.png", "resources/gfx/characters/costumes_forgotten/costume_069_technology.png"], ["resources/gfx/characters/costumes/costume_071_virus.png", "resources/gfx/characters/costumes_forgotten/costume_071_virus.png"], ["resources/gfx/characters/costumes/costume_073_whoreofbabylon.png", "resources/gfx/characters/costumes_forgotten/costume_073_whoreofbabylon.png"], ["resources/gfx/characters/costumes/costume_078_3dollarbill.png", "resources/gfx/characters/costumes_forgotten/costume_078_3dollarbill.png"], ["resources/gfx/characters/costumes/costume_082_bobscurse.png", "resources/gfx/characters/costumes_forgotten/costume_082_bobscurse.png"], ["resources/gfx/characters/costumes/costume_082_lordofthepit head.png", "resources/gfx/characters/costumes_forgotten/costume_082_lordofthepit head.png"], ["resources/gfx/characters/costumes/costume_087_chemicalpeel.png", "resources/gfx/characters/costumes_forgotten/costume_087_chemicalpeel.png"], ["resources/gfx/characters/costumes/costume_088_deaddove.png", "resources/gfx/characters/costumes_forgotten/costume_088_deaddove.png"], ["resources/gfx/characters/costumes/costume_095_ipecac.png", "resources/gfx/characters/costumes_forgotten/costume_095_ipecac.png"], ["resources/gfx/characters/costumes/costume_096_jesusjuice.png", "resources/gfx/characters/costumes_forgotten/costume_096_jesusjuice.png"], ["resources/gfx/characters/costumes/costume_098_meat.png", "resources/gfx/characters/costumes_forgotten/costume_098_meat.png"], ["resources/gfx/characters/costumes/costume_102_mulligan.png", "resources/gfx/characters/costumes_forgotten/costume_102_mulligan.png"], ["resources/gfx/characters/costumes/costume_103_mutantspider.png", "resources/gfx/characters/costumes_forgotten/costume_103_mutantspider.png"], ["resources/gfx/characters/costumes/costume_106_polyphemus.png", "resources/gfx/characters/costumes_forgotten/costume_106_polyphemus.png"], ["resources/gfx/characters/costumes/costume_108_sacredheart.png", "resources/gfx/characters/costumes_forgotten/costume_108_sacredheart.png"], ["resources/gfx/characters/costumes/costume_110_smbsuperfan.png", "resources/gfx/characters/costumes_forgotten/costume_110_smbsuperfan.png"], ["resources/gfx/characters/costumes/costume_111_speedball.png", "resources/gfx/characters/costumes_forgotten/costume_111_speedball.png"], ["resources/gfx/characters/costumes/costume_117_toothpicks.png", "resources/gfx/characters/costumes_forgotten/costume_117_toothpicks.png"], ["resources/gfx/characters/costumes/costume_118_toughlove.png", "resources/gfx/characters/costumes_forgotten/costume_118_toughlove.png"], ["resources/gfx/characters/costumes/costume_148_infestationface.png", "resources/gfx/characters/costumes_forgotten/costume_148_infestationface.png"], ["resources/gfx/characters/costumes/costume_159_spiritofthenight head.png", "resources/gfx/characters/costumes_forgotten/costume_159_spiritofthenight head.png"], ["resources/gfx/characters/costumes/costume_203_humblingbundle.png", "resources/gfx/characters/costumes_forgotten/costume_203_humblingbundle.png"], ["resources/gfx/characters/costumes/costume_210_gnawedleaf_statuehead.png", "resources/gfx/characters/costumes_forgotten/costume_210_gnawedleaf_statuehead.png"], ["resources/gfx/characters/costumes/costume_214_anemic.png", "resources/gfx/characters/costumes_forgotten/costume_214_anemic.png"], ["resources/gfx/characters/costumes/costume_218_placenta.png", "resources/gfx/characters/costumes_forgotten/costume_218_placenta.png"], ["resources/gfx/characters/costumes/costume_222_antigravity.png", "resources/gfx/characters/costumes_forgotten/costume_222_antigravity.png"], ["resources/gfx/characters/costumes/costume_223_pyromaniac.png", "resources/gfx/characters/costumes_forgotten/costume_223_pyromaniac.png"], ["resources/gfx/characters/costumes/costume_224_crickets body.png", "resources/gfx/characters/costumes_forgotten/costume_224_crickets body.png"], ["resources/gfx/characters/costumes/costume_230_abaddon.png", "resources/gfx/characters/costumes_forgotten/costume_230_abaddon.png"], ["resources/gfx/characters/costumes/costume_231_balloftar_head.png", "resources/gfx/characters/costumes_forgotten/costume_231_balloftar_head.png"], ["resources/gfx/characters/costumes/costume_234_infestation2.png", "resources/gfx/characters/costumes_forgotten/costume_234_infestation2.png"], ["resources/gfx/characters/costumes/costume_235_taurus.png", "resources/gfx/characters/costumes_forgotten/costume_235_taurus.png"], ["resources/gfx/characters/costumes/costume_240_experimentaltreatment.png", "resources/gfx/characters/costumes_forgotten/costume_240_experimentaltreatment.png"], ["resources/gfx/characters/costumes/costume_304_libra_head.png", "resources/gfx/characters/costumes_forgotten/costume_304_libra_head.png"], ["resources/gfx/characters/costumes/costume_305_scorpio.png", "resources/gfx/characters/costumes_forgotten/costume_305_scorpio.png"], ["resources/gfx/characters/costumes/costume_307_capricorn.png", "resources/gfx/characters/costumes_forgotten/costume_307_capricorn.png"], ["resources/gfx/characters/costumes/costume_309_pisces_head.png", "resources/gfx/characters/costumes_forgotten/costume_309_pisces_head.png"], ["resources/gfx/characters/costumes/costume_329_theludovicotreatment.png", "resources/gfx/characters/costumes_forgotten/costume_329_theludovicotreatment.png"], ["resources/gfx/characters/costumes/costume_330_soymilk.png", "resources/gfx/characters/costumes_forgotten/costume_330_soymilk.png"], ["resources/gfx/characters/costumes/costume_340_caffeinepill_head.png", "resources/gfx/characters/costumes_forgotten/costume_340_caffeinepill_head.png"], ["resources/gfx/characters/costumes/costume_341_tornphoto.png", "resources/gfx/characters/costumes_forgotten/costume_341_tornphoto.png"], ["resources/gfx/characters/costumes/costume_342_bluecap.png", "resources/gfx/characters/costumes_forgotten/costume_342_bluecap.png"], ["resources/gfx/characters/costumes/costume_358_thewiz.png", "resources/gfx/characters/costumes_forgotten/costume_358_thewiz.png"], ["resources/gfx/characters/costumes/costume_359_8inchnail.png", "resources/gfx/characters/costumes_forgotten/costume_359_8inchnail.png"], ["resources/gfx/characters/costumes/costume_368_epiphora.png", "resources/gfx/characters/costumes_forgotten/costume_368_epiphora.png"], ["resources/gfx/characters/costumes/costume_369_continuum.png", "resources/gfx/characters/costumes_forgotten/costume_369_continuum.png"], ["resources/gfx/characters/costumes/costume_379_pupuladuplex.png", "resources/gfx/characters/costumes_forgotten/costume_379_pupuladuplex.png"], ["resources/gfx/characters/costumes/costume_393_serpentskiss.png", "resources/gfx/characters/costumes_forgotten/costume_393_serpentskiss.png"], ["resources/gfx/characters/costumes/costume_398_godsflesh.png", "resources/gfx/characters/costumes_forgotten/costume_398_godsflesh.png"], ["resources/gfx/characters/costumes/costume_399_mawofthevoid.png", "resources/gfx/characters/costumes_forgotten/costume_399_mawofthevoid.png"], ["resources/gfx/characters/costumes/costume_402_chaos.png", "resources/gfx/characters/costumes_forgotten/costume_402_chaos.png"], ["resources/gfx/characters/costumes/costume_418_fruitcake.png", "resources/gfx/characters/costumes_forgotten/costume_418_fruitcake.png"], ["resources/gfx/characters/costumes/costume_424_sackhead.png", "resources/gfx/characters/costumes_forgotten/costume_424_sackhead.png"], ["resources/gfx/characters/costumes/costume_438_binky.png", "resources/gfx/characters/costumes_forgotten/costume_438_binky.png"], ["resources/gfx/characters/costumes/costume_443_apple.png", "resources/gfx/characters/costumes_forgotten/costume_443_apple.png"], ["resources/gfx/characters/costumes/costume_445_dogtooth.png", "resources/gfx/characters/costumes_forgotten/costume_445_dogtooth.png"], ["resources/gfx/characters/costumes/costume_446_deadtooth.png", "resources/gfx/characters/costumes_forgotten/costume_446_deadtooth.png"], ["resources/gfx/characters/costumes/costume_452_varicoseveins_head.png", "resources/gfx/characters/costumes_forgotten/costume_452_varicoseveins_head.png"], ["resources/gfx/characters/costumes/costume_457_conehead.png", "resources/gfx/characters/costumes_forgotten/costume_457_conehead.png"], ["resources/gfx/characters/costumes/costume_460_glaucoma.png", "resources/gfx/characters/costumes_forgotten/costume_460_glaucoma.png"], ["resources/gfx/characters/costumes/costume_461_parasitoid_grey.png", "resources/gfx/characters/costumes_forgotten/costume_461_parasitoid_grey.png"], ["resources/gfx/characters/costumes/costume_495_ghostpepper.png", "resources/gfx/characters/costumes_forgotten/costume_495_ghostpepper.png"], ["resources/gfx/characters/costumes/costume_496_euthanasia.png", "resources/gfx/characters/costumes_forgotten/costume_496_euthanasia.png"], ["resources/gfx/characters/costumes/costume_510_delirious head.png", "resources/gfx/characters/costumes_forgotten/costume_510_delirious head.png"], ["resources/gfx/characters/costumes/costume_513_bozo.png", "resources/gfx/characters/costumes_forgotten/costume_513_bozo.png"], ["resources/gfx/characters/costumes/costume_525_leprosy.png", "resources/gfx/characters/costumes_forgotten/costume_525_leprosy.png"], ["resources/gfx/characters/costumes/costume_529_pop.png", "resources/gfx/characters/costumes_forgotten/costume_529_pop.png"], ["resources/gfx/characters/costumes/costume_531_haemolacria.png", "resources/gfx/characters/costumes_forgotten/costume_531_haemolacria.png"], ["resources/gfx/characters/costumes/costume_533_trisagion.png", "resources/gfx/characters/costumes_forgotten/costume_533_trisagion.png"], ["resources/gfx/characters/costumes/costume_540_flatstone.png", "resources/gfx/characters/costumes_forgotten/costume_540_flatstone.png"], ["resources/gfx/characters/costumes/costume_541_marrow.png", "resources/gfx/characters/costumes_forgotten/costume_541_marrow.png"], ["resources/gfx/characters/costumes/costume_chocolate milk.png", "resources/gfx/characters/costumes_forgotten/costume_chocolate milk.png"], ["resources/gfx/characters/costumes/costume_dead onion.png", "resources/gfx/characters/costumes_forgotten/costume_dead onion.png"], ["resources/gfx/characters/costumes/costume_guppyhead.png", "resources/gfx/characters/costumes_forgotten/costume_guppyhead.png"], ["resources/gfx/characters/costumes/costume_i found pills.png", "resources/gfx/characters/costumes_forgotten/costume_i found pills.png"], ["resources/gfx/characters/costumes/costume_mind head.png", "resources/gfx/characters/costumes_forgotten/costume_mind head.png"], ["resources/gfx/characters/costumes/costume_monstros lung.png", "resources/gfx/characters/costumes_forgotten/costume_monstros lung.png"], ["resources/gfx/characters/costumes/costume_rebirth_69_lordoftheflieshead.png", "resources/gfx/characters/costumes_forgotten/costume_rebirth_69_lordoftheflieshead.png"], ["resources/gfx/characters/costumes/emptyvessel head.png", "resources/gfx/characters/costumes_forgotten/emptyvessel head.png"], ["resources/gfx/characters/costumes/ghost.png", "resources/gfx/characters/costumes_forgotten/ghost.png"], ["resources/gfx/characters/costumes/ruawizard.png", "resources/gfx/characters/costumes_forgotten/ruawizard.png"], ["resources/gfx/characters/costumes/transformation_angel_head.png", "resources/gfx/characters/costumes_forgotten/transformation_angel_head.png"], ["resources/gfx/characters/costumes/transformation_baby.png", "resources/gfx/characters/costumes_forgotten/transformation_baby.png"], ["resources/gfx/characters/costumes/transformation_bob_head.png", "resources/gfx/characters/costumes_forgotten/transformation_bob_head.png"], ["resources/gfx/characters/costumes/transformation_drugs_head.png", "resources/gfx/characters/costumes_forgotten/transformation_drugs_head.png"], ["resources/gfx/characters/costumes/transformation_evilangel_body.png", "resources/gfx/characters/costumes_forgotten/transformation_evilangel_body.png"], ["resources/gfx/characters/costumes/transformation_evilangel_head.png", "resources/gfx/characters/costumes_forgotten/transformation_evilangel_head.png"], ["resources/gfx/characters/costumes/transformation_mushroom_head.png", "resources/gfx/characters/costumes_forgotten/transformation_mushroom_head.png"], ["resources/gfx/characters/costumes/transformation_poop_head.png", "resources/gfx/characters/costumes_forgotten/transformation_poop_head.png"], ["resources/gfx/characters/costumes/transformation_spider.png", "resources/gfx/characters/costumes_forgotten/transformation_spider.png"], ["resources/gfx/characters/costumes/x_overdose.png", "resources/gfx/characters/costumes_forgotten/x_overdose.png"], ["resources-dlc3/gfx/characters/costumes/costume_011x_soap.png", "resources-dlc3/gfx/characters/costumes_forgotten/costume_011x_soap.png"], ["resources-dlc3/gfx/characters/costumes/costume_022x_intruder.png", "resources-dlc3/gfx/characters/costumes_forgotten/costume_022x_intruder.png"], ["resources-dlc3/gfx/characters/costumes/costume_040x_mars.png", "resources-dlc3/gfx/characters/costumes_forgotten/costume_040x_mars.png"], ["resources-dlc3/gfx/characters/costumes/costume_046x_voodoohead.png", "resources-dlc3/gfx/characters/costumes_forgotten/costume_046x_voodoohead.png"], ["resources-dlc3/gfx/characters/costumes/costume_068x_redstew.png", "resources-dlc3/gfx/characters/costumes_forgotten/costume_068x_redstew.png"], ["resources-dlc3/gfx/characters/costumes/costume_084x_knockout.png", "resources-dlc3/gfx/characters/costumes_forgotten/costume_084x_knockout.png"], ["resources-dlc3/gfx/characters/costumes/costume_101x_falsephd.png", "resources-dlc3/gfx/characters/costumes_forgotten/costume_101x_falsephd.png"], ["resources-dlc3/gfx/characters/costumes/costume_105x_giantcell.png", "resources-dlc3/gfx/characters/costumes_forgotten/costume_105x_giantcell.png"], ["resources-dlc3/gfx/characters/costumes/costume_703_esau_jr.png", "resources-dlc3/gfx/characters/costumes_forgotten/costume_703_esau_jr.png"], ["resources-dlc3/gfx/characters/costumes/fetus_tears.png", "resources-dlc3/gfx/characters/costumes_forgotten/fetus_tears.png"],])], ["forgottensoul", new Map([["resources/gfx/characters/costumes/ghost.png", "resources/gfx/characters/costumes_forgottensoul/ghost.png"],])], ["keeper", new Map([["resources/gfx/characters/costumes/costume_002_bookofbelial.png", "resources/gfx/characters/costumes_keeper/costume_002_bookofbelial.png"], ["resources/gfx/characters/costumes/costume_004_gamekid.png", "resources/gfx/characters/costumes_keeper/costume_004_gamekid.png"], ["resources/gfx/characters/costumes/costume_006_mylittleunicorn.png", "resources/gfx/characters/costumes_keeper/costume_006_mylittleunicorn.png"], ["resources/gfx/characters/costumes/costume_007_thenail.png", "resources/gfx/characters/costumes_keeper/costume_007_thenail.png"], ["resources/gfx/characters/costumes/costume_009_razorblade.png", "resources/gfx/characters/costumes_keeper/costume_009_razorblade.png"], ["resources/gfx/characters/costumes/costume_013_9volt.png", "resources/gfx/characters/costumes_keeper/costume_013_9volt.png"], ["resources/gfx/characters/costumes/costume_016_blood-bag.png", "resources/gfx/characters/costumes_keeper/costume_016_blood-bag.png"], ["resources/gfx/characters/costumes/costume_019_brimstone.png", "resources/gfx/characters/costumes_keeper/costume_019_brimstone.png"], ["resources/gfx/characters/costumes/costume_019_brimstone2.png", "resources/gfx/characters/costumes_keeper/costume_019_brimstone2.png"], ["resources/gfx/characters/costumes/costume_021_charmofthevampire.png", "resources/gfx/characters/costumes_keeper/costume_021_charmofthevampire.png"], ["resources/gfx/characters/costumes/costume_023_commoncold.png", "resources/gfx/characters/costumes_keeper/costume_023_commoncold.png"], ["resources/gfx/characters/costumes/costume_025_cupidsarrow.png", "resources/gfx/characters/costumes_keeper/costume_025_cupidsarrow.png"], ["resources/gfx/characters/costumes/costume_026_dead bird.png", "resources/gfx/characters/costumes_keeper/costume_026_dead bird.png"], ["resources/gfx/characters/costumes/costume_028_growthhormones.png", "resources/gfx/characters/costumes_keeper/costume_028_growthhormones.png"], ["resources/gfx/characters/costumes/costume_029_theinnereye.png", "resources/gfx/characters/costumes_keeper/costume_029_theinnereye.png"], ["resources/gfx/characters/costumes/costume_033_lumpofcoal.png", "resources/gfx/characters/costumes_keeper/costume_033_lumpofcoal.png"], ["resources/gfx/characters/costumes/costume_036_themark.png", "resources/gfx/characters/costumes_keeper/costume_036_themark.png"], ["resources/gfx/characters/costumes/costume_037_maxshead.png", "resources/gfx/characters/costumes_keeper/costume_037_maxshead.png"], ["resources/gfx/characters/costumes/costume_039_momscontact.png", "resources/gfx/characters/costumes_keeper/costume_039_momscontact.png"], ["resources/gfx/characters/costumes/costume_040_momseye.png", "resources/gfx/characters/costumes_keeper/costume_040_momseye.png"], ["resources/gfx/characters/costumes/costume_043_momslipstick.png", "resources/gfx/characters/costumes_keeper/costume_043_momslipstick.png"], ["resources/gfx/characters/costumes/costume_045_moneyispower.png", "resources/gfx/characters/costumes_keeper/costume_045_moneyispower.png"], ["resources/gfx/characters/costumes/costume_046_mrmega.png", "resources/gfx/characters/costumes_keeper/costume_046_mrmega.png"], ["resources/gfx/characters/costumes/costume_047_myreflection.png", "resources/gfx/characters/costumes_keeper/costume_047_myreflection.png"], ["resources/gfx/characters/costumes/costume_048_numberone.png", "resources/gfx/characters/costumes_keeper/costume_048_numberone.png"], ["resources/gfx/characters/costumes/costume_051_ouijaboard.png", "resources/gfx/characters/costumes_keeper/costume_051_ouijaboard.png"], ["resources/gfx/characters/costumes/costume_054_pentagram.png", "resources/gfx/characters/costumes_keeper/costume_054_pentagram.png"], ["resources/gfx/characters/costumes/costume_055_phd.png", "resources/gfx/characters/costumes_keeper/costume_055_phd.png"], ["resources/gfx/characters/costumes/costume_056_roidrage.png", "resources/gfx/characters/costumes_keeper/costume_056_roidrage.png"], ["resources/gfx/characters/costumes/costume_058_sadonion.png", "resources/gfx/characters/costumes_keeper/costume_058_sadonion.png"], ["resources/gfx/characters/costumes/costume_061_skeletonkey.png", "resources/gfx/characters/costumes_keeper/costume_061_skeletonkey.png"], ["resources/gfx/characters/costumes/costume_062_smallrock.png", "resources/gfx/characters/costumes_keeper/costume_062_smallrock.png"], ["resources/gfx/characters/costumes/costume_065_spoonbender.png", "resources/gfx/characters/costumes_keeper/costume_065_spoonbender.png"], ["resources/gfx/characters/costumes/costume_067_steven.png", "resources/gfx/characters/costumes_keeper/costume_067_steven.png"], ["resources/gfx/characters/costumes/costume_068_superbandage.png", "resources/gfx/characters/costumes_keeper/costume_068_superbandage.png"], ["resources/gfx/characters/costumes/costume_069_technology.png", "resources/gfx/characters/costumes_keeper/costume_069_technology.png"], ["resources/gfx/characters/costumes/costume_071_virus.png", "resources/gfx/characters/costumes_keeper/costume_071_virus.png"], ["resources/gfx/characters/costumes/costume_073_whoreofbabylon.png", "resources/gfx/characters/costumes_keeper/costume_073_whoreofbabylon.png"], ["resources/gfx/characters/costumes/costume_076_woodenspoon.png", "resources/gfx/characters/costumes_keeper/costume_076_woodenspoon.png"], ["resources/gfx/characters/costumes/costume_077_xrayvision.png", "resources/gfx/characters/costumes_keeper/costume_077_xrayvision.png"], ["resources/gfx/characters/costumes/costume_078_3dollarbill.png", "resources/gfx/characters/costumes_keeper/costume_078_3dollarbill.png"], ["resources/gfx/characters/costumes/costume_082_bobscurse.png", "resources/gfx/characters/costumes_keeper/costume_082_bobscurse.png"], ["resources/gfx/characters/costumes/costume_082_lordofthepit head.png", "resources/gfx/characters/costumes_keeper/costume_082_lordofthepit head.png"], ["resources/gfx/characters/costumes/costume_085_catoninetails.png", "resources/gfx/characters/costumes_keeper/costume_085_catoninetails.png"], ["resources/gfx/characters/costumes/costume_087_chemicalpeel.png", "resources/gfx/characters/costumes_keeper/costume_087_chemicalpeel.png"], ["resources/gfx/characters/costumes/costume_088_deaddove.png", "resources/gfx/characters/costumes_keeper/costume_088_deaddove.png"], ["resources/gfx/characters/costumes/costume_095_ipecac.png", "resources/gfx/characters/costumes_keeper/costume_095_ipecac.png"], ["resources/gfx/characters/costumes/costume_096_jesusjuice.png", "resources/gfx/characters/costumes_keeper/costume_096_jesusjuice.png"], ["resources/gfx/characters/costumes/costume_098_meat.png", "resources/gfx/characters/costumes_keeper/costume_098_meat.png"], ["resources/gfx/characters/costumes/costume_102_mulligan.png", "resources/gfx/characters/costumes_keeper/costume_102_mulligan.png"], ["resources/gfx/characters/costumes/costume_103_mutantspider.png", "resources/gfx/characters/costumes_keeper/costume_103_mutantspider.png"], ["resources/gfx/characters/costumes/costume_104_pageantboy.png", "resources/gfx/characters/costumes_keeper/costume_104_pageantboy.png"], ["resources/gfx/characters/costumes/costume_105_thepeeper.png", "resources/gfx/characters/costumes_keeper/costume_105_thepeeper.png"], ["resources/gfx/characters/costumes/costume_106_polyphemus.png", "resources/gfx/characters/costumes_keeper/costume_106_polyphemus.png"], ["resources/gfx/characters/costumes/costume_108_sacredheart.png", "resources/gfx/characters/costumes_keeper/costume_108_sacredheart.png"], ["resources/gfx/characters/costumes/costume_110_smbsuperfan.png", "resources/gfx/characters/costumes_keeper/costume_110_smbsuperfan.png"], ["resources/gfx/characters/costumes/costume_111_speedball.png", "resources/gfx/characters/costumes_keeper/costume_111_speedball.png"], ["resources/gfx/characters/costumes/costume_111_speedball_grey.png", "resources/gfx/characters/costumes_keeper/costume_111_speedball_grey.png"], ["resources/gfx/characters/costumes/costume_113_squeezy.png", "resources/gfx/characters/costumes_keeper/costume_113_squeezy.png"], ["resources/gfx/characters/costumes/costume_114_stemcells.png", "resources/gfx/characters/costumes_keeper/costume_114_stemcells.png"], ["resources/gfx/characters/costumes/costume_115_stigmata.png", "resources/gfx/characters/costumes_keeper/costume_115_stigmata.png"], ["resources/gfx/characters/costumes/costume_116_technology2.png", "resources/gfx/characters/costumes_keeper/costume_116_technology2.png"], ["resources/gfx/characters/costumes/costume_117_toothpicks.png", "resources/gfx/characters/costumes_keeper/costume_117_toothpicks.png"], ["resources/gfx/characters/costumes/costume_118_toughlove.png", "resources/gfx/characters/costumes_keeper/costume_118_toughlove.png"], ["resources/gfx/characters/costumes/costume_148_infestationface.png", "resources/gfx/characters/costumes_keeper/costume_148_infestationface.png"], ["resources/gfx/characters/costumes/costume_159_spiritofthenight head.png", "resources/gfx/characters/costumes_keeper/costume_159_spiritofthenight head.png"], ["resources/gfx/characters/costumes/costume_200_momseyeshadow.png", "resources/gfx/characters/costumes_keeper/costume_200_momseyeshadow.png"], ["resources/gfx/characters/costumes/costume_201_ironbar.png", "resources/gfx/characters/costumes_keeper/costume_201_ironbar.png"], ["resources/gfx/characters/costumes/costume_203_humblingbundle.png", "resources/gfx/characters/costumes_keeper/costume_203_humblingbundle.png"], ["resources/gfx/characters/costumes/costume_205_sharpplug.png", "resources/gfx/characters/costumes_keeper/costume_205_sharpplug.png"], ["resources/gfx/characters/costumes/costume_210_gnawedleaf_statuehead.png", "resources/gfx/characters/costumes_keeper/costume_210_gnawedleaf_statuehead.png"], ["resources/gfx/characters/costumes/costume_213_lostcontact.png", "resources/gfx/characters/costumes_keeper/costume_213_lostcontact.png"], ["resources/gfx/characters/costumes/costume_214_anemic.png", "resources/gfx/characters/costumes_keeper/costume_214_anemic.png"], ["resources/gfx/characters/costumes/costume_216_ceremonialrobes_head.png", "resources/gfx/characters/costumes_keeper/costume_216_ceremonialrobes_head.png"], ["resources/gfx/characters/costumes/costume_218_placenta.png", "resources/gfx/characters/costumes_keeper/costume_218_placenta.png"], ["resources/gfx/characters/costumes/costume_219_oldbandage.png", "resources/gfx/characters/costumes_keeper/costume_219_oldbandage.png"], ["resources/gfx/characters/costumes/costume_221_rubbercement.png", "resources/gfx/characters/costumes_keeper/costume_221_rubbercement.png"], ["resources/gfx/characters/costumes/costume_222_antigravity.png", "resources/gfx/characters/costumes_keeper/costume_222_antigravity.png"], ["resources/gfx/characters/costumes/costume_223_pyromaniac.png", "resources/gfx/characters/costumes_keeper/costume_223_pyromaniac.png"], ["resources/gfx/characters/costumes/costume_224_crickets body.png", "resources/gfx/characters/costumes_keeper/costume_224_crickets body.png"], ["resources/gfx/characters/costumes/costume_225_gimpy.png", "resources/gfx/characters/costumes_keeper/costume_225_gimpy.png"], ["resources/gfx/characters/costumes/costume_230_abaddon.png", "resources/gfx/characters/costumes_keeper/costume_230_abaddon.png"], ["resources/gfx/characters/costumes/costume_231_balloftar_head.png", "resources/gfx/characters/costumes_keeper/costume_231_balloftar_head.png"], ["resources/gfx/characters/costumes/costume_233_tiny planet.png", "resources/gfx/characters/costumes_keeper/costume_233_tiny planet.png"], ["resources/gfx/characters/costumes/costume_234_infestation2.png", "resources/gfx/characters/costumes_keeper/costume_234_infestation2.png"], ["resources/gfx/characters/costumes/costume_235_taurus.png", "resources/gfx/characters/costumes_keeper/costume_235_taurus.png"], ["resources/gfx/characters/costumes/costume_236_ecoli.png", "resources/gfx/characters/costumes_keeper/costume_236_ecoli.png"], ["resources/gfx/characters/costumes/costume_237_deathstouch.png", "resources/gfx/characters/costumes_keeper/costume_237_deathstouch.png"], ["resources/gfx/characters/costumes/costume_240_experimentaltreatment.png", "resources/gfx/characters/costumes_keeper/costume_240_experimentaltreatment.png"], ["resources/gfx/characters/costumes/costume_241_contractfrombelow.png", "resources/gfx/characters/costumes_keeper/costume_241_contractfrombelow.png"], ["resources/gfx/characters/costumes/costume_244_tech05.png", "resources/gfx/characters/costumes_keeper/costume_244_tech05.png"], ["resources/gfx/characters/costumes/costume_245_2020.png", "resources/gfx/characters/costumes_keeper/costume_245_2020.png"], ["resources/gfx/characters/costumes/costume_247_bffs.png", "resources/gfx/characters/costumes_keeper/costume_247_bffs.png"], ["resources/gfx/characters/costumes/costume_248_hivemind.png", "resources/gfx/characters/costumes_keeper/costume_248_hivemind.png"], ["resources/gfx/characters/costumes/costume_249_theresoptions.png", "resources/gfx/characters/costumes_keeper/costume_249_theresoptions.png"], ["resources/gfx/characters/costumes/costume_254_bloodclot.png", "resources/gfx/characters/costumes_keeper/costume_254_bloodclot.png"], ["resources/gfx/characters/costumes/costume_258_missingno.png", "resources/gfx/characters/costumes_keeper/costume_258_missingno.png"], ["resources/gfx/characters/costumes/costume_259_darkmatter.png", "resources/gfx/characters/costumes_keeper/costume_259_darkmatter.png"], ["resources/gfx/characters/costumes/costume_261_proptosis.png", "resources/gfx/characters/costumes_keeper/costume_261_proptosis.png"], ["resources/gfx/characters/costumes/costume_267_robobaby20.png", "resources/gfx/characters/costumes_keeper/costume_267_robobaby20.png"], ["resources/gfx/characters/costumes/costume_304_libra_head.png", "resources/gfx/characters/costumes_keeper/costume_304_libra_head.png"], ["resources/gfx/characters/costumes/costume_305_scorpio.png", "resources/gfx/characters/costumes_keeper/costume_305_scorpio.png"], ["resources/gfx/characters/costumes/costume_307_capricorn.png", "resources/gfx/characters/costumes_keeper/costume_307_capricorn.png"], ["resources/gfx/characters/costumes/costume_309_pisces_head.png", "resources/gfx/characters/costumes_keeper/costume_309_pisces_head.png"], ["resources/gfx/characters/costumes/costume_310_evesmascara.png", "resources/gfx/characters/costumes_keeper/costume_310_evesmascara.png"], ["resources/gfx/characters/costumes/costume_315_strangeattractor.png", "resources/gfx/characters/costumes_keeper/costume_315_strangeattractor.png"], ["resources/gfx/characters/costumes/costume_316_cursedeye.png", "resources/gfx/characters/costumes_keeper/costume_316_cursedeye.png"], ["resources/gfx/characters/costumes/costume_329_theludovicotreatment.png", "resources/gfx/characters/costumes_keeper/costume_329_theludovicotreatment.png"], ["resources/gfx/characters/costumes/costume_330_soymilk.png", "resources/gfx/characters/costumes_keeper/costume_330_soymilk.png"], ["resources/gfx/characters/costumes/costume_340_caffeinepill_head.png", "resources/gfx/characters/costumes_keeper/costume_340_caffeinepill_head.png"], ["resources/gfx/characters/costumes/costume_341_tornphoto.png", "resources/gfx/characters/costumes_keeper/costume_341_tornphoto.png"], ["resources/gfx/characters/costumes/costume_342_bluecap.png", "resources/gfx/characters/costumes_keeper/costume_342_bluecap.png"], ["resources/gfx/characters/costumes/costume_358_thewiz.png", "resources/gfx/characters/costumes_keeper/costume_358_thewiz.png"], ["resources/gfx/characters/costumes/costume_359_8inchnail.png", "resources/gfx/characters/costumes_keeper/costume_359_8inchnail.png"], ["resources/gfx/characters/costumes/costume_368_epiphora.png", "resources/gfx/characters/costumes_keeper/costume_368_epiphora.png"], ["resources/gfx/characters/costumes/costume_369_continuum.png", "resources/gfx/characters/costumes_keeper/costume_369_continuum.png"], ["resources/gfx/characters/costumes/costume_373_deadeye.png", "resources/gfx/characters/costumes_keeper/costume_373_deadeye.png"], ["resources/gfx/characters/costumes/costume_374_holylight.png", "resources/gfx/characters/costumes_keeper/costume_374_holylight.png"], ["resources/gfx/characters/costumes/costume_379_pupuladuplex.png", "resources/gfx/characters/costumes_keeper/costume_379_pupuladuplex.png"], ["resources/gfx/characters/costumes/costume_380_paytoplay.png", "resources/gfx/characters/costumes_keeper/costume_380_paytoplay.png"], ["resources/gfx/characters/costumes/costume_381_edensblessing.png", "resources/gfx/characters/costumes_keeper/costume_381_edensblessing.png"], ["resources/gfx/characters/costumes/costume_392_zodiac.png", "resources/gfx/characters/costumes_keeper/costume_392_zodiac.png"], ["resources/gfx/characters/costumes/costume_393_serpentskiss.png", "resources/gfx/characters/costumes_keeper/costume_393_serpentskiss.png"], ["resources/gfx/characters/costumes/costume_394_marked.png", "resources/gfx/characters/costumes_keeper/costume_394_marked.png"], ["resources/gfx/characters/costumes/costume_395_techx.png", "resources/gfx/characters/costumes_keeper/costume_395_techx.png"], ["resources/gfx/characters/costumes/costume_397_tractorbeam.png", "resources/gfx/characters/costumes_keeper/costume_397_tractorbeam.png"], ["resources/gfx/characters/costumes/costume_398_godsflesh.png", "resources/gfx/characters/costumes_keeper/costume_398_godsflesh.png"], ["resources/gfx/characters/costumes/costume_399_mawofthevoid.png", "resources/gfx/characters/costumes_keeper/costume_399_mawofthevoid.png"], ["resources/gfx/characters/costumes/costume_402_chaos.png", "resources/gfx/characters/costumes_keeper/costume_402_chaos.png"], ["resources/gfx/characters/costumes/costume_410_evileye.png", "resources/gfx/characters/costumes_keeper/costume_410_evileye.png"], ["resources/gfx/characters/costumes/costume_418_fruitcake.png", "resources/gfx/characters/costumes_keeper/costume_418_fruitcake.png"], ["resources/gfx/characters/costumes/costume_429_headofthekeeper.png", "resources/gfx/characters/costumes_keeper/costume_429_headofthekeeper.png"], ["resources/gfx/characters/costumes/costume_438_binky.png", "resources/gfx/characters/costumes_keeper/costume_438_binky.png"], ["resources/gfx/characters/costumes/costume_443_apple.png", "resources/gfx/characters/costumes_keeper/costume_443_apple.png"], ["resources/gfx/characters/costumes/costume_444_leadpencil.png", "resources/gfx/characters/costumes_keeper/costume_444_leadpencil.png"], ["resources/gfx/characters/costumes/costume_445_dogtooth.png", "resources/gfx/characters/costumes_keeper/costume_445_dogtooth.png"], ["resources/gfx/characters/costumes/costume_446_deadtooth.png", "resources/gfx/characters/costumes_keeper/costume_446_deadtooth.png"], ["resources/gfx/characters/costumes/costume_449_metalplate.png", "resources/gfx/characters/costumes_keeper/costume_449_metalplate.png"], ["resources/gfx/characters/costumes/costume_450_eyeofgreed.png", "resources/gfx/characters/costumes_keeper/costume_450_eyeofgreed.png"], ["resources/gfx/characters/costumes/costume_452_varicoseveins_head.png", "resources/gfx/characters/costumes_keeper/costume_452_varicoseveins_head.png"], ["resources/gfx/characters/costumes/costume_455_dadslostcoin.png", "resources/gfx/characters/costumes_keeper/costume_455_dadslostcoin.png"], ["resources/gfx/characters/costumes/costume_457_conehead.png", "resources/gfx/characters/costumes_keeper/costume_457_conehead.png"], ["resources/gfx/characters/costumes/costume_459_sinusinfection.png", "resources/gfx/characters/costumes_keeper/costume_459_sinusinfection.png"], ["resources/gfx/characters/costumes/costume_460_glaucoma.png", "resources/gfx/characters/costumes_keeper/costume_460_glaucoma.png"], ["resources/gfx/characters/costumes/costume_461_parasitoid.png", "resources/gfx/characters/costumes_keeper/costume_461_parasitoid.png"], ["resources/gfx/characters/costumes/costume_462_eyeofbelial.png", "resources/gfx/characters/costumes_keeper/costume_462_eyeofbelial.png"], ["resources/gfx/characters/costumes/costume_463_sulphuricacid.png", "resources/gfx/characters/costumes_keeper/costume_463_sulphuricacid.png"], ["resources/gfx/characters/costumes/costume_465_analogstick.png", "resources/gfx/characters/costumes_keeper/costume_465_analogstick.png"], ["resources/gfx/characters/costumes/costume_466_contagion.png", "resources/gfx/characters/costumes_keeper/costume_466_contagion.png"], ["resources/gfx/characters/costumes/costume_495_ghostpepper.png", "resources/gfx/characters/costumes_keeper/costume_495_ghostpepper.png"], ["resources/gfx/characters/costumes/costume_496_euthanasia.png", "resources/gfx/characters/costumes_keeper/costume_496_euthanasia.png"], ["resources/gfx/characters/costumes/costume_499_eucharist.png", "resources/gfx/characters/costumes_keeper/costume_499_eucharist.png"], ["resources/gfx/characters/costumes/costume_502_largezit.png", "resources/gfx/characters/costumes_keeper/costume_502_largezit.png"], ["resources/gfx/characters/costumes/costume_503_littlehorn.png", "resources/gfx/characters/costumes_keeper/costume_503_littlehorn.png"], ["resources/gfx/characters/costumes/costume_507_sharpstraw.png", "resources/gfx/characters/costumes_keeper/costume_507_sharpstraw.png"], ["resources/gfx/characters/costumes/costume_510_delirious head.png", "resources/gfx/characters/costumes_keeper/costume_510_delirious head.png"], ["resources/gfx/characters/costumes/costume_513_bozo.png", "resources/gfx/characters/costumes_keeper/costume_513_bozo.png"], ["resources/gfx/characters/costumes/costume_514_modem.png", "resources/gfx/characters/costumes_keeper/costume_514_modem.png"], ["resources/gfx/characters/costumes/costume_524_technology0.png", "resources/gfx/characters/costumes_keeper/costume_524_technology0.png"], ["resources/gfx/characters/costumes/costume_525_leprosy.png", "resources/gfx/characters/costumes_keeper/costume_525_leprosy.png"], ["resources/gfx/characters/costumes/costume_529_pop.png", "resources/gfx/characters/costumes_keeper/costume_529_pop.png"], ["resources/gfx/characters/costumes/costume_531_haemolacria.png", "resources/gfx/characters/costumes_keeper/costume_531_haemolacria.png"], ["resources/gfx/characters/costumes/costume_532_lachryphagy.png", "resources/gfx/characters/costumes_keeper/costume_532_lachryphagy.png"], ["resources/gfx/characters/costumes/costume_533_trisagion.png", "resources/gfx/characters/costumes_keeper/costume_533_trisagion.png"], ["resources/gfx/characters/costumes/costume_540_flatstone.png", "resources/gfx/characters/costumes_keeper/costume_540_flatstone.png"], ["resources/gfx/characters/costumes/costume_541_marrow.png", "resources/gfx/characters/costumes_keeper/costume_541_marrow.png"], ["resources/gfx/characters/costumes/costume_547_divorcepapers.png", "resources/gfx/characters/costumes_keeper/costume_547_divorcepapers.png"], ["resources/gfx/characters/costumes/costume_blindfold.png", "resources/gfx/characters/costumes_keeper/costume_blindfold.png"], ["resources/gfx/characters/costumes/costume_breath of life.png", "resources/gfx/characters/costumes_keeper/costume_breath of life.png"], ["resources/gfx/characters/costumes/costume_chocolate milk.png", "resources/gfx/characters/costumes_keeper/costume_chocolate milk.png"], ["resources/gfx/characters/costumes/costume_chocolate milk_grey.png", "resources/gfx/characters/costumes_keeper/costume_chocolate milk_grey.png"], ["resources/gfx/characters/costumes/costume_dead onion.png", "resources/gfx/characters/costumes_keeper/costume_dead onion.png"], ["resources/gfx/characters/costumes/costume_godhead.png", "resources/gfx/characters/costumes_keeper/costume_godhead.png"], ["resources/gfx/characters/costumes/costume_guppyhead.png", "resources/gfx/characters/costumes_keeper/costume_guppyhead.png"], ["resources/gfx/characters/costumes/costume_i found pills.png", "resources/gfx/characters/costumes_keeper/costume_i found pills.png"], ["resources/gfx/characters/costumes/costume_mawmark.png", "resources/gfx/characters/costumes_keeper/costume_mawmark.png"], ["resources/gfx/characters/costumes/costume_mind head.png", "resources/gfx/characters/costumes_keeper/costume_mind head.png"], ["resources/gfx/characters/costumes/costume_monstros lung.png", "resources/gfx/characters/costumes_keeper/costume_monstros lung.png"], ["resources/gfx/characters/costumes/costume_rebirth_69_lordoftheflieshead.png", "resources/gfx/characters/costumes_keeper/costume_rebirth_69_lordoftheflieshead.png"], ["resources/gfx/characters/costumes/costume_tick.png", "resources/gfx/characters/costumes_keeper/costume_tick.png"], ["resources/gfx/characters/costumes/emptyvessel head.png", "resources/gfx/characters/costumes_keeper/emptyvessel head.png"], ["resources/gfx/characters/costumes/moms perfume.png", "resources/gfx/characters/costumes_keeper/moms perfume.png"], ["resources/gfx/characters/costumes/ruawizard.png", "resources/gfx/characters/costumes_keeper/ruawizard.png"], ["resources/gfx/characters/costumes/transformation_adulthood.png", "resources/gfx/characters/costumes_keeper/transformation_adulthood.png"], ["resources/gfx/characters/costumes/transformation_baby.png", "resources/gfx/characters/costumes_keeper/transformation_baby.png"], ["resources/gfx/characters/costumes/transformation_bob_head.png", "resources/gfx/characters/costumes_keeper/transformation_bob_head.png"], ["resources/gfx/characters/costumes/transformation_bookworm.png", "resources/gfx/characters/costumes_keeper/transformation_bookworm.png"], ["resources/gfx/characters/costumes/transformation_drugs_head.png", "resources/gfx/characters/costumes_keeper/transformation_drugs_head.png"], ["resources/gfx/characters/costumes/transformation_evilangel_head.png", "resources/gfx/characters/costumes_keeper/transformation_evilangel_head.png"], ["resources/gfx/characters/costumes/transformation_mushroom_head.png", "resources/gfx/characters/costumes_keeper/transformation_mushroom_head.png"], ["resources-dlc3/gfx/characters/costumes/costume_000x_mucormycosis.png", "resources-dlc3/gfx/characters/costumes_keeper/costume_000x_mucormycosis.png"], ["resources-dlc3/gfx/characters/costumes/costume_001x_2spooky.png", "resources-dlc3/gfx/characters/costumes_keeper/costume_001x_2spooky.png"], ["resources-dlc3/gfx/characters/costumes/costume_005x_eyesore.png", "resources-dlc3/gfx/characters/costumes_keeper/costume_005x_eyesore.png"], ["resources-dlc3/gfx/characters/costumes/costume_007x_ithurts.png", "resources-dlc3/gfx/characters/costumes_keeper/costume_007x_ithurts.png"], ["resources-dlc3/gfx/characters/costumes/costume_007x_ithurts2.png", "resources-dlc3/gfx/characters/costumes_keeper/costume_007x_ithurts2.png"], ["resources-dlc3/gfx/characters/costumes/costume_008x_almondmilk.png", "resources-dlc3/gfx/characters/costumes_keeper/costume_008x_almondmilk.png"], ["resources-dlc3/gfx/characters/costumes/costume_009x_rockbottom.png", "resources-dlc3/gfx/characters/costumes_keeper/costume_009x_rockbottom.png"], ["resources-dlc3/gfx/characters/costumes/costume_011x_soap.png", "resources-dlc3/gfx/characters/costumes_keeper/costume_011x_soap.png"], ["resources-dlc3/gfx/characters/costumes/costume_017x_playdohcookie.png", "resources-dlc3/gfx/characters/costumes_keeper/costume_017x_playdohcookie.png"], ["resources-dlc3/gfx/characters/costumes/costume_022x_intruder.png", "resources-dlc3/gfx/characters/costumes_keeper/costume_022x_intruder.png"], ["resources-dlc3/gfx/characters/costumes/costume_029x_wavycap.png", "resources-dlc3/gfx/characters/costumes_keeper/costume_029x_wavycap.png"], ["resources-dlc3/gfx/characters/costumes/costume_036x_luna.png", "resources-dlc3/gfx/characters/costumes_keeper/costume_036x_luna.png"], ["resources-dlc3/gfx/characters/costumes/costume_036x_luna2.png", "resources-dlc3/gfx/characters/costumes_keeper/costume_036x_luna2.png"], ["resources-dlc3/gfx/characters/costumes/costume_038x_venus.png", "resources-dlc3/gfx/characters/costumes_keeper/costume_038x_venus.png"], ["resources-dlc3/gfx/characters/costumes/costume_039x_terra.png", "resources-dlc3/gfx/characters/costumes_keeper/costume_039x_terra.png"], ["resources-dlc3/gfx/characters/costumes/costume_040x_mars.png", "resources-dlc3/gfx/characters/costumes_keeper/costume_040x_mars.png"], ["resources-dlc3/gfx/characters/costumes/costume_041x_jupiter.png", "resources-dlc3/gfx/characters/costumes_keeper/costume_041x_jupiter.png"], ["resources-dlc3/gfx/characters/costumes/costume_043x_uranus.png", "resources-dlc3/gfx/characters/costumes_keeper/costume_043x_uranus.png"], ["resources-dlc3/gfx/characters/costumes/costume_044x_neptunus.png", "resources-dlc3/gfx/characters/costumes_keeper/costume_044x_neptunus.png"], ["resources-dlc3/gfx/characters/costumes/costume_045x_pluto.png", "resources-dlc3/gfx/characters/costumes_keeper/costume_045x_pluto.png"], ["resources-dlc3/gfx/characters/costumes/costume_047x_eyedrops.png", "resources-dlc3/gfx/characters/costumes_keeper/costume_047x_eyedrops.png"], ["resources-dlc3/gfx/characters/costumes/costume_052x_thescooper.png", "resources-dlc3/gfx/characters/costumes_keeper/costume_052x_thescooper.png"], ["resources-dlc3/gfx/characters/costumes/costume_053x_oculusrift.png", "resources-dlc3/gfx/characters/costumes_keeper/costume_053x_oculusrift.png"], ["resources-dlc3/gfx/characters/costumes/costume_063x_birdseye.png", "resources-dlc3/gfx/characters/costumes_keeper/costume_063x_birdseye.png"], ["resources-dlc3/gfx/characters/costumes/costume_065x_rottentomato.png", "resources-dlc3/gfx/characters/costumes_keeper/costume_065x_rottentomato.png"], ["resources-dlc3/gfx/characters/costumes/costume_068x_redstew.png", "resources-dlc3/gfx/characters/costumes_keeper/costume_068x_redstew.png"], ["resources-dlc3/gfx/characters/costumes/costume_069x_sosig.png", "resources-dlc3/gfx/characters/costumes_keeper/costume_069x_sosig.png"], ["resources-dlc3/gfx/characters/costumes/costume_084x_knockout.png", "resources-dlc3/gfx/characters/costumes_keeper/costume_084x_knockout.png"], ["resources-dlc3/gfx/characters/costumes/costume_090x_revelation.png", "resources-dlc3/gfx/characters/costumes_keeper/costume_090x_revelation.png"], ["resources-dlc3/gfx/characters/costumes/costume_094x_assaultbattery.png", "resources-dlc3/gfx/characters/costumes_keeper/costume_094x_assaultbattery.png"], ["resources-dlc3/gfx/characters/costumes/costume_101x_falsephd.png", "resources-dlc3/gfx/characters/costumes_keeper/costume_101x_falsephd.png"], ["resources-dlc3/gfx/characters/costumes/costume_105x_giantcell.png", "resources-dlc3/gfx/characters/costumes_keeper/costume_105x_giantcell.png"], ["resources-dlc3/gfx/characters/costumes/costume_106x_tropicamide.png", "resources-dlc3/gfx/characters/costumes_keeper/costume_106x_tropicamide.png"], ["resources-dlc3/gfx/characters/costumes/costume_663_toothandnail.png", "resources-dlc3/gfx/characters/costumes_keeper/costume_663_toothandnail.png"], ["resources-dlc3/gfx/characters/costumes/costume_665_guppyseye.png", "resources-dlc3/gfx/characters/costumes_keeper/costume_665_guppyseye.png"], ["resources-dlc3/gfx/characters/costumes/costume_703_esau_jr.png", "resources-dlc3/gfx/characters/costumes_keeper/costume_703_esau_jr.png"], ["resources-dlc3/gfx/characters/costumes/n_reverse_chariot.png", "resources-dlc3/gfx/characters/costumes_keeper/n_reverse_chariot.png"],])], ["shadow", new Map([["resources/gfx/characters/costumes/costume_002_bookofbelial.png", "resources/gfx/characters/costumes_shadow/costume_002_bookofbelial.png"], ["resources/gfx/characters/costumes/costume_004_gamekid.png", "resources/gfx/characters/costumes_shadow/costume_004_gamekid.png"], ["resources/gfx/characters/costumes/costume_006_mylittleunicorn.png", "resources/gfx/characters/costumes_shadow/costume_006_mylittleunicorn.png"], ["resources/gfx/characters/costumes/costume_007_thenail.png", "resources/gfx/characters/costumes_shadow/costume_007_thenail.png"], ["resources/gfx/characters/costumes/costume_009_razorblade.png", "resources/gfx/characters/costumes_shadow/costume_009_razorblade.png"], ["resources/gfx/characters/costumes/costume_011_shoopdawhoop.png", "resources/gfx/characters/costumes_shadow/costume_011_shoopdawhoop.png"], ["resources/gfx/characters/costumes/costume_019_brimstone.png", "resources/gfx/characters/costumes_shadow/costume_019_brimstone.png"], ["resources/gfx/characters/costumes/costume_019_brimstone2.png", "resources/gfx/characters/costumes_shadow/costume_019_brimstone2.png"], ["resources/gfx/characters/costumes/costume_021_charmofthevampire.png", "resources/gfx/characters/costumes_shadow/costume_021_charmofthevampire.png"], ["resources/gfx/characters/costumes/costume_023_commoncold.png", "resources/gfx/characters/costumes_shadow/costume_023_commoncold.png"], ["resources/gfx/characters/costumes/costume_027_drfetus.png", "resources/gfx/characters/costumes_shadow/costume_027_drfetus.png"], ["resources/gfx/characters/costumes/costume_029_theinnereye.png", "resources/gfx/characters/costumes_shadow/costume_029_theinnereye.png"], ["resources/gfx/characters/costumes/costume_037_maxshead.png", "resources/gfx/characters/costumes_shadow/costume_037_maxshead.png"], ["resources/gfx/characters/costumes/costume_040_momseye.png", "resources/gfx/characters/costumes_shadow/costume_040_momseye.png"], ["resources/gfx/characters/costumes/costume_043_momslipstick.png", "resources/gfx/characters/costumes_shadow/costume_043_momslipstick.png"], ["resources/gfx/characters/costumes/costume_045_moneyispower.png", "resources/gfx/characters/costumes_shadow/costume_045_moneyispower.png"], ["resources/gfx/characters/costumes/costume_046_mrmega.png", "resources/gfx/characters/costumes_shadow/costume_046_mrmega.png"], ["resources/gfx/characters/costumes/costume_047_myreflection.png", "resources/gfx/characters/costumes_shadow/costume_047_myreflection.png"], ["resources/gfx/characters/costumes/costume_048_numberone.png", "resources/gfx/characters/costumes_shadow/costume_048_numberone.png"], ["resources/gfx/characters/costumes/costume_051_ouijaboard.png", "resources/gfx/characters/costumes_shadow/costume_051_ouijaboard.png"], ["resources/gfx/characters/costumes/costume_052_thepact.png", "resources/gfx/characters/costumes_shadow/costume_052_thepact.png"], ["resources/gfx/characters/costumes/costume_053_parasite.png", "resources/gfx/characters/costumes_shadow/costume_053_parasite.png"], ["resources/gfx/characters/costumes/costume_056_roidrage.png", "resources/gfx/characters/costumes_shadow/costume_056_roidrage.png"], ["resources/gfx/characters/costumes/costume_063_spelunkerhat.png", "resources/gfx/characters/costumes_shadow/costume_063_spelunkerhat.png"], ["resources/gfx/characters/costumes/costume_065_spoonbender.png", "resources/gfx/characters/costumes_shadow/costume_065_spoonbender.png"], ["resources/gfx/characters/costumes/costume_067_steven.png", "resources/gfx/characters/costumes_shadow/costume_067_steven.png"], ["resources/gfx/characters/costumes/costume_069_technology.png", "resources/gfx/characters/costumes_shadow/costume_069_technology.png"], ["resources/gfx/characters/costumes/costume_071_virus.png", "resources/gfx/characters/costumes_shadow/costume_071_virus.png"], ["resources/gfx/characters/costumes/costume_073_whoreofbabylon.png", "resources/gfx/characters/costumes_shadow/costume_073_whoreofbabylon.png"], ["resources/gfx/characters/costumes/costume_077_xrayvision.png", "resources/gfx/characters/costumes_shadow/costume_077_xrayvision.png"], ["resources/gfx/characters/costumes/costume_078_3dollarbill.png", "resources/gfx/characters/costumes_shadow/costume_078_3dollarbill.png"], ["resources/gfx/characters/costumes/costume_082_bobscurse.png", "resources/gfx/characters/costumes_shadow/costume_082_bobscurse.png"], ["resources/gfx/characters/costumes/costume_082_lordofthepit head.png", "resources/gfx/characters/costumes_shadow/costume_082_lordofthepit head.png"], ["resources/gfx/characters/costumes/costume_087_chemicalpeel.png", "resources/gfx/characters/costumes_shadow/costume_087_chemicalpeel.png"], ["resources/gfx/characters/costumes/costume_088_deaddove.png", "resources/gfx/characters/costumes_shadow/costume_088_deaddove.png"], ["resources/gfx/characters/costumes/costume_089_epicfetus.png", "resources/gfx/characters/costumes_shadow/costume_089_epicfetus.png"], ["resources/gfx/characters/costumes/costume_095_ipecac.png", "resources/gfx/characters/costumes_shadow/costume_095_ipecac.png"], ["resources/gfx/characters/costumes/costume_098_meat.png", "resources/gfx/characters/costumes_shadow/costume_098_meat.png"], ["resources/gfx/characters/costumes/costume_102_mulligan.png", "resources/gfx/characters/costumes_shadow/costume_102_mulligan.png"], ["resources/gfx/characters/costumes/costume_103_mutantspider.png", "resources/gfx/characters/costumes_shadow/costume_103_mutantspider.png"], ["resources/gfx/characters/costumes/costume_106_polyphemus.png", "resources/gfx/characters/costumes_shadow/costume_106_polyphemus.png"], ["resources/gfx/characters/costumes/costume_108_sacredheart.png", "resources/gfx/characters/costumes_shadow/costume_108_sacredheart.png"], ["resources/gfx/characters/costumes/costume_109_scapular.png", "resources/gfx/characters/costumes_shadow/costume_109_scapular.png"], ["resources/gfx/characters/costumes/costume_110_smbsuperfan.png", "resources/gfx/characters/costumes_shadow/costume_110_smbsuperfan.png"], ["resources/gfx/characters/costumes/costume_111_speedball.png", "resources/gfx/characters/costumes_shadow/costume_111_speedball.png"], ["resources/gfx/characters/costumes/costume_113_squeezy.png", "resources/gfx/characters/costumes_shadow/costume_113_squeezy.png"], ["resources/gfx/characters/costumes/costume_116_technology2.png", "resources/gfx/characters/costumes_shadow/costume_116_technology2.png"], ["resources/gfx/characters/costumes/costume_117_toothpicks.png", "resources/gfx/characters/costumes_shadow/costume_117_toothpicks.png"], ["resources/gfx/characters/costumes/costume_119_halo.png", "resources/gfx/characters/costumes_shadow/costume_119_halo.png"], ["resources/gfx/characters/costumes/costume_130_pony.png", "resources/gfx/characters/costumes_shadow/costume_130_pony.png"], ["resources/gfx/characters/costumes/costume_148_infestationface.png", "resources/gfx/characters/costumes_shadow/costume_148_infestationface.png"], ["resources/gfx/characters/costumes/costume_159_spiritofthenight head.png", "resources/gfx/characters/costumes_shadow/costume_159_spiritofthenight head.png"], ["resources/gfx/characters/costumes/costume_181_whitepony.png", "resources/gfx/characters/costumes_shadow/costume_181_whitepony.png"], ["resources/gfx/characters/costumes/costume_203_humblingbundle.png", "resources/gfx/characters/costumes_shadow/costume_203_humblingbundle.png"], ["resources/gfx/characters/costumes/costume_221_rubbercement.png", "resources/gfx/characters/costumes_shadow/costume_221_rubbercement.png"], ["resources/gfx/characters/costumes/costume_222_antigravity.png", "resources/gfx/characters/costumes_shadow/costume_222_antigravity.png"], ["resources/gfx/characters/costumes/costume_223_pyromaniac.png", "resources/gfx/characters/costumes_shadow/costume_223_pyromaniac.png"], ["resources/gfx/characters/costumes/costume_224_crickets body.png", "resources/gfx/characters/costumes_shadow/costume_224_crickets body.png"], ["resources/gfx/characters/costumes/costume_230_abaddon.png", "resources/gfx/characters/costumes_shadow/costume_230_abaddon.png"], ["resources/gfx/characters/costumes/costume_231_balloftar_head.png", "resources/gfx/characters/costumes_shadow/costume_231_balloftar_head.png"], ["resources/gfx/characters/costumes/costume_234_infestation2.png", "resources/gfx/characters/costumes_shadow/costume_234_infestation2.png"], ["resources/gfx/characters/costumes/costume_235_taurus.png", "resources/gfx/characters/costumes_shadow/costume_235_taurus.png"], ["resources/gfx/characters/costumes/costume_237_deathstouch.png", "resources/gfx/characters/costumes_shadow/costume_237_deathstouch.png"], ["resources/gfx/characters/costumes/costume_240_experimentaltreatment.png", "resources/gfx/characters/costumes_shadow/costume_240_experimentaltreatment.png"], ["resources/gfx/characters/costumes/costume_241_contractfrombelow.png", "resources/gfx/characters/costumes_shadow/costume_241_contractfrombelow.png"], ["resources/gfx/characters/costumes/costume_242_infamy.png", "resources/gfx/characters/costumes_shadow/costume_242_infamy.png"], ["resources/gfx/characters/costumes/costume_244_tech05.png", "resources/gfx/characters/costumes_shadow/costume_244_tech05.png"], ["resources/gfx/characters/costumes/costume_245_2020.png", "resources/gfx/characters/costumes_shadow/costume_245_2020.png"], ["resources/gfx/characters/costumes/costume_256_hotbombs.png", "resources/gfx/characters/costumes_shadow/costume_256_hotbombs.png"], ["resources/gfx/characters/costumes/costume_257_firemind.png", "resources/gfx/characters/costumes_shadow/costume_257_firemind.png"], ["resources/gfx/characters/costumes/costume_259_darkmatter.png", "resources/gfx/characters/costumes_shadow/costume_259_darkmatter.png"], ["resources/gfx/characters/costumes/costume_261_proptosis.png", "resources/gfx/characters/costumes_shadow/costume_261_proptosis.png"], ["resources/gfx/characters/costumes/costume_267_robobaby20.png", "resources/gfx/characters/costumes_shadow/costume_267_robobaby20.png"], ["resources/gfx/characters/costumes/costume_304_libra_head.png", "resources/gfx/characters/costumes_shadow/costume_304_libra_head.png"], ["resources/gfx/characters/costumes/costume_305_scorpio.png", "resources/gfx/characters/costumes_shadow/costume_305_scorpio.png"], ["resources/gfx/characters/costumes/costume_307_capricorn.png", "resources/gfx/characters/costumes_shadow/costume_307_capricorn.png"], ["resources/gfx/characters/costumes/costume_309_pisces_head.png", "resources/gfx/characters/costumes_shadow/costume_309_pisces_head.png"], ["resources/gfx/characters/costumes/costume_316_cursedeye.png", "resources/gfx/characters/costumes_shadow/costume_316_cursedeye.png"], ["resources/gfx/characters/costumes/costume_329_theludovicotreatment.png", "resources/gfx/characters/costumes_shadow/costume_329_theludovicotreatment.png"], ["resources/gfx/characters/costumes/costume_340_caffeinepill_head.png", "resources/gfx/characters/costumes_shadow/costume_340_caffeinepill_head.png"], ["resources/gfx/characters/costumes/costume_341_tornphoto.png", "resources/gfx/characters/costumes_shadow/costume_341_tornphoto.png"], ["resources/gfx/characters/costumes/costume_342_bluecap.png", "resources/gfx/characters/costumes_shadow/costume_342_bluecap.png"], ["resources/gfx/characters/costumes/costume_350_toxicshock.png", "resources/gfx/characters/costumes_shadow/costume_350_toxicshock.png"], ["resources/gfx/characters/costumes/costume_353_bomberboy.png", "resources/gfx/characters/costumes_shadow/costume_353_bomberboy.png"], ["resources/gfx/characters/costumes/costume_358_thewiz.png", "resources/gfx/characters/costumes_shadow/costume_358_thewiz.png"], ["resources/gfx/characters/costumes/costume_359_8inchnail.png", "resources/gfx/characters/costumes_shadow/costume_359_8inchnail.png"], ["resources/gfx/characters/costumes/costume_368_epiphora.png", "resources/gfx/characters/costumes_shadow/costume_368_epiphora.png"], ["resources/gfx/characters/costumes/costume_369_continuum.png", "resources/gfx/characters/costumes_shadow/costume_369_continuum.png"], ["resources/gfx/characters/costumes/costume_371_curseofthetower.png", "resources/gfx/characters/costumes_shadow/costume_371_curseofthetower.png"], ["resources/gfx/characters/costumes/costume_374_holylight.png", "resources/gfx/characters/costumes_shadow/costume_374_holylight.png"], ["resources/gfx/characters/costumes/costume_375_hosthat.png", "resources/gfx/characters/costumes_shadow/costume_375_hosthat.png"], ["resources/gfx/characters/costumes/costume_379_pupuladuplex.png", "resources/gfx/characters/costumes_shadow/costume_379_pupuladuplex.png"], ["resources/gfx/characters/costumes/costume_380_paytoplay.png", "resources/gfx/characters/costumes_shadow/costume_380_paytoplay.png"], ["resources/gfx/characters/costumes/costume_381_edensblessing.png", "resources/gfx/characters/costumes_shadow/costume_381_edensblessing.png"], ["resources/gfx/characters/costumes/costume_392_zodiac.png", "resources/gfx/characters/costumes_shadow/costume_392_zodiac.png"], ["resources/gfx/characters/costumes/costume_393_serpentskiss.png", "resources/gfx/characters/costumes_shadow/costume_393_serpentskiss.png"], ["resources/gfx/characters/costumes/costume_394_marked.png", "resources/gfx/characters/costumes_shadow/costume_394_marked.png"], ["resources/gfx/characters/costumes/costume_395_techx.png", "resources/gfx/characters/costumes_shadow/costume_395_techx.png"], ["resources/gfx/characters/costumes/costume_398_godsflesh.png", "resources/gfx/characters/costumes_shadow/costume_398_godsflesh.png"], ["resources/gfx/characters/costumes/costume_399_mawofthevoid.png", "resources/gfx/characters/costumes_shadow/costume_399_mawofthevoid.png"], ["resources/gfx/characters/costumes/costume_402_chaos.png", "resources/gfx/characters/costumes_shadow/costume_402_chaos.png"], ["resources/gfx/characters/costumes/costume_410_evileye.png", "resources/gfx/characters/costumes_shadow/costume_410_evileye.png"], ["resources/gfx/characters/costumes/costume_414_moreoptions.png", "resources/gfx/characters/costumes_shadow/costume_414_moreoptions.png"], ["resources/gfx/characters/costumes/costume_418_fruitcake.png", "resources/gfx/characters/costumes_shadow/costume_418_fruitcake.png"], ["resources/gfx/characters/costumes/costume_424_sackhead.png", "resources/gfx/characters/costumes_shadow/costume_424_sackhead.png"], ["resources/gfx/characters/costumes/costume_425_nightlight.png", "resources/gfx/characters/costumes_shadow/costume_425_nightlight.png"], ["resources/gfx/characters/costumes/costume_429_headofthekeeper.png", "resources/gfx/characters/costumes_shadow/costume_429_headofthekeeper.png"], ["resources/gfx/characters/costumes/costume_432_glitterbomb.png", "resources/gfx/characters/costumes_shadow/costume_432_glitterbomb.png"], ["resources/gfx/characters/costumes/costume_444_leadpencil.png", "resources/gfx/characters/costumes_shadow/costume_444_leadpencil.png"], ["resources/gfx/characters/costumes/costume_445_dogtooth.png", "resources/gfx/characters/costumes_shadow/costume_445_dogtooth.png"], ["resources/gfx/characters/costumes/costume_446_deadtooth.png", "resources/gfx/characters/costumes_shadow/costume_446_deadtooth.png"], ["resources/gfx/characters/costumes/costume_450_eyeofgreed.png", "resources/gfx/characters/costumes_shadow/costume_450_eyeofgreed.png"], ["resources/gfx/characters/costumes/costume_457_conehead.png", "resources/gfx/characters/costumes_shadow/costume_457_conehead.png"], ["resources/gfx/characters/costumes/costume_460_glaucoma.png", "resources/gfx/characters/costumes_shadow/costume_460_glaucoma.png"], ["resources/gfx/characters/costumes/costume_462_eyeofbelial.png", "resources/gfx/characters/costumes_shadow/costume_462_eyeofbelial.png"], ["resources/gfx/characters/costumes/costume_463_sulphuricacid.png", "resources/gfx/characters/costumes_shadow/costume_463_sulphuricacid.png"], ["resources/gfx/characters/costumes/costume_464_glyphofbalance.png", "resources/gfx/characters/costumes_shadow/costume_464_glyphofbalance.png"], ["resources/gfx/characters/costumes/costume_465_analogstick.png", "resources/gfx/characters/costumes_shadow/costume_465_analogstick.png"], ["resources/gfx/characters/costumes/costume_494_jacobsladder.png", "resources/gfx/characters/costumes_shadow/costume_494_jacobsladder.png"], ["resources/gfx/characters/costumes/costume_496_euthanasia.png", "resources/gfx/characters/costumes_shadow/costume_496_euthanasia.png"], ["resources/gfx/characters/costumes/costume_498_duality.png", "resources/gfx/characters/costumes_shadow/costume_498_duality.png"], ["resources/gfx/characters/costumes/costume_510_delirious head.png", "resources/gfx/characters/costumes_shadow/costume_510_delirious head.png"], ["resources/gfx/characters/costumes/costume_513_bozo.png", "resources/gfx/characters/costumes_shadow/costume_513_bozo.png"], ["resources/gfx/characters/costumes/costume_517_fastbombs.png", "resources/gfx/characters/costumes_shadow/costume_517_fastbombs.png"], ["resources/gfx/characters/costumes/costume_524_technology0.png", "resources/gfx/characters/costumes_shadow/costume_524_technology0.png"], ["resources/gfx/characters/costumes/costume_525_leprosy.png", "resources/gfx/characters/costumes_shadow/costume_525_leprosy.png"], ["resources/gfx/characters/costumes/costume_529_pop.png", "resources/gfx/characters/costumes_shadow/costume_529_pop.png"], ["resources/gfx/characters/costumes/costume_531_haemolacria.png", "resources/gfx/characters/costumes_shadow/costume_531_haemolacria.png"], ["resources/gfx/characters/costumes/costume_532_lachryphagy.png", "resources/gfx/characters/costumes_shadow/costume_532_lachryphagy.png"], ["resources/gfx/characters/costumes/costume_536_sacrificial altar.png", "resources/gfx/characters/costumes_shadow/costume_536_sacrificial altar.png"], ["resources/gfx/characters/costumes/costume_chocolate milk.png", "resources/gfx/characters/costumes_shadow/costume_chocolate milk.png"], ["resources/gfx/characters/costumes/costume_dead onion.png", "resources/gfx/characters/costumes_shadow/costume_dead onion.png"], ["resources/gfx/characters/costumes/costume_godhead halo.png", "resources/gfx/characters/costumes_shadow/costume_godhead halo.png"], ["resources/gfx/characters/costumes/costume_godhead.png", "resources/gfx/characters/costumes_shadow/costume_godhead.png"], ["resources/gfx/characters/costumes/costume_guppyhead.png", "resources/gfx/characters/costumes_shadow/costume_guppyhead.png"], ["resources/gfx/characters/costumes/costume_i found pills.png", "resources/gfx/characters/costumes_shadow/costume_i found pills.png"], ["resources/gfx/characters/costumes/costume_mawmark.png", "resources/gfx/characters/costumes_shadow/costume_mawmark.png"], ["resources/gfx/characters/costumes/costume_megablast.png", "resources/gfx/characters/costumes_shadow/costume_megablast.png"], ["resources/gfx/characters/costumes/costume_mind head.png", "resources/gfx/characters/costumes_shadow/costume_mind head.png"], ["resources/gfx/characters/costumes/costume_monstros lung.png", "resources/gfx/characters/costumes_shadow/costume_monstros lung.png"], ["resources/gfx/characters/costumes/costume_rebirth_69_lordoftheflieshead.png", "resources/gfx/characters/costumes_shadow/costume_rebirth_69_lordoftheflieshead.png"], ["resources/gfx/characters/costumes/costume_soul_2.png", "resources/gfx/characters/costumes_shadow/costume_soul_2.png"], ["resources/gfx/characters/costumes/emptyvessel head.png", "resources/gfx/characters/costumes_shadow/emptyvessel head.png"], ["resources/gfx/characters/costumes/purityglow_blue.png", "resources/gfx/characters/costumes_shadow/purityglow_blue.png"], ["resources/gfx/characters/costumes/purityglow_orange.png", "resources/gfx/characters/costumes_shadow/purityglow_orange.png"], ["resources/gfx/characters/costumes/purityglow_red.png", "resources/gfx/characters/costumes_shadow/purityglow_red.png"], ["resources/gfx/characters/costumes/purityglow_yellow.png", "resources/gfx/characters/costumes_shadow/purityglow_yellow.png"], ["resources/gfx/characters/costumes/ruawizard.png", "resources/gfx/characters/costumes_shadow/ruawizard.png"], ["resources/gfx/characters/costumes/transformation_baby.png", "resources/gfx/characters/costumes_shadow/transformation_baby.png"], ["resources/gfx/characters/costumes/transformation_bob_head.png", "resources/gfx/characters/costumes_shadow/transformation_bob_head.png"], ["resources/gfx/characters/costumes/transformation_bookworm.png", "resources/gfx/characters/costumes_shadow/transformation_bookworm.png"], ["resources/gfx/characters/costumes/transformation_drugs_head.png", "resources/gfx/characters/costumes_shadow/transformation_drugs_head.png"], ["resources/gfx/characters/costumes/transformation_evilangel_head.png", "resources/gfx/characters/costumes_shadow/transformation_evilangel_head.png"], ["resources/gfx/characters/costumes/transformation_mushroom_head.png", "resources/gfx/characters/costumes_shadow/transformation_mushroom_head.png"], ["resources/gfx/characters/costumes/transformation_poop_head.png", "resources/gfx/characters/costumes_shadow/transformation_poop_head.png"], ["resources/gfx/characters/costumes/transformation_spider.png", "resources/gfx/characters/costumes_shadow/transformation_spider.png"], ["resources/gfx/characters/costumes/x_overdose.png", "resources/gfx/characters/costumes_shadow/x_overdose.png"], ["resources-dlc3/gfx/characters/costumes/character_004b_judasfez.png", "resources-dlc3/gfx/characters/costumes_shadow/character_004b_judasfez.png"], ["resources-dlc3/gfx/characters/costumes/costume_001x_2spooky.png", "resources-dlc3/gfx/characters/costumes_shadow/costume_001x_2spooky.png"], ["resources-dlc3/gfx/characters/costumes/costume_005x_eyesore.png", "resources-dlc3/gfx/characters/costumes_shadow/costume_005x_eyesore.png"], ["resources-dlc3/gfx/characters/costumes/costume_007x_ithurts2.png", "resources-dlc3/gfx/characters/costumes_shadow/costume_007x_ithurts2.png"], ["resources-dlc3/gfx/characters/costumes/costume_008x_almondmilk.png", "resources-dlc3/gfx/characters/costumes_shadow/costume_008x_almondmilk.png"], ["resources-dlc3/gfx/characters/costumes/costume_009x_rockbottom.png", "resources-dlc3/gfx/characters/costumes_shadow/costume_009x_rockbottom.png"], ["resources-dlc3/gfx/characters/costumes/costume_011x_soap.png", "resources-dlc3/gfx/characters/costumes_shadow/costume_011x_soap.png"], ["resources-dlc3/gfx/characters/costumes/costume_017x_playdohcookie.png", "resources-dlc3/gfx/characters/costumes_shadow/costume_017x_playdohcookie.png"], ["resources-dlc3/gfx/characters/costumes/costume_019x_occulteye.png", "resources-dlc3/gfx/characters/costumes_shadow/costume_019x_occulteye.png"], ["resources-dlc3/gfx/characters/costumes/costume_022x_intruder.png", "resources-dlc3/gfx/characters/costumes_shadow/costume_022x_intruder.png"], ["resources-dlc3/gfx/characters/costumes/costume_029x_wavycap.png", "resources-dlc3/gfx/characters/costumes_shadow/costume_029x_wavycap.png"], ["resources-dlc3/gfx/characters/costumes/costume_038x_venus.png", "resources-dlc3/gfx/characters/costumes_shadow/costume_038x_venus.png"], ["resources-dlc3/gfx/characters/costumes/costume_039x_terra.png", "resources-dlc3/gfx/characters/costumes_shadow/costume_039x_terra.png"], ["resources-dlc3/gfx/characters/costumes/costume_040x_mars.png", "resources-dlc3/gfx/characters/costumes_shadow/costume_040x_mars.png"], ["resources-dlc3/gfx/characters/costumes/costume_041x_jupiter.png", "resources-dlc3/gfx/characters/costumes_shadow/costume_041x_jupiter.png"], ["resources-dlc3/gfx/characters/costumes/costume_045x_pluto.png", "resources-dlc3/gfx/characters/costumes_shadow/costume_045x_pluto.png"], ["resources-dlc3/gfx/characters/costumes/costume_053x_oculusrift.png", "resources-dlc3/gfx/characters/costumes_shadow/costume_053x_oculusrift.png"], ["resources-dlc3/gfx/characters/costumes/costume_065x_rottentomato.png", "resources-dlc3/gfx/characters/costumes_shadow/costume_065x_rottentomato.png"], ["resources-dlc3/gfx/characters/costumes/costume_069x_sosig.png", "resources-dlc3/gfx/characters/costumes_shadow/costume_069x_sosig.png"], ["resources-dlc3/gfx/characters/costumes/costume_084x_knockout.png", "resources-dlc3/gfx/characters/costumes_shadow/costume_084x_knockout.png"], ["resources-dlc3/gfx/characters/costumes/costume_090x_revelation.png", "resources-dlc3/gfx/characters/costumes_shadow/costume_090x_revelation.png"], ["resources-dlc3/gfx/characters/costumes/costume_105x_giantcell.png", "resources-dlc3/gfx/characters/costumes_shadow/costume_105x_giantcell.png"], ["resources-dlc3/gfx/characters/costumes/costume_106x_tropicamide.png", "resources-dlc3/gfx/characters/costumes_shadow/costume_106x_tropicamide.png"], ["resources-dlc3/gfx/characters/costumes/costume_665b_double_guppyseye.png", "resources-dlc3/gfx/characters/costumes_shadow/costume_665b_double_guppyseye.png"], ["resources-dlc3/gfx/characters/costumes/costume_665_guppyseye.png", "resources-dlc3/gfx/characters/costumes_shadow/costume_665_guppyseye.png"], ["resources-dlc3/gfx/characters/costumes/costume_703_esau_jr.png", "resources-dlc3/gfx/characters/costumes_shadow/costume_703_esau_jr.png"], ["resources-dlc3/gfx/characters/costumes/costume_730b_double_glasseye.png", "resources-dlc3/gfx/characters/costumes_shadow/costume_730b_double_glasseye.png"], ["resources-dlc3/gfx/characters/costumes/costume_730_glasseye.png", "resources-dlc3/gfx/characters/costumes_shadow/costume_730_glasseye.png"], ["resources-dlc3/gfx/characters/costumes/costume_731_stye.png", "resources-dlc3/gfx/characters/costumes_shadow/costume_731_stye.png"], ["resources-dlc3/gfx/characters/costumes/fetus_tears.png", "resources-dlc3/gfx/characters/costumes_shadow/fetus_tears.png"], ["resources-dlc3/gfx/characters/costumes/n_mega_foundpills.png", "resources-dlc3/gfx/characters/costumes_shadow/n_mega_foundpills.png"],])], ["lilith", new Map([["resources/gfx/characters/costumes/character_002_maggiesbeautifulgoldenlocks.png", "resources-dlc3/gfx/characters/costumes_lilith/character_002_maggiesbeautifulgoldenlocks.png"],])],])

    public static processSkinAltAndCostumeAlt(target: Actor, skinAlt: number, costumeAlt: string) {
        for (let sprite of target.content?.Spritesheets || []) {
            if (sprite.Path && sprite.Path.endsWith('.png')) {
                let path_from = sprite.Path
                let path_try_skin = sprite.Path.substring(0, sprite.Path.length - 4) + this.SKIN_ALT_NAME[skinAlt] + '.png'
                if (costumeAlt && costumeAlt.length > 0 && this.COSTUME_ALT_DICT.has(costumeAlt)) {
                    let rep_dict = this.COSTUME_ALT_DICT.get(costumeAlt)
                    if (rep_dict?.has(path_try_skin)) {
                        //皮肤颜色变换后，仍然具有角色贴图（使用变换后的角色贴图）
                        sprite.Path = rep_dict.get(path_try_skin) || sprite.Path
                    } else if (rep_dict?.has(path_from)) {
                        //皮肤颜色变换前有角色贴图，但变换后没有（使用变换前的角色贴图）
                        sprite.Path = rep_dict.get(path_from) || sprite.Path
                    } else {
                        //没有角色贴图（使用变换后的皮肤颜色贴图）
                        sprite.Path = path_try_skin
                    }
                } else {
                    sprite.Path = path_try_skin
                }
            }
        }
    }

    public static processCostumeAlt(target: Actor, costumeAlt: string) {
        if (this.COSTUME_ALT_DICT.has(costumeAlt)) {
            let rep_dict = this.COSTUME_ALT_DICT.get(costumeAlt)
            for (let sprite of target.content?.Spritesheets || []) {
                if (sprite.Path && rep_dict?.has(sprite.Path)) {
                    sprite.Path = rep_dict.get(sprite.Path) || sprite.Path
                }
            }
        }
    }

    private static getAdrenalineAnms(emptyHeart: number /* range: 0 ~ 12, maybe 0 ~ 24 with some item */, frameCount: number)
        : [HeadOffsetY: number, HeadScaleX: number, HeadScaleY: number, BodyScaleX: number, BodyScaleY: number] {
        if (emptyHeart == 0) {
            return [0, 1, 1, 1, 1]
        }

        let EmptyHeartCount = emptyHeart / 24.00


        let v582 = 1.0 - ((1.0 - EmptyHeartCount) * (1.0 - EmptyHeartCount));
        let v601 = ((EmptyHeartCount * EmptyHeartCount * 9.0) + 1.0) * 2 * 3.1415927 / 30.0;
        let v596 = v582 * 0.5;
        let v191 = Math.cos(frameCount * v601);
        let v192 = ((v191 * 0.5) + 0.5) * 1.2 * ((v191 * 0.5) + 0.5) * 1.2
        let j = ((v192 - 0.2) * v596) + 1.0;
        let v194 = Math.cos((frameCount - 3) * v601);
        let v195 = ((v194 * 0.5) + 0.5) * 1.2 * ((v194 * 0.5) + 0.5) * 1.2
        let v196 = (v195 - 0.2) * (EmptyHeartCount * EmptyHeartCount);
        let v608 = ((((1.0 / j) - 1.0) * 0.5) + 1.0) + v196;//output
        let v579 = (v196 * 0.5) + j; //output
        let v198 = Math.cos((frameCount + 10) * v601);
        let v199 = ((v198 * 0.5) + 0.5) * 1.2 * ((v198 * 0.5) + 0.5) * 1.2
        j = (v199 - 0.2) * v596;
        let v201 = Math.cos((frameCount + 20) * v601);
        let v202 = ((v201 * 0.5) + 0.5) * 1.2 * ((v201 * 0.5) + 0.5) * 1.2
        v582 = ((v202 - 0.2) * (v582 * 0.1)) + 1.0;//output
        let SomeVariable = 1.0 / v582;//output

        return [j * 10, SomeVariable, v582, v608, v579]
    }

    private static COSTUME_STEP = ["glow", "back", "body", "body0", "body1", "head", "head0", "head1", "head2", "head3", "head4", "head5", "top0", "extra", "ghost"]

    public static renderCostume(anmA: CostumeInfo[], anmB: CostumeInfo[] | undefined, anmC: CostumeInfo[] | undefined, ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, centerX: number, centerY: number, rootScale: number, shootFrame: number, walkFrame: number,
        blackBody: boolean /* 犹大之影 */, gameFrameCount: number, adrenalineLevel: number /* 肾上腺素 */
        , layer_stack_offset: [number, number]) {
        //anmA is leg,anmB is head
        let step_draw_candidates = new Map<string, (CostumeInfo | undefined)[]>()

        let headTransformLayer = undefined
        //setup steps for anmA
        for (let step of this.COSTUME_STEP) {
            for (let info of anmA) {
                for (let layer of info.player.currentAnm?.frames || []) {
                    if (info.player.getLayerName(layer.LayerId) == step) {
                        //动画中包含目标图层
                        if (layer.frames[0]) {
                            step_draw_candidates.set(step, [info])
                        }
                    }
                }

                /** begin:HeadTransform **/
                let nulllayer_id = undefined
                for (let nulllayer of info.player.anm2.content?.Nulls || []) {
                    if (nulllayer.Name == "HeadTransform") {
                        nulllayer_id = nulllayer.Id
                    }
                }
                if (nulllayer_id != undefined) {
                    for (let nulllayer of info.player.currentAnm?.nullFrames || []) {
                        if (nulllayer.LayerId == nulllayer_id) {
                            headTransformLayer = nulllayer
                        }
                    }
                }
                /* end:HeadTransform*/

            }
        }
        //setup steps for anmB
        let head_has_charge = false
        if (anmB) {
            for (let step of this.COSTUME_STEP) {
                for (let info of anmB) {
                    for (let layer of info.player.currentAnm?.frames || []) {
                        if (info.player.getLayerName(layer.LayerId) == step) {
                            //动画中包含目标图层
                            if (info.head_has_charge) {
                                head_has_charge = true
                            }
                            if (layer.frames[0]) {
                                if (step_draw_candidates.has(step)) {
                                    (step_draw_candidates.get(step) || [])[1] = info
                                } else {
                                    step_draw_candidates.set(step, [undefined, info])
                                }
                            }
                        }
                    }
                }
            }
        }
        //setup steps for anmC
        if (anmC) {
            for (let step of this.COSTUME_STEP) {
                for (let info of anmC) {
                    for (let layer of info.player.currentAnm?.frames || []) {
                        if (info.player.getLayerName(layer.LayerId) == step) {
                            //动画中包含目标图层
                            if (layer.frames[0]) {
                                if (step_draw_candidates.has(step)) {
                                    (step_draw_candidates.get(step) || [])[2] = info
                                } else {
                                    step_draw_candidates.set(step, [undefined, undefined, info])
                                }
                            }
                        }
                    }
                }
            }
        }
        let head_transform = undefined

        let [adrenalineHeadOffsetY, adrenalineHeadScaleX, adrenalineHeadScaleY, adrenalineBodyScaleX, adrenalineBodyScaleY] =
            this.getAdrenalineAnms(adrenalineLevel, gameFrameCount)

        let layer_stack_id = 0
        for (let step of this.COSTUME_STEP) {
            layer_stack_id++
            let layer_stack_xoffset = (layer_stack_id % 8) * (layer_stack_offset[0] ?? 0)
            let layer_stack_yoffset = Math.floor(layer_stack_id / 8) * (layer_stack_offset[1] ?? 0)
            if (step_draw_candidates.has(step)) {
                let players = step_draw_candidates.get(step)
                for (let draw_anm = 0; draw_anm <= 2; draw_anm++) {
                    let player = (players && players[draw_anm])?.player
                    if (player) {
                        let old_frame = undefined
                        //let head_transform = undefined
                        if (step.startsWith("body")) {
                            old_frame = player.currentFrame
                            player.play(walkFrame % (player.currentAnm?.FrameNum || 100000))
                            if (draw_anm == 0 /* leg */ && headTransformLayer) {
                                head_transform = headTransformLayer.frames[player.currentFrame]
                            }
                        }
                        if (step.startsWith("head") && !player.currentAnm?.Loop) {
                            old_frame = player.currentFrame
                            if (draw_anm == 1 /* draw head */ && head_has_charge && !(players && players[draw_anm])?.head_has_charge) {
                                player.play(shootFrame % 2)
                            } else {
                                player.play(shootFrame % (player.currentAnm?.FrameNum || 100000))
                            }
                        }
                        /* fallback:HeadLeft -> HeadLeft_Idle */
                        let fallback_restore = undefined
                        if (players && players[draw_anm]?.head_has_idle && step == "head") {
                            let frames = player.getLayerByName("head")?.frames
                            //c340
                            if (frames != undefined && (player.currentFrame < frames.length && frames[player.currentFrame].Visible == false)) {
                                fallback_restore = player.currentAnm
                                player.setFrame(player.getCurrentAnmName() + "_Idle", player.currentFrame)
                            }
                        }
                        if (step.startsWith("head")) {
                            player.drawCanvas(ctx, canvas, centerX + layer_stack_xoffset, centerY + layer_stack_yoffset, rootScale, step, head_transform, false,
                                adrenalineHeadScaleX, adrenalineHeadScaleY, adrenalineHeadOffsetY)
                        } else {
                            let step_is_body = step.startsWith("body")
                            player.drawCanvas(ctx, canvas, centerX + layer_stack_xoffset, centerY + layer_stack_yoffset, rootScale, step, undefined, blackBody && step_is_body,
                                adrenalineBodyScaleX, adrenalineBodyScaleY, 0
                            )
                        }

                        if (fallback_restore) {
                            player.currentAnm = fallback_restore
                        }

                        if (old_frame != undefined) {
                            player.currentFrame = old_frame
                        }
                    }
                }
            }
        }
    }
}
interface CostumeInfo {
    player: AnmPlayer,
    head_has_idle: boolean,
    head_has_charge: boolean
    /* steps[step][layer] == anmarray_index */
}

class WebGLOverlay {
    backend_canvas: HTMLCanvasElement
    webgl_canvas: HTMLCanvasElement

    texture?: WebGLTexture
    shaderController:ShaderController
    constructor(backend_canvas: HTMLCanvasElement, webgl_canvas: HTMLCanvasElement, shaderName: string) {
        this.backend_canvas = backend_canvas
        this.webgl_canvas = webgl_canvas
        let controller_class = PredefinedShaderControllers[shaderName]
        if(controller_class){
            this.shaderController = new controller_class()
        }else{
            this.shaderController = new ShaderController()
        }
    }

    loadShader(gl: WebGLRenderingContext, type: GLenum, source: string) {
        const shader = gl.createShader(type);
        if (!shader)
            return
        // Send the source to the shader object
        gl.shaderSource(shader, source);
        // Compile the shader program
        gl.compileShader(shader);
        // See if it compiled successfully
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error(
                `An error occurred compiling the shaders: ${gl.getShaderInfoLog(shader)}`,
            );
            gl.deleteShader(shader);
            return null;
        }

        return shader;
    }

    initShaderProgram(gl: WebGLRenderingContext, vsSource: string, fsSource: string) {
        const vertexShader = this.loadShader(gl, gl.VERTEX_SHADER, vsSource);
        const fragmentShader = this.loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
        if (!vertexShader || !fragmentShader) return;
        // Create the shader program

        const shaderProgram = gl.createProgram();
        if(!shaderProgram)return;
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);

        // If creating the shader program failed, alert

        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            console.error(
                `Unable to initialize the shader program: ${gl.getProgramInfoLog(
                    shaderProgram,
                )}`,
            );
            return null;
        }

        return shaderProgram;
    }

    init() {
        let gl = this.webgl_canvas.getContext("webgl")
        if (!gl) return;
        const shaderProgram = this.initShaderProgram(gl, this.shaderController.vertex(), this.shaderController.fragment());
        if(!shaderProgram) return;  

        ShaderController.bindArray(gl, shaderProgram, "Position", 2, [
            -1,-1,
            -1,1,
            1,-1,
            1,1
        ])

        ShaderController.bindArray(gl, shaderProgram, "TexCoord", 2, [
            0,1,
            0,0,
            1,1,
            1,0
        ])

        this.shaderController.init(gl, shaderProgram, this)

        gl.useProgram(shaderProgram)

        gl.activeTexture(gl.TEXTURE0)
        this.texture = gl.createTexture() ?? undefined
        if(this.texture){
            gl.bindTexture(gl.TEXTURE_2D, this.texture)
        }

        gl.uniform1i(
            gl.getUniformLocation(shaderProgram, "Texture0"),0
        )
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.enable(gl.BLEND)
        gl.blendFunc(gl.SRC_ALPHA,gl.ZERO)

    }

    render() {
        var gl = this.webgl_canvas.getContext("webgl")
        if(gl == null)return
        this.shaderController.update(gl)
        if(this.texture)
            gl.bindTexture(gl.TEXTURE_2D, this.texture)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE, this.backend_canvas)
        gl.clearColor(0,0,0,0)
        gl.clear(gl.COLOR_BUFFER_BIT)
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }
}