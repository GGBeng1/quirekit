import { Extension } from "@quirekit/msfe-core";
import { Decoration } from "@quirekit/cm-view";
import { abbreviationSyntax } from "./syntax";
import { abbreviationProjection } from "./runtime";

/** Document abbreviations resolve through the shared parser scheduler and retain literal definition source. */
export const Abbreviations = Extension.create({ name: "abbreviations",
  /** @returns Explicit definition grammar. */
  addMarkdownExtensions: () => abbreviationSyntax,
  /** @returns A composable text decoration layer; existing block owners retain their projections. */
  addCodeMirrorExtensions: () => abbreviationProjection,
  /** @returns Semantic inline abbreviation elements plus subdued editable definitions. */
  addProjections: () => [
    { nodes: ["AbbreviationDefinition"],
      /** @param input - Exact definition. @returns Existing reference-source styling; definitions remain reachable in every mode. */
      decorate: ({ node }) => [Decoration.mark({ class: "msfe-reference-definition" }).range(node.from, node.to)],
    },
  ],
});
