class FrameStatus implements Frame{
    XPivot: number = 0
    YPivot: number = 0
    XCrop: number = 0
    YCrop: number = 0
    Width:number = 0
    Height:number = 0
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
    filterGenerated:boolean = false
    filterId?:string

    copyFrom(other:Frame){
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

    public static Interp(a:Frame,b:Frame,r:number):FrameStatus{
        let ret = new FrameStatus()
        ret.XPivot = a.XPivot
        ret.YPivot = a.YPivot
        ret.XCrop = a.XCrop
        ret.YCrop = a.YCrop
        ret.Width = a.Width
        ret.Height = a.Height
        ret.XPosition = (b.XPosition - a.XPosition)*r + a.XPosition
        ret.YPosition = (b.YPosition - a.YPosition)*r + a.YPosition
        ret.Delay = (b.Delay - a.Delay)*r + a.Delay
        ret.Visible = a.Visible
        ret.XScale = (b.XScale - a.XScale)*r + a.XScale
        ret.YScale = (b.YScale - a.YScale)*r + a.YScale
        ret.RedTint = (b.RedTint - a.RedTint)*r + a.RedTint
        ret.GreenTint = (b.GreenTint - a.GreenTint)*r + a.GreenTint
        ret.BlueTint = (b.BlueTint - a.BlueTint)*r + a.BlueTint
        ret.AlphaTint = (b.AlphaTint - a.AlphaTint)*r + a.AlphaTint
        ret.RedOffset = (b.RedOffset - a.RedOffset)*r + a.RedOffset
        ret.GreenOffset = (b.GreenOffset - a.GreenOffset)*r + a.GreenOffset
        ret.BlueOffset = (b.BlueOffset - a.BlueOffset)*r + a.BlueOffset
        ret.Rotation = (b.Rotation - a.Rotation)*r + a.Rotation
        ret.Interpolated = a.Interpolated
        return ret
    }
}

class LayerStatus{
    LayerId:number = 0
    Visible:boolean = false
    frames:FrameStatus[/* frame id */] = []
}
interface LoadedAnms{
    rootframes:FrameStatus[/* frame id */],frames:LayerStatus[/* layer id */], Loop:boolean,
    FrameNum:number
    events:(string|null)[]
    name:string

    nullFrames:LayerStatus[]
}


class AnmPlayer{
    static svgfilter_incrid:number = 0
    anm2:Actor
    
    sprites:string[] = new Array() /* spriteid -> sprite path */
    sprites_htmlimg:HTMLImageElement[] = new Array()
    layers:Layer[/* layer id */] = new Array()
    events:string[/* event id */] = new Array()

    currentFrame:number = -1
    currentAnm?:LoadedAnms

    frames:Map</* anim name */string,LoadedAnms> = new Map()

    forceLoop:boolean = false
    flipX:boolean = false
    //倒放
    revert:boolean = false

    sheet_offsets:{x:number,y:number}[/* sheet id */] = []

    eventListener?:(eventName:string)=>void
    anmEndEventListener?:()=>void
    imgLoadListener?:()=>void

    constructor(json:Actor, img_url_builder:(url:string,replaced:boolean)=>string,spritesheet_overwrite:(sprite_id:number)=>string, onloadimg:()=>void){
        this.anm2 = json

        for(let sheet of this.anm2.content?.Spritesheets || []){
            this.sprites[sheet.Id] = sheet.Path || 'unknown'
        }

        for(let layer of this.anm2.content?.Layers || []){
            this.layers[layer.Id] = layer
        }

        for(let evt of this.anm2.content?.Events || []){
            this.events[evt.Id] = evt.Name
        }

        
        for(let anm of this.anm2.animations?.animation || []){
            this.loadAnmObject(anm)
        }
        this.setFrame(this.anm2.animations?.DefaultAnimation || '', 0)

        this.img_url_builder = img_url_builder
        for(let i=0;i<(this.anm2.content?.Spritesheets?.length || 0);i++){
            this.loadSpritesheet(i,spritesheet_overwrite)
        }

        this.imgLoadListener = onloadimg
        
    }

