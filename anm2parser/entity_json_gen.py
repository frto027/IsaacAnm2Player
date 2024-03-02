# 用于生成实体动画的json文件

from pathlib import Path
import xml.etree.ElementTree as ET
from typing import Callable

folder = Path("E:\\SteamLibrary\\steamapps\\common\\The Binding of Isaac Rebirth\\")

wikitext_dir = Path("wikitexts")

xml = folder / "resources-dlc3" / "entities2.xml"

with xml.open("r") as f:
    entityXml = ET.parse(f).getroot()

PrettyPrint = True

infobox_page = []

class AnmInfo:
    def __init__(self, Anm2Fullpath : Path) -> None:
        self.path = Anm2Fullpath
        self.AnmNames = []
        self.RecommandSize: dict[str, tuple[float,float,float,float]] = {}
        with Anm2Fullpath.open("r", encoding="utf8") as f:
            xml = ET.parse(f).getroot()
            for ch in xml:
                if ch.tag != "Animations":
                    continue
                for cch in ch:
                    assert cch.tag == "Animation"
                    self.AnmNames.append(cch.attrib["Name"])
                    # calc recommand size
                    left = 100000
                    right = -100000
                    up = 100000
                    down = -100000
                    for anmation in cch:
                        if anmation.tag == "RootAnimation":
                            for frame in anmation:
                                assert frame.tag == "Frame"
                                rootx = float(frame.attrib["XPosition"])
                                rooty = float(frame.attrib["YPosition"])
                                rootxScale = float(frame.attrib["XScale"])/100
                                rootyScale = float(frame.attrib["YScale"])/100
                        if anmation.tag == "LayerAnimations":
                            for layerAnim in anmation:
                                for frame in layerAnim:
                                    x = float(frame.attrib["XPosition"])
                                    y = float(frame.attrib["YPosition"])
                                    xpivot = float(frame.attrib["XPivot"])
                                    ypivot = float(frame.attrib["YPivot"])
                                    w = float(frame.attrib["Width"])
                                    h = float(frame.attrib["Height"])
                                    xScale = float(frame.attrib["XScale"])/100
                                    yScale = float(frame.attrib["YScale"])/100
                                    visible = frame.attrib["Visible"] == "true"

                                    mleft = -xpivot * xScale + x + rootx
                                    mright = (w - xpivot) * xScale + x + rootx
                                    mup = -ypivot * yScale + y + rooty
                                    mdown = (h - ypivot) * yScale + y + rooty

                                    if mleft > mright:
                                        (mleft, mright) = (mright,mleft)
                                    if mup > mdown:
                                        (mup, mdown) = (mdown, mup)

                                    left = min(left, mleft)
                                    right = max(right, mright)
                                    up = min(up, mup)
                                    down = max(down, mdown)

                    self.RecommandSize[cch.attrib["Name"]] = (left, right, up, down)
                    

    def GetRecommandSize(self, AnmName: str, size: tuple[float, float, float, float]):
        (l,r,u,d) = self.RecommandSize[AnmName]
        (left, right, up, down) = size
        l = min(l, left)
        r = max(r, right)
        u = min(u, up)
        d = max(d, down)
        return (l,r,u,d)
    
    def __str__(self) -> str:
        # return "{" + f"AnmInfo:names:{self.AnmNames}" + "}"
        return "{" + f"{self.AnmNames}" + "}"
    

class Template:
    def __init__(self, name:str) -> None:
        self.__name = name
        self.__attr = {}
    def setattr(self, __name: str, __value) -> None:
        self.__attr[__name] = __value
    def getattr(self, __name: str):
        return self.__attr[__name]
    def __str__(self) -> str:
        ret = ["{{", self.__name]
        body = None
        for attr in self.__attr:
            target = self.__attr[attr]
            if type(target) == list:
                target = ''.join([str(t) for t in target])
            elif type(target) == float:
                target = "%.2f" % target
                while "." in target and (target.endswith("0") or target.endswith(".")):
                    target = target[:-1]
            else:
                target = str(target)
            if attr == "body":
                body = target
                continue
            ret.extend(["|", attr, "=", target])
        if body != None:
            ret.extend(["|body=", body])
        if ret[-1].endswith("}}"):
            ret.append(" ")
        ret.append("}}")
        if PrettyPrint:
            ret.append("<!--\n-->")
        return ''.join(ret)

class Anm2Anm(Template):
    def __init__(self, anm2_full_path:Path) -> None:
        super().__init__("Anm2/Anm")
        self.setattr("anm", "Anm2/" + str(anm2_full_path.relative_to(folder)).replace(".anm2", ".json").replace("\\","/").replace(" ","_").lower())
        self.rules = []
    def name(self, n:str):
        self.setattr("name", n)
    def pos(self, x:float,y:float):
        self.setattr("x", x)
        self.setattr("y", y)
    def pos_to(self, anm):
        self.setattr("x", anm.getattr("x"))
        self.setattr("y", anm.getattr("y"))

    def addrule(self, rule:str):
        self.rules.append(rule)
        # self.getattr("body").append( ("  " if PrettyPrint else "") + "{{Anm2/Rule|" + rule + "}}" + ("\n" if PrettyPrint else ""))
    
    def __str__(self) -> str:
        if PrettyPrint:
            self.setattr("body", ["<!--\n  -->{{Anm2/Rule|" + x + "}}" for x in self.rules])
            self.getattr("body").append("<!--\n-->")
        else:
            self.setattr("body", "{{Anm2/Rule|" + "{{!}}".join(self.rules) + "}}")
        return super().__str__()

