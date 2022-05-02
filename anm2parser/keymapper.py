kmap = {}
kmap_r = {"a":"info","b":"CreatedBy","c":"CreatedOn","d":"Fps","e":"Version","f":"content","g":"Spritesheets","h":"Id","i":"Path","j":"Layers","k":"Name","l":"SpritesheetId","m":"Nulls","n":"Events","o":"animations","p":"DefaultAnimation","q":"animation","r":"FrameNum","s":"Loop","t":"RootAnimation","u":"XPosition","v":"YPosition","w":"Delay","x":"Visible","y":"XScale","z":"YScale","A":"RedTint","B":"GreenTint","C":"BlueTint","D":"AlphaTint","E":"RedOffset","F":"GreenOffset","G":"BlueOffset","H":"Rotation","I":"Interpolated","J":"LayerAnimations","K":"frames","L":"LayerId","M":"XPivot","N":"YPivot","O":"XCrop","P":"YCrop","Q":"Width","R":"Height","S":"NullAnimations","T":"NullId","U":"Triggers","V":"EventId","W":"AtFrame"}
map_dict="XYZ"

for k in kmap_r:
    kmap[kmap_r[k]] = k

kincr = 0
def keymap(obj):
    global kincr
    if type(obj) == list:
        for child in obj:
            keymap(child)

    if type(obj) == dict:
        keys = []
        for k in obj:
            keys.append(k)
        for k in keys:
            if k in kmap:
                tk = kmap[k]
            else:
                assert len(map_dict) > kincr
                tk = map_dict[kincr]
                kincr += 1
                kmap[k] = tk
                kmap_r[tk] = k
            temp = obj[k]
            del obj[k]
            obj[tk] = temp
            keymap(temp)

