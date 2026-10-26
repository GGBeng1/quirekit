import { Node, defineSource } from "@quirekit/msfe-core";
import { Decoration } from "@quirekit/cm-view";
import { definitionSyntax } from "./syntax";
import { definitionReading } from "./reading";

/** Optional definition-list semantics; all descriptions remain editable CodeMirror text. */
export const DefinitionList = Node.create({ name: "definitionList",
  /** @returns Native term/description grammar. */
  addMarkdownExtensions: () => definitionSyntax,
  /** @returns Semantic term/description relationships in Locked without changing input ownership. */
  addCodeMirrorExtensions: () => definitionReading,
  /** @returns Queryable terms and multi-block bodies. */
  addSource: () => defineSource({ nodes: ["DefinitionTerm", "DefinitionDescription"], read: (_document, node) => ({ kind: node.kind }), patch: () => null }),
  /** @returns Public Prose term/description rhythm adapted to the canonical rows. */
  addProjections: () => [{ nodes: ["DefinitionTerm", "DefinitionDescription"],
    /** @param input - Confirmed term or body in the viewport. @returns Bounded text styles and source marker hiding. */
    decorate({ state, node, active, from, to }) {
      const term = node.name === "DefinitionTerm", result = [];
      const first = state.doc.lineAt(node.from).from;
      let line = state.doc.lineAt(Math.max(from, node.from));
      while (line.from <= to && line.from < node.to) {
        result.push(Decoration.line({ class: term ? "msfe-definition-term"
          : `msfe-definition-description${line.from === first ? " msfe-definition-description-start" : ""}` }).range(line.from));
        if (line.to >= state.doc.length) break;
        line = state.doc.lineAt(line.to + 1);
      }
      const marker = node.getChild("DefinitionMark");
      if (marker && !active) result.push(Decoration.replace({}).range(marker.from, marker.to));
      return result;
    },
  }],
});
