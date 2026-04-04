from glob import glob
import re
import pathlib
from xml.etree import ElementTree as ET
# this is only for game version repentence+

from common import GAME_FOLDER

xml = GAME_FOLDER / "resources" / "costumes2.xml"

with xml.open("r") as f:
    root = ET.parse(f).getroot()

datas = []

for costume in root:
    
    def _bool(name:str):
        if name in costume.attrib:
            v = costume.attrib[name]
            assert v == "true" or v == "false", v
            return v == "true"
        return False
    def _str(name:str, _default:str):
        if name in costume.attrib:
            return costume.attrib[name]
        return _default
    def _int(name:str, _default:int):
        if name in costume.attrib:
            return int(costume.attrib[name])
        return _default

    path = costume.attrib["anm2path"]
    assert path.endswith(".anm2")
    path = path[:-4] + "json"
    path = path.lower()
    path = path.replace(" ", "_") # wiki自动转换的
    while "__" in path:
        path = path.replace("__","_")
    wikipath = f"Anm2/resources-repp/gfx/characters/{path.lower()}"


    data = [
        _int("id", -1),
        wikipath,
        _str("type","unk"),
        _int("skinColor", -2),
        _bool("isFlying"),
        _bool("overwriteColor"),
        _int("priority", 0),
        _bool("hasSkinAlt"),
        _bool("hasOverlay"),
        _bool("forceBodyColor"),
        _bool("forceHeadColor")
    ]

    datas.append(data)

output_json = {
    "description": {
        "zh": "由genCostumes2.tabx.py生成"
    },
    "schema": {
        "fields": [
            {
                "name": "id",
                "type": "number",
                "title": {
                    "en": "id",
                    "zh": ""
                }
            },
            {
                "name": "anm2path",
                "type": "string",
                "title": {
                    "en": "anm2path",
                    "zh": ""
                }
            },
            {
                "name": "type",
                "type": "string",
                "title": {
                    "en": "type",
                    "zh": ""
                }
            },
            {
                "name": "skinColor",
                "type": "number",
                "title": {
                    "en": "skinColor",
                    "zh": ""
                }
            },
            {
                "name": "isFlying",
                "type": "boolean",
                "title": {
                    "en": "isFlying",
                    "zh": ""
                }
            },
            {
                "name": "overwriteColor",
                "type": "boolean",
                "title": {
                    "en": "overwriteColor",
                    "zh": ""
                }
            },
            {
                "name": "priority",
                "type": "number",
                "title": {
                    "en": "priority",
                    "zh": ""
                }
            },
            {
                "name": "hasSkinAlt",
                "type": "boolean",
                "title": {
                    "en": "hasSkinAlt",
                    "zh": ""
                }
            },
            {
                "name": "hasOverlay",
                "type": "boolean",
                "title": {
                    "en": "hasOverlay",
                    "zh": ""
                }
            },
            {
                "name": "forceBodyColor",
                "type": "boolean",
                "title": {
                    "en": "forceBodyColor",
                    "zh": ""
                }
            },
            {
                "name": "forceHeadColor",
                "type": "boolean",
                "title": {
                    "en": "forceHeadColor",
                    "zh": ""
                }
            }
        ]
    },
    "data": datas
}

import json

with open("Costumes2.tabx.json","w") as f:
    f.write(json.dumps(output_json))