"use strict";
var FrameStatus = /** @class */ (function () {
    function FrameStatus() {
        this.XPivot = 0;
        this.YPivot = 0;
        this.XCrop = 0;
        this.YCrop = 0;
        this.Width = 0;
        this.Height = 0;
        this.XPosition = 0;
        this.YPosition = 0;
        this.Delay = 0;
        this.Visible = true;
        this.XScale = 0;
        this.YScale = 0;
        this.RedTint = 0;
        this.GreenTint = 0;
        this.BlueTint = 0;
        this.AlphaTint = 0;
        this.RedOffset = 0;
        this.GreenOffset = 0;
        this.BlueOffset = 0;
        this.Rotation = 0;
        this.Interpolated = false;
        //通过SVG Filter实现颜色偏移
        this.filterGenerated = false;
    }
    FrameStatus.prototype.copyFrom = function (other) {
        this.XPivot = other.XPivot;
        this.YPivot = other.YPivot;
        this.XCrop = other.XCrop;
        this.YCrop = other.YCrop;
        this.Width = other.Width;
        this.Height = other.Height;
        this.XPosition = other.XPosition;
        this.YPosition = other.YPosition;
        this.Delay = other.Delay;
        this.Visible = other.Visible;
        this.XScale = other.XScale;
        this.YScale = other.YScale;
        this.RedTint = other.RedTint;
        this.GreenTint = other.GreenTint;
        this.BlueTint = other.BlueTint;
        this.AlphaTint = other.AlphaTint;
        this.RedOffset = other.RedOffset;
        this.GreenOffset = other.GreenOffset;
        this.BlueOffset = other.BlueOffset;
        this.Rotation = other.Rotation;
        this.Interpolated = other.Interpolated;
    };
    FrameStatus.Interp = function (a, b, r) {
        var ret = new FrameStatus();
        ret.XPivot = a.XPivot;
        ret.YPivot = a.YPivot;
        ret.XCrop = a.XCrop;
        ret.YCrop = a.YCrop;
        ret.Width = a.Width;
        ret.Height = a.Height;
        ret.XPosition = (b.XPosition - a.XPosition) * r + a.XPosition;
        ret.YPosition = (b.YPosition - a.YPosition) * r + a.YPosition;
        ret.Delay = (b.Delay - a.Delay) * r + a.Delay;
        ret.Visible = a.Visible;
        ret.XScale = (b.XScale - a.XScale) * r + a.XScale;
        ret.YScale = (b.YScale - a.YScale) * r + a.YScale;
        ret.RedTint = (b.RedTint - a.RedTint) * r + a.RedTint;
        ret.GreenTint = (b.GreenTint - a.GreenTint) * r + a.GreenTint;
        ret.BlueTint = (b.BlueTint - a.BlueTint) * r + a.BlueTint;
        ret.AlphaTint = (b.AlphaTint - a.AlphaTint) * r + a.AlphaTint;
        ret.RedOffset = (b.RedOffset - a.RedOffset) * r + a.RedOffset;
        ret.GreenOffset = (b.GreenOffset - a.GreenOffset) * r + a.GreenOffset;
        ret.BlueOffset = (b.BlueOffset - a.BlueOffset) * r + a.BlueOffset;
        ret.Rotation = (b.Rotation - a.Rotation) * r + a.Rotation;
        ret.Interpolated = a.Interpolated;
        return ret;
    };
    return FrameStatus;
}());
var LayerStatus = /** @class */ (function () {
    function LayerStatus() {
        this.LayerId = 0;
        this.Visible = false;
        this.frames = [];
    }
    return LayerStatus;
}());
var AnmPlayer = /** @class */ (function () {
    function AnmPlayer(json, img_url_builder) {
        var _a, _b, _c, _d, _e, _f, _g;
        this.sprites = new Array(); /* spriteid -> sprite path */
        this.sprites_htmlimg = new Array();
        this.layers = new Array();
        this.events = new Array();
        this.currentFrame = -1;
        this.frames = new Map();
        this.forceLoop = false;
        this.debug_anchor = false;
        this.anm2 = json; //JSON.parse(json)
        for (var _i = 0, _h = ((_a = this.anm2.content) === null || _a === void 0 ? void 0 : _a.Spritesheets) || []; _i < _h.length; _i++) {
            var sheet = _h[_i];
            this.sprites[sheet.Id] = sheet.Path || 'unknown';
        }
        for (var _j = 0, _k = ((_b = this.anm2.content) === null || _b === void 0 ? void 0 : _b.Layers) || []; _j < _k.length; _j++) {
            var layer = _k[_j];
            this.layers[layer.Id] = layer;
        }
        for (var _l = 0, _m = ((_c = this.anm2.content) === null || _c === void 0 ? void 0 : _c.Events) || []; _l < _m.length; _l++) {
            var evt = _m[_l];
            this.events[evt.Id] = evt.Name;
        }
        for (var _o = 0, _p = ((_d = this.anm2.animations) === null || _d === void 0 ? void 0 : _d.animation) || []; _o < _p.length; _o++) {
            var anm = _p[_o];
            this.loadAnmObject(anm);
        }
        this.setFrame(((_e = this.anm2.animations) === null || _e === void 0 ? void 0 : _e.DefaultAnimation) || '', 0);
        this.img_url_builder = img_url_builder;
        for (var i = 0; i < (((_g = (_f = this.anm2.content) === null || _f === void 0 ? void 0 : _f.Spritesheets) === null || _g === void 0 ? void 0 : _g.length) || 0); i++) {
            this.loadSpritesheet(i);
        }
    }
    AnmPlayer.prototype.loadAnimationFrames = function (anms, length) {
        var ret = new Array(length);
        var fi = 0;
        for (var findex = 0; findex < anms.length; findex++) {
            var frame = anms[findex];
            if (frame.Interpolated && findex + 1 < anms.length) {
                for (var d = 0; d < frame.Delay; d++) {
                    ret[fi++] = FrameStatus.Interp(frame, anms[findex + 1], d / frame.Delay);
                }
            }
            else {
                var temp = new FrameStatus();
                temp.copyFrom(frame);
                for (var d = 0; d < frame.Delay; d++) {
                    ret[fi++] = temp;
                }
            }
        }
        while (fi > 0 && fi < length) {
            ret[fi] = ret[fi - 1];
            fi++;
        }
        return ret;
    };
    AnmPlayer.prototype.createSvgFilterElement = function (R, G, B, A, RO, GO, BO) {
        var NS = "http://www.w3.org/2000/svg";
        if (AnmPlayer.svgRoot == undefined) {
            AnmPlayer.svgRoot = document.createElementNS(NS, "svg");
            document.body.appendChild(AnmPlayer.svgRoot);
        }
        var filter = document.createElementNS(NS, "filter");
        var id = "AnmPlayerSvgFilter_" + (AnmPlayer.svgfilter_incrid++);
        filter.setAttribute("id", id);
        var colormat = document.createElementNS(NS, "feColorMatrix");
        colormat.setAttribute("in", "SourceGraphic");
        colormat.setAttribute("type", "matrix");
        colormat.setAttribute("color-interpolation-filters", "sRGB");
        var mat = "";
        mat += R + " 0 0 0 " + RO + "\n";
        mat += "0 " + G + " 0 0 " + GO + "\n";
        mat += "0 0 " + B + " 0 " + BO + "\n";
        mat += "0 0 0 " + A + " 0";
        colormat.setAttribute("values", mat);
        filter.appendChild(colormat);
        AnmPlayer.svgRoot.appendChild(filter);
        return id;
    };
    /*
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
    */
    AnmPlayer.prototype.loadAnmObject = function (anm) {
        var rootframes = this.loadAnimationFrames(anm.RootAnimation, anm.FrameNum);
        var layerframes = new Array(anm.LayerAnimations.length);
        for (var j = 0; j < anm.LayerAnimations.length; j++) {
            var layer = new LayerStatus();
            layer.Visible = anm.LayerAnimations[j].Visible;
            layer.frames = this.loadAnimationFrames(anm.LayerAnimations[j].frames, anm.FrameNum);
            layer.LayerId = anm.LayerAnimations[j].LayerId;
            layerframes[j] = layer;
        }
        var events = new Array(anm.FrameNum);
        for (var _i = 0, _a = anm.Triggers; _i < _a.length; _i++) {
            var trig = _a[_i];
            events[trig.AtFrame] = this.events[trig.EventId];
        }
        this.frames.set(anm.Name || "", {
            rootframes: rootframes,
            frames: layerframes,
            Loop: anm.Loop,
            FrameNum: anm.FrameNum,
            events: events,
            name: anm.Name || ''
        });
    };
    AnmPlayer.prototype.loadAnm = function (name) {
        var _a;
        if (!this.frames.has(name)) {
            var anms = (_a = this.anm2.animations) === null || _a === void 0 ? void 0 : _a.animation;
            if (anms) {
                for (var i = 0; i < anms.length; i++) {
                    if (anms[i].Name == name) {
                        // load
                        this.loadAnmObject(anms[i]);
                    }
                }
            }
        }
    };
    AnmPlayer.prototype.setFrame = function (name, frame) {
        this.currentAnm = this.frames.get(name);
        this.play(frame);
    };
    AnmPlayer.prototype.play = function (frame) {
        if (this.currentAnm) {
            this.currentFrame = frame;
            if (this.currentFrame < 0) {
                this.currentFrame = 0;
            }
            if (this.currentFrame > this.currentAnm.FrameNum) {
                if (this.currentAnm.Loop) {
                    this.currentFrame %= this.currentAnm.FrameNum;
                }
                else {
                    this.currentFrame = this.currentAnm.FrameNum - 1;
                }
            }
        }
    };
    AnmPlayer.prototype.setEndEventListener = function (listener) {
        this.anmEndEventListener = listener;
    };
    AnmPlayer.prototype.update = function () {
        var _a, _b;
        if (this.currentAnm) {
            this.currentFrame++;
            if (this.currentFrame >= this.currentAnm.FrameNum) {
                if (this.currentAnm.Loop || this.forceLoop) {
                    this.currentFrame = 0;
                }
                else {
                    this.currentFrame--;
                }
                if (this.anmEndEventListener) {
                    this.anmEndEventListener();
                }
            }
        }
        else {
            return;
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
        var eventname = (_a = this.currentAnm) === null || _a === void 0 ? void 0 : _a.events[this.currentFrame];
        if (eventname) {
            (_b = this.eventListener) === null || _b === void 0 ? void 0 : _b.call(undefined, eventname);
        }
    };
    AnmPlayer.prototype.loadSpritesheet = function (i) {
        var img = this.sprites_htmlimg[i];
        if (img == undefined) {
            var imgpath = this.sprites[i];
            img = document.createElement("img");
            img.src = this.img_url_builder(imgpath);
            img.setAttribute('style', "image-rendering: pixelated; display:none;");
            img.onload = function () {
                img.setAttribute("img_loaded", "true");
            };
            this.sprites_htmlimg[i] = img;
            document.body.appendChild(img);
        }
        return img;
    };
    AnmPlayer.prototype.drawCanvas = function (ctx, canvas, centerX, centerY, rootScale) {
        var _a, _b, _c;
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        //ctx.clearRect(0,0,canvas.width, canvas.height)
        // ctx.beginPath()
        ctx.strokeRect(0, 0, canvas.width, canvas.height);
        //root transform
        if (centerX == undefined) {
            centerX = canvas.width / 2;
        }
        if (centerY == undefined) {
            centerY = canvas.height / 2;
        }
        if (rootScale == undefined) {
            rootScale = 1;
        }
        var rootframe = (_a = this.currentAnm) === null || _a === void 0 ? void 0 : _a.rootframes[this.currentFrame];
        ctx.translate(centerX, centerY);
        ctx.scale(rootScale, rootScale);
        if (rootframe) {
            ctx.translate(rootframe.XPosition, rootframe.YPosition);
            ctx.rotate(rootframe.Rotation * Math.PI / 180);
            ctx.scale(rootframe.XScale / 100, rootframe.YScale / 100);
        }
        if (this.debug_anchor) {
            ctx.beginPath();
            ctx.arc(0, 0, 5, 0, Math.PI / 2);
            ctx.fillStyle = 'blue';
            ctx.fill();
        }
        //layer transform
        for (var i = 0; i < (((_b = this.currentAnm) === null || _b === void 0 ? void 0 : _b.frames.length) || 0); i++) {
            var layer = (_c = this.currentAnm) === null || _c === void 0 ? void 0 : _c.frames[i];
            if (layer === null || layer === void 0 ? void 0 : layer.Visible) {
                var frame = layer.frames[this.currentFrame];
                if (frame && frame.Visible) {
                    ctx.save();
                    var img = this.loadSpritesheet(this.layers[layer.LayerId].SpritesheetId);
                    ctx.translate(frame.XPosition, frame.YPosition);
                    ctx.rotate(frame.Rotation * Math.PI / 180);
                    // ctx.translate(-canvas.width/2,-canvas.height/2)
                    ctx.scale(frame.XScale / 100, frame.YScale / 100);
                    // ctx.translate(canvas.width/2,canvas.height/2)
                    ctx.translate(-frame.XPivot, -frame.YPivot);
                    //apply root transform
                    //draw frame
                    if (!frame.filterGenerated) {
                        frame.filterGenerated = true;
                        frame.filterId = 'url(#' + this.createSvgFilterElement(((rootframe === null || rootframe === void 0 ? void 0 : rootframe.RedTint) || 255) * frame.RedTint / (255 * 255), ((rootframe === null || rootframe === void 0 ? void 0 : rootframe.GreenTint) || 255) * frame.GreenTint / (255 * 255), ((rootframe === null || rootframe === void 0 ? void 0 : rootframe.BlueTint) || 255) * frame.BlueTint / (255 * 255), ((rootframe === null || rootframe === void 0 ? void 0 : rootframe.AlphaTint) || 255) * frame.AlphaTint / (255 * 255), frame.RedOffset / 255, frame.GreenOffset / 255, frame.BlueOffset / 255) + ')';
                    }
                    ctx.filter = frame.filterId || '';
                    ctx.globalAlpha = 1;
                    ctx.drawImage(img, frame.XCrop, frame.YCrop, frame.Width, frame.Height, 0, 0, frame.Width, frame.Height);
                    /*
                    if(frame.bufferedImageBitmap){
                        ctx.globalAlpha = 1
                        ctx.drawImage(frame.bufferedImageBitmap,0,0, frame.Width, frame.Height,0,0, frame.Width, frame.Height)
                    }else{
                        ctx.globalAlpha = frame.AlphaTint / 255
                        ctx.drawImage(img,frame.XCrop,frame.YCrop, frame.Width, frame.Height,0,0, frame.Width, frame.Height)
                    }*/
                    if (this.debug_anchor) {
                        ctx.beginPath();
                        ctx.arc(frame.XPivot, frame.YPivot, 5, 0, Math.PI / 2);
                        ctx.fillStyle = 'green';
                        ctx.fill();
                    }
                    ctx.restore();
                }
            }
        }
        ctx.restore();
    };
    AnmPlayer.prototype.getAnmNames = function () {
        var _a;
        var ret = [];
        for (var _i = 0, _b = ((_a = this.anm2.animations) === null || _a === void 0 ? void 0 : _a.animation) || []; _i < _b.length; _i++) {
            var anm = _b[_i];
            ret.push(anm.Name || '');
        }
        return ret;
    };
    AnmPlayer.prototype.getCurrentAnmName = function () {
        var _a;
        return ((_a = this.currentAnm) === null || _a === void 0 ? void 0 : _a.name) || '';
    };
    AnmPlayer.prototype.getFps = function () {
        var _a;
        return ((_a = this.anm2.info) === null || _a === void 0 ? void 0 : _a.Fps) || 30;
    };
    AnmPlayer.expandActor = function (target, keymap) {
        if (typeof (target) != "object") {
            return;
        }
        for (var i = 0; i < target.length; i++) {
            this.expandActor(target[i], keymap);
        }
        for (var k in keymap) {
            if (k.length == 1 && typeof (keymap[k]) == "string" && target[k] != undefined) {
                this.expandActor(target[k], keymap);
                target[keymap[k]] = target[k];
                target[k] = undefined;
            }
        }
    };
    AnmPlayer.svgfilter_incrid = 0;
    return AnmPlayer;
}());
