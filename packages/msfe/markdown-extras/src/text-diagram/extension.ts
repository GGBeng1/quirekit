import type { PreviewOptions } from "../shared/types";
import { previewTarget } from "../shared/target";
import { Node, defineSource, componentView } from "@quirekit/msfe-core";
import { createTextDiagramRenderer } from "./renderer";
import { textDiagramLanguage } from "@quirekit/text-diagram";
import { previewContainer } from "../shared/container";
import { mapPreviewProps } from "../shared/mapping";
import { textDiagramAiCapabilities } from "../ai/facts";
import { createTextFigureAgentCommands } from "../ai/commands";
import type {} from "../ai/types";

/** Optional closed PlantUML and DOT fence previews; active source keeps the ordinary code-block editor. */
export const TextDiagrams = Node.create<PreviewOptions>({ name: "textDiagram",
  /** @returns Product-neutral rendering defaults. */
  addOptions: () => ({}),
  /** @returns PlantUML and DOT in the AI figure catalog, rendered before they are written. */
  addAiCapabilities: () => textDiagramAiCapabilities,
  /** @returns Text figure commands the AI core may run. */
  addCommands: () => createTextFigureAgentCommands(),
  /** @returns Read-only diagram bodies from the canonical fenced-code syntax. */
  addSource: () => defineSource({ nodes: ["FencedCode"],
    /** @param document - Canonical source. @param node - Parser-confirmed fence. @returns Diagram body only for closed TextDiagrams fences. */
    read(document, node) {
    const marks = node.children("CodeMark"), info = node.child("CodeInfo");
    if (marks.length !== 2 || !info) return null;
    const language = textDiagramLanguage(document.slice(info.from, info.to));
    if (!language || language === "mermaid") return null;
    // Accepted CodeText chunks exclude container prefixes while retaining meaningful
    // code indentation and line breaks, including fences nested inside quotes.
    return { language, text: node.children("CodeText").map(part => document.slice(part.from, part.to)).join("") };
  },
    /** @returns Diagram creation remains a canonical source edit. */
    patch: () => null }),
  /** @returns Direct block layout, with source automatically revealed by an intersecting selection. */
  addProjectionLayers() { const name = this.name, owner = this, renderer = createTextDiagramRenderer(this.options.controls, this.options.activation); return [{ key: `${name}-preview`, placement: "block", incremental: true,
    /** @param input - Accepted semantic source and permissions. @returns Direct block replacements, with activity resolved by core. */
    build(input) {
    return input.query(name).matches.map(match => ({ type: "replace" as const, from: input.document.lineAt(match.from).from, to: match.to,
      key: `${match.from}`, view: componentView(renderer, { text: String(match.attrs.text), source: input.document.slice(input.document.lineAt(match.from).from, match.to),
        readOnly: input.readOnly || input.mode === "locked", range: { from: match.from, to: match.to },
        target: range => previewTarget(owner.editor, range, owner.options.edit, "textDiagram"),
        kind: "textDiagram" as const, language: match.attrs.language as "plantuml" | "dot", container: previewContainer(input.document, match.node) }, mapPreviewProps) }));
  } }]; },
});
