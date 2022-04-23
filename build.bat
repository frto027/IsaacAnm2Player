python anm2parser\run.py web
del /S web\index.html
copy anm2player\preview.html web\index.html
npx tsc -p anm2player
