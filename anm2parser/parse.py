# 不得不说，nodejs对xml超级不友好的
import xml.etree.ElementTree as ET

SIMPLE = False

def makeInfo(xml):
    r = {}
    for k in xml.attrib:
        r[k] = xml.attrib[k]
    r["Fps"] = int(r["Fps"])
    return r

def makeSpritesheet(xml):
    assert xml.tag == "Spritesheet"
    return {
        "Id":int(xml.attrib["Id"]),
        "Path":xml.attrib["Path"]
    }

def makeLayer(xml):
    assert xml.tag == "Layer"
    return {
        "Id":int(xml.attrib["Id"]),
        "Name":xml.attrib["Name"],
        "SpritesheetId":int(xml.attrib["SpritesheetId"])
    }
def makeNull(xml):
    assert xml.tag == "Null"
    return {
        "Id":int(xml.attrib["Id"]),
        "Name":xml.attrib["Name"]
    }
def makeEvent(xml):
    assert xml.tag == "Event"
    return {
        "Id":int(xml.attrib["Id"]),
        "Name":xml.attrib["Name"]
    }
def makeTrigger(xml):
    assert xml.tag == "Trigger"
    return {
        "EventId":int(xml.attrib["EventId"]),
        "AtFrame":int(xml.attrib["AtFrame"])
    }

def makeContent(xml):
    assert xml.tag == "Content"
    r = {}

    for child in xml:
        if child.tag == "Spritesheets":
            r["Spritesheets"] = []
            for spr in child:
                assert spr.tag == "Spritesheet"
                r["Spritesheets"].append(makeSpritesheet(spr))

        if child.tag == "Layers":
            r["Layers"] = []
            for layer in child:
                assert layer.tag == "Layer"
                r["Layers"].append(makeLayer(layer))
        
        if child.tag == "Nulls":
            r["Nulls"] = []
            for nul in child:
                assert nul.tag == "Null"
                r["Nulls"].append(makeNull(nul))
        if child.tag == "Events":
            r["Events"] = []
            for evt in child:
                assert evt.tag == "Event"
                r["Events"].append(makeEvent(evt))
    return r

def makeFrame(xml):
    assert xml.tag == "Frame"
    r = {}
    for k in xml.attrib:
        r[k] = xml.attrib[k]
    for k in [
        "XPosition",
        "YPosition",
        "Delay",
        "XScale",
        "YScale",
        "RedTint",
        "GreenTint",
        "BlueTint",
        "AlphaTint",
        "RedOffset",
        "GreenOffset",
        "BlueOffset",
        "Rotation",
        "XPivot",
        "YPivot",
        "XCrop",
        "YCrop",
        "Width",
        "Height"
    ]:
        if k in r:
            r[k] = float(r[k])
            if r[k] == int(r[k]):
                r[k] = int(r[k])
    for k in ["Visible","Interpolated"]:
        if k in r:
            r[k] = r[k] == "true" or r[k] == "True" or r[k] == "TRUE"
        else:
            if k == "Visible":
                r[k] = True
            else:
                r[k] = False
    return r

def makeLayerAnimation(xml):
    assert xml.tag == "LayerAnimation"
    r = {"frames":[]}
    for child in xml:
        assert child.tag == "Frame"
        r["frames"].append(makeFrame(child))
    r["LayerId"] = int(xml.attrib["LayerId"])
    r["Visible"] = xml.attrib["Visible"] == "true" or xml.attrib["Visible"] == "True" or xml.attrib["Visible"] == "TRUE"
    return r

def makeNullAnimation(xml):
    assert xml.tag == "NullAnimation"
    r = {}
    r["NullId"] = int(xml.attrib["NullId"])
    r["Visible"] = xml.attrib["Visible"] == "true" or xml.attrib["Visible"] == "True" or xml.attrib["Visible"] == "TRUE"

    r["frames"] = []
    for child in xml:
        assert child.tag == "Frame"
        r["frames"].append(makeFrame(child))
    return r
        

def makeAnimation(xml):
    assert xml.tag == "Animation"
    r = {}
    for k in xml.attrib:
        r[k] = xml.attrib[k]
    r["FrameNum"] = int(r["FrameNum"])
    r["Loop"] = r["Loop"] == "true" or r["Loop"] == "True" or r["Loop"] == "TRUE"

    for child in xml:
        if child.tag == "RootAnimation":
            r["RootAnimation"] = []
            for frame in child:
                assert frame.tag == "Frame"
                r["RootAnimation"].append(makeFrame(frame))
        if child.tag == "LayerAnimations":
            r["LayerAnimations"] = []
            for layera in child:
                r["LayerAnimations"].append(makeLayerAnimation(layera))
        if child.tag == "NullAnimations" and not SIMPLE:
            r["NullAnimations"] = []
            for nula in child:
                assert nula.tag == "NullAnimation"
                r["NullAnimations"].append(makeNullAnimation(nula))
        if child.tag == "Triggers":
            # dont care
            r["Triggers"] = []
            for trig in child:
                assert trig.tag == "Trigger"
                r["Triggers"].append(makeTrigger(trig))
    return r

def makeAnimations(xml):
    assert xml.tag == "Animations"
    r = {}
    if not SIMPLE:
        r["DefaultAnimation"] = xml.attrib["DefaultAnimation"]
    r["animation"] = []
    for child in xml:
        if child.tag == "Animation":
            r["animation"].append(makeAnimation(child))
    return r

def makeActor(xml):
    assert xml.tag == "AnimatedActor"
    r = {}

    for child in xml:
        if child.tag == "Info" and not SIMPLE:
            r["info"] = makeInfo(child)
        if child.tag == "Content":
            r["content"] = makeContent(child)
        if child.tag == "Animations":
            r["animations"] = makeAnimations(child)

    return r
        

def parseFile(filepath):
    xml = ET.parse(filepath).getroot()
    return makeActor(xml)

import json
def tojson(filepath):
    return json.dumps(parseFile(filepath), separators=(',',':'))