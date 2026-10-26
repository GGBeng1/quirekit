import type { OmmlNode } from "./types";

/** Properties whose value is a boolean toggle; an element without `m:val` means on. */
const toggles = new Set([
  "m:degHide", "m:subHide", "m:supHide", "m:grow", "m:hideTop", "m:hideBot", "m:hideLeft", "m:hideRight", "m:strikeH",
  "m:strikeV", "m:strikeBLTR", "m:strikeTLBR", "m:show", "m:zeroWid", "m:zeroAsc", "m:zeroDesc", "m:transp", "m:alnScr",
  "m:plcHide", "m:opEmu", "m:noBreak", "m:diff", "m:aln", "m:maxDist", "m:objDist", "m:lit", "m:nor"
]);

/** OMML property defaults by property container; equal values are equivalent to omission. */
const defaults: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  "m:fPr": { "m:type": "bar" },
  "m:radPr": { "m:degHide": "0" },
  "m:naryPr": { "m:chr": "∫", "m:grow": "0", "m:subHide": "0", "m:supHide": "0" },
  "m:dPr": { "m:begChr": "(", "m:endChr": ")", "m:sepChr": "|", "m:grow": "1", "m:shp": "centered" },
  "m:accPr": { "m:chr": "̂" },
  "m:barPr": { "m:pos": "bot" },
  "m:groupChrPr": { "m:chr": "⏟", "m:pos": "bot", "m:vertJc": "top" },
  "m:borderBoxPr": {
    "m:hideTop": "0", "m:hideBot": "0", "m:hideLeft": "0", "m:hideRight": "0",
    "m:strikeH": "0", "m:strikeV": "0", "m:strikeBLTR": "0", "m:strikeTLBR": "0"
  },
  "m:phantPr": { "m:show": "1", "m:zeroWid": "0", "m:zeroAsc": "0", "m:zeroDesc": "0", "m:transp": "0" },
  "m:sSubSupPr": { "m:alnScr": "0" },
  "m:mPr": { "m:baseJc": "center", "m:plcHide": "0", "m:rSpRule": "0", "m:cSpRule": "0", "m:rSp": "0", "m:cSp": "0", "m:cGp": "0" },
  "m:mcPr": { "m:mcJc": "center" },
  "m:eqArrPr": { "m:baseJc": "center", "m:maxDist": "0", "m:objDist": "0", "m:rSpRule": "0", "m:rSp": "0" },
  "m:boxPr": { "m:opEmu": "0", "m:noBreak": "1", "m:diff": "0", "m:aln": "0" }
};

/** Integral characters whose limits default to the side (`intLim`); other operators default to above/below. */
const integrals = new Set(["∫", "∬", "∭", "⨌", "∮", "∯", "∰"]);

/**
 * Reads the effective value of one property element, normalizing toggles to `1`/`0`.
 * @param tag - Property tag.
 * @param node - Property element.
 * @returns Effective value.
 */
export function propertyValue(tag: string, node: OmmlNode): string | undefined {
  const value = ((node as Record<string, unknown>)[":@"] as Record<string, string> | undefined)?.["@_m:val"];
  if (!toggles.has(tag)) return value;
  if (value === undefined || value === "on" || value === "true" || value === "1") return "1";
  return "0";
}

/**
 * Reports whether a property only restates the default, including the character-dependent `m:limLoc`
 * under Word's default `intLim`/`naryLim` document settings.
 * @param container - Property container tag such as `m:naryPr`.
 * @param tag - Property tag.
 * @param value - Effective value.
 * @param siblings - All properties of the container, keyed by tag with effective values.
 * @returns Whether the property can be omitted without changing the formula.
 */
export function isDefaultProperty(container: string, tag: string, value: string | undefined, siblings: ReadonlyMap<string, string | undefined>): boolean {
  if (container === "m:naryPr" && tag === "m:limLoc") {
    return value === (integrals.has(siblings.get("m:chr") ?? "∫") ? "subSup" : "undOvr");
  }
  // Normal text is upright, so a plain style on it changes nothing (WPS writes it).
  if (container === "m:rPr" && tag === "m:sty" && value === "p" && siblings.has("m:nor") && siblings.get("m:nor") !== "0") return true;
  return defaults[container]?.[tag] === value;
}