class Anm2(Template):
    def __init__(self, anmInfo:AnmInfo = None) -> None:
        super().__init__("Anm2")
        self.body = []
        self.width = 50
        self.height = 50
        self.scale = 2
        self.info = anmInfo
        if PrettyPrint:
            self.body.append("<!--\n-->")
    def size(self, w:int,h:int):
        self.width = w
        self.height = h
    def addAnm(self, anm2_full_path:Path, updateSize = True) -> Anm2Anm:
        r = Anm2Anm(anm2_full_path)
        self.body.append(r)
        # r.pos(self.width/2, self.height/2)
        return r
    def updateSize(self, names:list[str], anm2Anm: Anm2Anm):
        l = 100000
        r = -100000
        u = 100000
        d = -100000
        for name in names:
            (l,r,u,d) = self.info.GetRecommandSize(name, (l,r,u,d))

        self.width = r-l
        self.height = d-u
        if self.width * self.scale > 280:
            self.scale = 280 / self.width
        anm2Anm.pos(-l, -u)

    def __str__(self) -> str:
        self.setattr("width", self.width)
        self.setattr("height", self.height)
        self.setattr("scale", self.scale)
        self.setattr("body", self.body)
        self.setattr("waitkey","{{{waitkey|}}}")
        self.setattr("border","{{{border|0}}}")
        return super().__str__()

class AnmGenRule:
    def Match(self, AnmInfo:AnmInfo):
        return False
    def GenPlayRule(self, AnmInfo:AnmInfo) -> Anm2:
        raise Exception("can't call this method")
    def __str__(self) -> str:
        return type(self).__name__
    
########################## overwrite ###################

OverwriteDict:dict[str, Callable[[str], Anm2]] = {}

# 如果想要自己编写模板，就在这里指定

OverwriteStrDict:dict[str,str] = {

}

########################## rules #######################

rules: list[AnmGenRule] = []

class SingleRule(AnmGenRule):
    def Match(self, AnmInfo: AnmInfo):
        return len(AnmInfo.AnmNames) == 1
    def GenPlayRule(self, AnmInfo: AnmInfo) -> Anm2:
        r = Anm2(AnmInfo)
        Name = AnmInfo.AnmNames[0]
        anm = r.addAnm(AnmInfo.path)
        anm.name(Name)
        anm.addrule(f"when:{Name},next:{Name}")
        r.updateSize([Name], anm)
        return r
rules.append(SingleRule())


class WalkRule(AnmGenRule):
    def __init__(self, name:str) -> None:
        super().__init__()
        self.normalName = name
    def Match(self, AnmInfo: AnmInfo):
        return self.normalName in AnmInfo.AnmNames
    def GenPlayRule(self, AnmInfo: AnmInfo) -> Anm2:
        r = Anm2(AnmInfo)

        otherAnms: list[Anm2Anm] = []
        
        anm = r.addAnm(AnmInfo.path)
        anm.name(self.normalName)
        anm.addrule(f"when:{self.normalName},next:{self.normalName}")

        names = [self.normalName]

        if "WalkOpenEye" in AnmInfo.AnmNames:
            names.append("WalkOpenEye")
            anm.addrule(f"when:{self.normalName},clicknext:WalkOpenEye")
            anm.addrule(f"when:WalkOpenEye,next:{self.normalName}")


        if "WalkHori" in AnmInfo.AnmNames:
            walkAnm = r.addAnm(AnmInfo.path)
            names.append("WalkHori")
            walkAnm.name("WalkHori")
            walkAnm.addrule("when:WalkHori,next:WalkHori")
            otherAnms.append(walkAnm)

        r.updateSize(names, anm)

        for a in otherAnms:
            a.pos_to(anm)
        return r
    def __str__(self) -> str:
        return f"WalkRule({self.normalName})"
rules.extend([WalkRule("Walk"), WalkRule("Head"), WalkRule("HeadWalk")])

class HeadAndWalk(AnmGenRule):
    def Match(self, AnmInfo: AnmInfo):
        return "WalkDown" in AnmInfo.AnmNames
    def GenPlayRule(self, AnmInfo: AnmInfo) -> Anm2:
        r = Anm2(AnmInfo)
        anm = r.addAnm(AnmInfo.path)
        anm.name("WalkDown")
        names = ["WalkDown"]
        anm.addrule("when:WalkDown,next:WalkDown")
        top = None
        if "HeadDown" in AnmInfo.AnmNames:
            names.append("HeadDown")
            top = r.addAnm(AnmInfo.path)
            top.name("HeadDown")
            top.addrule("when:HeadDown,next:HeadDown")
        elif "Head" in AnmInfo.AnmNames:
            names.append("Head")
            top = r.addAnm(AnmInfo.path)
            top.name("Head")
            top.addrule("when:Head,next:Head")
        r.updateSize(names, anm)
        if top != None:
            top.pos_to(anm)
        r.body.reverse()
        return r
rules.append(HeadAndWalk())

