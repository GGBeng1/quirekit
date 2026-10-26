import { TextSelection } from "@quirekit/pm";
import type { EditorState, Node } from "@quirekit/pm";
import type { QuireNativeTextContext } from "@quirekit/view/mounted-services";
import type { AccessibilityRegistry } from "../registry/types";
import { supportsTextPosition } from "../registry/semantics";

/**
 * Projects one bounded textblock through explicitly admitted structural owners.
 * @param state - Canonical accepted state.
 * @param budget - Maximum native UTF-16 units.
 * @param registry - Compiled node semantics and input policy.
 * @returns Exact context, or null while unsupported selections retain canonical authority.
 */
export function projectTextContext(state: EditorState, budget: number, registry: AccessibilityRegistry): QuireNativeTextContext | null {
  const selection = state.selection;
  const { $anchor, $head, from, to } = selection;
  if (!(selection instanceof TextSelection) || !$anchor.sameParent($head) || !supportsTextPosition($anchor, registry)
    || to - from > budget) return null;
  const base = $anchor.start();
  const size = $anchor.parent.content.size;
  const spare = Math.max(0, budget - (to - from));
  let start = Math.max(0, from - base - Math.floor(spare / 2));
  let end = Math.min(size, start + budget);
  start = Math.max(0, end - budget);
  start = alignBoundary($anchor.parent, start, 1);
  end = alignBoundary($anchor.parent, end, -1);
  const projection = projectInlineText($anchor.parent, start, end, base, registry);
  if (!projection || from < base + start || to > base + end) return null;
  return { doc: state.doc, text: projection.text, positions: projection.positions,
    anchor: selection.anchor - base - start, head: selection.head - base - start };
}

/** @param node - Textblock. @param position - Local boundary. @param direction - Inward shift. @returns Boundary that does not split a surrogate pair. */
function alignBoundary(node: Node, position: number, direction: number): number {
  if (position <= 0 || position >= node.content.size) return position;
  const pair = node.textBetween(position - 1, position + 1, "", "\uFFFC");
  return /^[\uD800-\uDBFF][\uDC00-\uDFFF]$/.test(pair) ? position + direction : position;
}

/**
 * Maps text and hard breaks only; an inline atom cannot be mistaken for editable text.
 * @param node - Textblock whose content offsets are used below.
 * @param from - Inclusive local content boundary.
 * @param to - Exclusive local content boundary.
 * @param base - Canonical start of textblock content.
 * @param registry - Exact semantics of inline leaves.
 * @returns Source-mapped text, or null for an unsupported atom or split surrogate.
 */
function projectInlineText(node: Node, from: number, to: number, base: number, registry: AccessibilityRegistry) {
  let text = "";
  let valid = true;
  const positions = [base + from];
  node.nodesBetween(from, to, (child, position) => {
    if (child.isText) {
      const start = Math.max(from, position) - position;
      const end = Math.min(to, position + child.nodeSize) - position;
      const value = child.text!.slice(start, end);
      if (/^[\uDC00-\uDFFF]|[\uD800-\uDBFF]$/u.test(value)) valid = false;
      text += value;
      for (let index = start; index < end; index++) positions.push(base + position + index + 1);
    } else if (registry.node(child)?.kind === "break" && child.nodeSize === 1) {
      text += "\n";
      positions.push(base + position + 1);
    } else valid = false;
    return false;
  });
  return valid ? { text, positions } : null;
}
