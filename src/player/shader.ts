/*
MIT License

Copyright (c) 2026 frto027

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
import type { WebGLOverlay } from "./player"

import shader_default_vs from "../../src/shaders/default.vs"
import shader_default_fs from "../../src/shaders/default.fs"

export class ShaderController {
    static bindArray(
        gl: WebGLRenderingContext,
        shaderProgram: WebGLProgram,
        propertyName: string,
        dim: number,
        init: number[]
    ) {
        let vertex = gl.createBuffer()
        if (!vertex) return
        gl.bindBuffer(gl.ARRAY_BUFFER, vertex)

        if (init.length == dim) {
            let sinit = []
            for (let i = 0; i < 4; i++) {
                for (let j = 0; j < 4; j++) sinit.push(init[j]!)
            }
            init = sinit
        } else if (init.length == dim * 4) {
            //ok
        } else {
            console.error("invalid init length")
        }

        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(init), gl.STATIC_DRAW)
        let arg = gl.getAttribLocation(shaderProgram, propertyName)
        gl.vertexAttribPointer(arg, dim, gl.FLOAT, false, 0, 0)
        gl.enableVertexAttribArray(arg)
        return vertex
    }
    static bindDynamicArray(
        gl: WebGLRenderingContext,
        shaderProgram: WebGLProgram,
        propertyName: string,
        dim: number,
        init: number[]
    ) {
        let vertex = gl.createBuffer()
        if (!vertex) return
        this.setArray(gl, vertex, dim, init)
        let arg = gl.getAttribLocation(shaderProgram, propertyName)
        gl.vertexAttribPointer(arg, dim, gl.FLOAT, false, 0, 0)
        gl.enableVertexAttribArray(arg)
        return vertex
    }

    static setArray(gl: WebGLRenderingContext, loc: WebGLBuffer, dim: number, value: number[]) {
        if (value.length == dim) {
            let sinit = []
            for (let i = 0; i < 4; i++) {
                for (let j = 0; j < 4; j++) sinit.push(value[j]!)
            }
            value = sinit
        } else if (value.length == dim * 4) {
            //ok
        } else {
            console.error("invalid value length")
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, loc)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(value), gl.DYNAMIC_DRAW)
    }
    static bindDynamicFloat(
        gl: WebGLRenderingContext,
        shaderProgram: WebGLProgram,
        propertyName: string,
        init: number
    ) {
        let vertex = gl.createBuffer()
        if (!vertex) return
        this.setFloat(gl, vertex, init)
        let arg = gl.getAttribLocation(shaderProgram, propertyName)
        gl.vertexAttribPointer(arg, 1, gl.FLOAT, false, 0, 0)
        gl.enableVertexAttribArray(arg)
        return vertex
    }

    static setFloat(gl: WebGLRenderingContext, loc: WebGLBuffer, value: number) {
        gl.bindBuffer(gl.ARRAY_BUFFER, loc)
        // prettier-ignore
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            value, value, value, value
        ]), gl.DYNAMIC_DRAW)
    }
    vertex() {
        return shader_default_vs
    }

    fragment() {
        return shader_default_fs
    }
    init(gl: WebGLRenderingContext, program: WebGLProgram, webglOverlay: WebGLOverlay) {}
    update(gl: WebGLRenderingContext) {}

    setParam(name: string, value: any) {
        //注意，name和value可能是不可信任内容，请注意过滤（如果有必要）
    }
}
import shader_pixelation_vs from "../shaders/pixelation.vs"
import shader_pixelation_fs from "../shaders/pixelation.fs"
class ShaderPixelation extends ShaderController {
    vertex = () => shader_pixelation_vs

    fragment = () => shader_pixelation_fs

    PixelationAmount?: WebGLBuffer | undefined
    time = 0
    init(gl: WebGLRenderingContext, program: WebGLProgram, webglOverlay: WebGLOverlay) {
        // prettier-ignore
        ShaderController.bindArray(gl, program, "Color", 4, [
            0, 0, 0, 1
        ])
        // prettier-ignore
        ShaderController.bindArray(gl, program, "ScreenSize", 4, [
            webglOverlay.backend_canvas.width, webglOverlay.backend_canvas.height,
            webglOverlay.backend_canvas.width, webglOverlay.backend_canvas.height
        ])

        this.PixelationAmount = ShaderController.bindDynamicFloat(gl, program, "PixelationAmount", 0.01)
    }
    update(gl: WebGLRenderingContext) {
        this.time += 1
        ShaderController.setFloat(gl, this.PixelationAmount!, (Math.sin(this.time * 0.04) + 1) * 0.5 * 0.1)
    }
}

import shader_dizzy_fs from "../shaders/dizzy.fs"
import shader_dizzy_vs from "../shaders/dizzy.vs"

class ShaderDizzy extends ShaderController {
    Ratio: any
    Time: any
    Amount: any
    init(gl: WebGLRenderingContext, program: WebGLProgram, webglOverlay: WebGLOverlay): void {
        ShaderController.bindArray(gl, program, "TextureSize", 2, [
            webglOverlay.backend_canvas.width,
            webglOverlay.backend_canvas.height,
        ])
        let rx = 0.1,
            ry = 0.2
        // prettier-ignore
        this.Ratio = ShaderController.bindDynamicArray(gl, program, "Ratio", 4, [
            rx, ry, rx, ry,
            rx, ry, rx, ry,
            rx, ry, rx, ry,
            rx, ry, rx, ry
        ])
        this.Time = ShaderController.bindDynamicFloat(gl, program, "Time", 0.1)
        this.Amount = ShaderController.bindDynamicFloat(gl, program, "Amount", 0.1)
    }
    time = 0
    update(gl: WebGLRenderingContext): void {
        this.time += 1
        ShaderController.setFloat(gl, this.Time, this.time)
    }
    vertex = () => shader_dizzy_vs
    fragment = () => shader_dizzy_fs
}
import shader_hall_fs from "../shaders/hall.fs"
import shader_hall_vs from "../shaders/hall.vs"

class ShaderHallucination extends ShaderController {
    Amount: any
    Noise: any
    init(gl: WebGLRenderingContext, program: WebGLProgram, webglOverlay: WebGLOverlay): void {
        // prettier-ignore
        ShaderController.bindArray(gl, program, "ScreenSize", 4, [
            webglOverlay.backend_canvas.width, webglOverlay.backend_canvas.height,
            webglOverlay.backend_canvas.width, webglOverlay.backend_canvas.height
        ])
        this.Amount = ShaderController.bindDynamicFloat(gl, program, "Amount", 1)
        // prettier-ignore
        this.Noise = ShaderController.bindDynamicArray(gl, program, "Noise", 2, [
            0, 0,
            0, 1,
            0, 2,
            0, 3,
        ])
    }
    time = 0
    update(gl: WebGLRenderingContext): void {
        // prettier-ignore
        ShaderController.setArray(gl, this.Noise, 2, [
            0.2, Math.random(),
            0.2, Math.random(),
            0.2, Math.random(),
            0.2, Math.random(),
        ])
    }

    vertex = () => shader_hall_vs
    fragment = () => shader_hall_fs
}
import shader_oldtv_fs from "../shaders/oldtv.fs"
import shader_oldtv_vs from "../shaders/oldtv.vs"

class ShaderOldTV extends ShaderController {
    time = 0
    Time: any
    init(gl: WebGLRenderingContext, program: WebGLProgram, webglOverlay: WebGLOverlay): void {
        // prettier-ignore
        ShaderController.bindArray(gl, program, "ScreenSize", 4, [
            webglOverlay.backend_canvas.width, webglOverlay.backend_canvas.height,
            webglOverlay.backend_canvas.width, webglOverlay.backend_canvas.height
        ])

        this.Time = ShaderController.bindDynamicFloat(gl, program, "Time", 0)
    }
    update(gl: WebGLRenderingContext): void {
        this.time += 1
        ShaderController.setFloat(gl, this.Time, this.time / 60)
    }
    vertex = () => shader_oldtv_vs
    fragment = () => shader_oldtv_fs
}

import shader_dogma_fs from "../shaders/dogma.fs"
import shader_dogma_vs from "../shaders/dogma.vs"

class ShaderDogma extends ShaderController {
    Colorize: any
    WikiScale: any
    init(gl: WebGLRenderingContext, program: WebGLProgram, webglOverlay: WebGLOverlay): void {
        // if(webglOverlay.webgl_canvas.parentElement.parentElement.hasAttribute("data-scale")){
        //     scale = +webglOverlay.webgl_canvas.parentElement.parentElement.getAttribute("data-scale")
        // }
        // if(scale > 0 && scale < 1000){
        //     //ok
        // }else{
        //     scale = 1
        // }
        // prettier-ignore
        ShaderController.bindArray(gl, program, "TextureSize", 2, [
            webglOverlay.backend_canvas.width, webglOverlay.backend_canvas.height,
            webglOverlay.backend_canvas.width, webglOverlay.backend_canvas.height,
            webglOverlay.backend_canvas.width, webglOverlay.backend_canvas.height,
            webglOverlay.backend_canvas.width, webglOverlay.backend_canvas.height,
        ])
        // prettier-ignore
        ShaderController.bindArray(gl, program, "Color", 4, [
            1, 1, 1, 1,
            1, 1, 1, 1,
            1, 1, 1, 1,
            1, 1, 1, 1,
        ])
        // prettier-ignore
        this.Colorize = ShaderController.bindDynamicArray(gl, program, "ColorizeIn", 4, [
            1, 1, 1, 1,
            1, 1, 1, 1,
            1, 1, 1, 1,
            1, 1, 1, 1,
        ])
        // prettier-ignore
        ShaderController.bindArray(gl, program, "ColorOffsetIn", 3, [
            0, 0, 0,
            0, 0, 0,
            0, 0, 0,
            0, 0, 0,
        ])
        ShaderController.bindDynamicFloat(gl, program, "PixelationAmount", 0)
        // prettier-ignore
        ShaderController.bindArray(gl, program, "ClipPlane", 3, [
            1, 1, 0,
            1, 1, 0,
            1, 1, 0,
            1, 1, 0,
        ])

        this.WikiScale = ShaderController.bindDynamicFloat(gl, program, "WikiScale", this.scale)
    }
    time = 0
    offset = 0
    scale = 1 / 2

    restore = 0
    setParam(name: string, value: any): void {
        if (name == "offset") {
            this.offset = +value
        }
        if (name == "scale") {
            let scale = +value
            if (scale > 0 && scale < 1000) {
                this.scale = scale
            }
        }
        if (name == "restore") {
            this.restore = +value
        }
    }
    update(gl: WebGLRenderingContext): void {
        if (this.restore > 0) {
            this.restore = this.restore - 1
            if (this.restore == 0) {
                this.offset = 0
            }
        }
        let offset = this.offset
        let rnd = Math.random()
        // prettier-ignore
        ShaderController.setArray(gl, this.Colorize, 4, [
            offset, 1, 1, rnd,
            offset, 1, 1, rnd,
            offset, 1, 1, rnd,
            offset, 1, 1, rnd,
        ])
        ShaderController.setFloat(gl, this.WikiScale, this.scale)
    }

    vertex = () => shader_dogma_vs
    fragment = () => shader_dogma_fs
}

import shader_shockwave_vs from "../shaders/shockwave.vs"
import shader_shockwave_fs from "../shaders/shockwave.fs"

class ShaderShockwave extends ShaderController {
    Shockwave1: any
    Shockwave2: any
    init(gl: WebGLRenderingContext, program: WebGLProgram, webglOverlay: WebGLOverlay): void {
        ShaderController.bindArray(gl, program, "Color", 4, [
            1,1,1,1,
            1,1,1,1,
            1,1,1,1,
            1,1,1,1,
        ])
        ShaderController.bindArray(gl, program, "Ratio", 2, [
            1.2,1.2,
            1.2,1.2,
            1.2,1.2,
            1.2,1.2
        ])

        this.Shockwave1 =  ShaderController.bindDynamicArray(gl, program, "Shockwave1", 4, [
            .5,.5,.5,.5,
            .5,.5,.5,.5,
            .5,.5,.5,.5,
            .5,.5,.5,.5,
        ])
        this.Shockwave2 =  ShaderController.bindDynamicArray(gl, program, "Shockwave2", 4, [
            .5,.5,0,0,
            .5,.5,0,0,
            .5,.5,0,0,
            .5,.5,0,0,
        ])
    }
    vertex = ()=>shader_shockwave_vs
    fragment = ()=> shader_shockwave_fs

    time = 0
    x = 0
    y = 0
    amp = 0.00
    speed = 1/60
    update(gl: WebGLRenderingContext): void {


        if(this.time < 2){
            let progress = this.time
            this.time += this.speed
            ShaderController.setArray(gl, this.Shockwave1, 4, [
                this.x,this.y,progress,this.amp,
                this.x,this.y,progress,this.amp,
                this.x,this.y,progress,this.amp,
                this.x,this.y,progress,this.amp,
            ])
        }else{
            ShaderController.setArray(gl, this.Shockwave1, 4, [
                this.x,this.y,0,0,
                this.x,this.y,0,0,
                this.x,this.y,0,0,
                this.x,this.y,0,0,
            ])
        }

        // ShaderController.setArray(gl, this.Shockwave2, 4, [
        //     .5,.5,x,0.01,
        //     .5,.5,x,0.01,
        //     .5,.5,x,0.01,
        //     .5,.5,x,0.01,
        // ])
    }

    setParam(name: string, value: any): void {
        if(name == "x"){
            this.x = +value
        }
        if(name == "y"){
            this.y = +value
        }
        if(name == "time"){
            this.time = +value
        }
        if(name == "amp"){
            this.amp = +value
        }
        if(name == "speed"){
            this.speed = +value
        }
    }
}

export let PredefinedShaderControllers: { [name: string]: typeof ShaderController | null } = {
    __proto__: null,
    default: ShaderController,
    pixel: ShaderPixelation,
    dizzy: ShaderDizzy,
    hallucination: ShaderHallucination,
    oldtv: ShaderOldTV,
    dogma: ShaderDogma,
    shockwave: ShaderShockwave,
}
