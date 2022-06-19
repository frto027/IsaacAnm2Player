(function(){
function setup_anm2_player() {

    /* ========= */
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
        function AnmPlayer(json, img_url_builder, spritesheet_overwrite, onloadimg) {
            var _a, _b, _c, _d, _e, _f, _g;
            this.sprites = new Array(); /* spriteid -> sprite path */
            this.sprites_htmlimg = new Array();
            this.layers = new Array();
            this.events = new Array();
            this.currentFrame = -1;
            this.frames = new Map();
            this.forceLoop = false;
            this.flipX = false;
            //倒放
            this.revert = false;
            this.sheet_offsets = [];
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
            this.imgLoadListener = onloadimg;
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
        AnmPlayer.createSvgFilterElement = function (R, G, B, A, RO, GO, BO) {
            var NS = "http://www.w3.org/2000/svg";
            if (AnmPlayer.svgRoot == undefined) {
                AnmPlayer.svgRoot = document.createElementNS(NS, "svg");
                AnmPlayer.svgRoot.setAttribute("style", "display:none");
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
            var nullframes = new Array(anm.NullAnimations.length);
            for (var j = 0; j < anm.NullAnimations.length; j++) {
                var layer = new LayerStatus();
                layer.Visible = anm.NullAnimations[j].Visible;
                layer.frames = this.loadAnimationFrames(anm.NullAnimations[j].frames, anm.FrameNum);
                layer.LayerId = anm.NullAnimations[j].NullId;
                nullframes[j] = layer;
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
                name: anm.Name || '',
                nullFrames: nullframes
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
                if (this.currentFrame >= this.currentAnm.FrameNum) {
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
                if (this.revert) {
                    this.currentFrame--;
                    if (this.currentFrame < 0) {
                        if (this.currentAnm.Loop || this.forceLoop) {
                            this.currentFrame = this.currentAnm.FrameNum - 1;
                        }
                        else {
                            this.currentFrame = 0;
                        }
                        if (this.anmEndEventListener) {
                            this.anmEndEventListener();
                        }
                    }
                }
                else {
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
            var _this = this;
            var img = this.sprites_htmlimg[i];
            if (img == undefined) {
                var replaced_url = overwiter && overwiter(i);
                var imgpath = replaced_url || this.sprites[i];
                img = document.createElement("img");
                img.src = this.img_url_builder(imgpath, replaced_url != undefined);
                img.setAttribute('style', "image-rendering: pixelated; display:none;");
                img.onload = function () {
                    img.setAttribute("img_loaded", "true");
                    if (_this.imgLoadListener) {
                        _this.imgLoadListener();
                    }
                };
                this.sprites_htmlimg[i] = img;
                document.body.appendChild(img);
            }
            return img;
        };
        AnmPlayer.prototype.drawCanvas = function (ctx, canvas, centerX, centerY, rootScale, layer_name, transformFrame) {
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
            if (transformFrame) {
                ctx.translate(transformFrame.XPosition, transformFrame.YPosition);
                ctx.rotate(transformFrame.Rotation * Math.PI / 180);
                ctx.scale(transformFrame.XScale / 100, transformFrame.YScale / 100);
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
                        var sprite_sheet_id = this.layers[layer.LayerId].SpritesheetId;
                        var img = this.loadSpritesheet(sprite_sheet_id);
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
                            frame.filterId = 'url(#' + AnmPlayer.createSvgFilterElement(((rootframe === null || rootframe === void 0 ? void 0 : rootframe.RedTint) || 255) * frame.RedTint / (255 * 255), ((rootframe === null || rootframe === void 0 ? void 0 : rootframe.GreenTint) || 255) * frame.GreenTint / (255 * 255), ((rootframe === null || rootframe === void 0 ? void 0 : rootframe.BlueTint) || 255) * frame.BlueTint / (255 * 255), ((rootframe === null || rootframe === void 0 ? void 0 : rootframe.AlphaTint) || 255) * frame.AlphaTint / (255 * 255), frame.RedOffset / 255, frame.GreenOffset / 255, frame.BlueOffset / 255) + ')';
                        }
                        ctx.filter = frame.filterId || 'none';
                        ctx.globalAlpha = 1;
                        var sheet_offset_x = 0, sheet_offset_y = 0;
                        var sheet_offset = this.sheet_offsets[sprite_sheet_id];
                        if (sheet_offset != undefined) {
                            sheet_offset_x = sheet_offset.x;
                            sheet_offset_y = sheet_offset.y;
                        }
                        ctx.drawImage(img, frame.XCrop + sheet_offset_x, frame.YCrop + sheet_offset_y, frame.Width, frame.Height, 0, 0, frame.Width, frame.Height);
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
        AnmPlayer.prototype.getLayerByName = function (name) {
            var _a, _b;
            var layer_id = undefined;
            for (var _i = 0, _c = ((_a = this.anm2.content) === null || _a === void 0 ? void 0 : _a.Layers) || []; _i < _c.length; _i++) {
                var layer = _c[_i];
                if (layer.Name == name) {
                    layer_id = layer.Id;
                    break;
                }
            }
            if (layer_id != undefined) {
                for (var _d = 0, _e = ((_b = this.currentAnm) === null || _b === void 0 ? void 0 : _b.frames) || []; _d < _e.length; _d++) {
                    var frame = _e[_d];
                    if (frame.LayerId == layer_id) {
                        return frame;
                    }
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
        AnmPlayer.renderCostume = function (anmA, anmB, anmC, ctx, canvas, centerX, centerY, rootScale, shootFrame, walkFrame) {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
            //anmA is leg,anmB is head
            var step_draw_candidates = new Map();
            var headTransformLayer = undefined;
            //setup steps for anmA
            for (var _i = 0, _m = this.COSTUME_STEP; _i < _m.length; _i++) {
                var step = _m[_i];
                for (var _o = 0, anmA_1 = anmA; _o < anmA_1.length; _o++) {
                    var info = anmA_1[_o];
                    for (var _p = 0, _q = ((_a = info.player.currentAnm) === null || _a === void 0 ? void 0 : _a.frames) || []; _p < _q.length; _p++) {
                        var layer = _q[_p];
                        if (info.player.getLayerName(layer.LayerId) == step) {
                            //动画中包含目标图层
                            if (layer.frames[0]) {
                                step_draw_candidates.set(step, [info]);
                            }
                        }
                    }
                    /** begin:HeadTransform **/
                    var nulllayer_id = undefined;
                    for (var _r = 0, _s = ((_b = info.player.anm2.content) === null || _b === void 0 ? void 0 : _b.Nulls) || []; _r < _s.length; _r++) {
                        var nulllayer = _s[_r];
                        if (nulllayer.Name == "HeadTransform") {
                            nulllayer_id = nulllayer.Id;
                        }
                    }
                    if (nulllayer_id != undefined) {
                        for (var _t = 0, _u = ((_c = info.player.currentAnm) === null || _c === void 0 ? void 0 : _c.nullFrames) || []; _t < _u.length; _t++) {
                            var nulllayer = _u[_t];
                            if (nulllayer.LayerId == nulllayer_id) {
                                headTransformLayer = nulllayer;
                            }
                        }
                    }
                    /* end:HeadTransform*/
                }
            }
            //setup steps for anmB
            if (anmB) {
                for (var _v = 0, _w = this.COSTUME_STEP; _v < _w.length; _v++) {
                    var step = _w[_v];
                    for (var _x = 0, anmB_1 = anmB; _x < anmB_1.length; _x++) {
                        var info = anmB_1[_x];
                        for (var _y = 0, _z = ((_d = info.player.currentAnm) === null || _d === void 0 ? void 0 : _d.frames) || []; _y < _z.length; _y++) {
                            var layer = _z[_y];
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
            //setup steps for anmC
            if (anmC) {
                for (var _0 = 0, _1 = this.COSTUME_STEP; _0 < _1.length; _0++) {
                    var step = _1[_0];
                    for (var _2 = 0, anmC_1 = anmC; _2 < anmC_1.length; _2++) {
                        var info = anmC_1[_2];
                        for (var _3 = 0, _4 = ((_e = info.player.currentAnm) === null || _e === void 0 ? void 0 : _e.frames) || []; _3 < _4.length; _3++) {
                            var layer = _4[_3];
                            if (info.player.getLayerName(layer.LayerId) == step) {
                                //动画中包含目标图层
                                if (layer.frames[0]) {
                                    if (step_draw_candidates.has(step)) {
                                        (step_draw_candidates.get(step) || [])[2] = info;
                                    }
                                    else {
                                        step_draw_candidates.set(step, [undefined, undefined, info]);
                                    }
                                }
                            }
                        }
                    }
                }
            }
            var head_transform = undefined;
            for (var _5 = 0, _6 = this.COSTUME_STEP; _5 < _6.length; _5++) {
                var step = _6[_5];
                if (step_draw_candidates.has(step)) {
                    var players = step_draw_candidates.get(step);
                    for (var draw_anm = 0; draw_anm <= 2; draw_anm++) {
                        var player = (_f = (players && players[draw_anm])) === null || _f === void 0 ? void 0 : _f.player;
                        if (player) {
                            var old_frame = undefined;
                            //let head_transform = undefined
                            if (step.startsWith("body")) {
                                old_frame = player.currentFrame;
                                player.play(walkFrame % (((_g = player.currentAnm) === null || _g === void 0 ? void 0 : _g.FrameNum) || 100000));
                                if (draw_anm == 0 /* leg */ && headTransformLayer) {
                                    head_transform = headTransformLayer.frames[player.currentFrame];
                                }
                            }
                            if (step.startsWith("head") && !((_h = player.currentAnm) === null || _h === void 0 ? void 0 : _h.Loop)) {
                                old_frame = player.currentFrame;
                                player.play(shootFrame % (((_j = player.currentAnm) === null || _j === void 0 ? void 0 : _j.FrameNum) || 100000));
                            }
                            /* fallback:HeadLeft -> HeadLeft_Idle */
                            var fallback_restore = undefined;
                            if (players && ((_k = players[draw_anm]) === null || _k === void 0 ? void 0 : _k.head_has_idle) && step == "head") {
                                var frames_1 = (_l = player.getLayerByName("head")) === null || _l === void 0 ? void 0 : _l.frames;
                                //c340
                                if (frames_1 != undefined && (player.currentFrame < frames_1.length && frames_1[player.currentFrame].Visible == false)) {
                                    fallback_restore = player.currentAnm;
                                    player.setFrame(player.getCurrentAnmName() + "_Idle", player.currentFrame);
                                }
                            }
                            if (step.startsWith("head")) {
                                player.drawCanvas(ctx, canvas, centerX, centerY, rootScale, step, head_transform);
                            }
                            else {
                                player.drawCanvas(ctx, canvas, centerX, centerY, rootScale, step, undefined);
                            }
                            if (fallback_restore) {
                                player.currentAnm = fallback_restore;
                            }
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
        AnmPlayer.COSTUME_STEP = ["glow", "back", "body", "body0", "body1", "head", "head0", "head1", "head2", "head3", "head4", "head5", "top0", "extra", "ghost"];
        return AnmPlayer;
    }());
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
    var C_SECTION_FRAME_MAP = [
        0,0,0,0,0,0,
        1,1,1,1,
        2,2,2,2,
        3,3,3,3,
        4,4,4
    ]
    function huijiUrlBuilder(url,replaced) {
        /* 注意过滤url */
        var prefix = 'Anm2/'
        if(replaced)
            prefix = ''
        url = (prefix + url).replace(new RegExp("[/ \\?&]","g"), "_")
        url = url[0].toUpperCase() + url.substr(1)
        var hash = md5(url)
        url = "https://huiji-public.huijistatic.com/isaac/uploads/" + hash[0] + "/" + hash[0] + hash[1] + "/" + url
        return url
    }
    function initplayer(canvasdiv) {
        //players存储页面描述
        var players = []
        //anms存储AmpPlayer
        var anms = []
        //记录当前播放器中所有按钮是否被按下
        var btndiv = undefined
        var btns = new Map() /* 按钮名称到状态的映射，未按下为false，按下为function，此function用于重置按钮状态 */
        
        var waiting_for_click = canvasdiv.getAttribute("data-waitkey") == "true"
        var render_as_costume = canvasdiv.getAttribute("data-costume") == "true"
        var costume_A,costume_B,costume_C
        var costumeInfoA,costumeInfoB,costumeInfoC

        var costume_status = 'Walk',costume_status_reset = false
        var costume_leg_dir = 'Down',costume_head_dir = 'Down',costume_shooting = {u:false,d:false,l:false,r:false},
            costume_walking = {u:false,d:false,l:false,r:false} ,costume_shooting_frame=0,costume_walking_frame=0
        if(render_as_costume){
            costume_A = [] /* head */
            costume_B = [] /* body */
            costume_C = [] /* overlay */
            costumeInfoA = []
            costumeInfoB = []
            costumeInfoC = []
        }
        var is_flying = false

        var random_idle_last_update = 0
        var random_idle_anm = undefined
        var random_idle_is_playing = false

        var patch = new Set()
        var PATCH_Neptunus = "neptunus"
        var PATCH_csection = "csection"
        var PATCH_tApollyon = "tApollyon"
        var PATCH_noCharge = 'nocharge'
        var PATCH_randomIdle = "rndIdle"
        var PATCH_blueFilter = "blueFilter"
        var PATCH_noAttack = "noAttack"

        var tapollyon_ring_frame = 0

        var patch_attr = (canvasdiv.getAttribute("data-patch") || '').split(',')
        for(var i=0;i<patch_attr.length;i++){
            patch.add(patch_attr[i])
        }

        //动画此时还没有加载，加载后此变量指向draw函数
        var anmbtn_startdraw = undefined

        for (var i = 0; i < canvasdiv.children.length; i++) {
            var anm = canvasdiv.children[i]

            var rule = []
            var replace_sheet_map = new Map()
            //parse rule
            for (var j = 0; j < anm.children.length; j++) {
                var rules_str = anm.children[j].getAttribute("data-rule")
                if (rules_str && rules_str.length > 0) {
                    rules_str = rules_str.split('|')
                    for (var k = 0; k < rules_str.length; k++) {
                        var rule_str = rules_str[k] // xxx:xxx,xxx:xxx
                        var newrule = new Map()
                        if (rule_str.length > 0) {
                            rule_str = rule_str.split(',')
                            for (var l = 0; l < rule_str.length; l++) {
                                var rule_kv = rule_str[l]// xxx:xxx
                                if (rule_kv.length > 0) {
                                    rule_kv = rule_kv.split(':')
                                    if (rule_kv.length == 2) {
                                        var rule_k = rule_kv[0], rule_v = rule_kv[1]
                                        if (rule_k.length > 0 && rule_v.length > 0) {
                                            newrule.set(rule_k, rule_v)
                                        }
                                    }
                                }
                            }
                        }
                        rule.push(newrule)
                    }
                }
                //parse br
                if(anm.children[j].getAttribute("data-break") == "true"){
                    if(btndiv != undefined){
                        btndiv.appendChild(document.createElement("br"))
                    }
                }
                //parse button
                var btnname_str = anm.children[j].getAttribute("data-btnname")
                var btnreset_count = +anm.children[j].getAttribute("data-reset")
                var btn_istoggle = anm.children[j].getAttribute("data-toggle") == "true"
                var btn_groupname = anm.children[j].getAttribute("data-group")
                var btn_initial_status = anm.children[j].getAttribute("data-init") == "true"
                var btn_hide = anm.children[j].getAttribute("data-hide") == "true"
                if(btnname_str && btnname_str.length > 0){
                    if(btndiv == undefined){
                        btndiv = document.createElement("div")
                        // btndiv.style="margin-bottom:3px"
                    }
                    if(!btns.has(btnname_str)){
                        var nbtn = document.createElement("a")
                        nbtn.href = 'javascript:void(0)'
                        nbtn.innerText = btnname_str
                        if(btn_hide){
                            nbtn.style = "display:none"
                        }else{
                            nbtn.style = 'text-decoration:none;border-radius:4px;'
                        }
                        btndiv.appendChild(nbtn)
                        if(btn_istoggle){
                            (function(btnname,group_name,btn,btn_hide){
                                var is_active
                                function set_active(target){
                                    is_active = target
                                    if(btn_hide)
                                        return
                                    if(is_active){
                                        btn.style = 'text-decoration:none;border-radius:4px;background-color:#d5d4c963'
                                    }else{
                                        btn.style = 'text-decoration:none;border-radius:4px;'
                                    }
                                }
                                set_active(btn_initial_status)


                                btns.set(btnname,{
                                    /* 我们的按钮状态是is_active，通过闭包传递进来的，所以这里还是通过闭包来操作他 */
                                    peek:function(){return is_active},
                                    clear:function(){/* 按钮按下后，不改变状态 */},

                                    set_btn_status:function(newstatus){
                                        if(group_name != undefined){
                                            //reset group
                                            //搜索所有的btn，重置状态
                                            var values = btns.values()
                                            for(var value = values.next();!value.done;value = values.next()){
                                                if(value.value.reset_toggle_group){
                                                    value.value.reset_toggle_group(group_name)
                                                }
                                            }
                                        }
                                        set_active(newstatus)
                                    },
                                    reset_toggle_group:function(gpname){
                                        if(gpname == group_name){
                                            set_active(false)
                                        }
                                    }
                                })

                                nbtn.onclick = function(){
                                    if(anmbtn_startdraw == undefined){
                                        /* 动画还没有加载 */
                                        return
                                    }
                                    if(waiting_for_click){
                                        waiting_for_click = false
                                        anmbtn_startdraw(false)
                                    }

                                    if(group_name == undefined){
                                        set_active(!is_active)
                                    }else{
                                        //搜索所有的btn，重置状态
                                        var values = btns.values()
                                        for(var value = values.next();!value.done;value = values.next()){
                                            if(value.value.reset_toggle_group){
                                                value.value.reset_toggle_group(group_name)
                                            }
                                        }
                                        set_active(true)
                                    }
                                }
                            })(btnname_str,btn_groupname,nbtn,btn_hide)

                        }else{
                            (function(btnname,btn,btnreset_count,btn_hide){/* 用于闭包兼容 */
                                var is_active
                                function set_active(target){
                                    is_active = target
                                    if(btn_hide)
                                        return
                                    if(is_active){
                                        btn.style = 'text-decoration:none;border-radius:4px;background-color:#d5d4c963'
                                    }else{
                                        btn.style = 'text-decoration:none;border-radius:4px;'
                                    }
                                }
                                set_active(false)
                                btns.set(btnname,
                                        { /* button control object */
                                            peek: function(anm2_id){
                                                return is_active && !btn.triggered_anm2.has(anm2_id)
                                            },
                                            clear: function(anm2_id){
                                                if(is_active && !btn.triggered_anm2.has(anm2_id)){
                                                    btn.triggered_anm2.add(anm2_id)
                                                    if(btn.triggered_anm2.size >= btnreset_count){
                                                        set_active(false)
                                                    }
                                                    return true    
                                                }else{
                                                    return false
                                                }
                                            },
                                            set_btn_status: function(newstatus){
                                                btn.triggered_anm2 = new Set()
                                                set_active(newstatus)
                                            }
                                        }
                                    )
                                btn.onclick = function(){/* 实际回调函数 */
                                    if(anmbtn_startdraw == undefined){
                                        /* 动画还没有加载 */
                                        return
                                    }
                                    if(waiting_for_click){
                                        waiting_for_click = false
                                        anmbtn_startdraw(false)
                                    }
                                    //设置按钮状态为“按下”
                                    btn.triggered_anm2 = new Set()
                                    set_active(true)
                                }
                            })(btnname_str,nbtn,btnreset_count,btn_hide)
                        }
                    }
                }
                //parse replacesheet
                var replace_sheet_id = anm.children[j].getAttribute("data-replacesheet-id")
                var replace_sheet = anm.children[j].getAttribute("data-replacesheet")
                if(replace_sheet_id && replace_sheet_id.length>0 && replace_sheet && replace_sheet.length>0){
                    replace_sheet_map.set(+replace_sheet_id,replace_sheet)
                }
            }

            var skincolor = anm.getAttribute("data-skincolor")
            if(skincolor != undefined && skincolor.length > 0){
                skincolor = +skincolor
            }else{
                skincolor = undefined
            }

            is_flying |= anm.getAttribute("data-isflying") == "true"

            var anmobj = {
                anm2: "Data:" + (anm.getAttribute("data-anm2").replace(new RegExp("[&\\?]","g"),"") || ""),
                name: anm.getAttribute("data-name") || "",
                x: +anm.getAttribute("data-x"),
                y: +anm.getAttribute("data-y"),
                rule: rule,
                replace_sheet_map: replace_sheet_map,
                played_frame:0, /* 当前动画已经播放过多少帧，在因规则切换动画时会重置 */
                has_skin_alt:anm.getAttribute("data-has-skin-alt") == "true",
                skincolor:skincolor,
            }
            players.push(anmobj)
        }
        

        function apply_rule(ename, rule, anmplayer, player, player_id) {
            for (var i = 0; i < rule.length; i++) {
                var r = rule[i]
                if (r.has("when") && r.get("when") != player.name)
                    continue
                if (r.has("whendelay") && player.played_frame < +r.get("whendelay")){
                    continue
                }
                
                if (r.has("rate") && Math.random() > +r.get("rate"))
                    continue
                if (r.has("whenbtn")){
                    var block = false
                    var btn_names = r.get("whenbtn").split("&&&")
                    for(var j=0;j<btn_names.length;j++){
                        var btncb = btns.get(btn_names[j])
                        if((!btncb) || (!btncb.peek(player_id))){
                            block = true
                            break
                        }
                    }
                    if(block){
                        continue
                    }
                }
                if (r.has("whenbtnN")){
                    var block = false
                    var btn_names = r.get("whenbtnN").split("&&&")
                    for(var j=0;j<btn_names.length;j++){
                        var btncb = btns.get(btn_names[j])
                        if(btncb && btncb.peek(player_id)){
                            block = true
                            break
                        }
                    }
                    if(block){
                        continue
                    }
                }
                if (r.has(ename)) {
                    var rename = r.get(ename)
                    player.name = rename
                    if (anmplayer.getAnmNames().indexOf(rename.split('.')[0]) != -1) {
                        anmplayer.setFrame(rename.split('.')[0], 0)
                    }
                    player.played_frame = 0

                    if (r.has("whenbtn")){
                        var block = false
                        var btn_names = r.get("whenbtn").split("&&&")
                        for(var j=0;j<btn_names.length;j++){
                            var btncb = btns.get(btn_names[j])
                            btncb.clear(player_id)
                        }
                    }
    
                    if (mw.config.get("debug")) {
                        console.log("apply rule", rule[i])
                    }

                    anmplayer.flipX = r.has("flipX") && r.get("flipX") == "true"
                    anmplayer.revert = r.has("revert") && r.get("revert") == "true"
                    if(anmplayer.revert){
                        anmplayer.play(anmplayer.currentAnm.FrameNum - 1)
                    }

                    if(r.has("setbtn")){
                        var btnnames = r.get("setbtn").split("&&&")
                        for(var j=0;j<btnnames.length;j++){
                            var btnobj = btns.get(btnnames[j])
                            if(btnobj && btnobj.set_btn_status){
                                btnobj.set_btn_status(true)
                            }
                        }
                    }
                    if(r.has("resetbtn")){
                        var btnnames = r.get("resetbtn").split("&&&")
                        for(var j=0;j<btnnames.length;j++){
                            var btnobj = btns.get(btnnames[j])
                            if(btnobj && btnobj.set_btn_status){
                                btnobj.set_btn_status(false)
                            }
                        }
                    }
                    return true
                }
            }
            return false
        }

        canvasdiv.innerHTML = ''
        var color_div = document.createElement("div")
        function setBackgroundColor(color){
            if(color){
                color_div.style = 'margin:0;padding:0;'+color
            }else{
                color_div.style = 'margin:0;padding:0;'
            }
        }
        var BACKGROUND_COLORS = [
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
            /* 按键3：白色 */
            'background-color:white',
            /* 按键4：黑色 */
            'background-color:black',
        ]
        function handleColorKey(key){
            if(typeof(key) == 'string' && key.match("^[0-9]$")){
                setBackgroundColor(BACKGROUND_COLORS[+key] || '')
                return true
            }
        }
        setBackgroundColor()

        canvasdiv.appendChild(color_div)


        var canvas = document.createElement("canvas")
        canvas.width = +canvasdiv.getAttribute("data-width")
        canvas.height = +canvasdiv.getAttribute("data-height")
        color_div.appendChild(canvas)
        var canvas_style = "vertical-align:middle;"
        if(canvasdiv.getAttribute("data-scale")){
            var scale = +canvasdiv.getAttribute("data-scale")
            canvas_style += "transform:scale("+scale+");margin:" + (canvas.height * (scale-1)/2) + "px " + (canvas.width * (scale-1)/2) +"px;"
        }

        if(patch.has(PATCH_blueFilter)){
            canvas_style += "filter:url(#" + AnmPlayer.createSvgFilterElement(1.5,1.7,2,1,0.05,0.12,0.2) + ");"
        }

        canvas.style = canvas_style
        if(btndiv){
            var btndiv_contariner = document.createElement("div")
            btndiv_contariner.style="text-align:center"
            btndiv_contariner.appendChild(btndiv)
            // canvasdiv.appendChild(document.createElement("hr"))
            color_div.appendChild(btndiv_contariner)
        }
        var filter = { "$or": [] }
        for (var i = 0; i < players.length; i++) {
            filter["$or"].push({ "_id": players[i].anm2 })
        }


        function loadAnm(resources) {
            var overwrite_color = undefined
            if(render_as_costume){
                for(var i=0;i<players.length;i++){
                    if(players[i].skincolor != undefined){
                        overwrite_color = players[i].skincolor
                    }
                }
            }
            for (var i = 0; i < players.length; i++) {
                var replace_sprite_func = (function(map){
                    return function(id){
                        if(map.has(id))
                            return map.get(id)
                        return undefined
                    }
                })(players[i].replace_sheet_map)
    
    
                if(render_as_costume){
                    var target = resources.get(players[i].anm2)

                    if(overwrite_color != undefined && i == 0){
                        AnmPlayer.processSkinAlt(target,overwrite_color,true)
                    }

                    if(overwrite_color != undefined && players[i].has_skin_alt){
                        AnmPlayer.processSkinAlt(target,overwrite_color,false)
                    }

                    /* 此处ABC共用同一份json，注意确保它们没问题 */
                    costume_A[i] = new AnmPlayer(target,huijiUrlBuilder,replace_sprite_func, function(){draw(true)})
                    costume_B[i] = new AnmPlayer(target,huijiUrlBuilder,replace_sprite_func, function(){})
                    costume_C[i] = new AnmPlayer(target,huijiUrlBuilder,replace_sprite_func, function(){})

                    if(patch.has(PATCH_randomIdle)){
                        random_idle_anm = new AnmPlayer(target,huijiUrlBuilder,replace_sprite_func, function(){})
                        random_idle_anm.setEndEventListener(function(){random_idle_is_playing = false})
                    }

                    costume_A[i].forceLoop = true
                    costume_B[i].forceLoop = true
                    costume_C[i].forceLoop = true

                    var head_has_idle = false
                    var head_has_charge = false
                    var head_charge_frame = 0
                    var anm_names = costume_A[i].getAnmNames()
                    for(var j=0;j<anm_names.length;j++){
                        if(anm_names[j].startsWith("Head") && anm_names[j].endsWith("_Idle")){
                            head_has_idle = true
                        }
                        if(!patch.has(PATCH_noCharge)){
                            if(!head_has_charge && anm_names[j].startsWith("Head") && anm_names[j].endsWith("Charge")){
                                head_has_charge = true
                                costume_A[i].setFrame(anm_names[j],0)
                                head_charge_frame = costume_A[i].currentAnm.FrameNum
                            }
                        }

                    }

                    costumeInfoA[i] = {
                        player:costume_A[i],
                        head_has_idle:head_has_idle,
                        head_has_charge:head_has_charge,
                        head_charge_frame:head_charge_frame
                    }
                    costumeInfoB[i] = {
                        player:costume_B[i]
                    }
                    costumeInfoC[i] = {
                        player:costume_C[i]
                    }

                    if(patch.has(PATCH_csection) && costume_B[i].getAnmNames().indexOf("SubAnim_Shoot") != -1){
                        costume_B[i].sheet_offsets[0] = {x:0,y:0}
                        costumeInfoB[i].is_csection = true
                    }

                    if(patch.has(PATCH_tApollyon) && costume_A[i].getAnmNames().indexOf("SubAnim") != -1){
                        costume_A[i].sheet_offsets[2] = {x:0,y:0}
                        costumeInfoA[i].is_tapollyon = true
                    }


                    costume_A[i].setFrame("HeadDown",0)
                    costume_B[i].setFrame("WalkDown",0)
                    costume_C[i].setFrame("WalkDown_Overlay",0)
                }else{
                    anms[i] = new AnmPlayer(resources.get(players[i].anm2), huijiUrlBuilder,replace_sprite_func,function(){draw(true)})
                    anms[i].setFrame((players[i].name || '').split('.')[0], 0)    
                }
            }

            var commonFps = 1
            if(render_as_costume){
                commonFps = 30
            }else{
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
    
            }


            var currentFps = 0

            var canvas_clicked = []
            var touch_data = {}
            if(!render_as_costume){
                canvas.onclick = function () {
                    if(waiting_for_click){
                        waiting_for_click = false
                        draw(false)
                    }
                    for (var i = 0; i < players.length; i++) {
                        if (!apply_rule("click", players[i].rule, anms[i], players[i],i)) {
                            canvas_clicked[i] = true
                        }
                    }
                }
                //设置结束事件
                for (var i = 0; i < players.length; i++) {
                    (function (tanm, trule, i, tplayer) {
                        anms[i].setEndEventListener(function () {
                            if (canvas_clicked[i]) {
                                canvas_clicked[i] = false
                                if (apply_rule("clicknext", trule, tanm, tplayer,i)) {
                                    return
                                }
                            }
                            apply_rule("next", trule, tanm, tplayer,i)
                        })
                    })(anms[i], players[i].rule, i, players[i])
                }
                canvas.tabIndex = 1
                canvas.onkeydown = function(e){
                    if(handleColorKey(e.key))
                        e.preventDefault()
                }
            }else{
                if(waiting_for_click){
                    canvas.onclick = function(){
                        waiting_for_click = false
                        draw(false)
                        canvas.onclick = undefined
                    }
                }
                canvas.tabIndex = 1
                var COSTUME_ANM_KEYS = new Map([
                    ['p','Pickup'],
                    ['h','Hit'],
                    //['A','Appear'],
                    ['k','Death'],
                    ['b','Sad'],
                    ['o','Happy'],
                    //['t','TeleportUp'],
                    //['T','TeleportDown'],
                    ['t','Trapdoor'],
                    //['M','MinecartEnter'],
                    ['j','Jump'],
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
                    []
                ])
                canvas.onkeydown = function(e){
                    // if(e.type == 'click'){
                    //     return
                    // }
                    var catched = false
                    var key = e.key
                    if(key.length == 1){
                        key = key.toLowerCase()
                    }
                    if(!patch.has(PATCH_noAttack)){
                        if(key == 'ArrowUp'){
                            costume_head_dir = 'Up'
                            costume_shooting.u = true
                            catched = true
                        }
                        if(key == 'ArrowDown'){
                            costume_head_dir = 'Down'
                            costume_shooting.d = true
                            catched = true
                        }
                        if(key == 'ArrowLeft'){
                            costume_head_dir = 'Left'
                            costume_shooting.l = true
                            catched = true
                        }
                        if(key == 'ArrowRight'){
                            costume_head_dir = 'Right'
                            costume_shooting.r = true
                            catched = true
                        }    
                    }
                    if(key == 'w'){
                        costume_status = 'Walk'
                        costume_leg_dir = 'Up'
                        costume_walking.u = true
                        catched = true
                        if(!(costume_shooting.u||costume_shooting.d||costume_shooting.l||costume_shooting.r)){
                            costume_head_dir = 'Up'
                        }
                    }
                    if(key == 's'){
                        costume_leg_dir = 'Down'
                        costume_walking.d = true
                        catched = true
                        if(!(costume_shooting.u||costume_shooting.d||costume_shooting.l||costume_shooting.r)){
                            costume_head_dir = 'Down'
                        }
                    }
                    if(key == 'a'){
                        costume_leg_dir = 'Left'
                        costume_walking.l = true
                        catched = true
                        if(!(costume_shooting.u||costume_shooting.d||costume_shooting.l||costume_shooting.r)){
                            costume_head_dir = 'Left'
                        }
                    }
                    if(key == 'd'){
                        costume_leg_dir = 'Right'
                        costume_walking.r = true
                        catched = true
                        if(!(costume_shooting.u||costume_shooting.d||costume_shooting.l||costume_shooting.r)){
                            costume_head_dir = 'Right'
                        }
                    }
                    if(key == 'r'){
                        costume_status = 'Walk'
                        catched = true
                    }
                    if(COSTUME_ANM_KEYS.has(key)){
                        var target_anm = COSTUME_ANM_KEYS.get(key)
                        costume_status = target_anm
                        costume_status_reset = true
                        catched = true
                    }
                    if(handleColorKey(key)){
                        catched = true
                    }
                    if(catched){
                        e.preventDefault()
                    }
                }
                canvas.onkeyup = function(e){
                    e.preventDefault()
                    var catched = false
                    var key = e.key
                    if(key.length == 1){
                        key = key.toLowerCase()
                    }
                    if(!patch.has(PATCH_noAttack)){
                        if(key == 'ArrowUp'){
                            costume_shooting.u = false
                            catched = true
                        }
                        if(key == 'ArrowDown'){
                            costume_shooting.d = false
                            catched = true
                        }
                        if(key == 'ArrowLeft'){
                            costume_shooting.l = false
                            catched = true
                        }
                        if(key == 'ArrowRight'){
                            costume_shooting.r = false
                            catched = true
                        }
                    }
                    if(key == 'w'){
                        costume_walking.u = false
                        catched = true
                    }
                    if(key == 's'){
                        costume_walking.d = false
                        catched = true
                    }
                    if(key == 'a'){
                        costume_walking.l = false
                        catched = true
                    }
                    if(key == 'd'){
                        costume_walking.r = false
                        catched = true
                    }
                    if(catched){
                        e.preventDefault()
                    }
                }
                canvas.addEventListener('touchstart',function(ev){
                    if(waiting_for_click){
                        waiting_for_click = false
                        draw(false)
                    }
                    var touch = ev.touches[0]
                    if(touch){
                        ev.preventDefault()
                        var id = touch.identifier
                        if(id == undefined){
                            id = 't'
                        }
                        var x = touch.pageX, y=touch.pageY
                        touch_data[id] = {x:x,y:y}
                        if(!patch.has(PATCH_noAttack)){
                            costume_shooting.u = (costume_head_dir == "Up")
                            costume_shooting.l = (costume_head_dir == "Left")
                            costume_shooting.r = (costume_head_dir == "Right")
                            costume_shooting.d = (costume_head_dir == "Down")    
                        }
                    }
                })
                canvas.addEventListener('touchmove',function(ev){
                    var touch = ev.touches[0]
                    if(touch){
                        ev.preventDefault()
                        var id = touch.identifier
                        if(id == undefined){
                            id = 't'
                        }
                        var x = touch.pageX, y=touch.pageY
                        var axis = touch_data[id]
                        if(axis == undefined)
                            return
                        var dx = x - axis.x
                        var dy = y - axis.y
                        var len = dx*dx+dy*dy
                        if(len > 4){
                            costume_shooting.d = false
                            costume_shooting.r = false
                            costume_shooting.u = false
                            costume_shooting.l = false
                            costume_walking.u = false
                            costume_walking.l = false
                            costume_walking.r = false
                            costume_walking.d = false
    
                            if(dx > dy){
                                if(dx > -dy){
                                    costume_head_dir = 'Right'
                                    costume_leg_dir = 'Right'
                                    costume_walking.r = true
                                }else{
                                    costume_head_dir = 'Up'
                                    costume_leg_dir = 'Up'
                                    costume_walking.u = true
                                }
                            }else{
                                if(dx > -dy){
                                    costume_head_dir = 'Down'
                                    costume_leg_dir = 'Down'
                                    costume_walking.d = true
                                }else{
                                    costume_head_dir = 'Left'
                                    costume_leg_dir = 'Left'
                                    costume_walking.l = true
                                }
                            }
                        }
                    }
                })
                canvas.addEventListener('touchend',function(ev){
                    ev.preventDefault()
                    costume_shooting.d = false
                    costume_shooting.r = false
                    costume_shooting.u = false
                    costume_shooting.l = false
                    costume_walking.u = false
                    costume_walking.l = false
                    costume_walking.r = false
                    costume_walking.d = false
                })

            }
            function draw(noUpdate) {
                //update

                var render_random_idle = random_idle_is_playing

                if(render_as_costume){
                    if(!noUpdate){
                        var is_head_idle = false
                        if(random_idle_is_playing){
                            random_idle_anm.update()
                        }
                        
                        if(patch.has(PATCH_csection)){
                            costume_leg_dir = costume_head_dir
                        }
                        if(patch.has(PATCH_tApollyon)){
                            tapollyon_ring_frame += 0.5
                        }
                        

                        if(costume_status == "Walk"){
                            if(costume_shooting.u || costume_shooting.d || costume_shooting.l || costume_shooting.r){
                                if(patch.has(PATCH_Neptunus)){
                                    costume_shooting_frame -= 0.5
                                }else{
                                    costume_shooting_frame+=0.5
                                }
                            }else{
                                if(patch.has(PATCH_Neptunus)){
                                    if(costume_shooting_frame < 17){
                                        costume_shooting_frame += 0.5
                                    }else{
                                        //do nothing
                                    }
                                    is_head_idle = true
                                }else{
                                    costume_shooting_frame = is_head_idle ? (costume_shooting_frame + 1) % 2 : 0
                                    is_head_idle = true
                                }
                            }
                            if(is_flying ||costume_walking.u || costume_walking.d || costume_walking.l || costume_walking.r ||
                                (patch.has(PATCH_csection) && (costume_shooting.u || costume_shooting.d || costume_shooting.l || costume_shooting.r))
                                ){
                                costume_walking_frame++
                            }else{
                                costume_walking_frame = 0
                            }
                        }
    
                        for(var i=0;i<costume_A.length;i++){
                            if(costume_status == 'Walk'){
                                var target_anm_name_A = 'Head' + costume_head_dir
                                if(is_head_idle && costumeInfoA[i].head_has_idle){
                                    target_anm_name_A += '_Idle'
                                }

                                if(costumeInfoA[i].is_tapollyon){
                                    costume_A[i].sheet_offsets[2].y = (Math.floor(tapollyon_ring_frame) % 8) * 32
                                }

                                if(patch.has(PATCH_Neptunus)){
                                    if(is_head_idle){
                                        costume_A[i].setFrame(target_anm_name_A + "Charge",costume_shooting_frame)
                                    }else{
                                        costume_A[i].setFrame(target_anm_name_A + "Shoot",costume_shooting_frame)
                                    }
                                }else if(!is_head_idle && costumeInfoA[i].head_has_charge){
                                    var head_charge_frame = costumeInfoA[i].head_charge_frame
                                    if(costume_shooting_frame >= head_charge_frame){
                                        costume_A[i].setFrame(target_anm_name_A + "ChargeFull",Math.floor(costume_shooting_frame - head_charge_frame))
                                    }else{
                                        costume_A[i].setFrame(target_anm_name_A + "Charge",costume_shooting_frame)
                                    }
                                }else /* original logic */ if(costume_A[i].getCurrentAnmName() != (target_anm_name_A)){
                                    costume_A[i].setFrame(target_anm_name_A,0)
                                }else{
                                    costume_A[i].update()
                                }



                                if(costumeInfoB[i].is_csection){
                                    costume_B[i].sheet_offsets[0].y = C_SECTION_FRAME_MAP[Math.floor(costume_shooting_frame * 1.5) % C_SECTION_FRAME_MAP.length] * 96
                                }
                                if(costume_B[i].getCurrentAnmName() != ('Walk' + costume_leg_dir)){
                                    costume_B[i].setFrame('Walk' + costume_leg_dir,0)
                                }else{
                                    costume_B[i].update()
                                }
                                if(costume_C[i].getCurrentAnmName() != ('Head' + costume_head_dir + '_Overlay')){
                                    costume_C[i].setFrame('Head' + costume_head_dir + '_Overlay',0)
                                }else{
                                    costume_C[i].update()
                                }
                            }else{
                                if(costume_A[i].getCurrentAnmName() != costume_status){
                                    costume_A[i].setFrame(costume_status,0)
                                }
                                if(costume_status_reset){
                                    costume_status_reset = false
                                    costume_A[i].play(0)
                                }
                                costume_A[i].update()
                            }
                        }

                        if(patch.has(PATCH_randomIdle)){
                            var now = new Date().getTime()
                            if(now > random_idle_last_update){
                                random_idle_last_update = now + 1000*5
                                random_idle_anm.setFrame("Idle",0)
                                random_idle_is_playing = true
                            }
                        }
                    }
                    //draw
                    var ctx = canvas.getContext("2d")
                    ctx.imageSmoothingEnabled = false
                    ctx.setTransform(1, 0, 0, 1, 0, 0)
                    ctx.clearRect(0, 0, canvas.width, canvas.height)
                    if(costume_status == 'Walk'){
                        if(patch.has(PATCH_csection)){
                            AnmPlayer.renderCostume(costumeInfoB,costumeInfoA,costumeInfoC,ctx, canvas, players[0].x, players[0].y, 1,0,Math.floor(costume_walking_frame))
                        }else if(render_random_idle){
                            //PATCH_randomIdle
                            AnmPlayer.renderCostume(costumeInfoB,undefined,undefined,ctx, canvas, players[0].x, players[0].y, 1,Math.floor(costume_shooting_frame),Math.floor(costume_walking_frame))
                            random_idle_anm.drawCanvas(ctx,canvas,players[0].x,players[0].y - 17,1)
                        }else{
                            AnmPlayer.renderCostume(costumeInfoB,costumeInfoA,costumeInfoC,ctx, canvas, players[0].x, players[0].y, 1,Math.floor(costume_shooting_frame),Math.floor(costume_walking_frame))
                        }
                    }else{
                        AnmPlayer.renderCostume(costumeInfoA,undefined,undefined,ctx, canvas, players[0].x, players[0].y, 1,Math.floor(costume_shooting_frame),Math.floor(costume_walking_frame))
                    }
                }else{
                    if(!noUpdate){
                        for (var i = 0; i < anms.length; i++) {
                            if (currentFps % (commonFps / anms[i].getFps()) == 0) {
                                anms[i].update()
                                players[i].played_frame++
                            }
                        }
                        currentFps = (currentFps + 1) % commonFps
                    }
                    //draw
                    var ctx = canvas.getContext("2d")
                    ctx.imageSmoothingEnabled = false

                    ctx.setTransform(1, 0, 0, 1, 0, 0)
                    ctx.clearRect(0, 0, canvas.width, canvas.height)
                    for (var i = anms.length - 1; i >= 0; i--) {
                        anms[i].drawCanvas(ctx, canvas, players[i].x, players[i].y, 1)
                    }

                }

                //loop
                if(!noUpdate && !waiting_for_click){
                    setTimeout(draw, 1000 / commonFps)
                }
            }
            anmbtn_startdraw = draw
            if(!waiting_for_click){
                draw(false)
            }
        }
        function downloadJson() {
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
                loadAnm(resources)
            }).fail(function (jqXHR, textStatus) {
                console.log("anm2 json download failed.", textStatus, jqXHR)
            })

        }
        //TODO:IndexedDB cache json
        downloadJson()
    }

    var canvases = $('.anm2player')

    for (var i = 0; i < canvases.length; i++) {
        initplayer(canvases[i])
    }

    function initJsonPage(path) {
        var infocard = document.createElement("div")
        infocard.style = "border:1px solid white;border-radius:8px;padding:10px"
        infocard.innerHTML = "<h4>Anm2文件</h4>" +
            '<div class="input-group">' +
            '<span class="input-group-addon" id="basic-addon1">文件路径：</span>' +
            '<input type="text" id="anm-previewcard-title" class="form-control" readonly>' +
            '</div>' +

            "<div style='margin:10px 0 10px 0' id='anm-previewcard-buttons'><button id='anm-previewcard-displayjson' class='btn btn-primary'>显示原始JSON</button><button id='anm-previewcard-loadanm' class='btn btn-success' style='margin-left:10px'>加载动画</button></div>"

        infocard.querySelector('#anm-previewcard-title').value = path

        var wiki_content = $('#mw-content-text')[0]
        var json_table = wiki_content.querySelector('.mw-jsonconfig')
        $(json_table).hide()

        wiki_content.appendChild(infocard)

        infocard.querySelector('#anm-previewcard-displayjson').onclick = function () {
            infocard.remove()
            $(json_table).show()
        }

        infocard.querySelector('#anm-previewcard-loadanm').onclick = function () {
            infocard.querySelector('#anm-previewcard-buttons').remove()
            var names = document.createElement('select')
            infocard.appendChild(document.createElement('hr'))
            infocard.appendChild(names)

            var replay = document.createElement('button')
            replay.style = "margin-left:10px"
            replay.classList.add('btn')
            replay.classList.add('btn-primary')
            replay.innerText = "重新播放"
            infocard.appendChild(replay)
            infocard.appendChild(document.createElement('hr'))

            var canvas = document.createElement('canvas')
            canvas.width = 800
            canvas.height = 600
            canvas.style = 'background:#FFF'
            infocard.appendChild(canvas)

            $.ajax({
                url: "/api/rest_v1/namespace/data",
                method: "GET",
                data: { filter: JSON.stringify({ _id: "Data:" + path }) },
                dataType: "json"
            }).done(function (msg) {
                if (msg._embedded.length == 1) {
                    AnmPlayer.expandActor(msg._embedded[0], keymap)
                    var anm = new AnmPlayer(msg._embedded[0], huijiUrlBuilder)

                    var anmnames = anm.getAnmNames()
                    for (var i = 0; i < anmnames.length; i++) {
                        var names_option = document.createElement('option')
                        names_option.value = anmnames[i]
                        names_option.innerText = anmnames[i]
                        names.appendChild(names_option)
                    }
                    names.value = anm.getDefaultAnmName()

                    names.onchange = function () {
                        anm.setFrame(names.value, 0)
                    }
                    replay.onclick = function () {
                        anm.play(0)
                    }

                    function draw() {
                        anm.update()
                        var ctx = canvas.getContext('2d')
                        ctx.imageSmoothingEnabled = false
                        ctx.setTransform(1, 0, 0, 1, 0, 0);
                        ctx.clearRect(0, 0, canvas.width, canvas.height)
                        anm.drawCanvas(ctx, canvas, canvas.width / 2, canvas.height / 2, 1)

                        setTimeout(draw, 1000 / anm.getFps())
                    }
                    draw()
                }
            }).fail(function (jqXHR, textStatus) {
                console.log("anm2 json download failed.", textStatus, jqXHR)
            })
        }
    }
    var pageName = mw.config.get("wgPageName")
    if (pageName && pageName.startsWith("Data:Anm2/") && pageName.endsWith(".json")) {
        initJsonPage(pageName.substr(5))
    }
}

if(document.readyState == 'loading'){
    document.addEventListener('DOMContentLoaded', setup_anm2_player)
}else{
    setup_anm2_player()
}
})()
