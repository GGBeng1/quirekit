import type { OmmlElement, OmmlNode } from "../types";
import { child, childrenOf, elementsOf, tagOf } from "../decode/nodes";
import { accentGlyphs, escapeMathML, tokenize, variantAttribute } from "./tokens";

/** Conversion state of one formula. */
interface Conversion {
  /** Structures drawn approximately or as placeholders. */
  readonly approximations: Set<string>;
}

/**
 * Reads one property value of a structure, with toggles read as `1`.
 * @param node - Structure element.
 * @param propertiesTag - Property container tag.
 * @param tag - Property tag.
 * @returns Value, or undefined when absent.
 */
function property(node: OmmlNode, propertiesTag: string, tag: string): string | undefined {
  const container = child(node, propertiesTag);
  const item = container === undefined ? undefined : child(container, tag);
  if (item === undefined) return undefined;
  const value = (item[":@"] as Record<string, string> | undefined)?.["@_m:val"];
  return value === undefined || value === "on" || value === "true" ? "1" : value === "off" || value === "false" ? "0" : value;
}

/**
 * Converts the content of one slot to an `mrow`.
 * @param node - Slot element.
 * @param state - Conversion state.
 * @returns MathML.
 */
function row(node: OmmlNode | undefined, state: Conversion): string {
  return `<mrow>${node === undefined ? "" : elementsOf(node).map(item => convert(item, state)).join("")}</mrow>`;
}

/**
 * Converts one math run.
 * @param run - `m:r`.
 * @returns MathML tokens.
 */
function convertRun(run: OmmlElement): string {
  const style = child(run, "m:rPr");
  const read = (tag: string): string | undefined => style === undefined ? undefined
    : ((child(style, tag)?.[":@"] as Record<string, string> | undefined)?.["@_m:val"] ?? (child(style, tag) === undefined ? undefined : "1"));
  // Tracked insertions show their text; tracked deletions are hidden, as in Word's final view.
  const parts = elementsOf(run).flatMap(item => tagOf(item) === "w:ins" ? elementsOf(item) : [item]);
  const text = parts.filter(item => tagOf(item) === "m:t" || tagOf(item) === "w:t")
    .flatMap(item => childrenOf(item)).map(item => String((item as { "#text"?: unknown })["#text"] ?? "")).join("");
  if (text === "") return "";
  if (read("m:nor") !== undefined) return `<mtext>${escapeMathML(text)}</mtext>`;
  return tokenize(text, variantAttribute(read("m:scr"), read("m:sty")));
}

/**
 * Converts one structure, drawing unknown ones as a placeholder.
 * @param node - OMML element.
 * @param state - Conversion state.
 * @returns MathML.
 */
function convert(node: OmmlElement, state: Conversion): string {
  const tag = tagOf(node)!;
  const slot = (name: string): string => row(child(node, name), state);
  switch (tag) {
    case "m:r": return convertRun(node);
    case "m:f": {
      const type = property(node, "m:fPr", "m:type") ?? "bar";
      if (type === "lin") return `<mrow>${slot("m:num")}<mo>/</mo>${slot("m:den")}</mrow>`;
      const attributes = type === "noBar" ? ' linethickness="0"' : type === "skw" ? ' bevelled="true"' : "";
      return `<mfrac${attributes}>${slot("m:num")}${slot("m:den")}</mfrac>`;
    }
    case "m:rad":
      return property(node, "m:radPr", "m:degHide") === "1" ? `<msqrt>${slot("m:e")}</msqrt>` : `<mroot>${slot("m:e")}${slot("m:deg")}</mroot>`;
    case "m:sSub": return `<msub>${slot("m:e")}${slot("m:sub")}</msub>`;
    case "m:sSup": return `<msup>${slot("m:e")}${slot("m:sup")}</msup>`;
    case "m:sSubSup": return `<msubsup>${slot("m:e")}${slot("m:sub")}${slot("m:sup")}</msubsup>`;
    case "m:sPre": return `<mmultiscripts>${slot("m:e")}<mprescripts/>${slot("m:sub")}${slot("m:sup")}</mmultiscripts>`;
    case "m:nary": return convertNary(node, state);
    case "m:d": return convertDelimiter(node, state);
    case "m:func": return `<mrow>${slot("m:fName")}<mo>&#x2061;</mo>${slot("m:e")}</mrow>`;
    case "m:limLow": return `<munder>${slot("m:e")}${slot("m:lim")}</munder>`;
    case "m:limUpp": return `<mover>${slot("m:e")}${slot("m:lim")}</mover>`;
    case "m:acc": {
      const character = property(node, "m:accPr", "m:chr") ?? "̂";
      return `<mover accent="true">${slot("m:e")}<mo stretchy="true">${escapeMathML(accentGlyphs[character] ?? character)}</mo></mover>`;
    }
    case "m:bar":
      return property(node, "m:barPr", "m:pos") === "top"
        ? `<mover accent="true">${slot("m:e")}<mo stretchy="true">‾</mo></mover>`
        : `<munder accentunder="true">${slot("m:e")}<mo stretchy="true">_</mo></munder>`;
    case "m:groupChr": {
      const character = escapeMathML(property(node, "m:groupChrPr", "m:chr") ?? "⏟");
      return (property(node, "m:groupChrPr", "m:pos") ?? "bot") === "top"
        ? `<mover>${slot("m:e")}<mo stretchy="true">${character}</mo></mover>`
        : `<munder>${slot("m:e")}<mo stretchy="true">${character}</mo></munder>`;
    }
    case "m:m": return convertMatrix(node, state);
    case "m:eqArr": return convertEquationArray(node, state);
    case "m:borderBox": return convertBorderBox(node, state);
    case "m:box": return slot("m:e");
    case "m:phant": return convertPhantom(node, state);
    default:
      state.approximations.add(tag);
      return "<mtext>□</mtext>";
  }
}

