import { Fragment, Mapping, Slice, type Node as PMNode, type Transaction } from "@quirekit/pm";
import type { BlockInteractionOptions } from "../types";
import { preservesBlockIdentityTopology } from "./changed";

const normalizedDocuments = new WeakMap<BlockInteractionOptions, WeakSet<PMNode>>();

/** @param doc - Source document. @param options - Declared types and scopes. @returns Identity-bearing nodes and positions. */
export function collectIdentityNodes(doc: PMNode, options: BlockInteractionOptions): readonly { node: PMNode; pos: number }[] {
  const result: { node: PMNode; pos: number }[] = [];
  /** @param parent - Parent to inspect. @param start - Its content start. */
  const visit = (parent: PMNode, start: number): void => {
    parent.forEach((node, offset) => {
      const pos = start + offset;
      if (options.types.includes(node.type.name) || options.scopes.includes(node.type.name)) result.push({ node, pos });
      if (options.scopes.includes(node.type.name)) visit(node, pos + 1);
    });
  };
  visit(doc, 0);
  return result;
}

/**
 * Repairs new identities while reserving mapped originals before new copies.
 * @param tr - Candidate identity-only append transaction.
 * @param options - Schema owners and allocator.
 * @param previous - Document before the accepted root action.
 * @param transactions - Accepted maps, including owner normalization.
 * @returns Whether identity changes were appended.
 */
export function normalizeBlockIdentities(tr: Transaction, options: BlockInteractionOptions, previous?: PMNode, transactions: readonly Transaction[] = []): boolean {
  let normalized = normalizedDocuments.get(options);
  if (!normalized) { normalized = new WeakSet(); normalizedDocuments.set(options, normalized); }
  // Once this exact feature owner has validated the document, ordinary typing
  // can prove identity stability from the accepted maps without enumerating it.
  if (previous && normalized.has(previous) && transactions[0]?.before === previous
    && transactions.at(-1)?.doc === tr.doc && preservesBlockIdentityTopology(transactions)) {
    normalized.add(tr.doc);
    return false;
  }
  const entries = collectIdentityNodes(tr.doc, options);
  const used = new Set<string>();
  const owners = new Map<string, number>();
  const mapping = new Mapping();
  for (const transaction of transactions) mapping.appendMapping(transaction.mapping);
  if (previous) {
    const atPosition = new Map(entries.map(entry => [entry.pos, entry.node]));
    for (const entry of collectIdentityNodes(previous, options)) {
      const id = entry.node.attrs.blockId;
      if (typeof id !== "string") continue;
      const mapped = mapping.mapResult(entry.pos, 1);
      if (!mapped.deleted && atPosition.get(mapped.pos)?.attrs.blockId === id) owners.set(id, mapped.pos);
    }
  }
  // Reserve existing IDs first, including moved nodes whose old positions were
  // deleted. Allocation cannot accidentally collide with a later sibling.
  for (const entry of entries) {
    const id = entry.node.attrs.blockId;
    if (typeof id === "string" && id) { used.add(id); if (!owners.has(id)) owners.set(id, entry.pos); }
  }
  for (const entry of entries) {
    const id = entry.node.attrs.blockId;
    if (typeof id === "string" && id && owners.get(id) === entry.pos) continue;
    let fresh = options.createId();
    let attempts = 0;
    while ((!fresh || used.has(fresh)) && attempts++ < 100) fresh = options.createId();
    if (!fresh || used.has(fresh)) throw new RangeError("Block identity allocator must return unique non-empty strings.");
    used.add(fresh);
    tr.setNodeAttribute(entry.pos, "blockId", fresh);
  }
  normalized.add(tr.doc);
  return tr.docChanged;
}

/** @param slice - Clipboard slice. @returns Copy without source block identities. */
export function stripBlockIdentities(slice: Slice): Slice {
  /** @param node - Clipboard subtree. @returns Same content without interaction identities. */
  const clean = (node: PMNode): PMNode => {
    if (node.isText) return node;
    const children: PMNode[] = [];
    node.forEach(child => children.push(clean(child)));
    const attrs = "blockId" in node.attrs ? { ...node.attrs, blockId: null } : node.attrs;
    return node.type.create(attrs, Fragment.from(children), node.marks);
  };
  const nodes: PMNode[] = [];
  slice.content.forEach(node => nodes.push(clean(node)));
  return new Slice(Fragment.from(nodes), slice.openStart, slice.openEnd);
}
