"use strict";
class FrameStatus {
    constructor() {
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
        //我们通过imageBitmap来实现Timt和Offset的功能
        //null means it doesn't need image data
        this.bufferedImageBitmapParsed = false;
    }
    copyFrom(other) {
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
    }
    static Interp(a, b, r) {
        let ret = new FrameStatus();
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
    }
}
class LayerStatus {
    constructor() {
        this.LayerId = 0;
        this.Visible = false;
        this.frames = [];
    }
}
class AnmPlayer {
    constructor(json, img_root_url) {
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
        for (let sheet of ((_a = this.anm2.content) === null || _a === void 0 ? void 0 : _a.Spritesheets) || []) {
            this.sprites[sheet.Id] = sheet.Path || 'unknown';
        }
        for (let layer of ((_b = this.anm2.content) === null || _b === void 0 ? void 0 : _b.Layers) || []) {
            this.layers[layer.Id] = layer;
        }
        for (let evt of ((_c = this.anm2.content) === null || _c === void 0 ? void 0 : _c.Events) || []) {
            this.events[evt.Id] = evt.Name;
        }
        for (let anm of ((_d = this.anm2.animations) === null || _d === void 0 ? void 0 : _d.animation) || []) {
            this.loadAnmObject(anm);
        }
        this.setFrame(((_e = this.anm2.animations) === null || _e === void 0 ? void 0 : _e.DefaultAnimation) || '', 0);
        this.img_root_url = img_root_url;
        for (let i = 0; i < (((_g = (_f = this.anm2.content) === null || _f === void 0 ? void 0 : _f.Spritesheets) === null || _g === void 0 ? void 0 : _g.length) || 0); i++) {
            this.loadSpritesheet(i);
        }
    }
    loadAnimationFrames(anms, length) {
        let ret = new Array(length);
        let fi = 0;
        for (let findex = 0; findex < anms.length; findex++) {
            let frame = anms[findex];
            if (frame.Interpolated && findex + 1 < anms.length) {
                for (let d = 0; d < frame.Delay; d++) {
                    ret[fi++] = FrameStatus.Interp(frame, anms[findex + 1], d / frame.Delay);
                }
            }
            else {
                let temp = new FrameStatus();
                temp.copyFrom(frame);
                for (let d = 0; d < frame.Delay; d++) {
                    ret[fi++] = temp;
                }
            }
        }
        while (fi > 0 && fi < length) {
            ret[fi] = ret[fi - 1];
            fi++;
        }
        return ret;
    }
    loadImageData(root, layer, img, ctx) {
        if (img.getAttribute("img_loaded") != "true") {
            return;
        }
        if (layer.bufferedImageBitmapParsed)
            return;
        if ((!root || (root.AlphaTint == 255 &&
            root.RedTint == 255 &&
            root.BlueTint == 255 &&
            root.GreenTint == 255 &&
            root.RedOffset == 0 &&
            root.BlueOffset == 0 &&
            root.GreenOffset == 0)) &&
            layer.AlphaTint == 255 &&
            layer.RedTint == 255 &&
            layer.BlueTint == 255 &&
            layer.GreenTint == 255 &&
            layer.RedOffset == 0 &&
            layer.BlueOffset == 0 &&
            layer.GreenOffset == 0) {
            layer.bufferedImageBitmapParsed = true;
            //no need to load image bitmap
            return;
        }
        let olddata = ctx.getImageData(0, 0, layer.Width, layer.Height);
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, layer.Width, layer.Height);
        ctx.drawImage(img, layer.XCrop, layer.YCrop, layer.Width, layer.Height, 0, 0, layer.Width, layer.Height);
        let idata = ctx.getImageData(0, 0, layer.Width, layer.Height);
        ctx.restore();
        ctx.putImageData(olddata, 0, 0);
        let ATint = ((root === null || root === void 0 ? void 0 : root.AlphaTint) || 255) * layer.AlphaTint / (255 * 255);
        let RTint = ((root === null || root === void 0 ? void 0 : root.RedTint) || 255) * layer.RedTint / (255 * 255);
        let GTint = ((root === null || root === void 0 ? void 0 : root.GreenTint) || 255) * layer.GreenTint / (255 * 255);
        let BTint = ((root === null || root === void 0 ? void 0 : root.BlueTint) || 255) * layer.RedTint / (255 * 255);
        let Roff = ((root === null || root === void 0 ? void 0 : root.RedOffset) || 0) + layer.RedOffset;
        let Goff = ((root === null || root === void 0 ? void 0 : root.GreenOffset) || 0) + layer.GreenOffset;
        let Boff = ((root === null || root === void 0 ? void 0 : root.BlueOffset) || 0) + layer.BlueOffset;
        for (let i = 0; i < idata.width * idata.height; i++) {
            idata.data[i * 4 + 0] = Math.min((Math.floor(idata.data[i * 4 + 0] * RTint) + Roff), 255);
            idata.data[i * 4 + 1] = Math.min((Math.floor(idata.data[i * 4 + 1] * GTint) + Goff), 255);
            idata.data[i * 4 + 2] = Math.min((Math.floor(idata.data[i * 4 + 2] * BTint) + Boff), 255);
            idata.data[i * 4 + 3] = Math.floor(idata.data[i * 4 + 3] * ATint);
        }
        layer.bufferedImageBitmapParsed = true; //接下来的转换是异步的，为防止重入，此后不处理这一帧的数据
        window.createImageBitmap(idata).then(function (bitmap) {
            layer.bufferedImageBitmap = bitmap;
        });
    }
    loadAnmObject(anm) {
        let rootframes = this.loadAnimationFrames(anm.RootAnimation, anm.FrameNum);
        let layerframes = new Array(anm.LayerAnimations.length);
        for (let j = 0; j < anm.LayerAnimations.length; j++) {
            let layer = new LayerStatus();
            layer.Visible = anm.LayerAnimations[j].Visible;
            layer.frames = this.loadAnimationFrames(anm.LayerAnimations[j].frames, anm.FrameNum);
            layer.LayerId = anm.LayerAnimations[j].LayerId;
            layerframes[j] = layer;
        }
        let events = new Array(anm.FrameNum);
        for (let trig of anm.Triggers) {
            events[trig.AtFrame] = this.events[trig.EventId];
        }
        this.frames.set(anm.Name || "", {
            rootframes: rootframes, frames: layerframes, Loop: anm.Loop, FrameNum: anm.FrameNum, events: events
        });
    }
    loadAnm(name) {
        var _a;
        if (!this.frames.has(name)) {
            let anms = (_a = this.anm2.animations) === null || _a === void 0 ? void 0 : _a.animation;
            if (anms) {
                for (let i = 0; i < anms.length; i++) {
                    if (anms[i].Name == name) {
                        // load
                        this.loadAnmObject(anms[i]);
                    }
                }
            }
        }
    }
    setFrame(name, frame) {
        this.currentAnm = this.frames.get(name);
        this.play(frame);
    }
    play(frame) {
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
    }
    update() {
        var _a, _b, _c;
        if (this.currentAnm && (this.currentAnm.Loop || this.forceLoop)) {
            this.currentFrame = (this.currentFrame + 1) % this.currentAnm.FrameNum;
        }
        else if (this.currentFrame < (((_a = this.currentAnm) === null || _a === void 0 ? void 0 : _a.FrameNum) || 0)) {
            this.currentFrame = this.currentFrame + 1;
        }
        else {
            return;
        }
        //handle event
        let eventname = (_b = this.currentAnm) === null || _b === void 0 ? void 0 : _b.events[this.currentFrame];
        if (eventname) {
            (_c = this.eventListener) === null || _c === void 0 ? void 0 : _c.call(undefined, eventname);
        }
    }
    setImgRootUrl(root_url) {
        this.img_root_url = root_url;
    }
    loadSpritesheet(i) {
        let img = this.sprites_htmlimg[i];
        if (img == undefined) {
            let imgpath = this.sprites[i];
            img = document.createElement("img");
            img.src = (this.img_root_url || '') + imgpath;
            img.setAttribute('style', "image-rendering: pixelated; display:none;");
            img.onload = function () {
                img.setAttribute("img_loaded", "true");
            };
            this.sprites_htmlimg[i] = img;
            document.body.appendChild(img);
        }
        return img;
    }
    drawCanvas(ctx, canvas, centerX, centerY, rootScale) {
        var _a, _b, _c;
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
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
        let rootframe = (_a = this.currentAnm) === null || _a === void 0 ? void 0 : _a.rootframes[this.currentFrame];
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
        for (let i = 0; i < (((_b = this.currentAnm) === null || _b === void 0 ? void 0 : _b.frames.length) || 0); i++) {
            let layer = (_c = this.currentAnm) === null || _c === void 0 ? void 0 : _c.frames[i];
            if (layer === null || layer === void 0 ? void 0 : layer.Visible) {
                let frame = layer.frames[this.currentFrame];
                if (frame && frame.Visible) {
                    ctx.save();
                    let img = this.loadSpritesheet(this.layers[layer.LayerId].SpritesheetId);
                    ctx.translate(frame.XPosition, frame.YPosition);
                    ctx.rotate(frame.Rotation * Math.PI / 180);
                    // ctx.translate(-canvas.width/2,-canvas.height/2)
                    ctx.scale(frame.XScale / 100, frame.YScale / 100);
                    // ctx.translate(canvas.width/2,canvas.height/2)
                    ctx.translate(-frame.XPivot, -frame.YPivot);
                    //apply root transform
                    //draw frame
                    if (!frame.bufferedImageBitmapParsed) {
                        this.loadImageData(rootframe, frame, img, ctx);
                    }
                    if (frame.bufferedImageBitmap) {
                        ctx.globalAlpha = 1;
                        ctx.drawImage(frame.bufferedImageBitmap, 0, 0, frame.Width, frame.Height, 0, 0, frame.Width, frame.Height);
                    }
                    else {
                        ctx.globalAlpha = frame.AlphaTint / 255;
                        ctx.drawImage(img, frame.XCrop, frame.YCrop, frame.Width, frame.Height, 0, 0, frame.Width, frame.Height);
                    }
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
    }
    getAnmNames() {
        var _a;
        let ret = [];
        for (let anm of ((_a = this.anm2.animations) === null || _a === void 0 ? void 0 : _a.animation) || []) {
            ret.push(anm.Name || '');
        }
        return ret;
    }
    getFps() {
        var _a;
        return ((_a = this.anm2.info) === null || _a === void 0 ? void 0 : _a.Fps) || 30;
    }
    static expandActor(target, keymap) {
        if (typeof (target) != "object") {
            return;
        }
        for (let i = 0; i < target.length; i++) {
            this.expandActor(target[i], keymap);
        }
        for (let k in keymap) {
            if (k.length == 1 && typeof (keymap[k]) == "string" && target[k] != undefined) {
                this.expandActor(target[k], keymap);
                target[keymap[k]] = target[k];
                target[k] = undefined;
            }
        }
    }
}
