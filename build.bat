@REM python anm2parser\run.py docs
@REM del /S docs\index.html
@REM copy anm2player\preview.html docs\index.html

cd anm2player && npx tsc && cd .. && python huijianmplayer/merge.py huijianmplayer/anm2player.js docs/shaders.js docs/player.js
