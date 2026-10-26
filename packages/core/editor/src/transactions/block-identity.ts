import { AttrStep, type Transaction } from "@quirekit/pm";

/**
 * Recognizes initial, non-content block identity allocation by inspecting every step.
 * Arbitrary metadata cannot exempt a content edit from revision compilation.
 * @param transaction - Candidate initial normalization.
 * @returns Whether all steps only fill missing schema-declared interaction IDs.
 */
export function isQuireBlockIdentityInitialization(transaction: Transaction): boolean {
  return transaction.steps.length > 0 && transaction.steps.every((step, index) => {
    if (!(step instanceof AttrStep) || step.attr !== "blockId" || typeof step.value !== "string" || !step.value) return false;
    const node = transaction.docs[index]?.nodeAt(step.pos);
    return node !== undefined && node !== null && "blockId" in node.attrs && node.attrs.blockId === null;
  });
}
