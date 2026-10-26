import { Extension, type AnyExtension } from "@quirekit/msfe-core";
import { CustomContainer, DefinitionList, Footnotes, Frontmatter, Math, Mermaid, TextDiagrams, Subscript, Superscript, InsertedText, Highlight } from "@quirekit/msfe-markdown-extras";
import { markdownMermaidEnabled, markdownTextDiagramsEnabled } from "./capabilities";
import type { MarkdownOptions } from "../types";

/** @param options - Pure source configuration. @returns Fresh headless extensions without any editor product preset. */
export function createMarkdownExtensions(options: MarkdownOptions): readonly AnyExtension[] {
  return [
    ...(options.preset === false ? [] : [CustomContainer, DefinitionList, Footnotes, Frontmatter, Math, Mermaid, TextDiagrams,
      Subscript, Superscript, InsertedText, Highlight, Extension.create({ name: "incremark-presentation",
        /** @returns Snapshot-local diagram capability shared with editor adapters. */
        addCodeMirrorExtensions: () => [markdownMermaidEnabled.of(true), markdownTextDiagramsEnabled.of(true)],
      })]),
    ...(options.syntax?.length ? [{ id: "incremark-syntax", syntax: options.syntax }] : []),
    ...options.extensions ?? [],
  ];
}
