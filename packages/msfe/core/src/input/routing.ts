import type { EditorState, TransactionSpec } from "@quirekit/cm-state";
import { syntaxTree, syntaxTreeAvailable } from "@quirekit/cm-language";
import type { SyntaxNode } from "@lezer/common";
import { compositionField, modeFacet } from "../state/fields";
import { blockInputRegistry } from "./registry";
import type { BlockInputHandler, BlockInputIntent, BlockInputTarget } from "./types";

/**
 * Resolves ownership without parsing, dispatching or scanning unrelated blocks.
 * @param state - Canonical immutable source state.
 * @param intent - Requested keyboard gesture.
 * @returns One whole-selection edit, or native fallback with no partial mutation.
 */
export function planBlockInput(state: EditorState, intent: BlockInputIntent): TransactionSpec | null {
  if (state.readOnly || state.facet(modeFacet) !== "live" || state.field(compositionField, false)) return null;
  const ranges = state.selection.ranges;
  if (!syntaxTreeAvailable(state, ranges[ranges.length - 1]!.to)) return null;
  const tree = syntaxTree(state), registry = state.facet(blockInputRegistry);
  // Endpoints use the selected side of syntax boundaries. Their ancestry is
  // consumed once, so routing work is bounded by endpoint count × tree depth.
  const cursors = ranges.flatMap(range => (range.empty ? [range.head] : [range.from, range.to]).map((position, index) => ({
    range, position, node: tree.resolveInner(position, !range.empty && index === 0 ? 1 : -1) as SyntaxNode | null,
  })));
  while (true) {
    const targets: BlockInputTarget[] = [];
    let handler: BlockInputHandler | undefined;
    for (const cursor of cursors) {
      let matched = false;
      while (cursor.node) {
        const node = cursor.node, rule = registry.get(node.name), behavior = rule?.[intent];
        // Unknown blocks are semantic barriers. An extension must opt into
        // delegation before an enclosing document rule may transform its text.
        if ((!rule && node.type.is("Block")) || behavior === "native") return null;
        if (typeof behavior === "function") {
          if (handler && handler !== behavior) return null;
          handler = behavior;
          targets.push({ range: cursor.range, position: cursor.position, node });
          matched = true;
          break;
        }
        cursor.node = node.parent;
      }
      if (!matched) return null;
    }
    // A handler sees the entire unchanged selection exactly once. Conflicting
    // owners fall through before any planner runs; no partial result is applied.
    if (!handler) return null;
    const result = handler({ state, intent, targets });
    if (result === "native") return null;
    if (result !== "parent") return result;
    for (const cursor of cursors) cursor.node = cursor.node!.parent;
  }
}
