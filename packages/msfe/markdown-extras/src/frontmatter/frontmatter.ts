import { Node, defineSource, type ProjectionDecoration } from "@quirekit/msfe-core";
import { frontmatterSyntax } from "./syntax";

/** Optional source-preserving metadata panel; values are not interpreted or executed. */
export const Frontmatter = Node.create({ name: "frontmatter",
  /** @returns Root-only YAML/TOML delimiter grammar. */
  addMarkdownExtensions: () => frontmatterSyntax,
  /** @returns Complete containers only; an open header remains source. */
  addSource: () => defineSource({ nodes: ["Frontmatter"], read: (_document, node) => node.children("FrontmatterMark").length === 2 ? {} : null, patch: () => null }),
  /** @returns Native metadata rows bounded by the viewport. */
  addProjectionLayers() { const name = this.name; return [{ key: `${name}-rows`, placement: "inline",
    /** @param input - Visible source range. @returns Native metadata line roles without a second editor. */
    build(input) {
    const result: ProjectionDecoration[] = [];
    for (const match of input.query(name).matches) {
      let line = input.document.lineAt(Math.max(input.from, match.from));
      while (line.from <= input.to && line.from < match.to) {
        result.push({ type: "line", from: line.from, class: `msfe-frontmatter${line.from === input.document.lineAt(match.from).from ? " msfe-frontmatter-start" : ""}${line.to >= match.to ? " msfe-frontmatter-end" : ""}` });
        if (line.to >= input.document.length) break;
        line = input.document.lineAt(line.to + 1);
      }
    }
    return result;
  } }]; },
});
