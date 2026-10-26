"""Reproduce the typed preset data from the pinned, licensed XML resource."""
from pathlib import Path
import hashlib
import json
import xml.etree.ElementTree as ET

root = Path(__file__).resolve().parents[1]
source = (root / "resources/presetShapeDefinitions.xml").read_bytes()
assert hashlib.sha256(source).hexdigest() == "a7dad593d27bd70536b41da9b761fa16409536cc0c25ef2b6c7a61c5d9b3e738"
shapes = ET.fromstring(source)
ns = "{http://schemas.openxmlformats.org/drawingml/2006/main}"
definitions = {}

for shape in shapes:
    definition = {
        "adjustments": [[g.attrib["name"], g.attrib["fmla"]] for g in shape.findall(ns + "avLst/" + ns + "gd")],
        "guides": [[g.attrib["name"], g.attrib["fmla"]] for g in shape.findall(ns + "gdLst/" + ns + "gd")],
        "textRect": [shape.find(ns + "rect").attrib[c] for c in ["l", "t", "r", "b"]] if shape.find(ns + "rect") is not None else ["l", "t", "r", "b"],
        "paths": [],
        "handles": [],
    }
    for handle in shape.findall(ns + "ahLst/*"):
        item = {"kind": "xy" if handle.tag == ns + "ahXY" else "polar",
                "position": [handle.find(ns + "pos").attrib[c] for c in ["x", "y"]]}
        for key, suffix in [("x", "X"), ("y", "Y"), ("radius", "R"), ("angle", "Ang")]:
            guide = handle.attrib.get("gdRef" + suffix)
            if guide is not None:
                item[key] = {"guide": guide, "min": handle.attrib.get("min" + suffix, "-2147483648"),
                             "max": handle.attrib.get("max" + suffix, "2147483647")}
        definition["handles"].append(item)
    for path in shape.find(ns + "pathLst"):
        commands = []
        for op in path:
            tag = op.tag.removeprefix(ns)
            if tag == "close":
                commands.append(["Z"])
            elif tag == "arcTo":
                commands.append(["A"] + [op.attrib[c] for c in ["wR", "hR", "stAng", "swAng"]])
            else:
                key = {"moveTo": "M", "lnTo": "L", "quadBezTo": "Q", "cubicBezTo": "C"}[tag]
                commands.append([key] + [pt.attrib[c] for pt in op for c in ["x", "y"]])
        definition["paths"].append({
            "width": path.attrib.get("w"), "height": path.attrib.get("h"),
            "fill": path.attrib.get("fill", "norm"),
            "stroke": path.attrib.get("stroke", "true") not in ["0", "false"],
            "commands": commands,
        })
    definitions[shape.tag] = definition

header = "// Generated from Apache POI REL_5_4_1 DrawingML data; do not edit.\n// Copyright 2003-2025 The Apache Software Foundation. Apache-2.0.\n// See resources/PROVENANCE.txt, LICENSE-APACHE.txt and NOTICE-APACHE.txt.\n"
(root / "src/presets/names.ts").write_text(header + "/** Complete standard preset identities. */\nexport const drawingPresetNames = " + json.dumps(list(definitions)) + " as const;\n")
body = ",\n".join("  " + json.dumps(name) + ": " + json.dumps(value, separators=(",", ":")) for name, value in definitions.items())
(root / "src/presets/definitions.ts").write_text(header + 'import type { DrawingPresetName, PresetDefinition } from "./types";\n/** Size-dependent standard geometry programs. */\nexport const presetDefinitions: Readonly<Record<DrawingPresetName, PresetDefinition>> = {\n' + body + "\n};\n")
