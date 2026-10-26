import type { MathAccent, MathExpression, MathFence, MathFraction, MathRadical, MathScripts, MathSequence } from "@quirekit/math";
import type { EncodeContext } from "./context";
import { accentCharacters, underArrowCharacters } from "./tables";
import type { OmmlElement, OmmlNode } from "../types";
import { element, properties, property } from "../xml/build";

/** Fraction commands written without a fraction bar. */
const barless = new Set(["binom", "dbinom", "tbinom", "choose", "atop"]);

/**
 * Wraps content in a slot element.
 * @param tag - Slot tag such as `m:e`.
 * @param sequence - Slot content.
 * @param context - Encoding context.
 * @returns Slot element.
 */
export function slot(tag: string, sequence: MathSequence | undefined, context: EncodeContext): OmmlElement {
  return element(tag, context.encodeSequence(sequence, context));
}

/**
 * Wraps already encoded nodes, or one expression, in a slot element.
 * @param tag - Slot tag.
 * @param content - Encoded nodes, or an expression to encode.
 * @param context - Encoding context.
 * @returns Slot element.
 */
export function slotOf(tag: string, content: readonly OmmlNode[] | MathExpression | undefined, context: EncodeContext): OmmlElement {
  if (content === undefined) return element(tag);
  return element(tag, Array.isArray(content) ? content : context.encodeChildren([content as MathExpression], context));
}

/**
 * Encodes a fraction; binomials are bar-less fractions inside parentheses.
 * @param fraction - Fraction.
 * @param context - Encoding context.
 * @returns `m:f`, or `m:d` around it.
 */
export function encodeFraction(fraction: MathFraction, context: EncodeContext): OmmlElement {
  const noBar = barless.has(fraction.command);
  const encoded = element("m:f", [
    properties("m:fPr", noBar ? property("m:type", "noBar") : undefined),
    slot("m:num", fraction.numerator, context),
    slot("m:den", fraction.denominator, context)
  ]);
  return noBar && fraction.command !== "atop" ? element("m:d", [properties("m:dPr"), element("m:e", [encoded])]) : encoded;
}

/**
 * Encodes a radical; a square root hides its empty degree.
 * @param radical - Radical.
 * @param context - Encoding context.
 * @returns `m:rad`.
 */
export function encodeRadical(radical: MathRadical, context: EncodeContext): OmmlElement {
  return radical.degree === undefined
    ? element("m:rad", [properties("m:radPr", property("m:degHide", "1")), element("m:deg"), slot("m:e", radical.radicand, context)])
    : element("m:rad", [properties("m:radPr"), slot("m:deg", radical.degree, context), slot("m:e", radical.radicand, context)]);
}

/**
 * Encodes postfix scripts.
 * @param scripts - Scripted base.
 * @param context - Encoding context.
 * @returns `m:sSub`, `m:sSup` or `m:sSubSup`.
 */
export function encodeScripts(scripts: MathScripts, context: EncodeContext): OmmlElement {
  return scriptElement(slotOf("m:e", scripts.base, context), scripts.subscript, scripts.superscript, context);
}

/**
 * Builds the script structure around an encoded base.
 * @param base - Encoded `m:e`.
 * @param subscript - Lower script.
 * @param superscript - Upper script.
 * @param context - Encoding context.
 * @returns Script element, or the base content when there is no script.
 */
export function scriptElement(base: OmmlElement, subscript: MathSequence | undefined, superscript: MathSequence | undefined, context: EncodeContext): OmmlElement {
  if (subscript !== undefined && superscript !== undefined) {
    return element("m:sSubSup", [properties("m:sSubSupPr"), base, slot("m:sub", subscript, context), slot("m:sup", superscript, context)]);
  }
  if (subscript !== undefined) return element("m:sSub", [properties("m:sSubPr"), base, slot("m:sub", subscript, context)]);
  return element("m:sSup", [properties("m:sSupPr"), base, slot("m:sup", superscript, context)]);
}

/**
 * Encodes a `\left…\right` pair; `\middle` delimiters split it into several slots.
 * @param fence - Fence.
 * @param context - Encoding context.
 * @returns `m:d`.
 */
export function encodeFence(fence: MathFence, context: EncodeContext): OmmlElement {
  const groups: MathExpression[][] = [[]];
  let separator: string | undefined;
  for (const child of fence.content.children) {
    if (child.kind === "delimiter" && child.size === "middle") {
      separator ??= child.value;
      groups.push([]);
    } else {
      groups.at(-1)!.push(child);
    }
  }
  return element("m:d", [
    delimiterProperties(fence.open, fence.close, separator),
    ...groups.map(group => element("m:e", context.encodeChildren(group, context)))
  ]);
}

/**
 * Builds delimiter properties, omitting Word's defaults `(`, `|` and `)`.
 * @param open - Opening character, empty when hidden.
 * @param close - Closing character, empty when hidden.
 * @param separator - Separator character.
 * @returns `m:dPr`.
 */
export function delimiterProperties(open: string, close: string, separator?: string): OmmlElement {
  return properties("m:dPr",
    open === "(" ? undefined : property("m:begChr", open),
    separator === undefined || separator === "|" ? undefined : property("m:sepChr", separator),
    close === ")" ? undefined : property("m:endChr", close));
}

/**
 * Encodes accents, bars, braces and over/under annotations.
 * @param accent - Accent.
 * @param context - Encoding context.
 * @returns OMML structure.
 */
export function encodeAccent(accent: MathAccent, context: EncodeContext): OmmlElement {
  const base = slot("m:e", accent.content, context);
  const annotate = (tag: "m:limUpp" | "m:limLow", inner: OmmlElement): OmmlElement => accent.annotation === undefined
    ? inner
    : element(tag, [properties(`${tag}Pr`), element("m:e", [inner]), slot("m:lim", accent.annotation, context)]);
  switch (accent.name) {
    case "overline": return element("m:bar", [properties("m:barPr", property("m:pos", "top")), base]);
    case "underline": return element("m:bar", [properties("m:barPr"), base]);
    case "overbrace":
      return annotate("m:limUpp", element("m:groupChr", [properties("m:groupChrPr", property("m:chr", "⏞"), property("m:pos", "top"), property("m:vertJc", "bot")), base]));
    case "underbrace": return annotate("m:limLow", element("m:groupChr", [properties("m:groupChrPr"), base]));
    case "overset":
    case "stackrel": return element("m:limUpp", [properties("m:limUppPr"), base, slot("m:lim", accent.annotation, context)]);
    case "underset": return element("m:limLow", [properties("m:limLowPr"), base, slot("m:lim", accent.annotation, context)]);
    case "xrightarrow":
    case "xleftarrow": {
      const arrow = element("m:groupChr", [
        properties("m:groupChrPr", property("m:chr", accent.name === "xrightarrow" ? "→" : "←"), property("m:vertJc", "bot")),
        element("m:e", [element("m:box", [properties("m:boxPr"), base])])
      ]);
      return annotate("m:limLow", arrow);
    }
    default: {
      const under = underArrowCharacters[accent.name];
      if (under !== undefined) return element("m:groupChr", [properties("m:groupChrPr", property("m:chr", under)), base]);
      const character = accentCharacters[accent.name];
      return element("m:acc", [properties("m:accPr", character === undefined ? undefined : property("m:chr", character)), base]);
    }
  }
}
