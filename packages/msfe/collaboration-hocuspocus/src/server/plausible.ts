import type { ActivityHint } from "@quirekit/edit-history/writer";
import type { SourceChange } from "./text";

// Inserted Markdown that a block insertion of this type must contain.
const markers: Readonly<Record<string, RegExp>> = {
  table: /\|[^\n]*\n\s*\|?\s*:?-{3,}/u, code: /^(?:```|~~~)/mu, quote: /^\s*>/mu, divider: /^(?:\*{3,}|-{3,}|_{3,})\s*$/mu,
  list: /^\s*[-+*]\s/mu, ordered: /^\s*\d+[.)]\s/mu, task: /^\s*[-+*]\s+\[[ xX]\]/mu, definition: /^:\s/mu,
  highlight: /^:{3,}\s*highlight\b/mu, note: /^:{3,}\s*note\b/mu, warning: /^:{3,}\s*warning\b/mu, details: /^:{3,}\s*details\b/mu,
  nested: /^:{4,}\s*\w/mu, displayMath: /\$\$/u, inlineMath: /\$[^$\n]+\$/u, footnote: /\[\^[^\]]+\]/u, image: /!\[[^\]]*\]\(/u, link: /\[[^\]]+\]\(/u,
  textDiagram: /^(?:```|~~~)\s*(?:mermaid|plantuml|puml|dot|graphviz)/mu, flowchart: /^(?:```|~~~)\s*quirekit-flowchart/mu,
  mindMap: /^(?:```|~~~)\s*quirekit-mind-map/mu, whiteboard: /^(?:```|~~~)\s*quirekit-whiteboard/mu,
};

/**
 * Checks that an editor hint is consistent with the change the server observed. This is a textual plausibility
 * check, not a full syntax analysis: an insertion must insert text (and the block's Markdown when its type is known),
 * a removal must delete text. Inconsistent hints are ignored and the change is recorded as a plain edit.
 * @param hint - Editor hint.
 * @param change - Observed change.
 * @returns Whether the hint may label the change.
 */
export function plausibleHint(hint: ActivityHint, change: SourceChange): boolean {
  if (hint.delta !== change.delta) return false;
  if (hint.kind === "block.insert" || hint.kind === "block.duplicate" || hint.kind === "text.paste" || hint.kind === "text.drop") {
    if (!change.inserted) return false;
    const type = typeof hint.facts.type === "string" ? markers[hint.facts.type] : undefined;
    return !type || type.test(change.inserted);
  }
  if (hint.kind === "block.remove" || hint.kind === "text.cut") return change.deleted > 0;
  return true;
}
