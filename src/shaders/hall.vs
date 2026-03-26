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
