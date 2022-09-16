from glob import glob
import json
import pathlib


folder = "E:\\SteamLibrary\\steamapps\\common\\The Binding of Isaac Rebirth\\"

costume_maps = dict()

for f in glob(folder + "resources\\gfx\\characters\\costumes_*"):
    assert f.startswith(folder + "resources\\gfx\\characters\\costumes_")
    costume_maps[f[len(folder + "resources\\gfx\\characters\\costumes_"):]] = dict()
for f in glob(folder + "resources-dlc3\\gfx\\characters\\costumes_*"):
    assert f.startswith(folder + "resources-dlc3\\gfx\\characters\\costumes_")
    costume_maps[(f[len(folder + "resources-dlc3\\gfx\\characters\\costumes_"):])] = dict()
# print(costume_maps)

def parse_costume(png,prefix):
    png_name = png[len(prefix):]
    
    for alt in costume_maps:
        alt_dict = costume_maps[alt]
        
        target_path = folder + 'resources\\gfx\\characters\\costumes_' + alt + '\\' + png_name
        if pathlib.Path(target_path).exists():
            alt_dict[png[len(folder):]] = target_path[len(folder):]

        target_path = folder + 'resources-dlc3\\gfx\\characters\\costumes_' + alt + '\\' + png_name
        if pathlib.Path(target_path).exists():
            alt_dict[png[len(folder):]] = target_path[len(folder):]


for file in glob(folder + "resources\\gfx\\characters\\costumes\\*.png"):
    parse_costume(file,folder + "resources\\gfx\\characters\\costumes\\")
for file in glob(folder + "resources-dlc3\\gfx\\characters\\costumes\\*.png"):
    parse_costume(file,folder + "resources-dlc3\\gfx\\characters\\costumes\\")

output = "new Map(["
for costume in costume_maps:
    output += f'["{costume}",'
    output += "new Map(["# + "\n"
    for f_from in costume_maps[costume]:
        a = f_from.replace("\\","/")
        b = costume_maps[costume][f_from].replace("\\","/")
        output += f'  ["{a}","{b}"],' # + "\n"
    output += "])"
    output += "]," # + "\n"
output += "])"

if __name__ == "__main__":
    print(output)