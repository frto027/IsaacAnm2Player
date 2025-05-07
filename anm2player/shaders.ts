
class ShaderController {
    static bindArray(gl:WebGLRenderingContext, shaderProgram:WebGLProgram, propertyName:string,dim:number, init:number[]){
        let vertex = gl.createBuffer()
        if(!vertex)return
        gl.bindBuffer(gl.ARRAY_BUFFER, vertex)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(init), gl.STATIC_DRAW)
        let arg = gl.getAttribLocation(shaderProgram, propertyName)
        gl.vertexAttribPointer(arg, dim, gl.FLOAT, false, 0, 0)
        gl.enableVertexAttribArray(arg)
        return vertex
    }
    static bindDynamicArray(gl:WebGLRenderingContext, shaderProgram:WebGLProgram, propertyName:string,dim:number, init:number[]){
        let vertex = gl.createBuffer()
        if(!vertex)return
        gl.bindBuffer(gl.ARRAY_BUFFER, vertex)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(init), gl.DYNAMIC_DRAW)
        let arg = gl.getAttribLocation(shaderProgram, propertyName)
        gl.vertexAttribPointer(arg, dim, gl.FLOAT, false, 0, 0)
        gl.enableVertexAttribArray(arg)
        return vertex
    }
    static bindDynamicFloat(gl:WebGLRenderingContext, shaderProgram:WebGLProgram, propertyName:string, init:number){
        let vertex = gl.createBuffer()
        if(!vertex)return
        this.setFloat(gl, vertex, init)
        let arg = gl.getAttribLocation(shaderProgram, propertyName)
        gl.vertexAttribPointer(arg, 1, gl.FLOAT, false, 0, 0)
        gl.enableVertexAttribArray(arg)
        return vertex
    }

    static setFloat(gl:WebGLRenderingContext, loc:WebGLBuffer, value:number){
        gl.bindBuffer(gl.ARRAY_BUFFER, loc)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            value,value,value,value
        ]), gl.DYNAMIC_DRAW)
    }
    vertex(){
        return `
            attribute vec4 Position;
            attribute vec2 TexCoord;

            varying vec2 TexCoord0;

            void main() {
            gl_Position = Position;
            TexCoord0 = TexCoord;
            }
        `
    }

    fragment(){
        return  `
        precision mediump float;

        varying vec2 TexCoord0;
        varying float AmountOut;
        varying vec4 OutScreenSize;
        uniform sampler2D Texture0;

        void main() {
            gl_FragColor = texture2D(Texture0, TexCoord0);
        }
    `
    }
    init(gl:WebGLRenderingContext, program:WebGLProgram){
    }
    update(gl:WebGLRenderingContext){
    }

}

class ShaderPixelation extends ShaderController{
    vertex = ()=>`
        #ifdef GL_ES
precision highp float;
#endif

#if __VERSION__ >= 140

in vec3 Position;
in vec4 Color;
in vec2 TexCoord;
in float PixelationAmount;
in vec4 ScreenSize;

out vec4 Color0;
out vec2 TexCoord0;
out float OutPixelationAmount;
out vec4 OutScreenSize;

#else

attribute vec3 Position;
attribute vec4 Color;
attribute vec2 TexCoord;
attribute float PixelationAmount;
attribute vec4 ScreenSize;

varying vec4 Color0;
varying vec2 TexCoord0;
varying float OutPixelationAmount;
varying vec4 OutScreenSize;

#endif

void main(void)
{
	OutPixelationAmount = PixelationAmount;
	OutScreenSize = ScreenSize;
	Color0 = Color;
	gl_Position = vec4(Position.xyz, 1.0);
	TexCoord0 = TexCoord;
}
`
    
    fragment = ()=>`#ifdef GL_ES
precision highp float;
#endif

#if __VERSION__ >= 140

in vec4 Color0;
in vec2 TexCoord0;
in float OutPixelationAmount;
in vec4 OutScreenSize;
out vec4 fragColor;

#else

varying vec4 Color0;
varying vec2 TexCoord0;
varying float OutPixelationAmount;
varying vec4 OutScreenSize;
#define fragColor gl_FragColor
#define texture texture2D

#endif

uniform sampler2D Texture0;
void main(void)
{
	vec2 pa = OutPixelationAmount * 0.5 * min(OutScreenSize.z, OutScreenSize.w) / OutScreenSize.zw;
	vec2 center = OutScreenSize.xy * 0.5 / OutScreenSize.zw;
	vec2 snapCoord = TexCoord0.st - mod(TexCoord0.st - center, pa) + pa * 0.5;
	fragColor = texture(Texture0, snapCoord);
}
`

PixelationAmount?:WebGLBuffer
time = 0
init(gl:WebGLRenderingContext, program:WebGLProgram){
    this.PixelationAmount = ShaderController.bindDynamicFloat(gl, program, "PixelationAmount", 0.01)
}
update(gl:WebGLRenderingContext){
    this.time += 1
    ShaderController.setFloat(gl, this.PixelationAmount, (Math.sin(this.time * 0.04) + 1) * 0.5 * 0.1)
}

}

let PredefinedShaderControllers:{[name:string]:typeof ShaderController|null} = {
    __proto__:null,
    "pixel":ShaderPixelation
}

