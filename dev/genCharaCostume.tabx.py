from glob import glob
import re
import pathlib

# this is only for game version repentence+

from common import GAME_FOLDER

COLORS = ['white', 'black', 'blue', 'red', 'green', 'grey']

path_re = re.compile(r"^(resources/gfx/characters/costumes)([_a-z]*)(/.*\.png)$")
#                          1                                   2      3

png_lib:dict[str,set[str]] = {}

def handle(path:str):
    m = path_re.match(path)
    assert m, path
    chara = ""
    color = ""

    clean_path = m.group(1) + m.group(3)
    if m.group(2).startswith("_"):
        chara = m.group(2)[1:]
    for tcolor in COLORS:
        if clean_path.endswith(f"_{tcolor}.png"):
            clean_path = clean_path[:-len(f"_{tcolor}.png")] + ".png"
            color = tcolor
    
    result = f"{chara}:{color}"

    if result == ":":
        return

    if not clean_path in png_lib:
        png_lib[clean_path] = set()
    png_lib[clean_path].add(result)

for f in (GAME_FOLDER).rglob("resources/gfx/characters/costume*/**/*.png"):
    path = str(f.relative_to(GAME_FOLDER)).replace("\\","/")
    handle(path)

datas = []

json_output = {
    "description": {
        "zh": "由genCharaCostume.tabx.py自动生成"
    },
    "schema": {
        "fields": [
            {
                "name": "sprite_path",
                "type": "string",
                "title": {
                    "en": "sprite_path",
                    "zh": "贴图路径"
                }
            },
            {
                "name": "characolors",
                "type": "string",
                "title": {
                    "en": "characolors[]",
                    "zh": "角色颜色组合信息"
                }
            }
        ]
    },
    "data": datas
}

for url in png_lib:
    wiki_url = url
    assert wiki_url.startswith("resources/")
    wiki_url = "resources-repp/" + wiki_url[len("resources/"):]
    datas.append([
        wiki_url,
        ';'.join(png_lib[url])
    ])
import json
with open("CharaCostume.tabx.json",'w') as f:
    f.write(json.dumps(json_output))