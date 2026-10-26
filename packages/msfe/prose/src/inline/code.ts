import { Mark, defineSource } from "@quirekit/msfe-core";
import { Decoration } from "@quirekit/cm-view";
import { normalizeInlineCode } from "./normalization";

/** Inline code presentation leaves text and selection in the canonical editor. */
export const InlineCode = Mark.create({ name: "inlineCode",
  /** @returns A queryable, read-only source codec. */
  addSource: () => defineSource({ nodes: ["InlineCode"], read: () => ({}), patch: () => null }),
  /** @returns Direct inline-flow replacements, cached independently of source-reveal selection. */
  addProjectionLayers() { const name = this.name; return [{ key: `${name}-normalization`, placement: "block", incremental: true,
    /** @param input - Confirmed immutable source. @returns Only normalized fragments of inline code. */
    build: input => input.query(name).matches.flatMap(match => normalizeInlineCode(input.document, match.node)),
  }]; },
  /** @returns Confirmed code delimiters, never a regular-expression replacement over prose. */
  addProjections: () => [{ nodes: ["InlineCode"],
    /** @param input - Confirmed inline syntax. @returns Native content styling and inactive delimiter hiding. */
    decorate({ node, active }) {
      const marks = node.getChildren("CodeMark"), first = marks[0], last = marks.at(-1);
      if (!first || !last || first.to >= last.from) return [];
      const result = [Decoration.mark({ class: "msfe-inline-code msfe-syntax-code" }).range(first.to, last.from)];
      if (!active) for (const mark of marks) result.push(Decoration.replace({}).range(mark.from, mark.to));
      return result;
    },
  }],
});
