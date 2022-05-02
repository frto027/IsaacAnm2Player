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
    function AnmPlayer(json, img_url_builder, spritesheet_overwrite) {
        var _a, _b, _c, _d, _e, _f, _g;
        this.sprites = new Array(); /* spriteid -> sprite path */
        this.sprites_htmlimg = new Array();
        this.layers = new Array();
        this.events = new Array();
        this.currentFrame = -1;
        this.frames = new Map();
        this.forceLoop = false;
        this.flipX = false;
        this.debug_anchor = false;
        this.anm2 = json;
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
            this.loadSpritesheet(i, spritesheet_overwrite);
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
        //handle event
        var eventname = (_a = this.currentAnm) === null || _a === void 0 ? void 0 : _a.events[this.currentFrame];
        if (eventname) {
            (_b = this.eventListener) === null || _b === void 0 ? void 0 : _b.call(undefined, eventname);
        }
    };
    AnmPlayer.prototype.loadSpritesheet = function (i, overwiter) {
        var img = this.sprites_htmlimg[i];
        if (img == undefined) {
            var replaced_url = overwiter && overwiter(i);
            var imgpath = replaced_url || this.sprites[i];
            img = document.createElement("img");
            img.src = this.img_url_builder(imgpath, replaced_url != undefined);
            img.setAttribute('style', "image-rendering: pixelated; display:none;");
            img.onload = function () {
                img.setAttribute("img_loaded", "true");
            };
            this.sprites_htmlimg[i] = img;
            document.body.appendChild(img);
        }
        return img;
    };
    AnmPlayer.prototype.drawCanvas = function (ctx, canvas, centerX, centerY, rootScale, layer_name) {
        var _a, _b, _c;
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        // ctx.clearRect(0,0,canvas.width, canvas.height)
        // ctx.beginPath()
        // ctx.strokeRect(0,0,canvas.width,canvas.height)
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
        ctx.scale(this.flipX ? -rootScale : rootScale, rootScale);
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
            if (layer_name) {
                if (this.getLayerName(layer ? layer.LayerId : -1) != layer_name) {
                    continue;
                }
            }
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
                    ctx.filter = frame.filterId || 'none';
                    ctx.globalAlpha = 1;
                    ctx.drawImage(img, frame.XCrop, frame.YCrop, frame.Width, frame.Height, 0, 0, frame.Width, frame.Height);
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
    AnmPlayer.prototype.getDefaultAnmName = function () {
        var _a;
        return ((_a = this.anm2.animations) === null || _a === void 0 ? void 0 : _a.DefaultAnimation) || '';
    };
    AnmPlayer.prototype.getLayerName = function (layerId) {
        var _a;
        for (var _i = 0, _b = ((_a = this.anm2.content) === null || _a === void 0 ? void 0 : _a.Layers) || []; _i < _b.length; _i++) {
            var layer = _b[_i];
            if (layer.Id == layerId) {
                return layer.Name || undefined;
            }
        }
        return undefined;
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
    AnmPlayer.processSkinAlt = function (target, skinAlt, firstOnly) {
        var _a;
        if (firstOnly === void 0) { firstOnly = false; }
        if (skinAlt >= 0 && skinAlt < AnmPlayer.SKIN_ALT_NAME.length) {
            for (var _i = 0, _b = ((_a = target.content) === null || _a === void 0 ? void 0 : _a.Spritesheets) || []; _i < _b.length; _i++) {
                var sprite = _b[_i];
                if (firstOnly && sprite.Id != 0) {
                    continue;
                }
                if (sprite.Path && sprite.Path.endsWith('.png')) {
                    sprite.Path = sprite.Path.substring(0, sprite.Path.length - 4) + this.SKIN_ALT_NAME[skinAlt] + '.png';
                }
            }
        }
    };
    AnmPlayer.renderCostume = function (anmA, anmB, ctx, canvas, centerX, centerY, rootScale, shootFrame, walkFrame) {
        var _a, _b, _c, _d, _e, _f;
        //anmA is head,anmB is Leg
        var step_draw_candidates = new Map();
        //setup steps for anmA
        for (var _i = 0, _g = this.COSTUME_STEP; _i < _g.length; _i++) {
            var step = _g[_i];
            for (var _h = 0, anmA_1 = anmA; _h < anmA_1.length; _h++) {
                var info = anmA_1[_h];
                for (var _j = 0, _k = ((_a = info.player.currentAnm) === null || _a === void 0 ? void 0 : _a.frames) || []; _j < _k.length; _j++) {
                    var layer = _k[_j];
                    if (info.player.getLayerName(layer.LayerId) == step) {
                        //动画中包含目标图层
                        if (layer.frames[0]) {
                            step_draw_candidates.set(step, [info]);
                        }
                    }
                }
            }
        }
        //setup steps for anmB
        if (anmB) {
            for (var _l = 0, _m = this.COSTUME_STEP; _l < _m.length; _l++) {
                var step = _m[_l];
                for (var _o = 0, anmB_1 = anmB; _o < anmB_1.length; _o++) {
                    var info = anmB_1[_o];
                    for (var _p = 0, _q = ((_b = info.player.currentAnm) === null || _b === void 0 ? void 0 : _b.frames) || []; _p < _q.length; _p++) {
                        var layer = _q[_p];
                        if (info.player.getLayerName(layer.LayerId) == step) {
                            //动画中包含目标图层
                            if (layer.frames[0]) {
                                if (step_draw_candidates.has(step)) {
                                    (step_draw_candidates.get(step) || [])[1] = info;
                                }
                                else {
                                    step_draw_candidates.set(step, [undefined, info]);
                                }
                            }
                        }
                    }
                }
            }
        }
        for (var _r = 0, _s = this.COSTUME_STEP; _r < _s.length; _r++) {
            var step = _s[_r];
            if (step_draw_candidates.has(step)) {
                var players = step_draw_candidates.get(step);
                for (var draw_anm = 0; draw_anm <= 1; draw_anm++) {
                    var player = (_c = (players && players[draw_anm])) === null || _c === void 0 ? void 0 : _c.player;
                    if (player) {
                        var old_frame = undefined;
                        if (step.startsWith("body")) {
                            old_frame = player.currentFrame;
                            player.play(walkFrame % (((_d = player.currentAnm) === null || _d === void 0 ? void 0 : _d.FrameNum) || 100000));
                        }
                        if (step.startsWith("head") && !((_e = player.currentAnm) === null || _e === void 0 ? void 0 : _e.Loop)) {
                            old_frame = player.currentFrame;
                            player.play(shootFrame % (((_f = player.currentAnm) === null || _f === void 0 ? void 0 : _f.FrameNum) || 100000));
                        }
                        player.drawCanvas(ctx, canvas, centerX, centerY, rootScale, step);
                        if (old_frame != undefined) {
                            player.currentFrame = old_frame;
                        }
                    }
                }
            }
        }
    };
    AnmPlayer.svgfilter_incrid = 0;
    AnmPlayer.SKIN_ALT_NAME = ['_white', '_black', '_blue', '_red', '_green', '_grey'];
    AnmPlayer.COSTUME_STEP = ["glow", "body", "body0", "body1", "head", "head0", "head1", "head2", "head3", "head4", "head5", "top0", "extra", "ghost", "back"];
    return AnmPlayer;
}());
