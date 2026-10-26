import { readMindMapDocument } from "../../model/document";
import type { MindMapDocument } from "../../model/types";
import type { XmindExportResult } from "../types";
import { exportXmindAnnotations } from "./annotations";
import { exportXmindTopic } from "./topics";
import type { XmindExportContext, XmindExportTopic } from "./types";

/** @param input - One portable document or ordered workbook documents. @returns Modern XMind content and resources with explicit differences. */
export function exportXmindContent(input: MindMapDocument | readonly MindMapDocument[]): XmindExportResult {
  const documents = Array.isArray(input) ? input : [input];
  if (!documents.length || documents.length > 100) throw new RangeError("XMind: expected 1–100 documents");
  const context: XmindExportContext = { report: { seen: new WeakSet(), count: 0, textSize: 0, diagnostics: [] }, resources: new Map(), images: new Map() };
  const content = documents.map((candidate, index) => {
    const document = readMindMapDocument(candidate), path = `sheets[${index}]`, topics = new Map<string, XmindExportTopic>();
    const root = exportXmindTopic(document.root, context, `${path}.rootTopic`, topics);
    root.structureClass = { "mind-map": "org.xmind.ui.map.unbalanced", "logical-right": "org.xmind.ui.logic.right", "logical-left": "org.xmind.ui.logic.left", organization: "org.xmind.ui.org-chart.down", timeline: "org.xmind.ui.timeline.horizontal" }[document.layout];
    root.position = { x: 0, y: 0 };
    if (document.floatingTopics?.length) {
      const children = (root.children ??= {}) as Record<string, unknown>;
      children.detached = document.floatingTopics.map((free, i) => ({ ...exportXmindTopic(free.root, context, `${path}.floatingTopics[${i}].root`, topics),
        position: free.position, structureClass: free.side === "left" ? "org.xmind.ui.logic.left" : "org.xmind.ui.logic.right" }));
    }
    const relationships = exportXmindAnnotations(document.annotations ?? [], topics, context, path);
    return Object.freeze({ id: `sheet-${index + 1}`, title: document.root.text, rootTopic: root, ...(relationships.length ? { relationships } : {}) });
  });
  if (JSON.stringify(content).length > 4000000 || [...context.resources.values()].reduce((sum, bytes) => sum + bytes.length, 0) > 3000000) throw new RangeError("XMind: workbook content or resource budget exceeded");
  return Object.freeze({ content: Object.freeze(content), resources: context.resources, diagnostics: Object.freeze(context.report.diagnostics) });
}
