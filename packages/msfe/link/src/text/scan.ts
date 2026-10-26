import type { syntaxTree } from "@quirekit/cm-language";

type Tree = ReturnType<typeof syntaxTree>;

/** Syntax whose text is literal or already a destination, so it never becomes a text link. */
const excluded = /Code|Link|URL|Autolink|Image|HTML|Math|Frontmatter|Comment/u;
const wordCharacter = /[\p{L}\p{N}_]/u;

/** One candidate occurrence in document coordinates. */
export interface TextLinkMatch {
  /** Start offset. */ readonly from: number;
  /** End offset. */ readonly to: number;
  /** Matched text. */ readonly text: string;
}

/**
 * Finds candidates in one source range, skipping excluded syntax and matches inside longer words.
 * @param text - Source of the range.
 * @param offset - Document offset of the range start.
 * @param pattern - Global matcher.
 * @param tree - Parsed syntax of the same document.
 * @returns Candidates in document order.
 */
export function scanTextLinks(text: string, offset: number, pattern: RegExp, tree: Tree): TextLinkMatch[] {
  const matches: TextLinkMatch[] = [];
  pattern.lastIndex = 0;
  for (const match of text.matchAll(pattern)) {
    const start = match.index, end = start + match[0].length;
    if (!match[0] || wordCharacter.test(text[start - 1] ?? "") || wordCharacter.test(text[end] ?? "")) continue;
    if (insideExcluded(tree, offset + start)) continue;
    matches.push({ from: offset + start, to: offset + end, text: match[0] });
  }
  return matches;
}

/** @param tree - Parsed syntax. @param pos - Candidate start. @returns Whether an enclosing node keeps the text literal. */
function insideExcluded(tree: Tree, pos: number): boolean {
  for (let node: ReturnType<Tree["resolveInner"]> | null = tree.resolveInner(pos, 1); node; node = node.parent) {
    if (excluded.test(node.name)) return true;
  }
  return false;
}

/** @param pattern - Host matcher. @returns An equivalent global, Unicode-aware matcher. */
export function globalPattern(pattern: RegExp): RegExp {
  const flags = new Set([...pattern.flags, "g", "u"]);
  flags.delete("y");
  return new RegExp(pattern.source, [...flags].join(""));
}
