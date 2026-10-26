import { readMindMapDocument } from "../model/document";
import type { MindMapDocument, MindMapNode } from "../model/types";
import { readRecord, readText } from "../model/validation";
import type { MindMapCreateOptions } from "./types";

/**
 * Creates a validated document from plain topic content without a renderer or model SDK.
 * @param input - Untrusted recursive text/children data matching mindMapOutlineSchema.
 * @param options - Host layout defaults; identities and revision are assigned here.
 * @returns Detached immutable v2 document ready for Mind Editor or a draft session.
 */
export function createMindMapDocument(input: unknown, options: MindMapCreateOptions = {}): MindMapDocument {
  const defaults = readRecord(options, ["layout"], "options");
  const seen = new WeakSet<object>();
  let count = 0;
  let textSize = 0;
  /** @param value - Topic candidate. @param depth - Root-relative depth. @returns Canonical node candidate. */
  function visit(value: unknown, depth: number): MindMapNode {
    if (++count > 10000 || depth > 64) throw new RangeError("outline: tree budget exceeded");
    const node = readRecord(value, ["text", "children"], "outline");
    if (seen.has(node)) throw new TypeError("outline: repeated reference or cycle");
    seen.add(node);
    const id = `topic-${count}`;
    const text = readText(node.text, `${id}.text`);
    if ((textSize += text.length) > 1000000) throw new RangeError("outline: text budget exceeded");
    if (!Array.isArray(node.children)) throw new TypeError("outline.children: expected array");
    if (node.children.length >= 10000) throw new RangeError("outline: tree budget exceeded");
    return { id, text, collapsed: false, children: Array.from(node.children, child => visit(child, depth + 1)) };
  }
  // Assign identity before descending, then enter the existing canonical validator once.
  // Generation owns content only; it cannot smuggle viewport state or host revisions.
  return readMindMapDocument({ version: defaults.layout === "organization" || defaults.layout === "timeline" ? 6 : 2, revision: 0, layout: defaults.layout ?? "mind-map",
    root: visit(input, 0), floatingTopics: [], ...(defaults.layout === "organization" || defaults.layout === "timeline" ? { annotations: [] } : {}) });
}
