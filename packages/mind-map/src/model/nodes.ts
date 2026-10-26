import type { MindMapNode } from "./types";
import { readRecord, readText } from "./validation";
import { readMindMapDetails } from "../details/validation";
import { mindMapImagePixels } from "../details/image";
import { readMindMapStyle } from "../formatting/validation";

/** @param styled - Whether the enclosing schema admits explicit formatting. @param detailed - Whether node content is admitted. @returns A strict node reader sharing tree budgets. */
export function createMindMapNodeReader(styled = false, detailed = false) {
  const ids = new Set<string>();
  const seen = new WeakSet<object>();
  let totalText = 0, detailsSize = 0, pixels = 0;

  /**
   * Validates one subtree before any renderer can recurse into it.
   * @param candidate - Node candidate.
   * @param depth - Root-relative depth.
   * @param floating - Whether this node belongs to an independent tree.
   * @returns Detached immutable subtree.
   */
  function visit(candidate: unknown, depth: number, floating = false): MindMapNode {
    if (depth > 64 || ids.size >= 10000) throw new RangeError("root: tree budget exceeded");
    const node = readRecord(candidate, ["id", "text", "collapsed", "children", "side", ...(styled ? ["style"] : []), ...(detailed ? ["details"] : [])], "node");
    if (seen.has(node)) throw new TypeError("node: repeated reference or cycle");
    seen.add(node);
    if (typeof node.id !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/u.test(node.id)
      || ids.has(node.id)) throw new TypeError("node.id: invalid or duplicate identity");
    ids.add(node.id);
    const text = readText(node.text, `node.${node.id}.text`);
    totalText += text.length;
    if (totalText > 1000000) throw new RangeError("root: total text budget exceeded");
    if (typeof node.collapsed !== "boolean" || (!floating && depth === 0 && node.collapsed)) {
      throw new TypeError("node.collapsed: expected boolean; root must remain expanded");
    }
    if (Object.hasOwn(node, "side") && (floating || depth !== 1 || !["left", "right"].includes(node.side as string))) {
      throw new TypeError("node.side: only root children may specify left or right");
    }
    if (!Array.isArray(node.children) || node.children.length > 10000) {
      throw new TypeError("node.children: expected bounded ordered array");
    }
    const details = node.details === undefined ? undefined : readMindMapDetails(node.details);
    detailsSize += (details?.note?.length ?? 0) + (details?.image?.dataUrl.length ?? 0);
    if (details?.image) pixels += mindMapImagePixels(details.image.dataUrl);
    if (detailsSize > 2e6 || pixels > 16e6) throw new RangeError("details: document content budget exceeded");
    // Reconstruct only after checking keys: new schema fields can never disappear
    // during an older consumer's save, and aliases cannot cross the draft boundary.
    return Object.freeze({ id: node.id, text, collapsed: node.collapsed,
      children: Object.freeze(Array.from(node.children, child => visit(child, depth + 1, floating))),
      ...(node.side === undefined ? {} : { side: node.side as "left" | "right" }),
      ...(node.style === undefined ? {} : { style: readMindMapStyle(node.style) }), ...(details ? { details } : {}) });
  }
  return visit;
}