class HeadAndWalkHori(AnmGenRule):
    def Match(self, AnmInfo: AnmInfo):
        return "WalkHori" in AnmInfo.AnmNames
    def GenPlayRule(self, AnmInfo: AnmInfo) -> Anm2:
        r = Anm2(AnmInfo)
        anm = r.addAnm(AnmInfo.path)
        anm.name("WalkHori")
        names = ["WalkHori"]
        anm.addrule("when:WalkHori,next:WalkHori")
        top = None
        if "HeadDown" in AnmInfo.AnmNames:
            names.append("HeadDown")
            top = r.addAnm(AnmInfo.path)
            top.name("HeadDown")
            top.addrule("when:HeadDown,next:HeadDown")
        elif "Head" in AnmInfo.AnmNames:
            names.append("Head")
            top = r.addAnm(AnmInfo.path)
            top.name("Head")
            top.addrule("when:Head,next:Head")
        r.updateSize(names, anm)
        if top != None:
            top.pos_to(anm)
        r.body.reverse()
        return r
rules.append(HeadAndWalkHori())

class MatchOnly(AnmGenRule):
    def __init__(self, list, use) -> None:
        super().__init__()
        self.list = list
        self.use = use
    def Match(self, AnmInfo: AnmInfo):
        if len(self.list) != len(AnmInfo.AnmNames):
            return False
        for anm in self.list:
            if not anm in AnmInfo.AnmNames:
                return False
        return True
        
    def GenPlayRule(self, AnmInfo:AnmInfo) -> Anm2:
        r = Anm2(AnmInfo)
        anm = r.addAnm(AnmInfo.path)
        anm.name(self.use)
        anm.addrule(f"when:{self.use},next:{self.use}")
        r.updateSize([self.use], anm)
        return r
    def __str__(self) -> str:
        return f"MatchOnly([{','.join(self.list)}], {self.use})"

rules.extend([
    MatchOnly(["Rotate","Stuck"], "Rotate"),
    MatchOnly(['Fly', 'AttackStart', 'AttackLoop', 'AttackEnd', 'AttackBackStart', 'AttackBackLoop', 'AttackBackEnd'], "Fly"),
])

class CloseEyeIdleClickRule(AnmGenRule):
    def Match(self, AnmInfo: AnmInfo):
        return "Appear" in AnmInfo.AnmNames and "CloseEyes" in AnmInfo.AnmNames and "Idle" in AnmInfo.AnmNames and "ClosedEyes" in AnmInfo.AnmNames
    def GenPlayRule(self, AnmInfo: AnmInfo) -> Anm2:
        r = Anm2(AnmInfo)
        anm = r.addAnm(AnmInfo.path)
        anm.name("Idle")
        anm.addrule("when:Idle,next:Idle")
        anm.addrule("when:Appear,next:Idle")
        anm.addrule("when:Idle,clicknext:CloseEyes")
        anm.addrule("when:CloseEyes,next:ClosedEyes")
        anm.addrule("when:ClosedEyes,next:ClosedEyes")
        anm.addrule("when:ClosedEyes,clicknext:Appear")
        r.updateSize(["Idle","ClosedEyes","CloseEyes", "Appear"],anm)
        return r

rules.append(CloseEyeIdleClickRule())

class SwardRule(AnmGenRule):
    def Match(self, AnmInfo: AnmInfo):
        return "AttackRight" in AnmInfo.AnmNames and "IdleRight" in AnmInfo.AnmNames and "ChargedRight" in AnmInfo.AnmNames and "SpinRight" in AnmInfo.AnmNames
    def GenPlayRule(self, AnmInfo: AnmInfo) -> Anm2:
        r = Anm2(AnmInfo)
        anm = r.addAnm(AnmInfo.path)
        anm.name("IdleRight")
        anm.addrule("when:IdleRight,next:IdleRight")
        anm.addrule("when:IdleRight,clicknext:AttackRight")
        anm.addrule("when:AttackRight,next:ChargedRight")
        anm.addrule("when:ChargedRight,next:ChargedRight")
        anm.addrule("when:ChargedRight,clicknext:SpinRight")
        anm.addrule("when:SpinRight,next:IdleRight")
        r.updateSize(["IdleRight","AttackRight","ChargedRight","SpinRight"],anm)
        return r
rules.append(SwardRule())

class LoopStartEnd(AnmGenRule):
    def Match(self, AnmInfo: AnmInfo):
        return "Loop" in AnmInfo.AnmNames and "Start" in AnmInfo.AnmNames and "End" in AnmInfo.AnmNames
    def GenPlayRule(self, AnmInfo: AnmInfo) -> Anm2:
        r = Anm2(AnmInfo)
        anm = r.addAnm(AnmInfo.path)
        anm.name("Loop")
        anm.addrule("when:Loop,next:Loop")
        anm.addrule("when:Loop,clicknext:End")
        anm.addrule("when:End,next:Start")
        anm.addrule("when:Start,next:Loop")
        r.updateSize(["Start","Loop","End"], anm)
        return r
rules.append(LoopStartEnd())