    private loadAnimationFrames(anms:Frame[], length:number):FrameStatus[]{
        let ret = new Array(length)
        let fi=0
        for(let findex =0;findex < anms.length;findex++){
            let frame = anms[findex]
            if(frame.Interpolated && findex + 1 < anms.length){
                for(let d=0;d<frame.Delay;d++){
                    ret[fi++] = FrameStatus.Interp(frame, anms[findex+1], d / frame.Delay)
                }
            }else{
                let temp = new FrameStatus()
                temp.copyFrom(frame)
                for(let d=0;d<frame.Delay;d++){
                    ret[fi++]=temp
                }
            }
        }
        while(fi > 0 && fi < length){
            ret[fi] = ret[fi-1]
            fi++
        }
        return ret
    }

    static svgRoot?:Element
    public static createSvgFilterElement(R:number,G:number,B:number,A:number,RO:number,GO:number,BO:number){
        let NS = "http://www.w3.org/2000/svg"
        if(AnmPlayer.svgRoot == undefined){
            AnmPlayer.svgRoot = document.createElementNS(NS,"svg")
            AnmPlayer.svgRoot.setAttribute("style","display:none")
            document.body.appendChild(AnmPlayer.svgRoot)
        }
        let filter = document.createElementNS(NS,"filter")
        let id = "AnmPlayerSvgFilter_"+(AnmPlayer.svgfilter_incrid++)
        filter.setAttribute("id", id)
        let colormat = document.createElementNS(NS,"feColorMatrix")
        colormat.setAttribute("in","SourceGraphic")
        colormat.setAttribute("type","matrix")
        colormat.setAttribute("color-interpolation-filters","sRGB")
        let mat = ""
        mat += R + " 0 0 0 " + RO + "\n"
        mat += "0 " + G + " 0 0 " + GO + "\n"
        mat += "0 0 " + B + " 0 " + BO + "\n"
        mat += "0 0 0 " + A + " 0"
        colormat.setAttribute("values",mat)
        filter.appendChild(colormat)
        AnmPlayer.svgRoot.appendChild(filter)
        return id
    }

    private loadAnmObject(anm:PAnimation){
        let rootframes = this.loadAnimationFrames(anm.RootAnimation, anm.FrameNum)
        let layerframes:LayerStatus[] = new Array(anm.LayerAnimations.length)
        for(let j=0;j<anm.LayerAnimations.length;j++){
            let layer = new LayerStatus()
            layer.Visible = anm.LayerAnimations[j].Visible
            layer.frames = this.loadAnimationFrames(anm.LayerAnimations[j].frames, anm.FrameNum)
            layer.LayerId = anm.LayerAnimations[j].LayerId
            layerframes[j] = layer
        }

        let nullframes:LayerStatus[] = new Array(anm.NullAnimations.length)
        for(let j=0;j<anm.NullAnimations.length;j++){
            let layer = new LayerStatus()
            layer.Visible = anm.NullAnimations[j].Visible
            layer.frames = this.loadAnimationFrames(anm.NullAnimations[j].frames, anm.FrameNum)
            layer.LayerId = anm.NullAnimations[j].NullId
            nullframes[j] = layer
        }
        
        let events:(string|null)[] = new Array(anm.FrameNum)
        for(let trig of anm.Triggers){
            events[trig.AtFrame] = this.events[trig.EventId]
        }

        this.frames.set(anm.Name || "", {
            rootframes:rootframes,
            frames:layerframes,
            Loop:anm.Loop,
            FrameNum:anm.FrameNum,
            events:events,
            name:anm.Name || '',
            nullFrames:nullframes
        })
    }

    private loadAnm(name:string){
        if(!this.frames.has(name)){
            let anms = this.anm2.animations?.animation
            if(anms){
                for(let i=0;i<anms.length;i++){
                    if(anms[i].Name == name){
                        // load
                        this.loadAnmObject(anms[i])
                    }
                }
            }
        }
    }

    public setFrame(name:string, frame:number){
        this.currentAnm = this.frames.get(name)
        this.play(frame)
    }

    public play(frame:number){
        if(this.currentAnm){
            this.currentFrame = frame
            if(this.currentFrame < 0){
                this.currentFrame = 0
            }
            if(this.currentFrame >= this.currentAnm.FrameNum){
                if(this.currentAnm.Loop){
                    this.currentFrame %= this.currentAnm.FrameNum
                }else{
                    this.currentFrame = this.currentAnm.FrameNum - 1
                }
            }    
        }
    }

    public setEndEventListener(listener:()=>void){
        this.anmEndEventListener = listener
    }

