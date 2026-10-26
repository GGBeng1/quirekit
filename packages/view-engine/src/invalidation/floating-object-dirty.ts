import {
  type Node as ProseMirrorNode,
  type Transaction
} from "@quirekit/pm";
import {
  readQuireStepJson,
  readQuireTransactionPreviousDocs
} from "./transaction-steps";
import type {
  QuireFloatingObjectLayoutDirtyTarget,
  QuireInvalidationIdentityGap,
  QuireLayoutDirtyReason
} from "./types";
import type { QuireDrawingModelProfile } from "../document-profile/types";


/** Floating-object classification resolved from transaction source identity. */
export interface QuireFloatingObjectDirtyClassification {
  /** Canonical dirty reason selected for the transaction. */
  readonly reason: Extract<QuireLayoutDirtyReason, "floating-object-placement" | "fallback">;
  /** Exact local target when same-anchor identity is proven. */
  readonly floatingObjectTarget?: QuireFloatingObjectLayoutDirtyTarget | undefined;
  /** Explicit reason that local identity could not be proven. */
  readonly identityGaps?: readonly QuireInvalidationIdentityGap[] | undefined;
}

/** Immutable identity read from one Word floating-object atom. */
interface QuireFloatingObjectIdentity {
  /** Stable source object identity. */
  readonly objectId: string;
  /** Stable drawing payload identity. */
  readonly drawingId: string;
}

/** Before/after evidence for one transaction step touching a floating anchor. */
interface QuireFloatingObjectStepEvidence {
  /** Position inspected in the step's coordinate space. */
  readonly position: number;
  /** Anchor identity before the step, when the step removes or replaces one. */
  readonly before?: QuireFloatingObjectIdentity | undefined;
  /** Anchor identity after the step, when the step inserts or replaces one. */
  readonly after?: QuireFloatingObjectIdentity | undefined;
}

/**
 * Classifies floating-object updates without mistaking atom markup changes
 * for an unbounded structural edit.
 *
 * Every changing step must prove the same immutable anchor at the same position
 * before the batch can stay local. Delete-plus-insert relocation remains broad
 * until the retained graph can name both mapped flow owners.
 *
 * @param transactions - Transactions folded into one layout update.
 * @param drawingModel - Drawing model identifying anchor nodes.
 * @returns Local placement identity, explicit fallback, or undefined when no floating anchor is touched.
 */
export function deriveQuireFloatingObjectDirtyClassification(
  transactions: readonly Transaction[],
  drawingModel: QuireDrawingModelProfile
): QuireFloatingObjectDirtyClassification | undefined {
  const evidence: QuireFloatingObjectStepEvidence[] = [];
  let stepCount = 0;

  for (const transaction of transactions) {
    if (!transaction.docChanged) {
      continue;
    }
    const previousDocs = readQuireTransactionPreviousDocs(transaction);
    for (let index = 0; index < transaction.steps.length; index += 1) {
      stepCount += 1;
      const beforeDoc = asProseMirrorNode(previousDocs[index]);
      const afterDoc = asProseMirrorNode(previousDocs[index + 1]) ?? transaction.doc;
      const stepEvidence = readFloatingObjectStepEvidence(transaction.steps[index], beforeDoc, afterDoc, drawingModel);
      if (stepEvidence !== undefined) {
        evidence.push(stepEvidence);
      }
    }
  }

  if (evidence.length === 0) {
    return undefined;
  }

  const exact = resolveExactSameAnchorEvidence(evidence, stepCount);
  if (exact !== undefined) {
    return {
      reason: "floating-object-placement",
      floatingObjectTarget: {
        ...exact.identity,
        anchorPosition: exact.position,
        reason: "wrap-placement"
      }
    };
  }

  const relocation = evidence.some((removed) => {
    const removedIdentity = removed.before;
    return removedIdentity !== undefined
      && evidence.some((inserted) =>
        inserted.after !== undefined
        && inserted.position !== removed.position
        && areFloatingObjectIdentitiesEqual(removedIdentity, inserted.after)
      );
  });
  const gap: QuireInvalidationIdentityGap = relocation
    ? {
        code: "floating-object-relocation-unresolved",
        message: "Floating-object relocation does not yet prove both mapped flow-owner dependencies."
      }
    : {
        code: "floating-object-identity-unresolved",
        message: "Floating-object transaction steps do not prove one unchanged anchor identity and position."
      };

  return { reason: "fallback", identityGaps: [gap] };
}

