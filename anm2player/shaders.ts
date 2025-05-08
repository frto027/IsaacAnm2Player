
class ShaderController {
    static bindArray(gl:WebGLRenderingContext, shaderProgram:WebGLProgram, propertyName:string,dim:number, init:number[]){
        let vertex = gl.createBuffer()
        if(!vertex)return
        gl.bindBuffer(gl.ARRAY_BUFFER, vertex)

        if(init.length == dim){
            let sinit = []
            for(let i=0;i<4;i++){
                for(let j=0;j<4;j++)
                    sinit.push(init[j])
            }
            init = sinit
        }else if(init.length == dim * 4){
            //ok
        }else{
            console.error("invalid init length")
        }

        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(init), gl.STATIC_DRAW)
        let arg = gl.getAttribLocation(shaderProgram, propertyName)
        gl.vertexAttribPointer(arg, dim, gl.FLOAT, false, 0, 0)
        gl.enableVertexAttribArray(arg)
        return vertex
    }
    static bindDynamicArray(gl:WebGLRenderingContext, shaderProgram:WebGLProgram, propertyName:string,dim:number, init:number[]){
        let vertex = gl.createBuffer()
        if(!vertex)return
        this.setArray(gl, vertex, dim, init)
        let arg = gl.getAttribLocation(shaderProgram, propertyName)
        gl.vertexAttribPointer(arg, dim, gl.FLOAT, false, 0, 0)
        gl.enableVertexAttribArray(arg)
        return vertex
    }

    static setArray(gl:WebGLRenderingContext, loc:WebGLBuffer, dim:number, value:number[]){
        if(value.length == dim){
            let sinit = []
            for(let i=0;i<4;i++){
                for(let j=0;j<4;j++)
                    sinit.push(value[j])
            }
            value = sinit
        }else if(value.length == dim * 4){
            //ok
        }else{
            console.error("invalid value length")
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, loc)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(value), gl.DYNAMIC_DRAW)
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
    init(gl:WebGLRenderingContext, program:WebGLProgram, webglOverlay:WebGLOverlay){
    }
    update(gl:WebGLRenderingContext){
    }

}

