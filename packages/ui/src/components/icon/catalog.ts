import { defineQuireKitIcon } from "./define";
import { createQuireKitIconRegistry } from "./registry";
import { quireKitEditorCustomIconSvg } from "./custom";
import { quireKitEditorLucideIconSvg } from "./lucide";
import { quireKitIconAliases } from "./metadata";
import { buildQuireKitEditorIconCatalog } from "./labels";
import { quireKitDefaultLocale } from "../../locale/resolve";
import type { Messages as QuireKitIconCatalogMessages } from "../../locale/components/icon-catalog";
import type { QuireKitEditorIconEntry, QuireKitIconData } from "./types";

const directionalIcons = new Set<string>([
  "alignStart", "alignEnd", "chevronFirst", "chevronLast", "chevronLeft", "chevronRight",
  "chevronsLeft", "chevronsRight", "indentDecrease", "indentIncrease", "redo", "undo"
]);

// Dense or expansive silhouettes retain their upstream paths and receive the
// same optical correction through QuireIcon, independent of button geometry.
const opticalScales: Readonly<Record<string, number>> = Object.freeze({
  languages: 0.95,
  pipette: 0.85,
  sparkles: 0.9
});

/**
 * Normalizes one statically admitted source without changing its geometry.
 * @param icons - Audited SVG source map.
 * @param source - Attribution shared by this source map.
 * @returns Renderer data retaining the exact name union.
 */
function defineIconSet<const Icons extends Readonly<Record<string, string>>>(
  icons: Icons, source: "lucide" | "custom"
): { readonly [Name in keyof Icons]: QuireKitIconData } {
  return Object.fromEntries(Object.entries(icons).map(([name, svg]) => [name,
    defineQuireKitIcon({
      svg, source, license: source === "lucide" ? "ISC" : "QuireKit",
      mirrorInRtl: directionalIcons.has(name), opticalScale: opticalScales[name] ?? 1
    })
  ])) as { readonly [Name in keyof Icons]: QuireKitIconData };
}

const canonicalData = Object.freeze({
  ...defineIconSet(quireKitEditorLucideIconSvg, "lucide"),
  ...defineIconSet(quireKitEditorCustomIconSvg, "custom")
});
const compatibilityData = Object.fromEntries(Object.entries(quireKitIconAliases)
  .map(([alias, target]) => [alias, canonicalData[target]])) as {
    readonly [Name in keyof typeof quireKitIconAliases]: QuireKitIconData;
  };

/** Renderer-ready icons; compatibility names share the canonical object. */
export const quireKitEditorIconData = Object.freeze({ ...canonicalData, ...compatibilityData });

/** Shared registry used by QuireIconProvider and product registries. */
export const quireIconRegistry = createQuireKitIconRegistry(quireKitEditorIconData, {
  aliases: {
    alignLeft: "alignStart", alignRight: "alignEnd", commentAdd: "messageSquarePlus",
    strikethrough: "strike", tableBorders: "tableBorderAll", tableCellFillNone: "fillColor",
    trash2: "trash"
  }
});

const catalogCache = new WeakMap<QuireKitIconCatalogMessages, readonly QuireKitEditorIconEntry[]>();

/**
 * Returns the searchable icon catalog labeled in one language.
 * @param messages - Icon catalog text of the active language; defaults to Chinese.
 * @returns Entries in explicit task and family order, cached per messages object.
 */
export function getQuireKitEditorIconCatalog(
  messages: QuireKitIconCatalogMessages = quireKitDefaultLocale.messages.iconCatalog
): readonly QuireKitEditorIconEntry[] {
  const cached = catalogCache.get(messages);
  if (cached) return cached;
  const catalog = buildQuireKitEditorIconCatalog(messages, canonicalData);
  catalogCache.set(messages, catalog);
  return catalog;
}

/** Searchable catalog in the default language; use getQuireKitEditorIconCatalog for the active one. */
export const quireKitEditorIconCatalog = getQuireKitEditorIconCatalog();
