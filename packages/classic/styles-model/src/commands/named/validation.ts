export { isWordNamedCharacterStyle } from "../../model/validation";
import type { WordParagraphStyleRegistry } from "../../model/types";

/** @param registry - Document definitions. @param id - Edited identity. @param base - Requested parent. @param character - Whether the chain is character-only. @returns Whether the new inheritance edge is valid and acyclic. */
export function admitsWordStyleBase(registry: WordParagraphStyleRegistry, id: string, base: string | null, character: boolean): boolean {
  const definitions = character ? registry.characterStyles ?? {} : registry.styles;
  const visited = new Set([id]);
  let cursor = base;
  while (cursor) {
    if (visited.has(cursor) || definitions[cursor] === undefined) return false;
    visited.add(cursor); cursor = definitions[cursor]!.basedOn;
  }
  return true;
}