class HoriVertRule(AnmGenRule):
    def __init__(self, prefix) -> None:
        super().__init__()
        self.prefix = prefix
    def Match(self, AnmInfo: AnmInfo):
        if f"{self.prefix}Vert" in AnmInfo.AnmNames and f"{self.prefix}Hori" in AnmInfo.AnmNames:
            if len(AnmInfo.AnmNames) == 2:
                return True
            if len(AnmInfo.AnmNames) == 3:
                return True # print(AnmInfo.path, AnmInfo.AnmNames)
        return False
    def GenPlayRule(self, AnmInfo: AnmInfo) -> Anm2:
        r = Anm2(AnmInfo)
        anm = r.addAnm(AnmInfo.path)
        anm.name(f"{self.prefix}Hori")
        anm.addrule(f"when:{self.prefix}Hori,next{self.prefix}Hori")
        anm.addrule(f"when:{self.prefix}Vert,next{self.prefix}Vert")
        anm.addrule(f"when:{self.prefix}Hori,clicknext{self.prefix}Vert")
        anm.addrule(f"when:{self.prefix}Vert,clicknext{self.prefix}Hori")

        if "Head" in AnmInfo.AnmNames:
            r.updateSize([f"{self.prefix}Hori", f"{self.prefix}Vert", "Head"], anm)
            upper = r.addAnm(AnmInfo.path)
            upper.name("Head")
            upper.addrule("when:Head,next:Head")
            upper.pos_to(anm)
        elif "Spiders" in AnmInfo.AnmNames:
            r.updateSize([f"{self.prefix}Hori", f"{self.prefix}Vert", "Spiders"], anm)
            upper = r.addAnm(AnmInfo.path)
            upper.name("Spiders")
            upper.addrule("when:Spiders,next:Spiders")
            upper.pos_to(anm)
        elif "Blood" in AnmInfo.AnmNames:
            r.updateSize([f"{self.prefix}Hori", f"{self.prefix}Vert", "Blood"], anm)
            upper = r.addAnm(AnmInfo.path)
            upper.name("Blood")
            upper.addrule("when:Blood,next:Blood")
            upper.pos_to(anm)
        else:
            r.updateSize([f"{self.prefix}Hori", f"{self.prefix}Vert"], anm)
        return r
    def __str__(self) -> str:
        return f"HoriVertRule({self.prefix})"
    
rules.extend([HoriVertRule("Move"), HoriVertRule("Walk")])

class OneClickChange(AnmGenRule):
    def __init__(self,norm:str, change:str) -> None:
        super().__init__()
        self.norm = norm
        self.change = change
    def Match(self, AnmInfo: AnmInfo):
        return self.norm in AnmInfo.AnmNames and self.change in AnmInfo.AnmNames
    def GenPlayRule(self, AnmInfo: AnmInfo) -> Anm2:
        r = Anm2(AnmInfo)
        anm = r.addAnm(AnmInfo.path)
        anm.name(self.norm)
        anm.addrule(f"when:{self.norm},next:{self.norm}")
        anm.addrule(f"when:{self.norm},clicknext:{self.change}")
        anm.addrule(f"when:{self.change},next:{self.norm}")
        r.updateSize([self.norm,self.change], anm)
        return r
    def __str__(self) -> str:
        return f"OneClickChange({self.norm},{self.change})"
rules.extend([
    OneClickChange("Fly", "Die"),
    OneClickChange("Fly","Attack"),
    OneClickChange("Idle","Shoot"),
    OneClickChange("Float","Drop"),
    OneClickChange("Wiggle","Attack"),
    OneClickChange("WalkHori","Attack"),
    OneClickChange("Fly","Explode"),
    OneClickChange("Fly","Appear"),
    OneClickChange("Move Hori", "Attack Hori"),
    OneClickChange("Move Down", "Attack Down"),
    OneClickChange("Float","Shield"),
    OneClickChange("Heart","HeartAttack"),
    OneClickChange("Laser","Fade"),
    OneClickChange("Shake","Attack"),
    OneClickChange("Shake","Shoot"),
    OneClickChange("Hori","Appear"),
    OneClickChange("Down","Appear"),
    OneClickChange("WalkHori","Attack01Horiz"),
    OneClickChange("Roll","Appear"),
    OneClickChange("Eye Opened","Shoot"),
    OneClickChange("Throw","Appear"),
    OneClickChange("Dash","Death"),
    OneClickChange("Biggest","Death"),
    OneClickChange("Big","Death"),
    OneClickChange("Medium","Death"),
    OneClickChange("Small","Death"),
    OneClickChange("GrabLoop","Grab"),
    OneClickChange("Idle","PayPrize"),
    OneClickChange("RedLaser","RedLaserEnd"),
    OneClickChange("WalkHori","Attack04Horiz"),
])
class PinnnnRule(AnmGenRule):
    def __init__(self, segments:list[str], delta:float) -> None:
        super().__init__()
        self.segments = segments
        self.delta = delta
    def Match(self, AnmInfo: AnmInfo):
        for seg in self.segments:
            if not seg in AnmInfo.AnmNames:
                return False
        return True
    def GenPlayRule(self, AnmInfo: AnmInfo) -> Anm2:
        r = Anm2(AnmInfo)
        anm = r.addAnm(AnmInfo.path)
        anm.name(self.segments[0])
        anm.addrule(f"when:{self.segments[0]},next:{self.segments[0]}")
        r.updateSize(self.segments, anm)
        r.width += (len(self.segments) - 1) * self.delta
        delta = self.delta
        for seg in self.segments[1:]:
            later = r.addAnm(AnmInfo.path)
            later.name(seg)
            later.addrule(f"when:{seg},next:{seg}")
            later.pos(anm.getattr("x") + delta, anm.getattr("y"))
            delta += self.delta
        r.body.reverse()
        return r
    def __str__(self) -> str:
        return f"PinnnnnRule([{','.join(self.segments)}, {self.delta}])"