class ShaderPixelation extends ShaderController{
    vertex = ()=>`
#ifdef GL_ES
precision mediump float;
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
init(gl:WebGLRenderingContext, program:WebGLProgram, webglOverlay:WebGLOverlay){
    ShaderController.bindArray(gl, program, "Color", 4, [
        0,0,0,1
    ])

    ShaderController.bindArray(gl, program, "ScreenSize", 4, [
        webglOverlay.backend_canvas.width, webglOverlay.backend_canvas.height, 
        webglOverlay.backend_canvas.width, webglOverlay.backend_canvas.height
    ])

    this.PixelationAmount = ShaderController.bindDynamicFloat(gl, program, "PixelationAmount", 0.01)
}
update(gl:WebGLRenderingContext){
    this.time += 1
    ShaderController.setFloat(gl, this.PixelationAmount, (Math.sin(this.time * 0.04) + 1) * 0.5 * 0.1)
}

}


class ShaderDizzy extends ShaderController{
    Ratio:any
    Time:any
    Amount:any
    init(gl: WebGLRenderingContext, program: WebGLProgram, webglOverlay:WebGLOverlay): void {
        ShaderController.bindArray(gl, program, "TextureSize", 2, [
            webglOverlay.backend_canvas.width, webglOverlay.backend_canvas.height, 
        ])
        let rx = 0.1, ry = 0.2
        this.Ratio = ShaderController.bindDynamicArray(gl, program, "Ratio", 4, [
            rx,ry,rx,ry,
            rx,ry,rx,ry,
            rx,ry,rx,ry,
            rx,ry,rx,ry
        ])
        this.Time = ShaderController.bindDynamicFloat(gl, program, "Time", 0.1)
        this.Amount = ShaderController.bindDynamicFloat(gl,program, "Amount", 0.1)
    }
    time = 0
    update(gl: WebGLRenderingContext): void {
        this.time += 1
        ShaderController.setFloat(gl, this.Time, this.time)
    }
    vertex = ()=>`
#ifndef GL_ES
#  define lowp
#endif
precision mediump float;

attribute vec3 Position;
attribute vec2 TexCoord;
attribute vec2 TextureSize;
attribute vec4 Ratio;
attribute float Time;
attribute float Amount;

varying vec2 TexCoord0;
varying vec2 TextureSize0;
varying vec4 Ratio0;
varying lowp float Time0;
varying lowp float Amount0;

void main()
{
	gl_Position = vec4(Position.xyz, 1.0);
	TexCoord0 = TexCoord;
	TextureSize0 = TextureSize;
	Ratio0 = Ratio;
	Time0 = Time;
	Amount0 = Amount;
}
    `
    fragment = ()=>`
#ifndef GL_ES
#  define lowp
#endif
precision mediump float;

varying vec2 TexCoord0;
varying vec2 TextureSize0;
varying vec4 Ratio0;
varying lowp float Time0;
varying lowp float Amount0;

uniform sampler2D Texture0;

vec2 mirrorclamp(vec2 uv, vec2 m)
{
	return uv + max(vec2(0.0, 0.0), -2.0 * uv) + min(vec2(0.0, 0.0), -2.0 * (uv - m));
}

void main(void)
{
	float time = Time0 * 6.28318530718;
	float amount = Amount0;
	float am2 = pow(amount, 0.5);
	
	float rot = amount * 0.3 * cos(0.8 * time);
	mat2 rmat = mat2(cos(rot), -sin(rot), sin(rot), cos(rot));
	
	vec2 center = 0.5 * TextureSize0.xy;
	vec2 texcoord = rmat * (TexCoord0 - center) + center;
	
	vec2 amp = amount * vec2(0.016, 0.016) / Ratio0.xy;
	vec2 freq = vec2(8.0, 12.0);
	float speed = 1.0;
	vec2 uv = mirrorclamp(texcoord + amp * sin(freq * 3.141593 * Ratio0.xy * (TexCoord0.yx - Ratio0.wz) + speed*time), TextureSize0.xy);
	
	float mul = 1.0 + am2 * 0.6;
	float saturate = min(amount, 1.0) * 0.7;
	float exponent = 1.0 + pow(amount, 5.0) * 100.0;
	vec3 colorAdd = min(am2, 1.0) * (0.16 + 0.1 * sin(vec3(0.0, 1.0, 2.0) + vec3(0.4, 0.5, 0.6) * time));
	
	gl_FragColor = vec4(mul * (pow(saturate + colorAdd + texture2D(Texture0, uv).xyz, vec3(exponent, exponent, exponent))), 1.0);
}

