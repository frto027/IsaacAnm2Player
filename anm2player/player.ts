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

    //我们通过imageBitmap来实现Timt和Offset的功能
    //null means it doesn't need image data
    bufferedImageBitmapParsed:boolean = false
    bufferedImageBitmap?:ImageBitmap

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
}


class AnmPlayer{
    anm2:Actor
    
    sprites:string[] = new Array() /* spriteid -> sprite path */
    sprites_htmlimg:HTMLImageElement[] = new Array()
    layers:Layer[/* layer id */] = new Array()
    events:string[/* event id */] = new Array()

    currentFrame:number = -1
    currentAnm?:LoadedAnms

    frames:Map</* anim name */string,LoadedAnms> = new Map()

    forceLoop:boolean = false

    eventListener?:(eventName:string)=>void
    anmEndEventListener?:()=>void

    constructor(json:Actor, img_url_builder:(url:string)=>string){
        this.anm2 = json//JSON.parse(json)

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
            this.loadSpritesheet(i)
        }
        
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

    private loadImageData(root:FrameStatus | undefined, layer:FrameStatus, img:HTMLImageElement, ctx:CanvasRenderingContext2D){
        if(img.getAttribute("img_loaded") != "true"){
            return
        }

        if(layer.bufferedImageBitmapParsed)
            return
        
        if(
            (
                !root || (
                root.AlphaTint == 255 &&
                root.RedTint == 255 &&
                root.BlueTint == 255 &&
                root.GreenTint == 255 &&
                root.RedOffset == 0 &&
                root.BlueOffset == 0 &&
                root.GreenOffset == 0  
                )
            )&&

            layer.AlphaTint == 255 &&
            layer.RedTint == 255 &&
            layer.BlueTint == 255 &&
            layer.GreenTint == 255 &&
            layer.RedOffset == 0 &&
            layer.BlueOffset == 0 &&
            layer.GreenOffset == 0
            ){
                layer.bufferedImageBitmapParsed = true
                //no need to load image bitmap
                return
        }

        let olddata = ctx.getImageData(0,0,layer.Width,layer.Height)
        ctx.save()

        ctx.setTransform(1,0,0,1,0,0)
        
        ctx.clearRect(0,0,layer.Width,layer.Height)
        ctx.drawImage(img, layer.XCrop, layer.YCrop, layer.Width, layer.Height, 0,0,layer.Width, layer.Height)
        let idata = ctx.getImageData(0,0,layer.Width,layer.Height)

        ctx.restore()
        ctx.putImageData(olddata, 0,0)

        let ATint = (root?.AlphaTint || 255) * layer.AlphaTint / (255 * 255)
        let RTint = (root?.RedTint || 255) * layer.RedTint / (255 * 255)
        let GTint = (root?.GreenTint || 255) * layer.GreenTint / (255 * 255)
        let BTint = (root?.BlueTint || 255) * layer.RedTint / (255 * 255)
        let Roff = (root?.RedOffset || 0) + layer.RedOffset
        let Goff = (root?.GreenOffset || 0) + layer.GreenOffset
        let Boff = (root?.BlueOffset || 0) + layer.BlueOffset

        for(let i=0;i<idata.width * idata.height;i++){
            idata.data[i*4 + 0] = Math.min((Math.floor(idata.data[i*4+0] * RTint) + Roff), 255)
            idata.data[i*4 + 1] = Math.min((Math.floor(idata.data[i*4+1] * GTint) + Goff), 255)
            idata.data[i*4 + 2] = Math.min((Math.floor(idata.data[i*4+2] * BTint) + Boff), 255)
            idata.data[i*4 + 3] = Math.floor(idata.data[i*4+3] * ATint)
        }

        layer.bufferedImageBitmapParsed = true //接下来的转换是异步的，为防止重入，此后不处理这一帧的数据

        window.createImageBitmap(idata).then(function(bitmap){
            layer.bufferedImageBitmap = bitmap
        })
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
            name:anm.Name || ''
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
            if(this.currentFrame > this.currentAnm.FrameNum){
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
        }else{
            return
        }
        /*
        if(this.currentAnm && (this.currentAnm.Loop || this.forceLoop)){
            this.currentFrame = (this.currentFrame + 1) % this.currentAnm.FrameNum
        }else if(this.currentFrame < (this.currentAnm?.FrameNum || 0)){
            this.currentFrame = this.currentFrame + 1
        }else{
            return
        }
        */

        //handle event
        let eventname = this.currentAnm?.events[this.currentFrame]
        if(eventname){
           this.eventListener?.call(undefined,eventname) 
        }
    }

    img_url_builder:(name:string)=>string

    private loadSpritesheet(i:number){
        let img = this.sprites_htmlimg[i]
        if(img == undefined){
            let imgpath = this.sprites[i]
            img = document.createElement("img")
            img.src = this.img_url_builder(imgpath)
            img.setAttribute('style',"image-rendering: pixelated; display:none;")
            img.onload = function(){
                img.setAttribute("img_loaded","true")
            }
            this.sprites_htmlimg[i] = img
            document.body.appendChild(img)
        }
        return img
    }

    debug_anchor:boolean = false
    

    public drawCanvas(ctx:CanvasRenderingContext2D, canvas:HTMLCanvasElement, centerX?:number, centerY?:number, rootScale?:number){
        ctx.save()

        ctx.setTransform(1,0,0,1,0,0)
        //ctx.clearRect(0,0,canvas.width, canvas.height)
        // ctx.beginPath()
        ctx.strokeRect(0,0,canvas.width,canvas.height)

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

        ctx.scale(rootScale,rootScale)

        if(rootframe){
            ctx.translate(rootframe.XPosition, rootframe.YPosition)
            ctx.rotate(rootframe.Rotation * Math.PI / 180)
            ctx.scale(rootframe.XScale/100, rootframe.YScale/100)
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
            if(layer?.Visible){
                let frame = layer.frames[this.currentFrame]
                if(frame && frame.Visible){
                    ctx.save()

                    let img = this.loadSpritesheet(this.layers[layer.LayerId].SpritesheetId)


                    ctx.translate(frame.XPosition, frame.YPosition)
                    ctx.rotate(frame.Rotation * Math.PI / 180)
                    // ctx.translate(-canvas.width/2,-canvas.height/2)
                    ctx.scale(frame.XScale/100, frame.YScale/100)
                    // ctx.translate(canvas.width/2,canvas.height/2)

                    ctx.translate(-frame.XPivot, -frame.YPivot)

                    //apply root transform

                    //draw frame
                    if(!frame.bufferedImageBitmapParsed){
                        this.loadImageData(rootframe, frame, img, ctx)
                    }

                    if(frame.bufferedImageBitmap){
                        ctx.globalAlpha = 1
                        ctx.drawImage(frame.bufferedImageBitmap,0,0, frame.Width, frame.Height,0,0, frame.Width, frame.Height)
                    }else{
                        ctx.globalAlpha = frame.AlphaTint / 255
                        ctx.drawImage(img,frame.XCrop,frame.YCrop, frame.Width, frame.Height,0,0, frame.Width, frame.Height)
                    }
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
}

