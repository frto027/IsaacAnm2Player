precision mediump float;

attribute vec3 Position;
attribute vec4 Color;
attribute vec2 TexCoord;
attribute vec4 Shockwave1;
attribute vec4 Shockwave2;
attribute vec2 Ratio;
varying vec4 Color0;
varying vec2 TexCoord0;
varying vec4 Shockwave1Out;
varying vec4 Shockwave2Out;
varying vec2 OutRatio;

void main(void)
{
	Shockwave1Out = Shockwave1;
	Shockwave2Out = Shockwave2;
	OutRatio = Ratio;
	gl_Position = vec4(Position.xyz, 1.0);
	TexCoord0 = TexCoord;
	Color0 = Color;
}