    `
}

class ShaderHallucination extends ShaderController {
    Amount:any
    Noise:any
    init(gl: WebGLRenderingContext, program: WebGLProgram, webglOverlay:WebGLOverlay): void {
        ShaderController.bindArray(gl, program, "ScreenSize", 4, [
            webglOverlay.backend_canvas.width, webglOverlay.backend_canvas.height, 
            webglOverlay.backend_canvas.width, webglOverlay.backend_canvas.height
        ])
        this.Amount = ShaderController.bindDynamicFloat(gl,program, "Amount", 1)
        this.Noise = ShaderController.bindDynamicArray(gl, program, "Noise", 2, [
            0,0,
            0,1,
            0,2,
            0,3,
        ])
    }
    time = 0
    update(gl: WebGLRenderingContext): void {
        ShaderController.setArray(gl,this.Noise, 2, [
            0.2,Math.random(),
            0.2,Math.random(),
            0.2,Math.random(),
            0.2,Math.random(),
        ])
    }

    vertex = ()=>`
precision mediump float;

attribute vec3 Position;
attribute vec2 TexCoord;
attribute float Amount;
attribute vec2 Noise;
attribute vec4 ScreenSize;
varying vec2 TexCoord0;
varying float AmountOut;
varying vec4 OutScreenSize;
varying vec2 NoiseOut;


void main(void)
{
	AmountOut = Amount;
	NoiseOut = Noise;
	OutScreenSize = ScreenSize;
	gl_Position = vec4(Position.xyz, 1.0);
	TexCoord0 = TexCoord;
}
    `
    fragment = ()=>`
precision mediump float;

varying vec2 TexCoord0;
varying float AmountOut;
varying vec4 OutScreenSize;
varying vec2 NoiseOut;
uniform sampler2D Texture0;
float random (vec2 st) {
	return fract(sin(dot(st.xy,
		vec2(12.9898,78.233)))*
		43758.5453123);
}
void main(void)
{
	vec2 screenRatio = OutScreenSize.zw / OutScreenSize.xy;
	vec2 screenUV = TexCoord0 * screenRatio;

	/*Vigneting*/
	vec2 vigUV = (screenUV - 0.5) * vec2(1.5, 1.0) * 2.0;
	float vignete = 1.0 - pow(clamp(length(vigUV) * 0.65, 0.0, 1.0), 5.0) * 0.9;

	vec4 origColor = texture2D(Texture0, TexCoord0);
	/*Small bloom*/
	vec4 sum = vec4(0);
	for(int i = -1; i <= 1; i++) {
		for (int j = -1; j <= 1; j++) {
			vec4 col = texture2D(Texture0, TexCoord0 + vec2(i, j) * 3.0 / OutScreenSize.zw);
			sum += col * col * 0.13;
		}
	}
	vec4 color = origColor + sum;
	color.a = origColor.a;
	/*Desaturate + Sepia*/
	color.rgb = vec3(dot(vec3(0.2126,0.7152,0.0722), color.rgb));
	color.rgb *= vec3(1.1, 1.0, 0.9);
	color.rgb *= vignete;
	vec4 finalColor = mix(origColor, color, AmountOut);
    finalColor.rgb = mix(finalColor.rgb, vec3(random(TexCoord0 * (NoiseOut.y * 100.0))), NoiseOut.x);

	gl_FragColor = finalColor;
}
    `
}

class ShaderOldTV extends ShaderController {
    time = 0
    Time:any
    init(gl: WebGLRenderingContext, program: WebGLProgram, webglOverlay: WebGLOverlay): void {
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
    vertex = ()=>`
precision mediump float;

attribute vec3 Position;
attribute vec2 TexCoord;
attribute float Time;
attribute vec4 ScreenSize;
varying vec2 TexCoord0;
varying float TimeOut;
varying vec4 OutScreenSize;

void main(void)
{
	TimeOut = Time;
	OutScreenSize = ScreenSize;
	gl_Position = vec4(Position.xyz, 1.0);
	TexCoord0 = TexCoord;
}
    `
    fragment = ()=>`
precision mediump float;

varying vec2 TexCoord0;
varying float TimeOut;
varying vec4 OutScreenSize;
uniform sampler2D Texture0;

void main(void)
{
	vec2 screenRatio = OutScreenSize.zw / OutScreenSize.xy;
	vec2 screenUV = TexCoord0 * screenRatio;

	/*Distortion*/
	screenUV -= vec2(.5,.5);
	screenUV.x *= 1.0 + pow((abs(screenUV.y) / 5.0), 2.0);
	screenUV.y *= 1.0 + pow((abs(screenUV.x) / 1.5), 2.0);
	screenUV += vec2(.5,.5);

	/*Vigneting*/
	vec2 vigUV = (screenUV - 0.5) * vec2(1.5, 1.0) * 2.0;
	float vignete = 1.0 - pow(clamp(length(vigUV) * 0.65, 0.0, 1.0), 5.0) * 0.9;

	vec2 finalUV = screenUV / screenRatio;
	vec4 color = texture2D(Texture0, finalUV);
	color.r = texture2D(Texture0, finalUV + vec2(0.002, 0.0)).r;
	color.b = texture2D(Texture0, finalUV - vec2(0.002, 0.0)).b;
	color.rgb = mix(color.rgb, vec3((color.r + color.g + color.b) * 0.333), vec3(0.8, 0.0, 0.5));
	color.g *= 1.2;
	float scanline = abs(sin(finalUV.y * 700.0 - TimeOut)) * 0.2;
	float highlight = (1.0 - clamp(length(finalUV) * 3.5, 0.0, 1.0)) * (1.0 - clamp(length((finalUV - vec2(0.15, 0.15)) * 8.0), 0.0, 1.0));
	gl_FragColor = (color + vec4(vec3(scanline + highlight), 1.0)) * vignete;
}
    `
}


class ShaderDogma extends ShaderController {
    Colorize: any
    init(gl: WebGLRenderingContext, program: WebGLProgram, webglOverlay:WebGLOverlay): void {
        ShaderController.bindArray(gl, program, "TextureSize", 2, [
            webglOverlay.backend_canvas.width * 4, webglOverlay.backend_canvas.height * 4, 
            webglOverlay.backend_canvas.width * 4, webglOverlay.backend_canvas.height * 4, 
            webglOverlay.backend_canvas.width * 4, webglOverlay.backend_canvas.height * 4, 
            webglOverlay.backend_canvas.width * 4, webglOverlay.backend_canvas.height * 4, 
        ])
        ShaderController.bindArray(gl, program, "Color", 4, [
            1,1,1,1 ,
            1,1,1,1 ,
            1,1,1,1 ,
            1,1,1,1 ,
        ])
        this.Colorize = ShaderController.bindDynamicArray(gl, program, "ColorizeIn", 4, [
            1,1,1,1 ,
            1,1,1,1 ,
            1,1,1,1 ,
            1,1,1,1 ,
        ])
        ShaderController.bindArray(gl, program, "ColorOffsetIn", 3, [
            0,0,0 ,
            0,0,0 ,
            0,0,0 ,
            0,0,0 ,
        ])
        ShaderController.bindDynamicFloat(gl, program, "PixelationAmount", 0)
        ShaderController.bindArray(gl, program, "ClipPlane", 3, [
            1,1,0 ,
            1,1,0 ,
            1,1,0 ,
            1,1,0 ,
        ])

    }
    time = 0
    update(gl: WebGLRenderingContext): void {
        let rnd = Math.random()
        ShaderController.setArray(gl,this.Colorize, 4, [
            1,1,1, rnd ,
            1,1,1, rnd ,
            1,1,1, rnd ,
            1,1,1, rnd ,
        ])
    }

    vertex = ()=>`
precision mediump float;

attribute vec3 Position;
attribute vec4 Color;
attribute vec2 TexCoord;
attribute vec4 ColorizeIn;
attribute vec3 ColorOffsetIn;
attribute vec2 TextureSize;
attribute float PixelationAmount;
attribute vec3 ClipPlane;

varying vec4 Color0;
varying vec2 TexCoord0;
varying vec4 ColorizeOut;
varying vec3 ColorOffsetOut;
varying vec2 TextureSizeOut;
varying float PixelationAmountOut;
varying vec3 ClipPlaneOut;


void main(void)
{
	ColorizeOut = ColorizeIn;
	ColorOffsetOut = ColorOffsetIn;
	
	Color0 = Color;
	TextureSizeOut = TextureSize;
	PixelationAmountOut = PixelationAmount;
	ClipPlaneOut = ClipPlane;
	
	gl_Position = vec4(Position.xyz, 1.0);
	TexCoord0 = TexCoord;
}

