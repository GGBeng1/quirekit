import type { PreviewOptions } from "../shared/types";
import { previewTarget } from "../shared/target";
import { Node, defineSource, componentView, type ProjectionDecoration } from "@quirekit/msfe-core";
import { mathSyntax } from "./syntax";
import { createMathRenderer } from "./renderer";
import { delimitedBody } from "../shared/source";
import { previewContainer } from "../shared/container";
import { mapPreviewProps } from "../shared/mapping";

/** Optional inline and display formulas; the source remains directly editable. */
export const Math = Node.create<PreviewOptions>({ name: "math",
  /** @returns Product-neutral rendering defaults. */
  addOptions: () => ({}),
  /** @returns The canonical dollar-delimited grammar. */
  addMarkdownExtensions: () => mathSyntax,
  /** @returns Source body semantics; incomplete containers remain plain source. */
  addSource: () => defineSource({ nodes: ["InlineMath", "DisplayMath"],
    /** @param document - Canonical source. @param node - Confirmed formula. @returns Body semantics, or no preview for incomplete input. */
    read(document, node) { const text = delimitedBody(document, node, `${node.kind}Mark`); return text === null ? null : { text, display: node.kind === "DisplayMath" }; },
    /** @returns Structured formula commands are not yet provided. */
    patch: () => null,
  }),
  /** @returns Direct display layout and viewport-only inline math, both automatically revealing active source. */
  addProjectionLayers() { const name = this.name, owner = this, renderer = createMathRenderer(this.options.controls, this.options.activation); return [false, true].map(display => ({ key: `${name}-${display ? "block" : "inline"}`,
    placement: display ? "block" as const : "inline" as const, incremental: true,
    /** @param input - Cached semantic query and canonical permissions. @returns Layout-owned block or viewport-owned inline replacements. */
    build(input) {
      const result: ProjectionDecoration[] = [];
      for (const match of input.query(name).matches) {
        if (match.attrs.display !== display) continue;
        result.push({ type: "replace", from: display ? input.document.lineAt(match.from).from : match.from, to: match.to, key: `${match.from}`,
          view: componentView(renderer, { text: String(match.attrs.text), source: input.document.slice(display ? input.document.lineAt(match.from).from : match.from, match.to),
            readOnly: input.readOnly || input.mode === "locked", range: { from: match.from, to: match.to },
            target: range => previewTarget(owner.editor, range, owner.options.edit, display ? "displayMath" : "inlineMath"),
            kind: display ? "displayMath" : "inlineMath", ...(display ? { container: previewContainer(input.document, match.node) } : {}) }, mapPreviewProps) });
      }
      return result;
    },
  })); },
});
