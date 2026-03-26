precision mediump float;

varying vec2 TexCoord0;
varying float AmountOut;
varying vec4 OutScreenSize;
uniform sampler2D Texture0;

void main() {
    gl_FragColor = texture2D(Texture0, TexCoord0);
}
