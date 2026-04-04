import common
import pngupload
import tqdm
site = common.site_bot()

costume_pngs = [\
                x for x \
                in (common.GAME_FOLDER / 'resources' / 'gfx' / 'characters') \
                    .rglob("**/*.png") \
                if 'costumes' in str(x) \
                ]

for png in tqdm.tqdm(costume_pngs):
    if pngupload.check_same(site, png):
        continue
    print("uploading ", png)
    pngupload.compress_and_upload_png(site, png)