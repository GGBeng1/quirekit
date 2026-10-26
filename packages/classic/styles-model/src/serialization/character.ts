import type { Node } from "@quirekit/pm";
import type { QuireNodeCanvasTextStyle } from "@quirekit/core";
import type { WordParagraphStyleRegistry } from "../model/types";
import { resolveWordCharacterAppearance } from "../character/appearance";
import { resolveWordParagraphFormatting } from "@quirekit/classic-paragraph-model";
import { wordStyleTextCss } from "./text";

const properties = ["font-family", "font-size", "color", "background-color", "font-weight", "font-style", "font-variant-caps",
  "text-transform", "letter-spacing", "direction", "display", "text-decoration-line", "text-decoration-style", "text-decoration-color", "vertical-align"];

/** @param id - Character identity. @returns Collision-free CSS variable prefix independent of user-supplied syntax. */
function prefix(id: string): string { return `--qk-character-${Array.from(id).map(value => value.codePointAt(0)!.toString(16)).join("-")}`; }

/**
 * Resolves character styles against this exact paragraph occurrence for HTML, preserving the live mark identity.
 * @param node - Paragraph being serialized.
 * @param registry - Active definitions.
 * @param text - Paragraph and conditional-table typography.
 * @returns CSS variables only for styles actually referenced by this paragraph.
 */
export function wordCharacterStyleVariables(node: Node, registry: WordParagraphStyleRegistry, text: QuireNodeCanvasTextStyle): string {
  const ids = new Set<string>();
  node.forEach(child => child.marks.forEach(mark => {
    if (mark.type.name === "wordCharacterStyle" && typeof mark.attrs.styleId === "string") ids.add(mark.attrs.styleId);
  }));
  return [...ids].flatMap(id => {
    const resolved = resolveWordCharacterAppearance(registry, id, resolveWordParagraphFormatting(node.attrs.wordParagraph).styleId, text);
    const css = { ...wordStyleTextCss(resolved) };
    if (resolved.fontSize === undefined && resolved.fontScale !== undefined) {
      const ratio = resolved.fontScale / (text.fontScale ?? 1) * (resolved.glyphScale ?? 1);
      css["font-size"] = ratio === 1 ? "inherit" : `${ratio}em`;
    }
    return properties.map(name => `${prefix(id)}-${name}: ${css[name] ?? ({ "background-color": "transparent", "display": "inline", "text-decoration-line": "none", "text-decoration-style": "solid", "text-decoration-color": "currentColor", "vertical-align": "baseline" } as Record<string, string>)[name] ?? "inherit"}`);
  }).join("; ");
}

/** @param id - Character identity. @returns CSS references inherited from the owning paragraph, including table occurrence overrides. */
export function wordCharacterStyleReferences(id: string): string {
  return properties.map(name => `${name}: var(${prefix(id)}-${name}, inherit)`).join("; ");
}
