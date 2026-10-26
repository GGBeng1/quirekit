import type { WordParagraphStyleRegistry, WordParagraphStyleDiagnostic } from "./types";

const modeledRun = new Set(["rFonts", "b", "i", "bCs", "iCs", "caps", "smallCaps", "strike", "dstrike", "outline", "shadow", "emboss", "imprint", "vanish", "sz", "szCs", "spacing", "color", "highlight", "u", "shd", "vertAlign", "rtl", "lang", "em", "rPrChange"]);
const modeledParagraph = new Set(["pStyle", "jc", "bidi", "outlineLvl", "keepNext", "keepLines", "widowControl", "pageBreakBefore", "spacing", "ind", "pBdr", "shd", "tabs", "numPr", "sectPr", "rPr", "pPrChange"]);
const cache = new WeakMap<WordParagraphStyleRegistry, readonly WordParagraphStyleDiagnostic[]>();

/**
 * Reports retained properties outside the style renderer's admitted value space.
 * Diagnostics describe preservation, never silently advertise a visual fallback.
 * @param registry - Canonical imported definitions.
 * @returns Stable diagnostics suitable for a compatibility report or style form.
 */
export function collectWordStyleCompatibilityDiagnostics(registry: WordParagraphStyleRegistry): readonly WordParagraphStyleDiagnostic[] {
  const cached = cache.get(registry); if (cached) return cached;
  const result: WordParagraphStyleDiagnostic[] = [];
  for (const style of [...Object.values(registry.styles), ...Object.values(registry.characterStyles ?? {})]) {
    const source = style.preservation?.ooxml;
    if (!source || typeof source !== "object") continue;
    const retained: string[] = [];
    for (const [family, supported] of [["rPr", modeledRun], ["pPr", modeledParagraph]] as const) {
      const properties = (source as Record<string, unknown>)[family];
      if (!properties || typeof properties !== "object") continue;
      for (const name of Object.keys(properties)) {
        const local = name.split(":").at(-1)!;
        if (!supported.has(local)) retained.push(`${family}/${local}`);
        const property = (properties as Record<string, { attrs?: Record<string, unknown> }>)[name];
        const attributes = property?.attrs ?? {};
        if (local === "u" || local === "shd") {
          for (const attribute of Object.keys(attributes)) {
            const field = attribute.split(":").at(-1)!;
            if (field.startsWith("theme")) retained.push(`${family}/${local}/@${field}`);
          }
          if (local === "shd" && attributes["@_w:val"] !== undefined
            && !["clear", "nil"].includes(String(attributes["@_w:val"]))) retained.push(`${family}/shd/pattern`);
        }
        if (local === "rFonts" && attributes["@_w:hint"] !== undefined) retained.push(`${family}/rFonts/@hint`);
      }
    }
    if (style.text.fontFamilyHighAnsi && style.text.fontFamilyLatin && style.text.fontFamilyHighAnsi !== style.text.fontFamilyLatin) retained.push("rFonts/ascii+hAnsi");
    if (retained.length) result.push({ kind: "preserved-format", styleId: style.id, message: retained.join(", ") });
  }
  cache.set(registry, result); return result;
}
