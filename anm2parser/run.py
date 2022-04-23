folder = "E:\\SteamLibrary\\steamapps\\common\\The Binding of Isaac Rebirth\\"

from glob import glob
import json

import parse
import keymapper
import pathlib

res_sequence = ['resources-dlc3.zh', 'resources-dlc3', 'resources']

def replace_relative_path(obj, relative):
    if not "content" in obj:
        return
    content = obj["content"]
    if not "Spritesheets" in content:
        return
    for i in range(len(content["Spritesheets"])):
        newpath = pathlib.Path(relative).parent / content["Spritesheets"][i]["Path"]
        
        # 处理资源覆盖
        
        
        res_folder = newpath.parts[0]
        later_path = newpath.relative_to(res_folder)

        for res in res_sequence:
            if (pathlib.Path(folder) / res / later_path).exists():
                newpath = pathlib.Path(res) / later_path
                break
        
        newpath = (pathlib.Path(folder) / newpath).resolve().relative_to(pathlib.Path(folder))

        if not (pathlib.Path(folder) / newpath).exists():
            print("warring: res not exist " + str(newpath))

        content["Spritesheets"][i]["Path"] = str(newpath).replace('\\','/')


def copy_sprite(obj, frompath, topath):
    if not "content" in obj:
        return
    content = obj["content"]
    if not "Spritesheets" in content:
        return
    for i in range(len(content["Spritesheets"])):
        path = content["Spritesheets"][i]["Path"]
        fromp = pathlib.Path(frompath) / path
        top = pathlib.Path(topath) / path
        if not fromp.exists():
            print("warring:file not found " + str(fromp))
            continue
        if not top.parent.exists():
            top.parent.mkdir(parents = True)
        with open(str(fromp),"rb") as f:
            with open(str(top), "wb") as t:
                t.write(f.read())


fulljson = {}

for f in glob(folder + "**\\*.anm2",recursive=True):
    assert f.startswith(folder)
    
    relative_path = f[len(folder):]
    # print(f)
    fulljson[relative_path] = parse.parseFile(f)
    # keymapper.keymap(fulljson[relative_path])
    replace_relative_path(fulljson[relative_path],relative_path)

# with open("anm2.json","w") as f:
#     f.write(json.dumps({
#         "keymap":keymapper.kmap_r,
#         "data":fulljson
#     },separators=(',',':')))

def dumpjson(obj):
    return json.dumps(obj,separators=(',',':'))

import sys
if len(sys.argv) == 2:
    output = pathlib.Path(sys.argv[1])
    if not output.exists():
        output.mkdir(parents=True)


    for k in fulljson:
        target = output / k.replace('.anm2','.json')
        print(target)
        if not target.parent.exists():
            target.parent.mkdir(parents = True)
        with open(str(target),'w') as f:
            f.write(dumpjson(fulljson[k]))


    # copy png file

    for k in fulljson:
        copy_sprite(fulljson[k], folder, output)

    # generate manifest

    manifest = []
    for k in fulljson:
        manifest.append(k.replace('\\','/').replace('.anm2','.json'))
    with open(str(output/"manifest.json"), 'w') as f:
        f.write(dumpjson(manifest))
else:
    print("usage: \n\tpython " + sys.argv[0] + " <output folder>")
    print(len(sys.argv))