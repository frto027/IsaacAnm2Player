#ifdef GL_ES
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