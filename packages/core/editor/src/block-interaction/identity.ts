/**
 * Projects node JSON or node vectors for identity-independent content comparison.
 * Only node attrs.blockId is omitted; marks and opaque attribute payloads remain
 * exact. This projection never mutates the document or a recorded endpoint.
 * @param value - Detached node, node vector, or non-node sentinel.
 * @returns A comparison value without interaction-only node identities.
 */
export function withoutBlockInteractionIdentity(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutBlockInteractionIdentity);
  if (value === null || typeof value !== "object") return value;
  const node = value as Record<string, unknown>;
  if (typeof node.type !== "string") return value;
  const attrs = node.attrs;
  return {
    ...node,
    ...(attrs !== null && typeof attrs === "object" && !Array.isArray(attrs)
      ? { attrs: Object.fromEntries(Object.entries(attrs).filter(([key]) => key !== "blockId")) }
      : {}),
    ...(Array.isArray(node.content) ? { content: node.content.map(withoutBlockInteractionIdentity) } : {})
  };
}
