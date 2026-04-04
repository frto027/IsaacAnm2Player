import pathlib
import parse

import common
import mwclient
import mwclient.listing
import tqdm

class SpritesheetInfo:
    def __init__(self, path:pathlib.Path, pathStr:str):
        self.path = path
        self.pathStr = pathStr

sheets:list[SpritesheetInfo] = []

def replace_relative_path(obj, anm2FilePath:pathlib.Path):
    if not "content" in obj:
        return
    content = obj["content"]
    if not "Spritesheets" in content:
        return
    for i in range(len(content["Spritesheets"])):
        newpath = anm2FilePath.parent / content["Spritesheets"][i]["Path"]
        
        # 处理资源覆盖
        if not newpath.exists():
            print(f"warning: not found file {newpath}")
        
        full_path = newpath

        newpath = newpath.resolve().relative_to(common.GAME_FOLDER)

        res_path = str(newpath).replace("\\","/")
        assert res_path.startswith("resources/"), res_path
        res_path = "resources-repp/" + res_path[len("resources/"):]
        content["Spritesheets"][i]["Path"] = res_path

        sheets.append(SpritesheetInfo(full_path, res_path))


import keymapper
import json

class Anm2FileInfo:
    def __init__(self, path:pathlib.Path):
        self.path = path
        self.wikipath = common.towiki_pagename_anm2(path)
        self.fulljson = None

    def jsontext(self)->str:
        if self.fulljson == None:
            fulljjson = parse.parseFile(str(self.path))
            replace_relative_path(fulljjson, self.path)
            keymapper.keymap(fulljjson)
            self.fulljson = json.dumps(fulljjson, separators=(',',':'))
        return self.fulljson
anm2s:list[Anm2FileInfo] = []

for f in common.GAME_FOLDER.rglob("resources/**/*.anm2"):
    anm2s.append(Anm2FileInfo(f))

local_urls = list([common.unify_page_name(x.wikipath) for x in anm2s])

site = common.site()
print("obtain remote pages...")
remote_page_list = [x for x in mwclient.listing.PageList(site, "Anm2/resources-repp/", namespace=3500)]
print("done")

remote_urls = list([x.name for x in remote_page_list])
remote_urls = [common.unify_page_name(x) for x in remote_urls]
only_local = set(local_urls) - set(remote_urls)
only_remote = set(remote_urls) - set(local_urls)

local_urls.sort()
remote_urls.sort()

# output anm2 diffs
with open("url.locals",'w') as f:
    for u in local_urls:
        f.write(u + "\n")
with open("url.remote",'w') as f:
    for u in remote_urls:
        f.write(u + "\n")
with open("url.onlylocals",'w') as f:
    for u in only_local:
        f.write(u + "\n")
with open("url.onlyremote",'w') as f:
    for u in only_remote:
        f.write(u + "\n")


remote_urls = set(remote_urls)

# generate jsons and sheets
print("gen anm2 jsons")
for anm2 in tqdm.tqdm(anm2s):
    anm2.jsontext()

# for anm2 in anm2s:
#     # 只上传新anm2
#     if common.unify_page_name(anm2.wikipath) in remote_urls:
#         continue
#     print("uploading...", anm2.wikipath)
#     site.Pages[anm2.wikipath].save(anm2.jsontext(), summary="忏悔+补充上传")

print("upload pngs")

import pngupload
for sheet in tqdm.tqdm(sheets):
    if not sheet.path.exists():
        continue
    if not pngupload.check_same(site, sheet.path):
        pngupload.compress_and_upload_png(site, sheet.path)