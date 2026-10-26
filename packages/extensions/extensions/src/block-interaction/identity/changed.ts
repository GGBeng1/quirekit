import { AddMarkStep, AddNodeMarkStep, AttrStep, DocAttrStep, RemoveMarkStep, RemoveNodeMarkStep, ReplaceStep, type Transaction } from "@quirekit/pm";

/**
 * Proves that accepted steps cannot introduce, remove, split or rename block identities.
 * Unknown structural steps deliberately fall back to complete normalization.
 * @param transactions - Accepted root and owner append transactions.
 * @returns Whether every changed step preserves the existing identity topology.
 */
export function preservesBlockIdentityTopology(transactions: readonly Transaction[]): boolean {
  return transactions.length > 0 && transactions.every(transaction => transaction.steps.every((step, index) => {
    if (step instanceof AddMarkStep || step instanceof RemoveMarkStep || step instanceof AddNodeMarkStep || step instanceof RemoveNodeMarkStep || step instanceof DocAttrStep) return true;
    if (step instanceof AttrStep) return step.attr !== "blockId";
    if (!(step instanceof ReplaceStep) || step.slice.openStart || step.slice.openEnd) return false;
    const before = transaction.docs[index]!;
    const from = before.resolve(step.from), to = before.resolve(step.to);
    if (!from.sameParent(to) || !from.parent.inlineContent) return false;
    let inline = true;
    step.slice.content.forEach(node => { if (!node.isInline) inline = false; });
    return inline;
  }));
}