rules.extend([
    PinnnnRule(["ButtHori","Body3Hori","Body3Hori","WalkHeadHori"],18),
    PinnnnRule(["WalkBodyHori","WalkBodyHori","WalkBodyHori","WalkHeadHori"],18),
    PinnnnRule(["WalkBodyRef","WalkBodyRef","WalkBodyRef","WalkHeadRef"],18),
    PinnnnRule(["WalkBody02","WalkBody01","WalkNormalHori"],24),
])
class PinnnnRuleVert(AnmGenRule):
    def __init__(self, segments:list[str], delta:float) -> None:
        super().__init__()
        self.segments = segments
        self.delta = delta
    def Match(self, AnmInfo: AnmInfo):
        for seg in self.segments:
            if not seg in AnmInfo.AnmNames:
                return False
        return True
    def GenPlayRule(self, AnmInfo: AnmInfo) -> Anm2:
        r = Anm2(AnmInfo)
        anm = r.addAnm(AnmInfo.path)
        anm.name(self.segments[0])
        anm.addrule(f"when:{self.segments[0]},next:{self.segments[0]}")
        r.updateSize(self.segments, anm)
        r.height += (len(self.segments) - 1) * self.delta
        delta = self.delta
        for seg in self.segments[1:]:
            later = r.addAnm(AnmInfo.path)
            later.name(seg)
            later.addrule(f"when:{seg},next:{seg}")
            later.pos(anm.getattr("x"), anm.getattr("y") + delta)
            delta += self.delta
        return r
    def __str__(self) -> str:
        return f"PinnnnnRule([{','.join(self.segments)}, {self.delta}])"

class HopRule(AnmGenRule):
    def Match(self, AnmInfo: AnmInfo):
        return "Hop" in AnmInfo.AnmNames and "BigJumpUp" in AnmInfo.AnmNames and "BigJumpDown" in AnmInfo.AnmNames
    def GenPlayRule(self, AnmInfo: AnmInfo) -> Anm2:
        r = Anm2(AnmInfo)
        anm = r.addAnm(AnmInfo.path)
        anm.name("Hop")
        anm.addrule("when:Hop,next:Hop")
        anm.addrule("when:Hop,clicknext:BigJumpUp")
        anm.addrule("when:BigJumpUp,next:BigJumpDown")
        anm.addrule("when:BigJumpDown,next:Hop")
        r.updateSize(["Hop","BigJumpUp","BigJumpDown"],anm)
        return r
rules.append(HopRule())
class MachineRule(AnmGenRule):
    def Match(self, AnmInfo: AnmInfo):
        return "Idle" in AnmInfo.AnmNames and "Initiate" in AnmInfo.AnmNames and "Wiggle" in AnmInfo.AnmNames
    def GenPlayRule(self, AnmInfo: AnmInfo) -> Anm2:
        r = Anm2(AnmInfo)
        anm = r.addAnm(AnmInfo.path)
        anm.name("Idle")
        anm.addrule("when:Idle,next:Idle")
        anm.addrule("when:Idle,clicknext:Initiate")
        anm.addrule("when:Initiate,next:Wiggle")
        if "Prize" in AnmInfo.AnmNames:
            anm.addrule("when:Wiggle,next:Prize,rate:0.5")
            anm.addrule("when:Prize,next:Idle")
        
        if "NoPrize" in AnmInfo.AnmNames:
            anm.addrule("when:Wiggle,next:NoPrize")
            anm.addrule("when:NoPrize,next:Idle")
        else:
            anm.addrule("when:Wiggle,next:Idle")
        r.updateSize(["Idle","Wiggle","Initiate"], anm)
        return r
class MachineRule2(AnmGenRule):
    def Match(self, AnmInfo: AnmInfo):
        return "Idle" in AnmInfo.AnmNames and "PayShuffle" in AnmInfo.AnmNames and \
        "Shell1Prize" in AnmInfo.AnmNames and "Shell2Prize" in AnmInfo.AnmNames and\
        "Shell3Prize" in AnmInfo.AnmNames
    def GenPlayRule(self, AnmInfo: AnmInfo) -> Anm2:
        r = Anm2(AnmInfo)
        anm = r.addAnm(AnmInfo.path)
        anm.name("Idle")
        anm.addrule("when:Idle,next:Idle")
        anm.addrule("when:Idle,clicknext:PayShuffle")
        anm.addrule("when:PayShuffle,next:Shell2Prize,rate:0.36")
        anm.addrule("when:PayShuffle,next:Shell1Prize,rate:0.5")
        anm.addrule("when:PayShuffle,next:Shell3Prize")
        anm.addrule("when:Shell2Prize,next:Idle")
        anm.addrule("when:Shell1Prize,next:Idle")
        anm.addrule("when:Shell3Prize,next:Idle")
        r.updateSize(["Idle","PayShuffle","Shell1Prize"], anm)
        return r
