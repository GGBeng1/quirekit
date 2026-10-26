import type { Editor } from "@quirekit/core";
import { DOMSerializer, type Node } from "@quirekit/pm";
import { resolveWordNumberingMarkers, type ResolvedWordNumberingMarker } from "@quirekit/classic-numbering-model";
import { createMarker, markerIndent } from "./marker";

/**
 * Preserves resolved markers in the product's static HTML export, without writing display text into the model.
 * @param editor - Canonical document owner.
 * @returns Standalone body HTML with static list markers.
 */
export function exportListHTML(editor: Editor): string {
  const document = globalThis.document;
  const base = DOMSerializer.fromSchema(editor.state.schema);
  const queues = new Map<Node, (ResolvedWordNumberingMarker | undefined)[]>();
  const markers = resolveWordNumberingMarkers(editor.state.doc);
  editor.state.doc.descendants((node, position) => {
    if (!["paragraph", "heading"].includes(node.type.name)) return;
    const entries = queues.get(node) ?? [];
    entries.push(markers.get(position)); queues.set(node, entries);
  });
  const nodes = { ...base.nodes };
  for (const name of ["paragraph", "heading"]) {
    if (!nodes[name]) continue;
    nodes[name] = node => {
      const element = base.serializeNode(node, { document }) as HTMLElement;
      const marker = queues.get(node)?.shift();
      if (!marker) return element;
      const indent = markerIndent(marker);
      element.style.paddingInlineStart = `${indent.start}px`;
      element.style.paddingInlineEnd = `${indent.end}px`;
      element.style.textIndent = "0";
      const glyph = createMarker(document, editor, marker, () => undefined, true, true);
      element.prepend(glyph);
      return element;
    };
  }
  const container = document.createElement("div");
  container.append(new DOMSerializer(nodes, base.marks).serializeFragment(editor.state.doc.content, { document }));
  return container.innerHTML;
}
