kmap = {}
kmap_r = {}
map_dict="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"

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