rules.append(MachineRule())
rules.append(MachineRule2())

class LoopAnms(AnmGenRule):
    def __init__(self, namelist) -> None:
        super().__init__()
        self.namelist = namelist
    def Match(self, AnmInfo: AnmInfo):
        for n in self.namelist:
            if not n in AnmInfo.AnmNames:
                return False
        return True
    def GenPlayRule(self, AnmInfo: AnmInfo) -> Anm2:
        r = Anm2(AnmInfo)
        anm = r.addAnm(AnmInfo.path)
        anm.name(self.namelist[0])
        for i in range(len(self.namelist)):
            anm.addrule(f"when:{self.namelist[i]},next:{self.namelist[i]}")
            anm.addrule(f"when:{self.namelist[i]},clicknext:{self.namelist[(i+1)%len(self.namelist)]}")
        r.updateSize(self.namelist, anm)
        return r
    def __str__(self) -> str:
        return f"LoopAnms({','.join(self.namelist)})"
    
rules.extend([
    LoopAnms(["SpinningNeutral", "SpinningKey", "SpinningBomb", "SpinningHeart"]),
    OneClickChange("FloatDown", "FloatShootDown"),
    LoopAnms(["FloatDown", "IdleDown"]),
    LoopAnms(["RollVert", "RollHori"]),
    LoopAnms(["Poof","Poof_Small","Poof_Large"]),
    LoopAnms(["Right", "Bottom Right", "Down", "Bottom Left", "Left", "Top Left", "Top", "Top Right"]),
    LoopAnms(["Down","Right","Up","Left"]),
    LoopAnms(["Small", "Big"]),
    LoopAnms(["Hori","Down","Up"]),
    LoopAnms(["WalkHori","WalkVert"]),
    LoopAnms(["FloatDown","FloatUp","FloatSide"]),
    LoopAnms(["MrMawBodyHory","MrMawBodyVert"]),
    LoopAnms(["Level1Float","Level2Walking","Level3Walking","Level4Walking"]),
    LoopAnms(["Walk Neutral","Walk Happy", "Walk Sad", "Walk Smile"]),
    LoopAnms(["Blue","White","Red"]),
    LoopAnms(["Poof","Poof_Small","Poof_Tiny"]),
    LoopAnms(["Vert","Hori"]),
    LoopAnms(["Spotlight","SpotlightDelayed","SpotlightDelayed2"]),
    LoopAnms(["JumpDown","JumpUp"]),
    LoopAnms(["Move Hori", "Move Down", "Move Up"]),
    LoopAnms(["MrMawBodyHori","MrMawBodyVert"]),
    LoopAnms(["Spikes","No-Spikes"]),
    LoopAnms(["WalkRight","ChargeRight"]),
    LoopAnms(["Down","Side","Up"]),
    LoopAnms(["FloadDown","FloatUp"]),
    LoopAnms(["FloatDown","FloatDownRage"]),
    LoopAnms(["Float","ShootSide"]),
    LoopAnms(["Eye","ArmOpen","DoorOpen","DoorOpenArm","Fat01","Fat02"])
])

class FireplaceRule(AnmGenRule):
    def Match(self, AnmInfo: AnmInfo):
        return "Flickering" in AnmInfo.AnmNames and "Dissapear" in AnmInfo.AnmNames and "NoFire" in AnmInfo.AnmNames
    def GenPlayRule(self, AnmInfo: AnmInfo) -> Anm2:
        r = Anm2(AnmInfo)
        anm = r.addAnm(AnmInfo.path)
        anm.name("Flickering")
        anm.addrule("when:Flickering,next:Flickering")
        anm.addrule("when:Flickering,clicknext:Dissapear")
        anm.addrule("when:Dissapear,next:NoFire")
        anm.addrule("when:NoFire,next:NoFire")
        anm.addrule("when:NoFire,clicknext:Flickering")
        r.updateSize(["Flickering","Dissapear","NoFire"],anm)
        return r
rules.append(FireplaceRule())


