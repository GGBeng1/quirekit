import type { Node as PMNode } from "@quirekit/pm";
import type { BlockInteractionOptions } from "../types";
import type { ScopeBlockEntry } from "./types";

const owners = new WeakMap<BlockInteractionOptions, WeakMap<PMNode, readonly ScopeBlockEntry[]>>();

/**
 * Reuses unchanged scope subtrees across attribute and sibling edits.
 * @param parent - Immutable direct-block container.
 * @param options - Owning feature configuration.
 * @returns Direct block and explicitly declared scope entries, without opening descendants.
 */
export function readScopeBlockEntries(parent: PMNode, options: BlockInteractionOptions): readonly ScopeBlockEntry[] {
  let scopes = owners.get(options);
  if (!scopes) { scopes = new WeakMap(); owners.set(options, scopes); }
  const cached = scopes.get(parent);
  if (cached) return cached;
  const result: ScopeBlockEntry[] = [];
  parent.forEach((node, offset, order) => {
    const blockId = node.attrs.blockId;
    if ((options.types.includes(node.type.name) || options.scopes.includes(node.type.name)) && typeof blockId === "string" && blockId) result.push({ node, blockId, order, offset });
  });
  scopes.set(parent, result);
  return result;
}
