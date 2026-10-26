import type { MdHighlightAttributes, MdHighlightColor } from "./types";

/** Registered container name. */
export const highlightContainerName = "highlight";
/** Palette order shared by menus, reading and export. */
export const highlightColors: readonly MdHighlightColor[] = ["orange", "red", "green", "blue", "purple", "gray"];
/** Effective values when the source omits a field. */
export const defaultHighlight: MdHighlightAttributes = { emoji: "📌", color: "orange" };

const emojiPattern = /^[^\s{}="]{1,16}$/u;

/** @param value - Candidate source value. @returns The palette name, or undefined for an unknown value. */
function paletteColor(value: string | undefined): MdHighlightColor | undefined {
  return highlightColors.find(color => color === value);
}

/**
 * @param title - Literal container title, e.g. `{emoji=📌 color=blue}`.
 * @returns Effective attributes; unknown keys, invalid values and plain titles fall back to defaults.
 */
export function parseHighlightAttributes(title: string): MdHighlightAttributes {
  const block = /^\{(.*)\}$/u.exec(title.trim());
  const fields = new Map<string, string>();
  if (block) for (const match of block[1]!.matchAll(/([a-z]+)=(?:"([^"]*)"|([^\s"}]+))/gu)) fields.set(match[1]!, match[2] ?? match[3]!);
  const emoji = fields.get("emoji"), text = paletteColor(fields.get("text"));
  return { emoji: emoji && emojiPattern.test(emoji) ? emoji : defaultHighlight.emoji,
    color: paletteColor(fields.get("color")) ?? defaultHighlight.color, ...(text ? { text } : {}) };
}

/** @param attributes - Effective attributes. @returns Canonical attribute block in `emoji color text` order. */
export function formatHighlightAttributes(attributes: MdHighlightAttributes): string {
  return `{emoji=${attributes.emoji} color=${attributes.color}${attributes.text ? ` text=${attributes.text}` : ""}}`;
}

/** @param emoji - Candidate icon. @returns Whether it can be written unquoted into the attribute block. */
export function validHighlightEmoji(emoji: string): boolean {
  return emojiPattern.test(emoji);
}

/** @param line - Opening fence line source. @returns Effective attributes, or null when the line does not open a highlight. */
export function readHighlightHeader(line: string): MdHighlightAttributes | null {
  const match = /^[ \t]*:{3,}[ \t]+highlight(?:[ \t]+(.*?))?[ \t]*$/u.exec(line);
  return match ? parseHighlightAttributes(match[1] ?? "") : null;
}