class SequenceRule(AnmGenRule):
    def __init__(self, sequenceName:str, sequenceNameAfter:str = "") -> None:
        super().__init__()
        self.seqName = sequenceName
        self.seqAfter = sequenceNameAfter

    def Match(self, AnmInfo: AnmInfo):
        return f"{self.seqName}1{self.seqAfter}" in AnmInfo.AnmNames and (f"{self.seqName}0{self.seqAfter}" in AnmInfo.AnmNames or f"{self.seqName}2{self.seqAfter}" in AnmInfo.AnmNames)
    
    def GenPlayRule(self, AnmInfo: AnmInfo) -> Anm2:
        names = []

        if f"{self.seqName}0{self.seqAfter}" in AnmInfo.AnmNames:
            names.append(f"{self.seqName}0{self.seqAfter}")
        elif f"{self.seqName}{self.seqAfter}" in AnmInfo.AnmNames:
            names.append(f"{self.seqName}{self.seqAfter}")

        for i in range(20):
            if i == 0:
                continue
            if f"{self.seqName}{i}{self.seqAfter}" in AnmInfo.AnmNames:
                names.append(f"{self.seqName}{i}{self.seqAfter}")

        r = Anm2(AnmInfo)
        anm = r.addAnm(AnmInfo.path)
        anm.name(names[len(names)//2])
        for name in names:
            anm.addrule(f"when:{name},next:{name}")
        for i in range(len(names)):
            anm.addrule(f"when:{names[i]},clicknext:{names[(i+1)%len(names)]}")
        r.updateSize(names, anm)
        return r

    def __str__(self) -> str:
        return f"SequenceRule({self.seqName},{self.seqAfter})"
rules.extend([SequenceRule(x) for x in ["Idle", "Blook", "Gib0","Gib", "Fade", "", "Bling", "Particle", "Poof", "Blood0", "RelularTear", "RegularTear", "BloodTear", "Shopkeeper ", "State", "Rotate", "Drop0", "Laser", "Small0", "Guy", "Move", "Rubble0", "Spikes0", "Walk", "Bubble", "Head0"]])
rules.append(SequenceRule("Stone", "Move"))
rules.append(SequenceRule("Tooth", "Move"))
rules.append(SequenceRule("Level", "Float"))
rules.append(SequenceRule("", "Idle"))


class AutoLoopAnms(AnmGenRule):
    def __init__(self, namelist) -> None:
        super().__init__()
        self.namelist = namelist
    def Match(self, AnmInfo: AnmInfo):
        for n in self.namelist:
            if not n in AnmInfo.AnmNames:
                return False
        return True
    def GenPlayRule(self, AnmInfo: AnmInfo) -> Anm2:
        r = Anm2(AnmInfo)
        anm = r.addAnm(AnmInfo.path)
        anm.name(self.namelist[0])
        for i in range(len(self.namelist)):
            anm.addrule(f"when:{self.namelist[i]},next:{self.namelist[(i+1)%len(self.namelist)]}")
        r.updateSize(self.namelist, anm)
        return r
    def __str__(self) -> str:
        return f"AutoLoopAnms({','.join(self.namelist)})"
rules.extend([
    AutoLoopAnms(["Appear","Disappear"])
])

class AppearIdleClickRule(AnmGenRule):
    def Match(self, AnmInfo: AnmInfo):
        return "Appear" in AnmInfo.AnmNames and "Idle" in AnmInfo.AnmNames and "Disappear" in AnmInfo.AnmNames
    def GenPlayRule(self, AnmInfo: AnmInfo) -> Anm2:
        r = Anm2(AnmInfo)
        anm = r.addAnm(AnmInfo.path)
        anm.name("Idle")
        anm.addrule("when:Idle,next:Idle")
        anm.addrule("when:Idle,clicknext:Disappear")
        anm.addrule("when:Disappear,next:Appear")
        anm.addrule("when:Appear,next:Idle")
        r.updateSize(["Idle","Appear","Disappear"],anm)
        return r

class DefaultRule(AnmGenRule):
    def __init__(self, defaultNam:str) -> None:
        super().__init__()
        self.defaultName = defaultNam
    def Match(self, AnmInfo: AnmInfo):
        return self.defaultName in AnmInfo.AnmNames
    def GenPlayRule(self, AnmInfo:AnmInfo) -> Anm2:
        r = Anm2(AnmInfo)
        anm = r.addAnm(AnmInfo.path)
        if "Appear" in AnmInfo.AnmNames:
            names = [self.defaultName]
            anm.name("Appear")
            anm.addrule(f"when:Appear,next:{self.defaultName}")
            anm.addrule(f"when:{self.defaultName},next:{self.defaultName}")
            if "Collect" in AnmInfo.AnmNames:
                anm.addrule(f"when:{self.defaultName},clicknext:Collect")
                anm.addrule("when:Collect,next:Appear")
                # names.append("Collect")
            else:
                anm.addrule(f"when:{self.defaultName},clicknext:Appear")

            r.updateSize(names, anm)
        else:
            anm.name(self.defaultName)
            anm.addrule(f"when:{self.defaultName},next:{self.defaultName}")
            r.updateSize([self.defaultName], anm)
        return r
    def __str__(self) -> str:
        return f"DefaultRule({self.defaultName})"
rules.append(OneClickChange("Idle","Swing"))
rules.extend([
    MatchOnly(["Idle","Flying","IdleTransparent","FlyingTransparent"], "Flying"),
    MatchOnly(['Idle', 'StompArm', 'StompLeg'], "StompArm"),
    MatchOnly(["Idle","Float","Spawn"], "Float"),
    MatchOnly(["Idle","Float"],"Float"),
    MatchOnly(["Idle","Rotation"],"Rotation"),
    MatchOnly(["Idle","Move"],"Move"),
    MatchOnly(["Idle","Idle2","Idle3","Fall"],"Idle"),
    MatchOnly(['Idle', 'Walk', 'Spawn'],"Walk"),
    MatchOnly(['Stomp', 'QuickStompBegin', 'QuickStomp', 'QuickStompEnd'], "Stomp"),
])
rules.append(DefaultRule("Bestiary"))
rules.append(DefaultRule("Float"))
rules.append(DefaultRule("Walking"))
rules.append(OneClickChange("Idle","Pulse"))
rules.append(OneClickChange("Shake","Spit"))
rules.append(DefaultRule("Pulse"))
rules.append(DefaultRule("Idle"))
rules.append(DefaultRule("NumbersWhite"))
rules.append(DefaultRule("JumpDownHead"))
rules.append(DefaultRule("Rotate"))
rules.append(PinnnnRuleVert(["HeadWiggle","Body1Wiggle","Body2Wiggle","Ground"], 12))
rules.append(LoopAnms(["Walk01","Walk02"]))
rules.append(OneClickChange("Walk01","Attack01"))
rules.append(OneClickChange("Stomp","Death"))
rules.append(LoopAnms(['SadMaskDown', 'SadMaskRight', 'SadMaskUp', 'SadMaskLeft']))
rules.append(OneClickChange("HeartBeat","HeartAttack"))
rules.append(PinnnnRuleVert(["HeadFrontWiggleOpen","Body2Wiggle","Body1Wiggle"],18))
# rules.append(IdleRule())
#######################################################################

ForceRuleDict:dict[str,AnmGenRule] = {
    "2.4.0": OneClickChange("Idle","Appear"),
    "4.20.0": DefaultRule("Pulse"),
    "5.40.4": DefaultRule("Idle"),
    "5.40.1": DefaultRule("Idle"),
    "5.40.2": DefaultRule("Idle"),
    "23.3.0": OneClickChange("Move Hori", "Attack Down"),
    "33.1.0":FireplaceRule(),
    "33.3.0":FireplaceRule(),
    "33.4.0":FireplaceRule(),
    "33.10.0":AppearIdleClickRule(),
    "33.12.0":AppearIdleClickRule(),
    "33.13.0":AppearIdleClickRule(),
    "51.0.0":DefaultRule("Walk0"),
    "51.10.0":DefaultRule("Walk1"),
    "51.20.0":DefaultRule("Walk2"),
    "51.30.0":DefaultRule("Walk3"),
    "51.1.0":DefaultRule("Walk0"),
    "51.11.0":DefaultRule("Walk2"),
    "51.21.0":DefaultRule("Walk3"),
    "51.31.0":DefaultRule("Walk4"),
}

solid_template = 0
rule_matched = 0
rule_notmatched = 0

def ParseAnimFile(Type, Variant, Subtype, RelativePath, Fullpath):
    global solid_template, rule_matched, rule_notmatched
    info = AnmInfo(Fullpath)
    matched_rule = [rule for rule in rules if rule.Match(info)]
    template = None

    idstr = f"{Type}.{Variant}.{Subtype}"

    result_str = None

    noinclude = ""

    if idstr in OverwriteStrDict:
        result_str = OverwriteStrDict[idstr]
    else:
        if idstr in OverwriteDict:
            template = OverwriteDict[idstr](idstr)
            solid_template += 1
            print(Type, Variant, Subtype, f"Template {OverwriteDict[idstr]} matched")
        elif idstr in ForceRuleDict and ForceRuleDict[idstr].Match(info):
            template = ForceRuleDict[idstr].GenPlayRule(info)
            solid_template += 1
        elif len(matched_rule):
            template = matched_rule[0].GenPlayRule(info)
            rule_matched += 1
            noinclude += f"<pre>此动画由规则{matched_rule[0]}自动生成\n{','.join(info.AnmNames)}\n=>{','.join([str(x) for x in matched_rule])}</pre>"
            # print(Type,Variant,Subtype, RelativePath,info, "=>", [str(x) for x in matched_rule], ("\n" if PrettyPrint else "") + str(template))
            # print(Type,Variant,Subtype, ("\n" if PrettyPrint else "") + str(template))
        else:
            rule_notmatched += 1
            print(Type, Variant, Subtype, RelativePath, info, "no matched rule")

        if template != None:
            result_str = str(template)

    if result_str != None:
        wikitext_dir.mkdir(exist_ok=True)
        with (wikitext_dir/f"{Type}.{Variant}.{Subtype}.wikitext").open("w", encoding="utf8") as f:
            f.write(result_str)
            if len(noinclude) > 0:
                f.write("<noinclude>" + noinclude + "</noinclude>")

        print(f"[[文件:Entity {Type}.{Variant}.{Subtype}.png]]\n{result_str}")

def main():
    for entity in entityXml:
        assert entity.tag == "entity"
        Type = entity.attrib["id"]
        Variant = entity.attrib["variant"] if "variant" in entity.attrib else "0"
        Subtype = entity.attrib["subtype"] if "subtype" in entity.attrib else "0"
        File = entity.attrib["anm2path"]

        if Type == "1":
            continue
        TypeNum = int(Type)
        if TypeNum < 60 or TypeNum >= 100:
            continue
        if File == "":
            continue

        Fullpath = folder / "resources-dlc3/gfx" / File
        if not Fullpath.exists():
            Fullpath = folder / "resources/gfx" / File
            assert Fullpath.exists()
        RelativePath = Fullpath.relative_to(folder)
        # if Type != "1" or Variant != "0":
        #     continue
        ParseAnimFile(Type,Variant,Subtype,RelativePath, Fullpath)

        infobox_page.append("{{infobox entity|" + f"{Type}|{Variant}|{Subtype}" + "}}")
        infobox_page.append("{{infobox entity/anm|" + f"{Type}|{Variant}|{Subtype}" + "}}")

    with open("infobox.wikitext","w") as f:
        f.write('\n'.join(infobox_page))
    print("template:", solid_template, "matched:", rule_matched,"not matched:", rule_notmatched)

if __name__ == "__main__":
    main()