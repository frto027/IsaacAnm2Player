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