/**
 * Reads floating-anchor evidence at the exact position named by one step.
 *
 * @param step - ProseMirror step to inspect.
 * @param beforeDoc - Document before the step.
 * @param afterDoc - Document after the step.
 * @param drawingModel - Drawing model identifying anchor nodes.
 * @returns Evidence when either side owns a floating anchor.
 */
function readFloatingObjectStepEvidence(
  step: unknown,
  beforeDoc: ProseMirrorNode | undefined,
  afterDoc: ProseMirrorNode,
  drawingModel: QuireDrawingModelProfile
): QuireFloatingObjectStepEvidence | undefined {
  const json = readQuireStepJson(step);
  const position = readStepPosition(step, json);
  if (position === undefined) {
    return undefined;
  }
  const before = readFloatingObjectIdentity(beforeDoc?.nodeAt(position), drawingModel);
  const after = readFloatingObjectIdentity(afterDoc.nodeAt(position), drawingModel);

  return before === undefined && after === undefined
    ? undefined
    : {
        position,
        ...(before === undefined ? {} : { before }),
        ...(after === undefined ? {} : { after })
      };
}

/**
 * Resolves a batch in which every step replaces the same anchor in place.
 *
 * @param evidence - Floating-object evidence collected in step order.
 * @param stepCount - Total changing steps in the batch.
 * @returns Final exact position and identity when local invalidation is safe.
 */
function resolveExactSameAnchorEvidence(
  evidence: readonly QuireFloatingObjectStepEvidence[],
  stepCount: number
): { readonly position: number; readonly identity: QuireFloatingObjectIdentity } | undefined {
  if (evidence.length !== stepCount) {
    return undefined;
  }
  const first = evidence[0];
  if (
    first?.before === undefined
    || first.after === undefined
    || !areFloatingObjectIdentitiesEqual(first.before, first.after)
  ) {
    return undefined;
  }
  const identity = first.after;
  if (!evidence.every((entry) =>
    entry.before !== undefined
    && entry.after !== undefined
    && entry.position === first.position
    && areFloatingObjectIdentitiesEqual(entry.before, identity)
    && areFloatingObjectIdentitiesEqual(entry.after, identity)
  )) {
    return undefined;
  }

  return { position: first.position, identity };
}

/**
 * Reads immutable identity from a drawing-model anchor node.
 *
 * @param node - Candidate source node.
 * @param drawingModel - Drawing model identifying and reading anchor nodes.
 * @returns Object and drawing ids when the node is a valid anchor.
 */
function readFloatingObjectIdentity(
  node: ProseMirrorNode | null | undefined,
  drawingModel: QuireDrawingModelProfile
): QuireFloatingObjectIdentity | undefined {
  const object = node == null || node.type.name !== drawingModel.anchorNodeType
    ? undefined
    : drawingModel.readObject(node.attrs);
  return object === undefined ? undefined : { objectId: object.objectId, drawingId: object.drawing.drawingId };
}

/**
 * Reads the position field shared by replace and attribute steps.
 *
 * @param step - Runtime step object.
 * @param json - Serialized step fields.
 * @returns Exact step position when available.
 */
function readStepPosition(
  step: unknown,
  json: Record<string, unknown>
): number | undefined {
  const candidate = (step as { readonly pos?: unknown; readonly from?: unknown }).pos
    ?? (step as { readonly from?: unknown }).from
    ?? json.pos
    ?? json.from;

  return typeof candidate === "number" ? candidate : undefined;
}

/**
 * Narrows one transaction document retained as unknown.
 *
 * @param value - Candidate ProseMirror document.
 * @returns Node-like document when it exposes `nodeAt`.
 */
function asProseMirrorNode(value: unknown): ProseMirrorNode | undefined {
  return typeof (value as { readonly nodeAt?: unknown } | null)?.nodeAt === "function"
    ? value as ProseMirrorNode
    : undefined;
}

/**
 * Compares immutable Word floating-object identity.
 *
 * @param left - First identity.
 * @param right - Second identity.
 * @returns Whether both object and drawing ids match.
 */
function areFloatingObjectIdentitiesEqual(
  left: QuireFloatingObjectIdentity,
  right: QuireFloatingObjectIdentity
): boolean {
  return left.objectId === right.objectId && left.drawingId === right.drawingId;
}