    public update(){
        if(this.currentAnm){
            if(this.revert){
                this.currentFrame--
                if(this.currentFrame < 0){
                    if(this.currentAnm.Loop || this.forceLoop){
                        this.currentFrame = this.currentAnm.FrameNum - 1
                    }else{
                        this.currentFrame = 0
                    }
                    if(this.anmEndEventListener){
                        this.anmEndEventListener()
                    }
                }
            }else{
                this.currentFrame++
                if(this.currentFrame >= this.currentAnm.FrameNum){
                    if(this.currentAnm.Loop || this.forceLoop){
                        this.currentFrame = 0
                    }else{
                        this.currentFrame--
                    }
                    if(this.anmEndEventListener){
                        this.anmEndEventListener()
                    }
                }
            }
        }else{
            return
        }

        //handle event
        let eventname = this.currentAnm?.events[this.currentFrame]
        if(eventname){
           this.eventListener?.call(undefined,eventname) 
        }
    }

    img_url_builder:(name:string,replaced:boolean)=>string

    private loadSpritesheet(i:number, overwiter?:(id:number)=>string){
        let img = this.sprites_htmlimg[i]
        if(img == undefined){
            let replaced_url = overwiter && overwiter(i)
            let imgpath = replaced_url ||this.sprites[i]
            img = document.createElement("img")
            img.src = this.img_url_builder(imgpath,replaced_url != undefined)
            img.setAttribute('style',"image-rendering: pixelated; display:none;")
            img.onload = ()=>{
                img.setAttribute("img_loaded","true")
                if(this.imgLoadListener){
                    this.imgLoadListener()
                }
            }
            
            this.sprites_htmlimg[i] = img
            document.body.appendChild(img)
        }
        return img
    }

    debug_anchor:boolean = false
    

    public drawCanvas(ctx:CanvasRenderingContext2D, canvas:HTMLCanvasElement, centerX?:number, centerY?:number, rootScale?:number,layer_name?:string,transformFrame?:FrameStatus){
        ctx.save()

        ctx.setTransform(1,0,0,1,0,0)
        // ctx.clearRect(0,0,canvas.width, canvas.height)
        // ctx.beginPath()
        // ctx.strokeRect(0,0,canvas.width,canvas.height)

        //root transform
        if(centerX == undefined){
            centerX = canvas.width / 2
        }
        if(centerY == undefined){
            centerY = canvas.height/2
        }
        if(rootScale == undefined){
            rootScale = 1
        }
        

        let rootframe = this.currentAnm?.rootframes[this.currentFrame]


        ctx.translate(centerX, centerY)

        ctx.scale(this.flipX ? -rootScale:rootScale,rootScale)

        if(rootframe){
            ctx.translate(rootframe.XPosition, rootframe.YPosition)
            ctx.rotate(rootframe.Rotation * Math.PI / 180)
            ctx.scale(rootframe.XScale/100, rootframe.YScale/100)
        }

        if(transformFrame){
            ctx.translate(transformFrame.XPosition, transformFrame.YPosition)
            ctx.rotate(transformFrame.Rotation * Math.PI / 180)
            ctx.scale(transformFrame.XScale/100, transformFrame.YScale/100)
        }

        if(this.debug_anchor){
            ctx.beginPath()
            ctx.arc(0,0,5,0,Math.PI/2)
            ctx.fillStyle='blue'
            ctx.fill()
        }


        //layer transform
        for(let i=0;i<(this.currentAnm?.frames.length || 0);i++){

            let layer = this.currentAnm?.frames[i]
            if(layer_name){
                if(this.getLayerName(layer? layer.LayerId : -1) != layer_name){
                    continue
                }
            }
            if(layer?.Visible){
                let frame = layer.frames[this.currentFrame]
                if(frame && frame.Visible){
                    ctx.save()

                    let sprite_sheet_id = this.layers[layer.LayerId].SpritesheetId

                    let img = this.loadSpritesheet(sprite_sheet_id)


                    ctx.translate(frame.XPosition, frame.YPosition)
                    ctx.rotate(frame.Rotation * Math.PI / 180)
                    // ctx.translate(-canvas.width/2,-canvas.height/2)
                    ctx.scale(frame.XScale/100, frame.YScale/100)
                    // ctx.translate(canvas.width/2,canvas.height/2)

                    ctx.translate(-frame.XPivot, -frame.YPivot)

                    //apply root transform

                    //draw frame
                    if(!frame.filterGenerated){
                        frame.filterGenerated = true
                        frame.filterId = 'url(#' + AnmPlayer.createSvgFilterElement(
                            (rootframe?.RedTint || 255) * frame.RedTint     /(255*255),
                            (rootframe?.GreenTint || 255) * frame.GreenTint     /(255*255),
                            (rootframe?.BlueTint || 255) * frame.BlueTint       /(255*255),
                            (rootframe?.AlphaTint || 255) * frame.AlphaTint     /(255*255),
                            frame.RedOffset/255,
                            frame.GreenOffset/255,
                            frame.BlueOffset/255
                        ) + ')'
                    }

                    ctx.filter = frame.filterId || 'none'
                    ctx.globalAlpha = 1

                    let sheet_offset_x = 0,sheet_offset_y = 0
                    let sheet_offset = this.sheet_offsets[sprite_sheet_id]
                    if(sheet_offset!=undefined){
                        sheet_offset_x = sheet_offset.x
                        sheet_offset_y = sheet_offset.y
                    }

                    ctx.drawImage(img,frame.XCrop + sheet_offset_x,frame.YCrop + sheet_offset_y, frame.Width, frame.Height,0,0, frame.Width, frame.Height)

                    if(this.debug_anchor){
                        ctx.beginPath()
                        ctx.arc(frame.XPivot,frame.YPivot,5,0,Math.PI/2)
                        ctx.fillStyle = 'green'
                        ctx.fill()
                        
                    }
                    ctx.restore()
                }
            }
        }
        ctx.restore()
    }

