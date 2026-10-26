import { readMindMapDocument } from "../model/document";
import type { MindMapNode } from "../model/types";
import { readText } from "../model/validation";
import { reportXmindFields, xmindArray, xmindLayout, xmindPosition, xmindRecord } from "./reading";
import { readXmindTopic } from "./topics";
import type { XmindCanvas, XmindContext, XmindImportResult, XmindImportOptions } from "./types";
import { readXmindTheme } from "./import/style";
import { readXmindAnnotations } from "./import/annotations";

/**
 * Converts modern XMind content.json without DOM, filesystem or renderer access.
 * @param input - JSON string or decoded sheet array from content.json.
 * @param options - Explicit detached resource boundary.
 * @returns Every canvas and explicit diagnostics for data not represented by the model.
 */
export function parseXmindContent(input: unknown, options: XmindImportOptions = {}): XmindImportResult {
  if (typeof input === "string") {
    if (input.length > 4000000) throw new RangeError("XMind: JSON budget exceeded");
    input = JSON.parse(input);
  }
  const values = xmindArray(input, "sheets");
  if (!values.length || values.length > 100) throw new RangeError("XMind: expected 1–100 sheets");
  const context: XmindContext = { seen: new WeakSet(), count: 0, textSize: 0, diagnostics: [] };
  const sheets = Array.from(values, (value, index) => {
    const path = `sheets[${index}]`;
    const sheet = xmindRecord(value, path);
    reportXmindFields(sheet, ["id", "title", "rootTopic", "class", "coreVersion", "topicPositioning", "topicOverlapping", "theme", "relationships"], path, context);
    const root = xmindRecord(sheet.rootTopic, `${path}.rootTopic`);
    const canvas: XmindCanvas = { floatingTopics: [], ids: new Map(), groups: [], resources: options,
      theme: readXmindTheme(sheet.theme, `${path}.theme`, context), origin: root.position === undefined ? { x: 0, y: 0 }
      : xmindPosition(root.position, `${path}.rootTopic.position`, context) };
    const layout = xmindLayout(root.structureClass, `${path}.rootTopic.structureClass`, context);
    const node = readXmindTopic(root, `${path}.rootTopic`, 0, context, canvas, true);
    const annotations = readXmindAnnotations(sheet, canvas, context, path);
    let version = layout === "organization" || layout === "timeline" ? 6 : annotations.length ? 4 : 2;
    /** @param node - Converted topic. */
    function features(node: MindMapNode): void {
      if (node.style) version = Math.max(version, 3); if (node.details) version = Math.max(version, 5); node.children.forEach(features);
    }
    [node, ...canvas.floatingTopics.map(topic => topic.root)].forEach(features);
    return Object.freeze({ id: sheet.id === undefined ? `sheet-${index + 1}` : readText(sheet.id, `${path}.id`),
      title: sheet.title === undefined ? node.text : readText(sheet.title, `${path}.title`),
      document: readMindMapDocument({ version, revision: 0, layout, root: node, floatingTopics: canvas.floatingTopics,
        ...(version >= 4 ? { annotations } : {}) }) });
  });
  return Object.freeze({ sheets: Object.freeze(sheets), diagnostics: Object.freeze(context.diagnostics) });
}