/**
 * Converts a large operator with its limits and body.
 * @param node - `m:nary`.
 * @param state - Conversion state.
 * @returns MathML.
 */
function convertNary(node: OmmlElement, state: Conversion): string {
  const character = property(node, "m:naryPr", "m:chr") ?? "∫";
  const integral = ["∫", "∬", "∭", "⨌", "∮", "∯", "∰"].includes(character);
  const location = property(node, "m:naryPr", "m:limLoc") ?? (integral ? "subSup" : "undOvr");
  const operator = `<mo largeop="true" movablelimits="false"${property(node, "m:naryPr", "m:grow") === "1" ? ' stretchy="true"' : ""}>${escapeMathML(character)}</mo>`;
  const lower = property(node, "m:naryPr", "m:subHide") === "1" ? undefined : row(child(node, "m:sub"), state);
  const upper = property(node, "m:naryPr", "m:supHide") === "1" ? undefined : row(child(node, "m:sup"), state);
  const [both, onlyLower, onlyUpper] = location === "undOvr" ? ["munderover", "munder", "mover"] : ["msubsup", "msub", "msup"];
  const scripted = lower !== undefined && upper !== undefined ? `<${both}>${operator}${lower}${upper}</${both}>`
    : lower !== undefined ? `<${onlyLower}>${operator}${lower}</${onlyLower}>`
      : upper !== undefined ? `<${onlyUpper}>${operator}${upper}</${onlyUpper}>` : operator;
  return `<mrow>${scripted}${row(child(node, "m:e"), state)}</mrow>`;
}

/**
 * Converts a delimiter pair with its separators.
 * @param node - `m:d`.
 * @param state - Conversion state.
 * @returns MathML.
 */
function convertDelimiter(node: OmmlElement, state: Conversion): string {
  const stretchy = property(node, "m:dPr", "m:grow") === "0" ? "false" : "true";
  const fence = (character: string): string => character === "" ? "" : `<mo fence="true" stretchy="${stretchy}">${escapeMathML(character)}</mo>`;
  const separator = property(node, "m:dPr", "m:sepChr") ?? "|";
  const slots = elementsOf(node).filter(item => tagOf(item) === "m:e").map(item => row(item, state));
  return `<mrow>${fence(property(node, "m:dPr", "m:begChr") ?? "(")}${slots.join(`<mo stretchy="${stretchy}">${escapeMathML(separator)}</mo>`)}${fence(property(node, "m:dPr", "m:endChr") ?? ")")}</mrow>`;
}

/**
 * Converts a matrix, keeping column alignment.
 * @param node - `m:m`.
 * @param state - Conversion state.
 * @returns MathML.
 */