    public getAnmNames():string[]{
        let ret:string[] = []

        for(let anm of this.anm2.animations?.animation || []){
            ret.push(anm.Name || '')
        }
        return ret
    }
    public getCurrentAnmName():string{
        return this.currentAnm?.name || ''
    }
    public getFps():number{
        return this.anm2.info?.Fps || 30
    }

    public getDefaultAnmName():string{
        return this.anm2.animations?.DefaultAnimation || ''
    }
    public getLayerName(layerId:number):string|undefined{
        for(let layer of this.anm2.content?.Layers || []){
            if(layer.Id == layerId){
                return layer.Name || undefined
            }
        }
        return undefined
    }

    public getLayerByName(name:string):LayerStatus|undefined{
        let layer_id = undefined
        for(let layer of this.anm2.content?.Layers || []){
            if(layer.Name == name){
                layer_id = layer.Id
                break
            }
        }
        if(layer_id != undefined){
            for(let frame of this.currentAnm?.frames || []){
                if(frame.LayerId == layer_id){
                    return frame
                }
            }
        }
        return undefined
    }
    public static expandActor(target:any, keymap:any){
        if(typeof(target) != "object"){
            return
        }
        for(let i=0;i<target.length;i++){
            this.expandActor(target[i],keymap)
        }
        
        for(let k in keymap){
            if(k.length == 1 && typeof(keymap[k]) == "string" && target[k] != undefined){
                this.expandActor(target[k],keymap)
                target[keymap[k]] = target[k]
                target[k] = undefined
            }
        }
    }

    private static SKIN_ALT_NAME = ['_white','_black','_blue','_red','_green','_grey']
    public static processSkinAlt(target:Actor, skinAlt:number, firstOnly:boolean = false){
        if(skinAlt >=0 && skinAlt < AnmPlayer.SKIN_ALT_NAME.length){
            for(let sprite of target.content?.Spritesheets || []){
                if(firstOnly && sprite.Id != 0){
                    continue
                }
                if(sprite.Path && sprite.Path.endsWith('.png')){
                    sprite.Path = sprite.Path.substring(0,sprite.Path.length - 4) + this.SKIN_ALT_NAME[skinAlt] + '.png'
                }
            }
        }
    }
    private static COSTUME_STEP = ["glow","back","body","body0","body1","head","head0","head1","head2","head3","head4","head5","top0","extra","ghost"]

