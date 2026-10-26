import { readMindMapDocument, type MindMapDocument, type MindMapNode } from "@quirekit/mind-map";
import type { SimpleTree } from "../vendor/types";
import { fromSimpleStyle, toSimpleStyle, simpleStyleKeys } from "./formatting";

import { fromSimpleDetails, toSimpleDetails, simpleDetailsKeys } from "./details";

export const simpleLayouts = { "mind-map": "mindMap", "logical-right": "logicalStructure", "logical-left": "logicalStructureLeft", organization: "organizationStructure", timeline: "timeline" } as const;

/**
 * Projects a validated canonical tree, preserving identity, order and collapsed descendants.
 * @param document - Source document.
 * @returns Independent mutable vendor tree.
 */
export function toSimpleTree(document: MindMapDocument): SimpleTree {
  /** @param node - Canonical subtree. @returns Vendor subtree without renderer state. */
  function visit(node: MindMapNode): SimpleTree {
    return { data: { uid: node.id, text: node.text, expand: !node.collapsed, richText: false,
      ...(node.side === undefined ? {} : { dir: node.side }), ...toSimpleStyle(node.style), ...toSimpleDetails(node.details) }, children: node.children.map(visit) };
  }
  const source = readMindMapDocument(document);
  const tree = visit(source.root);
  tree.data._quirekitLayout = source.layout;
  if (source.annotations) tree.data._quirekitAnnotations = structuredClone(source.annotations);
  if (source.version !== 1) {
    tree.data._quirekitVersion = source.version;
    tree.children.push(...source.floatingTopics!.map(topic => {
      const free = visit(topic.root);
      free.data._quirekitFree = { ...topic.position, side: topic.side };
      return free;
    }));
  }
  return tree;
}

/**
 * Checks a vendor record rather than silently discarding unsupported persistent fields.
 * @param value - Vendor data.
 * @param allowed - Known keys, including explicitly transient renderer metadata.
 * @returns Checked record.
 */
function record(value: unknown, allowed: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError("Invalid SimpleMindMap object");
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) throw new TypeError(`Unsupported SimpleMindMap field: ${key}`);
  }
  return value as Record<string, unknown>;
}

/**
 * Converts the admitted tree and layout; revision stays with the host session.
 * @param input - Vendor snapshot, never an arbitrary file import.
 * @param base - Canonical metadata captured when the editor opened.
 * @returns Detached validated source document.
 */
export function fromSimpleTree(input: unknown, base: MindMapDocument): MindMapDocument {
  let count = 0;
  const seen = new WeakSet<object>();
  /** @param candidate - Vendor subtree. @param depth - Tree depth. @returns Canonical candidate. */
  function visit(candidate: unknown, depth: number): unknown {
    if (++count > 10000 || depth > 64) throw new RangeError("SimpleMindMap tree budget exceeded");
    const node = record(candidate, ["data", "children", "smmVersion", "inserting"]);
    if (seen.has(node)) throw new TypeError("Repeated SimpleMindMap node");
    seen.add(node);
    const data = record(node.data, ["uid", "text", "expand", "richText", "isActive", "dir", "resetRichText", "_quirekitFree", "_quirekitVersion", "_quirekitLayout", "_quirekitAnnotations", ...simpleStyleKeys, ...simpleDetailsKeys]);
    if ((data._quirekitFree !== undefined && depth !== 1) || ((data._quirekitVersion !== undefined || data._quirekitLayout !== undefined || data._quirekitAnnotations !== undefined) && depth !== 0)) {
      throw new TypeError("Invalid forest carrier metadata");
    }
    if ((data.richText !== undefined && data.richText !== false) || data.resetRichText === true) {
      throw new TypeError("Rich text is not supported by the plain-text adapter");
    }
    if (data.expand !== undefined && typeof data.expand !== "boolean") throw new TypeError("Invalid expand state");
    if (!Array.isArray(node.children)) throw new TypeError("Invalid SimpleMindMap children");
    const style = fromSimpleStyle(data), details = fromSimpleDetails(data);
    return { id: data.uid, text: data.text, collapsed: data.expand === false,
      children: node.children.map(child => visit(child, depth + 1)),
      ...(data.dir === undefined ? {} : { side: data.dir }), ...(style ? { style } : {}), ...(details ? { details } : {}) };
  }
  const tree = record(input, ["data", "children", "smmVersion", "inserting"]);
  const data = record(tree.data, ["uid", "text", "expand", "richText", "isActive", "dir", "resetRichText", "_quirekitVersion", "_quirekitLayout", "_quirekitAnnotations", ...simpleStyleKeys, ...simpleDetailsKeys]);
  if (data._quirekitVersion !== undefined && ![2, 3, 4, 5, 6].includes(data._quirekitVersion as number)) throw new TypeError("Invalid forest version");
  const projected = visit(input, 0) as MindMapNode;
  const children = tree.children as { data: Record<string, unknown> }[];
  const floatingTopics = children.flatMap((child, index) => {
    if (!Object.hasOwn(child.data, "_quirekitFree")) return [];
    const position = record(child.data._quirekitFree, ["x", "y", "side"]);
    return [{ root: projected.children[index], position: { x: position.x, y: position.y }, side: position.side }];
  });
  if (floatingTopics.length && data._quirekitVersion === undefined) throw new TypeError("Missing forest version");
  const { floatingTopics: _previous, annotations: _annotations, ...metadata } = base;
  return readMindMapDocument({ ...metadata, version: data._quirekitVersion ?? 1,
    layout: data._quirekitLayout ?? base.layout,
    root: { ...projected, children: projected.children.filter((_, index) => !Object.hasOwn(children[index]!.data, "_quirekitFree")) },
    ...(data._quirekitVersion !== undefined ? { floatingTopics } : {}),
    ...(data._quirekitAnnotations !== undefined ? { annotations: data._quirekitAnnotations } : {}) });
}
