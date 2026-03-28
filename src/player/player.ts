import { PredefinedShaderControllers, ShaderController } from "./shader"

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
    red?: number | undefined
    green?: number | undefined
    blue?: number | undefined
    alpha?: number | undefined
    redOffset?: number | undefined
    greenOffset?: number | undefined
    blueOffset?: number | undefined

    xscale?: number | undefined
    yscale?: number | undefined

    xoffset?: number | undefined
    yoffset?: number | undefined

    hide?: boolean | undefined
}

import { COSTUME_ALT_DICT } from "./costum_dict"
import { huijiUrlBuilder, isRecordingMode } from "../wikiplayer/huiji"

export type ReplaceSheetMap = Map<number, string>

export class AnmPlayer {
    static lazyLoadSpritesheet = true

    static svgfilter_incrid: number = 0
    static crossOrigin: string | undefined = undefined

    anm2: Actor

    sprites: string[] = new Array() /* spriteid -> sprite path */
    sprites_htmlimg: HTMLImageElement[] = new Array()
    layers: Layer[/* layer id */] = new Array()
    events: string[/* event id */] = new Array()

    layerAdjustParameters: LayerAdjustParameter[/* layer id */] = new Array()

    currentFrame: number = -1
    currentAnm?: LoadedAnms | undefined

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

    constructor(json: Actor, replaceSheetMap?:ReplaceSheetMap, onloadimg?: () => void) {
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
        if(replaceSheetMap)
            this.replaceSheetMap = replaceSheetMap

        if(!AnmPlayer.lazyLoadSpritesheet){
            for (let i = 0; i < (this.anm2.content?.Spritesheets?.length || 0); i++) {
                this.loadSpritesheet(i)
            }

        }
        if(onloadimg)
            this.imgLoadListener = onloadimg

    }

    private loadAnimationFrames(anms: Frame[], length: number): FrameStatus[] {
        let ret = new Array(length)
        let fi = 0
        for (let findex = 0; findex < anms.length; findex++) {
            let frame = anms[findex]!
            if (frame.Interpolated && findex + 1 < anms.length) {
                for (let d = 0; d < frame.Delay; d++) {
                    ret[fi++] = FrameStatus.Interp(frame, anms[findex + 1]!, d / frame.Delay)
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
            layer.Visible = anm.LayerAnimations[j]!.Visible
            layer.frames = this.loadAnimationFrames(anm.LayerAnimations[j]!.frames, anm.FrameNum)
            layer.LayerId = anm.LayerAnimations[j]!.LayerId
            layerframes[j] = layer
        }

        let nullframes: LayerStatus[] = new Array(anm.NullAnimations.length)
        for (let j = 0; j < anm.NullAnimations.length; j++) {
            let layer = new LayerStatus()
            layer.Visible = anm.NullAnimations[j]!.Visible
            layer.frames = this.loadAnimationFrames(anm.NullAnimations[j]!.frames, anm.FrameNum)
            layer.LayerId = anm.NullAnimations[j]!.NullId
            nullframes[j] = layer
        }

        let events: (string | null)[] = new Array(anm.FrameNum)
        for (let trig of anm.Triggers) {
            events[trig.AtFrame] = this.events[trig.EventId] ?? null
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
                    if (anms[i]!.Name == name) {
                        // load
                        this.loadAnmObject(anms[i]!)
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
    spritesheetCanvasProvider?: (spritesheed: Spritesheet, url: string, width: number, height: number) => CanvasRenderingContext2D
    public setSpritesheetCanvas(canvasProvider: (spritesheed: Spritesheet, url: string, width: number, height: number) => CanvasRenderingContext2D) {
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

    replaceSheetMap?:ReplaceSheetMap

    private loadSpritesheet(i: number) {
        let img = this.sprites_htmlimg[i]
        if (img == undefined) {
            let imgpath = "Anm2/" + this.sprites[i]!
            
            img = document.createElement("img")
            img.setAttribute('style', "image-rendering: pixelated; display:none;")
            if (AnmPlayer.crossOrigin != undefined) {
                img.setAttribute('crossorigin', AnmPlayer.crossOrigin)
            }

            if(this.replaceSheetMap?.has(i)){
                img.src = huijiUrlBuilder(this.replaceSheetMap.get(i)!)
            }else{
                img.src = huijiUrlBuilder(imgpath)
            }

            img.onload = () => {
                if(!img) 
                    throw new Error("impossible");
                img.setAttribute("img_loaded", "true")
                if (this.imgLoadListener) {
                    this.imgLoadListener()
                }
                if (this.spritesheetCanvasProvider) {
                    this.spritesheet_canvas = this.spritesheet_canvas || []
                    let sprite = this.anm2.content?.Spritesheets
                    if (sprite && sprite[i]) {
                        this.spritesheet_canvas[i] = this.spritesheetCanvasProvider(sprite[i]!, img.src, img.width, img.height)
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

                    let sprite_sheet_id = this.layers[layer.LayerId]!.SpritesheetId

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


    public static processSkinAltAndCostumeAlt(target: Actor, skinAlt: number, costumeAlt: string) {
        for (let sprite of target.content?.Spritesheets || []) {
            if (sprite.Path && sprite.Path.endsWith('.png')) {
                let path_from = sprite.Path
                let path_try_skin = sprite.Path.substring(0, sprite.Path.length - 4) + this.SKIN_ALT_NAME[skinAlt] + '.png'
                if (costumeAlt && costumeAlt.length > 0 && COSTUME_ALT_DICT.has(costumeAlt)) {
                    let rep_dict = COSTUME_ALT_DICT.get(costumeAlt)
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
        if (COSTUME_ALT_DICT.has(costumeAlt)) {
            let rep_dict = COSTUME_ALT_DICT.get(costumeAlt)
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
                            if (frames != undefined && (player.currentFrame < frames.length && frames[player.currentFrame]!.Visible == false)) {
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
export interface CostumeInfo {
    player: AnmPlayer
    head_has_idle?: boolean
    head_has_charge?: boolean
    head_charge_frame?: number

    is_csection?:boolean
    is_tapollyon?:boolean
    /* steps[step][layer] == anmarray_index */
}

export class WebGLOverlay {
    backend_canvas: HTMLCanvasElement
    webgl_canvas: HTMLCanvasElement

    texture?: WebGLTexture | null
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
        let gl = this.webgl_canvas.getContext("webgl", {
            preserveDrawingBuffer: isRecordingMode()
        })
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
        this.texture = gl.createTexture()
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