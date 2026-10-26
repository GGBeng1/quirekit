import { defineCommand, type CommandSpec } from "@quirekit/core";
import {
  defaultWordParagraphCharacterPitchTwips,
  patchWordParagraphAiValue,
  resolveWordParagraphFormatting,
  wordParagraphAiValues,
  type WordParagraphAiValueName
} from "@quirekit/classic-paragraph-model";
import { resolveWordParagraphStyleRegistry } from "../model/registry";
import type { WordNamedParagraphStyle, WordParagraphStyleRegistry } from "../model/types";

/** Point size a `fontScale` of 1 stands for, the base of on-screen layout. */
export const wordStyleAgentBasePoints = defaultWordParagraphCharacterPitchTwips / 20;

/** Paragraph values a style definition shows and accepts. */
export const wordStyleAgentParagraphValues: readonly WordParagraphAiValueName[] = ["align", "lineSpacing", "spaceBefore", "spaceAfter", "indent", "firstLineIndent"];

/**
 * Describes the style update command for Agents: an existing paragraph style named as on its 样式 setting line,
 * with values merged in the notation of paragraph and character formats.
 * @param run - Style update command.
 * @returns Described command.
 */
export function describeWordParagraphStyleUpdateCommand(run: CommandSpec): CommandSpec {
  const nullable = (schema: Readonly<Record<string, unknown>>) => ({ anyOf: [schema, { type: "null" }] });
  return defineCommand({
    description: "Changes an existing paragraph style, named as on its 样式 setting line; paragraphs using the style follow. `set` takes the values shown there; null returns a value to inheritance.",
    category: "样式",
    params: {
      type: "object",
      properties: {
        style: { type: "string", minLength: 1 },
        set: {
          type: "object",
          properties: {
            fontFamily: nullable({ type: "string", minLength: 1 }),
            fontSize: nullable({ type: "string", pattern: "^[0-9]+(\\.[0-9]+)?pt$", description: "Such as \"16pt\"." }),
            bold: nullable({ type: "boolean" }),
            italic: nullable({ type: "boolean" }),
            ...Object.fromEntries(wordStyleAgentParagraphValues.map(name => [name, nullable(wordParagraphAiValues[name].schema)]))
          },
          minProperties: 1,
          additionalProperties: false
        }
      },
      required: ["style", "set"],
      additionalProperties: false
    },
    adapt: (value, { doc }) => {
      const request = value as StyleParams;
      const style = findStyle(resolveWordParagraphStyleRegistry(doc.attrs.wordStyleRegistry), request.style);
      return style === undefined || style.locked ? null : { style: applyStyleChanges(style, request.set) };
    },
    run
  });
}

/** Style changes as Agents write them. */
interface StyleParams {
  /** Style name or id. */
  readonly style: string;
  /** Values to set; null returns a value to inheritance. */
  readonly set: Readonly<Record<string, unknown>>;
}

/**
 * Merges requested values into a style, keeping every other field.
 * @param style - Current definition.
 * @param set - Requested values.
 * @returns Replacement definition with the same id.
 */
function applyStyleChanges(style: WordNamedParagraphStyle, set: Readonly<Record<string, unknown>>): WordNamedParagraphStyle {
  const text: Record<string, unknown> = { ...style.text };
  if ("fontFamily" in set) assign(text, "fontFamily", set.fontFamily ?? undefined);
  if ("fontSize" in set) {
    const scale = typeof set.fontSize === "string" ? Number.parseFloat(set.fontSize) / wordStyleAgentBasePoints : undefined;
    assign(text, "fontScale", scale);
    assign(text, "lineHeightScale", scale);
  }
  if ("bold" in set) assign(text, "fontWeight", set.bold === null ? undefined : set.bold ? "bold" : "normal");
  if ("italic" in set) assign(text, "fontStyle", set.italic === null ? undefined : set.italic ? "italic" : "normal");
  let paragraph = style.paragraph;
  for (const name of wordStyleAgentParagraphValues) {
    // Spacing and indentation patches replace the whole group, so each starts from the previous result.
    if (name in set) paragraph = { ...paragraph, ...patchWordParagraphAiValue(resolveWordParagraphFormatting(paragraph), name, set[name] ?? null) };
  }
  return { ...style, text: text as WordNamedParagraphStyle["text"], paragraph };
}

/**
 * Sets or removes one key.
 * @param target - Record to change.
 * @param key - Key.
 * @param value - New value, or undefined to remove.
 */
function assign(target: Record<string, unknown>, key: string, value: unknown): void {
  if (value === undefined) delete target[key];
  else target[key] = value;
}

/**
 * @param registry - Style registry.
 * @param wanted - Style name or id.
 * @returns Matching style, compared case-insensitively.
 */
function findStyle(registry: WordParagraphStyleRegistry, wanted: string): WordNamedParagraphStyle | undefined {
  const key = wanted.toLowerCase();
  return Object.values(registry.styles).find(style => style.name.toLowerCase() === key || style.id.toLowerCase() === key);
}
