RLQ.push(function () {

    /* ========= */
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
        constructor(json, img_url_builder) {
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
            this.img_url_builder = img_url_builder;
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
        loadSpritesheet(i) {
            let img = this.sprites_htmlimg[i];
            if (img == undefined) {
                let imgpath = this.sprites[i];
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
        }
        drawCanvas(ctx, canvas, centerX, centerY, rootScale) {
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

    /* ===================================== */
    function md5(md5str) {
        var createMD5String = function (string) {
            var x = Array();
            var k, AA, BB, CC, DD, a, b, c, d;
            var S11 = 7,
                S12 = 12,
                S13 = 17,
                S14 = 22;
            var S21 = 5,
                S22 = 9,
                S23 = 14,
                S24 = 20;
            var S31 = 4,
                S32 = 11,
                S33 = 16,
                S34 = 23;
            var S41 = 6,
                S42 = 10,
                S43 = 15,
                S44 = 21;
            string = uTF8Encode(string);
            x = convertToWordArray(string);
            a = 0x67452301;
            b = 0xefcdab89;
            c = 0x98badcfe;
            d = 0x10325476;
            for (k = 0; k < x.length; k += 16) {
                AA = a;
                BB = b;
                CC = c;
                DD = d;
                a = FF(a, b, c, d, x[k + 0], S11, 0xd76aa478);
                d = FF(d, a, b, c, x[k + 1], S12, 0xe8c7b756);
                c = FF(c, d, a, b, x[k + 2], S13, 0x242070db);
                b = FF(b, c, d, a, x[k + 3], S14, 0xc1bdceee);
                a = FF(a, b, c, d, x[k + 4], S11, 0xf57c0faf);
                d = FF(d, a, b, c, x[k + 5], S12, 0x4787c62a);
                c = FF(c, d, a, b, x[k + 6], S13, 0xa8304613);
                b = FF(b, c, d, a, x[k + 7], S14, 0xfd469501);
                a = FF(a, b, c, d, x[k + 8], S11, 0x698098d8);
                d = FF(d, a, b, c, x[k + 9], S12, 0x8b44f7af);
                c = FF(c, d, a, b, x[k + 10], S13, 0xffff5bb1);
                b = FF(b, c, d, a, x[k + 11], S14, 0x895cd7be);
                a = FF(a, b, c, d, x[k + 12], S11, 0x6b901122);
                d = FF(d, a, b, c, x[k + 13], S12, 0xfd987193);
                c = FF(c, d, a, b, x[k + 14], S13, 0xa679438e);
                b = FF(b, c, d, a, x[k + 15], S14, 0x49b40821);
                a = GG(a, b, c, d, x[k + 1], S21, 0xf61e2562);
                d = GG(d, a, b, c, x[k + 6], S22, 0xc040b340);
                c = GG(c, d, a, b, x[k + 11], S23, 0x265e5a51);
                b = GG(b, c, d, a, x[k + 0], S24, 0xe9b6c7aa);
                a = GG(a, b, c, d, x[k + 5], S21, 0xd62f105d);
                d = GG(d, a, b, c, x[k + 10], S22, 0x2441453);
                c = GG(c, d, a, b, x[k + 15], S23, 0xd8a1e681);
                b = GG(b, c, d, a, x[k + 4], S24, 0xe7d3fbc8);
                a = GG(a, b, c, d, x[k + 9], S21, 0x21e1cde6);
                d = GG(d, a, b, c, x[k + 14], S22, 0xc33707d6);
                c = GG(c, d, a, b, x[k + 3], S23, 0xf4d50d87);
                b = GG(b, c, d, a, x[k + 8], S24, 0x455a14ed);
                a = GG(a, b, c, d, x[k + 13], S21, 0xa9e3e905);
                d = GG(d, a, b, c, x[k + 2], S22, 0xfcefa3f8);
                c = GG(c, d, a, b, x[k + 7], S23, 0x676f02d9);
                b = GG(b, c, d, a, x[k + 12], S24, 0x8d2a4c8a);
                a = HH(a, b, c, d, x[k + 5], S31, 0xfffa3942);
                d = HH(d, a, b, c, x[k + 8], S32, 0x8771f681);
                c = HH(c, d, a, b, x[k + 11], S33, 0x6d9d6122);
                b = HH(b, c, d, a, x[k + 14], S34, 0xfde5380c);
                a = HH(a, b, c, d, x[k + 1], S31, 0xa4beea44);
                d = HH(d, a, b, c, x[k + 4], S32, 0x4bdecfa9);
                c = HH(c, d, a, b, x[k + 7], S33, 0xf6bb4b60);
                b = HH(b, c, d, a, x[k + 10], S34, 0xbebfbc70);
                a = HH(a, b, c, d, x[k + 13], S31, 0x289b7ec6);
                d = HH(d, a, b, c, x[k + 0], S32, 0xeaa127fa);
                c = HH(c, d, a, b, x[k + 3], S33, 0xd4ef3085);
                b = HH(b, c, d, a, x[k + 6], S34, 0x4881d05);
                a = HH(a, b, c, d, x[k + 9], S31, 0xd9d4d039);
                d = HH(d, a, b, c, x[k + 12], S32, 0xe6db99e5);
                c = HH(c, d, a, b, x[k + 15], S33, 0x1fa27cf8);
                b = HH(b, c, d, a, x[k + 2], S34, 0xc4ac5665);
                a = II(a, b, c, d, x[k + 0], S41, 0xf4292244);
                d = II(d, a, b, c, x[k + 7], S42, 0x432aff97);
                c = II(c, d, a, b, x[k + 14], S43, 0xab9423a7);
                b = II(b, c, d, a, x[k + 5], S44, 0xfc93a039);
                a = II(a, b, c, d, x[k + 12], S41, 0x655b59c3);
                d = II(d, a, b, c, x[k + 3], S42, 0x8f0ccc92);
                c = II(c, d, a, b, x[k + 10], S43, 0xffeff47d);
                b = II(b, c, d, a, x[k + 1], S44, 0x85845dd1);
                a = II(a, b, c, d, x[k + 8], S41, 0x6fa87e4f);
                d = II(d, a, b, c, x[k + 15], S42, 0xfe2ce6e0);
                c = II(c, d, a, b, x[k + 6], S43, 0xa3014314);
                b = II(b, c, d, a, x[k + 13], S44, 0x4e0811a1);
                a = II(a, b, c, d, x[k + 4], S41, 0xf7537e82);
                d = II(d, a, b, c, x[k + 11], S42, 0xbd3af235);
                c = II(c, d, a, b, x[k + 2], S43, 0x2ad7d2bb);
                b = II(b, c, d, a, x[k + 9], S44, 0xeb86d391);
                a = addUnsigned(a, AA);
                b = addUnsigned(b, BB);
                c = addUnsigned(c, CC);
                d = addUnsigned(d, DD);
            }
            var tempValue = wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d);
            return tempValue.toLowerCase();
        };
        var rotateLeft = function (lValue, iShiftBits) {
            return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits));
        };
        var addUnsigned = function (lX, lY) {
            var lX4, lY4, lX8, lY8, lResult;
            lX8 = lX & 0x80000000;
            lY8 = lY & 0x80000000;
            lX4 = lX & 0x40000000;
            lY4 = lY & 0x40000000;
            lResult = (lX & 0x3fffffff) + (lY & 0x3fffffff);
            if (lX4 & lY4) return lResult ^ 0x80000000 ^ lX8 ^ lY8;
            if (lX4 | lY4) {
                if (lResult & 0x40000000) return lResult ^ 0xc0000000 ^ lX8 ^ lY8;
                else return lResult ^ 0x40000000 ^ lX8 ^ lY8;
            } else {
                return lResult ^ lX8 ^ lY8;
            }
        };
        var F = function (x, y, z) {
            return (x & y) | (~x & z);
        };
        var G = function (x, y, z) {
            return (x & z) | (y & ~z);
        };
        var H = function (x, y, z) {
            return x ^ y ^ z;
        };
        var I = function (x, y, z) {
            return y ^ (x | ~z);
        };
        var FF = function (a, b, c, d, x, s, ac) {
            a = addUnsigned(a, addUnsigned(addUnsigned(F(b, c, d), x), ac));
            return addUnsigned(rotateLeft(a, s), b);
        };
        var GG = function (a, b, c, d, x, s, ac) {
            a = addUnsigned(a, addUnsigned(addUnsigned(G(b, c, d), x), ac));
            return addUnsigned(rotateLeft(a, s), b);
        };
        var HH = function (a, b, c, d, x, s, ac) {
            a = addUnsigned(a, addUnsigned(addUnsigned(H(b, c, d), x), ac));
            return addUnsigned(rotateLeft(a, s), b);
        };
        var II = function (a, b, c, d, x, s, ac) {
            a = addUnsigned(a, addUnsigned(addUnsigned(I(b, c, d), x), ac));
            return addUnsigned(rotateLeft(a, s), b);
        };
        var convertToWordArray = function (string) {
            var lWordCount;
            var lMessageLength = string.length;
            var lNumberOfWordsTempOne = lMessageLength + 8;
            var lNumberOfWordsTempTwo = (lNumberOfWordsTempOne - (lNumberOfWordsTempOne % 64)) / 64;
            var lNumberOfWords = (lNumberOfWordsTempTwo + 1) * 16;
            var lWordArray = Array(lNumberOfWords - 1);
            var lBytePosition = 0;
            var lByteCount = 0;
            while (lByteCount < lMessageLength) {
                lWordCount = (lByteCount - (lByteCount % 4)) / 4;
                lBytePosition = (lByteCount % 4) * 8;
                lWordArray[lWordCount] = lWordArray[lWordCount] | (string.charCodeAt(lByteCount) << lBytePosition);
                lByteCount++;
            }
            lWordCount = (lByteCount - (lByteCount % 4)) / 4;
            lBytePosition = (lByteCount % 4) * 8;
            lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition);
            lWordArray[lNumberOfWords - 2] = lMessageLength << 3;
            lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29;
            return lWordArray;
        };
        var wordToHex = function (lValue) {
            var WordToHexValue = '',
                WordToHexValueTemp = '',
                lByte,
                lCount;
            for (lCount = 0; lCount <= 3; lCount++) {
                lByte = (lValue >>> (lCount * 8)) & 255;
                WordToHexValueTemp = '0' + lByte.toString(16);
                WordToHexValue = WordToHexValue + WordToHexValueTemp.substr(WordToHexValueTemp.length - 2, 2);
            }
            return WordToHexValue;
        };
        var uTF8Encode = function (string) {
            string = string.toString().replace(/\x0d\x0a/g, '\x0a');
            var output = '';
            for (var n = 0; n < string.length; n++) {
                var c = string.charCodeAt(n);
                if (c < 128) {
                    output += String.fromCharCode(c);
                } else if (c > 127 && c < 2048) {
                    output += String.fromCharCode((c >> 6) | 192);
                    output += String.fromCharCode((c & 63) | 128);
                } else {
                    output += String.fromCharCode((c >> 12) | 224);
                    output += String.fromCharCode(((c >> 6) & 63) | 128);
                    output += String.fromCharCode((c & 63) | 128);
                }
            }
            return output;
        };
        return createMD5String(md5str);
    }
    /*====================================== */
    var keymap = { "a": "info", "b": "CreatedBy", "c": "CreatedOn", "d": "Fps", "e": "Version", "f": "content", "g": "Spritesheets", "h": "Id", "i": "Path", "j": "Layers", "k": "Name", "l": "SpritesheetId", "m": "Nulls", "n": "Events", "o": "animations", "p": "DefaultAnimation", "q": "animation", "r": "FrameNum", "s": "Loop", "t": "RootAnimation", "u": "XPosition", "v": "YPosition", "w": "Delay", "x": "Visible", "y": "XScale", "z": "YScale", "A": "RedTint", "B": "GreenTint", "C": "BlueTint", "D": "AlphaTint", "E": "RedOffset", "F": "GreenOffset", "G": "BlueOffset", "H": "Rotation", "I": "Interpolated", "J": "LayerAnimations", "K": "frames", "L": "LayerId", "M": "XPivot", "N": "YPivot", "O": "XCrop", "P": "YCrop", "Q": "Width", "R": "Height", "S": "NullAnimations", "T": "NullId", "U": "Triggers", "V": "EventId", "W": "AtFrame" }

    function initplayer(canvasdiv) {
        //players存储页面描述
        var players = []
        //anms存储AmpPlayer
        var anms = []

        for (var i = 0; i < canvasdiv.children.length; i++) {
            var anm = canvasdiv.children[i]
            players.push({
                anm2: "Data:" + (anm.getAttribute("data-anm2").replaceAll('&', '').replaceAll('?', '') || ""),
                name: anm.getAttribute("data-name") || "",
                x: +anm.getAttribute("data-x"),
                y: +anm.getAttribute("data-y"),
            })
        }

        canvasdiv.innerHTML = ''
        var canvas = document.createElement("canvas")
        canvas.width = +canvasdiv.getAttribute("data-width")
        canvas.height = +canvasdiv.getAttribute("data-height")
        canvasdiv.appendChild(canvas)

        filter = { "$or": [] }
        for (var i = 0; i < players.length; i++) {
            filter["$or"].push({ "_id": players[i].anm2 })
        }
        console.log(filter)

        //download anm2
        $.ajax({
            url: "/api/rest_v1/namespace/data",
            method: "GET",
            data: { filter: JSON.stringify(filter) },
            dataType: "json"
        }).done(function (msg) {
            var resources = new Map()
            for (var i = 0; i < msg._embedded.length; i++) {
                AnmPlayer.expandActor(msg._embedded[i], keymap)
                resources.set(msg._embedded[i]._id, msg._embedded[i])
            }
            // console.log(resources)
            for (var i = 0; i < players.length; i++) {
                anms[i] = new AnmPlayer(resources.get(players[i].anm2), function (url) {
                    /* 注意过滤url */
                    url = ("Anm2/" + url).replaceAll("/", "_").replaceAll("?", "").replaceAll("&", "")
                    url = url[0].toUpperCase() + url.substr(1)
                    var hash = md5(url)
                    url = "https://huiji-public.huijistatic.com/isaac/uploads/" + hash[0] + "/" + hash[0] + hash[1] + "/" + url
                    return url
                })
                anms[i].setFrame(players[i].name, 0)
                // anms[i].forceLoop = true
            }

            var commonFps = 1
            for (var i = 0; i < anms.length; i++) {
                if (commonFps < anms[i].getFps()) {
                    commonFps = anms[i].getFps()
                }
            }
            for (; ;) {
                var passed = true
                for (var i = 0; i < anms.length; i++) {
                    if (commonFps % anms[i].getFps() != 0) {
                        passed = false
                        break
                    }
                }
                if (passed) {
                    break
                }
                commonFps++
            }

            var currentFps = 0
            function draw() {
                //update
                for (var i = 0; i < anms.length; i++) {
                    if (currentFps % (commonFps / anms[i].getFps()) == 0) {
                        anms[i].update()
                    }
                }
                currentFps = (currentFps + 1) % commonFps

                //draw
                var ctx = canvas.getContext("2d")

                ctx.setTransform(1, 0, 0, 1, 0, 0)
                ctx.clearRect(0, 0, canvas.width, canvas.height)
                for (var i = anms.length - 1; i >= 0; i--) {
                    anms[i].drawCanvas(ctx, canvas, players[i].x, players[i].y, 2)
                }

                //loop
                setTimeout(draw, 1000 / commonFps)
            }
            draw()
        }).fail(function (jqXHR, textStatus) {
            console.log("anm2 json download failed.", textStatus, jqXHR)
        })

    }

    var canvases = $('.anm2player')

    for (var i = 0; i < canvases.length; i++) {
        initplayer(canvases[i])
    }
})