import { isPlainObject, truncate } from "./preview";

/**
 * Reads slice JSON from a step JSON object.
 *
 * @param json - Step JSON object.
 * @returns Slice JSON object when present.
 */
export function readSliceJson(
  json: Record<string, unknown>
): Record<string, unknown> | undefined {
  return isPlainObject(json.slice) ? json.slice : undefined;
}

/**
 * Collects node type names from a slice JSON object.
 *
 * @param sliceJson - Slice JSON object.
 * @returns Node type names.
 */
export function collectSliceNodeTypes(
  sliceJson: Record<string, unknown> | undefined
): readonly string[] {
  const seen = new Set<string>();
  visitSliceNodes(sliceJson, (node) => {
    if (typeof node.type === "string") {
      seen.add(node.type);
    }
  });
  return [...seen];
}

/**
 * Collects a short text preview from a slice JSON object.
 *
 * @param sliceJson - Slice JSON object.
 * @returns Text preview when available.
 */
export function collectSliceTextPreview(
  sliceJson: Record<string, unknown> | undefined
): string | undefined {
  let text = "";
  visitSliceNodes(sliceJson, (node) => {
    if (typeof node.text === "string") {
      text += node.text;
    }
  });
  return text ? truncate(text) : undefined;
}

/**
 * Visits node JSON objects in a slice.
 *
 * @param value - JSON value to inspect.
 * @param visitor - Visitor called for each node-like object.
 */
function visitSliceNodes(
  value: unknown,
  visitor: (node: Record<string, unknown>) => void
): void {
  if (!isPlainObject(value)) {
    return;
  }

  const content = value.content;
  if (!Array.isArray(content)) {
    return;
  }

  for (const child of content) {
    if (isPlainObject(child)) {
      visitor(child);
      visitSliceNodes(child, visitor);
    }
  }
}
