import { syntaxTree } from "@quirekit/cm-language";
import type { EditorView } from "@quirekit/cm-view";
import { maxHtmlLength } from "./policy";
import type { HtmlCandidate } from "./types";

/** @param view - Canonical text and visible source ranges. @returns Bounded HTML candidates with Markdown code exclusion. */
export function htmlCandidates(view: EditorView): readonly HtmlCandidate[] {
  const result: HtmlCandidate[] = [], seen = new Set<number>();
  for (const visible of view.visibleRanges) syntaxTree(view.state).iterate({ ...visible, enter(reference) {
    if (reference.name === "FencedCode" || reference.name === "CodeBlock" || reference.name === "InlineCode") return false;
    if (reference.name !== "HTMLBlock" && reference.name !== "Paragraph" && !/^ATXHeading\d$/u.test(reference.name)) return;
    if (seen.has(reference.from)) return false;
    seen.add(reference.from);
    if (reference.to - reference.from > maxHtmlLength) return false;
    const tags = reference.name === "HTMLBlock" ? null : new Set<number>();
    if (tags) reference.node.toTree().iterate({ enter(child) {
      if (child.name === "HTMLTag") tags.add(child.from);
    } });
    if (!tags || tags.size) result.push({ from: reference.from, to: reference.to, tags,
      source: view.state.sliceDoc(reference.from, reference.to) });
    return false;
  } });
  return result;
}
