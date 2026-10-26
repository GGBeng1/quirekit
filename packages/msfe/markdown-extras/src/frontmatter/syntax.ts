import type { MarkdownConfig } from "@quirekit/lezer-markdown";
import { fencedContainer } from "../syntax/containers";

/** Opt-in YAML/TOML source container; no metadata execution or decoding. */
export const frontmatterSyntax: MarkdownConfig = {
  defineNodes: ["Frontmatter", "FrontmatterMark", "FrontmatterText"],
  parseBlock: [fencedContainer("Frontmatter", /^(?:---|\+\+\+)\s*$/u, true)],
};
