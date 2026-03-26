attribute vec4 Position;
attribute vec2 TexCoord;

varying vec2 TexCoord0;

void main() {
gl_Position = Position;
    TexCoord0 = TexCoord;
}
