import sys

if len(sys.argv) != 3:
    print(f"""
    usage: python {sys.argv[0]} <anm2player.js> <player.js>
    """)
    exit(1)

anm2player = sys.argv[1]
player = sys.argv[2]

print(f"{anm2player} <-- {player}")

with open(player,"r", encoding="utf8") as f:
    player_doc = f.read()

if player_doc.startswith('"use strict";\n'):
    player_doc = player_doc[len('"use strict";\n'):]

anm2player_ret = ""

# prescan
step = 0
with open(anm2player,"r", encoding="utf8") as f:
    for line in f.readlines():
        if "/* == BEGIN_OF player.ts == */" in line:
            assert step == 0
            step = 1
            anm2player_ret += line
            anm2player_ret += player_doc
        if "/* == END_OF player.ts == */" in line:
            assert step == 1
            step = 2
        if not step == 1:
            anm2player_ret += line
assert step == 2

with open(anm2player,"w",encoding="utf8") as f:
    f.write(anm2player_ret)