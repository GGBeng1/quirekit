import { normalizeQuireDocumentFontTheme } from "@quirekit/core";
import { decodeLitAstPreservation } from "@quirekit/lit-docx-contract";
import { resolveWordParagraphStyleRegistry } from "../registry";
import type { WordParagraphStyleRegistry } from "../types";
import type { WordStyleTextProperties } from "../text/types";
import { readWordThemeColors, resolveWordThemeColor } from "./color";
import type { WordStyleThemeContext } from "./types";

/** Document attrs keep their identity across typing and selection-only changes. */
const registries = new WeakMap<object, WordParagraphStyleRegistry>();

/**
 * Compiles document bindings once per immutable attribute snapshot, without changing canonical definitions.
 * @param attrs - Current document attributes.
 * @returns Render-only registry whose theme values follow the document resources.
 */
export function resolveWordDocumentStyleRegistry(attrs: Readonly<Record<string, unknown>>): WordParagraphStyleRegistry {
  const cached = registries.get(attrs);
  if (cached) return cached;
  const registry = resolveWordParagraphStyleRegistry(attrs.wordStyleRegistry);
  const deltas = [registry.textDefaults, ...Object.values(registry.styles).map(style => style.text), ...Object.values(registry.characterStyles ?? {}).map(style => style.text)];
  if (!deltas.some(text => text?.fontReferences || text?.colorReference)) { registries.set(attrs, registry); return registry; }
  const preservation = decodeLitAstPreservation(attrs.litAstDocumentPreservation) as { meta?: { rawXmlFiles?: Record<string, string> } } | null;
  const raw = preservation?.meta?.rawXmlFiles;
  const context: WordStyleThemeContext = { fonts: normalizeQuireDocumentFontTheme(attrs.fontTheme),
    colors: readWordThemeColors(raw?.themeXml ?? "", raw?.settingsXml ?? "") };
  const resolved: WordParagraphStyleRegistry = { ...registry,
    textDefaults: resolveWordStyleTheme(registry.textDefaults ?? {}, context),
    styles: Object.fromEntries(Object.entries(registry.styles).map(([id, style]) => [id, { ...style, text: resolveWordStyleTheme(style.text, context) }])),
    characterStyles: Object.fromEntries(Object.entries(registry.characterStyles ?? {}).map(([id, style]) => [id, { ...style, text: resolveWordStyleTheme(style.text, context) }]))
  };
  registries.set(attrs, resolved);
  return resolved;
}

/** @param text - Canonical property delta. @param context - Document resources. @returns Render-only delta with resolved binding values. */
export function resolveWordStyleTheme(text: WordStyleTextProperties, context: WordStyleThemeContext): WordStyleTextProperties {
  const result = { ...text };
  for (const [slot, target] of [["latin", "fontFamilyLatin"], ["highAnsi", "fontFamilyHighAnsi"],
    ["eastAsia", "fontFamilyEastAsia"], ["complexScript", "fontFamilyComplexScript"]] as const) {
    const reference = text.fontReferences?.[slot];
    if (!reference) continue;
    const role = reference.toLowerCase().startsWith("major") ? context.fonts?.heading ?? context.fonts?.body : context.fonts?.body;
    const family = role?.[slot === "highAnsi" ? "latin" : slot];
    if (family) result[target] = family;
  }
  const color = text.colorReference ? resolveWordThemeColor(text.colorReference, context.colors) : undefined;
  if (color) result.color = color;
  return result;
}
