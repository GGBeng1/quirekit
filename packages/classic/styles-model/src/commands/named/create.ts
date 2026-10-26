import { linkedStyleText } from "../../model/text/toggles";
import { isWordParagraphStyleRegistry } from "../../model/validation";
import type { CommandProps, CommandSpec } from "@quirekit/core";
import { resolveWordParagraphStyleRegistry } from "../../model/registry";
import type { WordParagraphStyleRegistry } from "../../model/types";
import type { CreateWordNamedStyleOptions } from "./types";
import { admitsWordStyleBase } from "./validation";
import { isWordStyleRevisionTracking } from "./admission";

/** @returns Atomic named style creation command; no preset is inferred from current direct formatting. */
export function createWordNamedStyleCommand(): CommandSpec {
  return (options) => (context) => {
    if (!options || typeof options !== "object" || !context.editor.isEditable || context.tr.doc.attrs.wordDocumentProtection?.enforcement
      || isWordStyleRevisionTracking(context)) return false;
    const value = options as CreateWordNamedStyleOptions;
    if (typeof value.name !== "string" || !value.name.trim() || !["paragraph", "character", "linked"].includes(value.kind)) return false;
    const registry = resolveWordParagraphStyleRegistry(context.tr.doc.attrs.wordStyleRegistry);
    const definitions = [...Object.values(registry.styles), ...Object.values(registry.characterStyles ?? {})];
    if (definitions.some(style => style.name === value.name.trim())) return false;
    let index = 1;
    const used = new Set(definitions.map(style => style.id));
    while (used.has(`QuireStyle${index}`) || used.has(`QuireStyle${index}Char`)) index++;
    const id = value.id ?? `QuireStyle${index}`;
    if (typeof id !== "string" || !id.trim() || used.has(id) || (value.kind === "linked" && used.has(`${id}Char`))) return false;
    const basedOn = value.basedOn ?? null;
    if (!admitsWordStyleBase(registry, id, basedOn, value.kind === "character")) return false;
    if (value.kind === "character" && value.paragraph !== undefined) return false;
    const shared = { id, name: value.name.trim(), basedOn, link: null, default: false, quickFormat: true, uiPriority: 100,
      hidden: false, semiHidden: false, unhideWhenUsed: false, locked: false, text: value.text ?? {}, preservation: { ooxml: { customStyle: true } } };
    const styles = { ...registry.styles }, characterStyles = { ...registry.characterStyles };
    if (value.kind === "character") characterStyles[id] = { ...shared, kind: "character" };
    else {
      styles[id] = { ...shared, role: "custom", headingLevel: null, next: registry.defaultParagraphStyleId,
        paragraph: value.paragraph ?? {}, link: value.kind === "linked" ? `${id}Char` : null };
      if (value.kind === "linked") characterStyles[`${id}Char`] = { ...shared, id: `${id}Char`, name: `${shared.name} Char`,
        kind: "character", basedOn: basedOn && registry.characterStyles?.[registry.styles[basedOn]?.link ?? ""] ? registry.styles[basedOn]!.link : null, link: id, text: linkedStyleText({}, shared.text, false) };
    }
    return storeNamedStyles(context, { ...registry, styles, characterStyles });
  };
}

/** @param context - Active atomic command. @param registry - Valid replacement. @returns Whether the document changed. */
export function storeNamedStyles(context: CommandProps, registry: WordParagraphStyleRegistry): boolean {
  if (!isWordParagraphStyleRegistry(registry)) return false;
  if (JSON.stringify(context.tr.doc.attrs.wordStyleRegistry) === JSON.stringify(registry)) return false;
  context.tr.setDocAttribute("wordStyleRegistry", registry);
  context.dispatch?.(context.tr);
  return true;
}
