import type { Extension } from "@quirekit/cm-state";
import { editingBoundaries } from "../../input/boundaries/runtime";
import type { InlineBoundaryRule } from "./types";

/** @param rules - Existing public inline policies. @returns Compatibility adapter onto the shared block/style boundary runtime. */
export function inlineBoundaryNavigation(rules: readonly InlineBoundaryRule[]): Extension {
  return editingBoundaries(rules.map(rule => ({ nodes: rule.nodes,
    /** @param context - Confirmed Markdown owner, never its embedded language tree. @returns Paired style markers and their editable content. */
    resolve({ node }) {
      const first = node.getChild(rule.marker);
      let last = node.lastChild;
      while (last && last.name !== rule.marker) last = last.prevSibling;
      return first && last && first.to < last.from ? { from: first.from, to: last.to, contentFrom: first.to,
        contentTo: last.from, kind: "style", navigation: rule.behavior, deletion: "unwrap" } : null;
    },
  })));
}