function convertMatrix(node: OmmlElement, state: Conversion): string {
  const aligns: string[] = [];
  for (const group of elementsOf(child(child(node, "m:mPr") ?? {}, "m:mcs") ?? {})) {
    const count = Number(property(group, "m:mcPr", "m:count") ?? "1");
    aligns.push(...Array.from({ length: count }, () => property(group, "m:mcPr", "m:mcJc") ?? "center"));
  }
  const rows = elementsOf(node).filter(item => tagOf(item) === "m:mr")
    .map(item => `<mtr>${elementsOf(item).map(cell => `<mtd>${row(cell, state)}</mtd>`).join("")}</mtr>`).join("");
  return `<mtable${aligns.length === 0 ? "" : ` columnalign="${aligns.join(" ")}"`}>${rows}</mtable>`;
}

/**
 * Converts an equation array; alignment points are approximated by centered rows.
 * @param node - `m:eqArr`.
 * @param state - Conversion state.
 * @returns MathML.
 */
function convertEquationArray(node: OmmlElement, state: Conversion): string {
  const rows = elementsOf(node).filter(item => tagOf(item) === "m:e")
    .map(item => `<mtr><mtd>${row(item, state).replace(/<mo>&amp;<\/mo>/gu, "")}</mtd></mtr>`).join("");
  return `<mtable>${rows}</mtable>`;
}

/**
 * Converts a bordered box with hidden sides and strikes.
 * @param node - `m:borderBox`.
 * @param state - Conversion state.
 * @returns MathML.
 */
function convertBorderBox(node: OmmlElement, state: Conversion): string {
  const on = (tag: string): boolean => property(node, "m:borderBoxPr", tag) === "1";
  const notation = [
    ...(on("m:hideTop") ? [] : ["top"]), ...(on("m:hideBot") ? [] : ["bottom"]),
    ...(on("m:hideLeft") ? [] : ["left"]), ...(on("m:hideRight") ? [] : ["right"]),
    ...(on("m:strikeH") ? ["horizontalstrike"] : []), ...(on("m:strikeV") ? ["verticalstrike"] : []),
    ...(on("m:strikeBLTR") ? ["updiagonalstrike"] : []), ...(on("m:strikeTLBR") ? ["downdiagonalstrike"] : [])
  ];
  const content = row(child(node, "m:e"), state);
  return notation.length === 0 ? content : `<menclose notation="${notation.join(" ")}">${content}</menclose>`;
}

/**
 * Converts a phantom; visible phantoms only zero their collapsed dimensions.
 * @param node - `m:phant`.
 * @param state - Conversion state.
 * @returns MathML.
 */
function convertPhantom(node: OmmlElement, state: Conversion): string {
  const on = (tag: string): boolean => property(node, "m:phantPr", tag) === "1";
  const content = row(child(node, "m:e"), state);
  const shown = property(node, "m:phantPr", "m:show") !== "0";
  const padded = [on("m:zeroWid") ? ' width="0"' : "", on("m:zeroAsc") ? ' height="0"' : "", on("m:zeroDesc") ? ' depth="0"' : ""].join("");
  const inner = shown ? content : `<mphantom>${content}</mphantom>`;
  return padded === "" ? inner : `<mpadded${padded}>${inner}</mpadded>`;
}

/** Result of converting OMML for display. */
export interface OmmlMathMLResult {
  /** Complete `<math>` markup. */
  readonly mathml: string;
  /** OMML structures drawn as placeholders. */
  readonly approximations: readonly string[];
}

/**
 * Converts any Word formula to MathML for display, without requiring an exact LaTeX form.
 * @param element - `m:oMath` or `m:oMathPara`.
 * @returns MathML and the structures that could only be drawn as placeholders.
 */
export function ommlToMathML(element: OmmlElement): OmmlMathMLResult {
  const state: Conversion = { approximations: new Set() };
  const display = "m:oMathPara" in element;
  const formulas = display ? elementsOf(element).filter(item => tagOf(item) === "m:oMath") : [element];
  const body = formulas.map(formula => row(formula, state)).join(display && formulas.length > 1 ? "<mspace linebreak=\"newline\"/>" : "");
  return { mathml: `<math xmlns="http://www.w3.org/1998/Math/MathML" display="${display ? "block" : "inline"}">${body}</math>`, approximations: [...state.approximations] };
}