    public static renderCostume(anmA:CostumeInfo[],anmB:CostumeInfo[]|undefined,anmC:CostumeInfo[]|undefined,ctx:CanvasRenderingContext2D, canvas:HTMLCanvasElement, centerX:number, centerY:number, rootScale:number,shootFrame:number,walkFrame:number){
        //anmA is leg,anmB is head
        let step_draw_candidates = new Map<string,(CostumeInfo|undefined)[]>()

        let headTransformLayer = undefined
        //setup steps for anmA
        for(let step of this.COSTUME_STEP){
            for(let info of anmA){
                for(let layer of info.player.currentAnm?.frames || []){
                    if(info.player.getLayerName(layer.LayerId) == step){
                        //动画中包含目标图层
                        if(layer.frames[0]){
                            step_draw_candidates.set(step,[info])
                        }
                    }
                }

                /** begin:HeadTransform **/
                let nulllayer_id = undefined
                for(let nulllayer of info.player.anm2.content?.Nulls || []){
                    if(nulllayer.Name == "HeadTransform"){
                        nulllayer_id = nulllayer.Id
                    }
                }
                if(nulllayer_id != undefined){
                    for(let nulllayer of info.player.currentAnm?.nullFrames ||[]){
                        if(nulllayer.LayerId == nulllayer_id){
                            headTransformLayer = nulllayer
                        }
                    }
                }
                /* end:HeadTransform*/

            }
        }
        //setup steps for anmB
        if(anmB){
            for(let step of this.COSTUME_STEP){
                for(let info of anmB){
                    for(let layer of info.player.currentAnm?.frames || []){
                        if(info.player.getLayerName(layer.LayerId) == step){
                            //动画中包含目标图层
                            if(layer.frames[0]){
                                if(step_draw_candidates.has(step)){
                                    (step_draw_candidates.get(step) || [])[1] = info
                                }else{
                                    step_draw_candidates.set(step,[undefined, info])
                                }
                            }
                        }
                    }
                }
            }
        }
        //setup steps for anmC
        if(anmC){
            for(let step of this.COSTUME_STEP){
                for(let info of anmC){
                    for(let layer of info.player.currentAnm?.frames || []){
                        if(info.player.getLayerName(layer.LayerId) == step){
                            //动画中包含目标图层
                            if(layer.frames[0]){
                                if(step_draw_candidates.has(step)){
                                    (step_draw_candidates.get(step) || [])[2] = info
                                }else{
                                    step_draw_candidates.set(step,[undefined, undefined, info])
                                }
                            }
                        }
                    }
                }
            }
        }
        let head_transform = undefined

        for(let step of this.COSTUME_STEP){
            if(step_draw_candidates.has(step)){
                let players = step_draw_candidates.get(step)
                for(let draw_anm = 0;draw_anm <= 2;draw_anm++){
                    let player = (players && players[draw_anm])?.player
                    if(player){
                        let old_frame = undefined
                        //let head_transform = undefined
                        if(step.startsWith("body")){
                            old_frame = player.currentFrame
                            player.play(walkFrame % (player.currentAnm?.FrameNum || 100000))
                            if(draw_anm == 0 /* leg */ && headTransformLayer){
                                head_transform = headTransformLayer.frames[player.currentFrame]
                            }
                        }
                        if(step.startsWith("head") && !player.currentAnm?.Loop){
                            old_frame = player.currentFrame
                            player.play(shootFrame % (player.currentAnm?.FrameNum || 100000))
                        }
                        /* fallback:HeadLeft -> HeadLeft_Idle */
                        let fallback_restore = undefined
                        if(players && players[draw_anm]?.head_has_idle && step == "head"){
                            let frames = player.getLayerByName("head")?.frames
                            //c340
                            if(frames != undefined && (player.currentFrame < frames.length && frames[player.currentFrame].Visible == false)){
                                fallback_restore = player.currentAnm
                                player.setFrame(player.getCurrentAnmName() + "_Idle",player.currentFrame)
                            }
                        }
                        if(step.startsWith("head")){
                            player.drawCanvas(ctx,canvas,centerX,centerY,rootScale,step,head_transform)
                        }else{
                            player.drawCanvas(ctx,canvas,centerX,centerY,rootScale,step,undefined)
                        }

                        if(fallback_restore){
                            player.currentAnm = fallback_restore
                        }

                        if(old_frame != undefined){
                            player.currentFrame = old_frame
                        }
                    }
                }
            }
        }
    }
}
interface CostumeInfo{
    player:AnmPlayer,
    head_has_idle:boolean,
    /* steps[step][layer] == anmarray_index */
}

