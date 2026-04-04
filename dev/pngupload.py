import pathlib
import cv2
import common
import mwclient.errors
import numpy as np
def wikipath(png:pathlib.Path):
    online_path = str(png.resolve().relative_to(common.GAME_FOLDER)).replace("\\","/")
    assert online_path.startswith("resources/")
    online_path = "resources-repp/" + online_path[len("resources/"):]
    urlpath = 'Anm2_' + online_path.replace('/','_')
    return urlpath

def compress_and_upload_png(site, png:pathlib.Path):
    # compress
    offline = cv2.imread(str(png),cv2.IMREAD_UNCHANGED)
    v,buf = cv2.imencode('.png',offline,[cv2.IMWRITE_PNG_COMPRESSION,9])
    with open("offline.png",'wb') as f:
        f.write(buf)

    urlpath = wikipath(png)

    #upload
    print("uploading "+urlpath)
    with open("offline.png",'rb') as f:
        r = None
        retry = 0
        while r == None and retry < 3:
            try:
                retry = retry + 1
                r = site.upload(f,urlpath,'Anm2动画素材(忏悔+)[[分类:Anm2动画贴图]]',ignore=True, comment='png upload')
            except mwclient.errors.APIError as e:
                print(e)
        print(r)

def check_same(site, png:pathlib.Path):
    urlpath = wikipath(png)
    retry = 0
    while retry < 3:
        retry += 1
        try:
            img = site.images[urlpath]
            if not img.exists:
                return False
            return True
            with open('online.png','wb') as f:
                img.download(f)
            break
        except Exception as e:
            print(e)
    online = cv2.imread('online.png',cv2.IMREAD_UNCHANGED)
    offline = cv2.imread(str(png), cv2.IMREAD_UNCHANGED)
    return np.array_equal(online, offline)
