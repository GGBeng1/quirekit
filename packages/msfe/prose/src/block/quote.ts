import { Node, defineSource, type ProjectionDecoration } from "@quirekit/msfe-core";
import { Decoration } from "@quirekit/cm-view";

/** Quote containers decorate native lines; hosts may extend this with independent component controls. */
export const Blockquote = Node.create({ name: "blockquote",
  /** @returns Source semantics without imposing a component renderer. */
  addSource: () => defineSource({ nodes: ["Blockquote"], read: () => ({}), patch: () => null }),
  /** @returns Stable-width prefixes, preventing horizontal movement beneath a drag pointer. */
  addProjections: () => [{ nodes: ["QuoteMark"],
    /** @param input - Canonical prefix and selection activity. @returns Source-preserving decorations. */
    decorate({ state, node, active }) {
      const to = node.to + Number(state.sliceDoc(node.to, node.to + 1) === " ");
      return [Decoration.mark({ class: `msfe-quote-prefix${active ? "" : " msfe-quote-prefix-hidden"}` }).range(node.from, to)];
    },
  }],
  /** @returns Visible line work only, with nested containers sharing already-covered lines. */
  addProjectionLayers() { const name = this.name; return [{ key: `${name}-body`, placement: "inline", build: input => {
    const result: ProjectionDecoration[] = [];
    let covered = -1;
    for (const match of input.query(name).matches) {
      if (match.to <= covered || covered >= input.document.length) continue;
      // Source-order ancestors cover their descendants. Each visible line is
      // decorated once, even for deeply nested containers spanning the document.
      let line = input.document.lineAt(Math.max(input.from, match.from, covered + 1));
      while (line.from <= input.to && line.from < match.to) {
        result.push({ type: "line", from: line.from, class: "msfe-quote-line" }); covered = line.to;
        if (line.to >= input.document.length) break;
        line = input.document.lineAt(line.to + 1);
      }
    }
    return result;
  } }]; },
});
