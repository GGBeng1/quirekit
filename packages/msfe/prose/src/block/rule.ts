import { Node, defineSource } from "@quirekit/msfe-core";
import { Decoration } from "@quirekit/cm-view";

/** Thematic separator; source characters remain available to native selection and undo. */
export const HorizontalRule = Node.create({ name: "horizontalRule",
  /** @returns Queryable source semantics. */
  addSource: () => defineSource({ nodes: ["HorizontalRule"], read: () => ({}), patch: () => null }),
  /** @returns A line presentation outside source activity. */
  addProjections: () => [{ nodes: ["HorizontalRule"],
    /** @param input - Confirmed single-line separator. @returns Semantic reading separator. */
    decorate({ state, node, active }) {
      return active ? [] : [Decoration.line({ class: "msfe-rule", attributes: { role: "separator" } }).range(state.doc.lineAt(node.from).from)];
    },
  }],
});
