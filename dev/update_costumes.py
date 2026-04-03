from glob import glob
import re
import pathlib

GAME_FOLDER = pathlib.Path("")

COLORS = ['white', 'black', 'blue', 'red', 'green', 'grey']

path_re = re.compile(r"^(resources)(-dlc3)?(/gfx/characters/costumes)([_a-z]+)(/.*\.png)$")
#                          1         2          3                       4        5

png_lib:dict[str,set[str]] = {}

def handle(path:str):
    m = path_re.match(path)
    assert m

    dlc3 = ""
    chara = ""
    color = ""

    clean_path = m.group(1) + m.group(3) + m.group(5)
    if m.group(2) != "":
        dlc3 = "dlc3"
    if m.group(4).startswith("_"):
        chara = m.group(4)[1:]
    for tcolor in COLORS:
        if clean_path.endswith(f"_{tcolor}.png"):
            clean_path = clean_path[:-len(f"_{tcolor}.png")] + ".png"
            color = tcolor
    
    result = f"{dlc3}:{chara}:{color}"
    if not clean_path in png_lib:
        png_lib[clean_path] = set()
    png_lib[clean_path].add(result)

for f in (GAME_FOLDER / 'resources').glob("resources/gfx/characters/costumes*/**/*.png"):
    path = str(f.relative_to(GAME_FOLDER))
    handle(path)
for f in (GAME_FOLDER / 'resources').glob("resources-dlc3/gfx/characters/costumes*/**/*.png"):
    path = str(f.relative_to(GAME_FOLDER))
    handle(path)


datas = []

json_output = {
    "description": {
        "zh": "有update_costumes.py自动生成"
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
    datas.append([
        url,
        ';'.join(png_lib[url])
    ])
import json
with open("CharaCostume.tabx",'w') as f:
    f.write(json.dumps(json_output))