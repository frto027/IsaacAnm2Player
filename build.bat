python anm2parser\run.py docs
del /S docs\index.html
copy anm2player\preview.html docs\index.html

cd anm2player && npx tsc && cd ..
python huijianmplayer/merge.py huijianmplayer/anm2player.js docs/player.js