    `
    fragment = ()=>`
#ifndef GL_ES
#  define lowp
#  define mediump
#endif
precision mediump float;

varying lowp vec4 Color0;
varying mediump vec2 TexCoord0;
varying lowp vec4 ColorizeOut;
varying lowp vec3 ColorOffsetOut;
varying lowp vec2 TextureSizeOut;
varying lowp float PixelationAmountOut;
varying lowp vec3 ClipPlaneOut;

uniform sampler2D Texture0;
//const vec3 _lum = vec3(0.212671, 0.715160, 0.072169);

//
// Description : Array and textureless GLSL 2D simplex noise function.
//      Author : Ian McEwan, Ashima Arts.
//  Maintainer : ijm
//     Lastmod : 20110822 (ijm)
//     License : Copyright (C) 2011 Ashima Arts. All rights reserved.
//               Distributed under the MIT License. See LICENSE file.
//               https://github.com/ashima/webgl-noise
// 

vec3 mod289(vec3 x)
{
	return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec2 mod289(vec2 x)
{
	return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec3 permute(vec3 x)
{
	return mod289(((x*34.0)+1.0)*x);
}

float snoise(vec2 v)
{
	const vec4 C = vec4(0.211324865405187,  // (3.0-sqrt(3.0))/6.0
					  0.366025403784439,  // 0.5*(sqrt(3.0)-1.0)
					 -0.577350269189626,  // -1.0 + 2.0 * C.x
					  0.024390243902439); // 1.0 / 41.0
	// First corner
	vec2 i  = floor(v + dot(v, C.yy) );
	vec2 x0 = v -   i + dot(i, C.xx);

	// Other corners
	vec2 i1;
	//i1.x = step( x0.y, x0.x ); // x0.x > x0.y ? 1.0 : 0.0
	//i1.y = 1.0 - i1.x;
	i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
	// x0 = x0 - 0.0 + 0.0 * C.xx ;
	// x1 = x0 - i1 + 1.0 * C.xx ;
	// x2 = x0 - 1.0 + 2.0 * C.xx ;
	vec4 x12 = x0.xyxy + C.xxzz;
	x12.xy -= i1;

	// Permutations
	i = mod289(i); // Avoid truncation effects in permutation
	vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
		+ i.x + vec3(0.0, i1.x, 1.0 ));

	vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
	m = m*m ;
	m = m*m ;

	// Gradients: 41 points uniformly over a line, mapped onto a diamond.
	// The ring size 17*17 = 289 is close to a multiple of 41 (41*7 = 287)

	vec3 x = 2.0 * fract(p * C.www) - 1.0;
	vec3 h = abs(x) - 0.5;
	vec3 ox = floor(x + 0.5);
	vec3 a0 = x - ox;

	// Normalise gradients implicitly by scaling m
	// Approximation of: m *= inversesqrt( a0*a0 + h*h );
	m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );

	// Compute final noise value at P
	vec3 g;
	g.x  = a0.x  * x0.x  + h.x  * x0.y;
	g.yz = a0.yz * x12.xz + h.yz * x12.yw;
	return 130.0 * dot(m, g);
}

void main(void)
{
	// Clip
	
	// // Pixelate
	// vec2 pa = vec2(1.0+PixelationAmountOut, 1.0+PixelationAmountOut) / TextureSizeOut;
	
	// vec2 uv_aligned = TexCoord0 - mod(TexCoord0, pa) + pa * 0.5;
	// vec2 uv = PixelationAmountOut > 0.0 ? uv_aligned : TexCoord0;
	
	// // Glitch distortion
	// float uOffset = snoise(vec2(ColorizeOut.a*1000.0, TextureSizeOut.x * 0.5 * uv_aligned.y));
	// uOffset = uOffset * ColorizeOut.r * 10.0 / TextureSizeOut.x;
	// uv.x += uOffset;
	
	vec4 Color = texture2D(Texture0, TexCoord0);
	
	if( Color.a == 0.0 )	discard;
	
	//vec3 Colorized = mix(Color.rgb, dot(Color.rgb, _lum) * ColorizeOut.rgb, ColorizeOut.a);
	//gl_FragColor = vec4(Colorized + ColorOffsetOut * Color.a, Color.a);
	
	// No colorization support, instead use colorize parameter for noise control
	if(Color.r == Color.g && Color.b > Color.r)
	{
		// Blue: Replace with simplex noise
		//float a = mix((snoise(TextureSizeOut * 0.5 * uv_aligned + vec2(ColorizeOut.a*1000.0, 0.0))+0.5)*Color.b, Color.b, Color.r/Color.b);
		
		vec2 NoiseUV = gl_FragCoord.xy + vec2(ColorizeOut.a*10000.0, ColorizeOut.a*10000.0);
		NoiseUV -= mod(NoiseUV, vec2(2.0+2.0*PixelationAmountOut,2.0+2.0*PixelationAmountOut));
		float a = mix((snoise(NoiseUV)+0.5)*Color.b, Color.b, Color.r/Color.b);
		Color.r = Color.g = Color.b = a;
	}
	else if(Color.r == Color.b && Color.g > Color.r)
	{
		// Green: Flicker a solid color
		//float a = mix((snoise(vec2(ColorizeOut.a*1000.0, 0.0))+1.0)*0.5*Color.g, Color.g, Color.r/Color.g);
		float a = mix(step(0.0,snoise(vec2(ColorizeOut.a*1000.0, 0.0)))*Color.g, Color.g, Color.r/Color.g);
		Color.r = Color.g = Color.b = a;
	}
	
	// Color *= Color0;
	gl_FragColor = vec4(Color.rgb + ColorOffsetOut * Color.a, Color.a);
	// gl_FragColor.rgb = mix(gl_FragColor.rgb, gl_FragColor.rgb - mod(gl_FragColor.rgb, 1.0/16.0) + 1.0/32.0, clamp(PixelationAmountOut, 0.0, 1.0));
}

    `
}


let PredefinedShaderControllers:{[name:string]:typeof ShaderController|null} = {
    __proto__:null,
    "default":ShaderController,
    "pixel":ShaderPixelation,
    "dizzy":ShaderDizzy,
    "hallucination":ShaderHallucination,
    "oldtv":ShaderOldTV,
    "dogma":ShaderDogma
}

