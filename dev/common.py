import mwclient
import json
import pathlib

with open('D:/huiji_auth.json','r') as f:
    auth_header = json.load(f)
    
useraccount_bot = "Frto027的机器人"
useraccount = "Frto027"
with open("D:/pswd.txt", "r") as f:
    password = f.read()

def site()->mwclient.Site:
    site = mwclient.Site("isaac.huijiwiki.com",clients_useragent=f"Frto027/Anm2PlayerUploader,(https://github.com/frto027/IsaacAnm2Player)", custom_headers=auth_header)
    site.login(useraccount, password)
    return site

def site_bot()->mwclient.Site:
    site = mwclient.Site("isaac.huijiwiki.com",clients_useragent=f"Frto027_bot/Anm2PlayerUploader,(https://github.com/frto027/IsaacAnm2Player)", custom_headers=auth_header)
    site.login(useraccount_bot, password)
    return site

GAME_FOLDER = pathlib.Path(r"D:\SteamLibrary\steamapps\common\The Binding of Isaac Rebirth\extracted_resources")

def towiki_pagename_anm2(path:pathlib.Path)->str:
    rpath = path.relative_to(GAME_FOLDER)
    pathstr = str(rpath).replace("\\","/")
    assert pathstr.endswith(".anm2")
    pathstr = pathstr[:-4] + "json"
    assert pathstr.startswith("resources/"), pathstr
    pathstr = "Data:Anm2/resources-repp/" + pathstr[len("resources/"):]
    return pathstr

def unify_page_name(path:str)->str:
    path = path.replace(" ","_")
    while "__" in path:
        path = path.replace("__","_")
    return path

def towiki_path_anm2(path:pathlib.Path)->str:
    rpath = path.relative_to(GAME_FOLDER)
    pathstr = str(rpath).replace("\\","/")
    assert pathstr.endswith(".anm2")
    pathstr = pathstr[:-4] + "json"
    pathstr = pathstr.lower().replace(" ","_")
    assert pathstr.startswith("resources/"), pathstr
    pathstr = "Data:Anm2/resources-repp/" + pathstr[len("resources/"):]
    return pathstr
