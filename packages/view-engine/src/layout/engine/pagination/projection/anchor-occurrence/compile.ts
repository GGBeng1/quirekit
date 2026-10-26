import { containsQuireDocumentRange } from "@quirekit/renderer";
import type { QuireLayoutOwnerFacts } from "@quirekit/layout/products";
import type {
  QuireInlineSourceVisualOccurrenceGap
} from "@quirekit/layout/inline";
import type { QuireLayoutAnchor } from "../../../types";
import { translateQuireLayoutAnchor } from "../translate";
import type {
  QuireInlineSourceOccurrenceProjection,
  QuireInlineSourceOccurrenceProjectionMode
} from "./types";

/** Result of compiling logical source anchors into concrete visual occurrences. */
export interface QuireInlineSourceOccurrenceCompileResult {
  /** Valid occurrence anchors in logical source and projection order. */
  readonly anchors: readonly QuireLayoutAnchor[];
  /** Invalid or unavailable source occurrences excluded from output. */
  readonly gaps: readonly QuireInlineSourceVisualOccurrenceGap[];
}

/** Input accepted by the page occurrence compiler. */
export interface QuireInlineSourceOccurrenceCompileInput {
  /** Logical single-occurrence anchors from source-flow layout. */
  readonly anchors: readonly QuireLayoutAnchor[];
  /** Concrete page or repeated-fragment projections. */
  readonly projections: readonly QuireInlineSourceOccurrenceProjection[];
  /** Missing-projection policy selected by complete or mounted projection. */
  readonly mode: QuireInlineSourceOccurrenceProjectionMode;
}

/**
 * Compiles logical anchors into exact page-local visual occurrences.
 *
 * Source order is the outer ordering authority and projection order is the
 * inner authority. Identity comes from source and projection facts, never from
 * rectangle equality or backend output.
 *
 * @param input - Logical anchors, concrete projections, and clipping mode.
 * @returns Valid visual occurrences and typed gaps.
 */
export function compileQuireInlineSourceVisualOccurrences(
  input: QuireInlineSourceOccurrenceCompileInput
): QuireInlineSourceOccurrenceCompileResult {
  const anchors: QuireLayoutAnchor[] = [];
  const gaps: QuireInlineSourceVisualOccurrenceGap[] = [];
  const occurrenceIds = new Set<string>();

  for (const anchor of input.anchors) {
    if (anchor.occurrence.kind !== "single") {
      gaps.push({
        code: "non-logical-source-anchor",
        sourceAnchorId: anchor.sourceAnchorId,
        message: `Source anchor "${anchor.sourceAnchorId}" is already a visual occurrence.`
      });
      continue;
    }

    const matches = input.projections.filter((projection) =>
      containsQuireDocumentRange(projection.sourceRange, anchor.range)
    );
    if (matches.length === 0) {
      if (input.mode === "complete") {
        gaps.push({
          code: "missing-page-occurrence",
          sourceAnchorId: anchor.sourceAnchorId,
          message: `Source anchor "${anchor.sourceAnchorId}" has no owning page occurrence.`
        });
      }
      continue;
    }

    for (const projection of matches) {
      const projected = projectAnchorOccurrence(anchor, projection, gaps);
      if (projected === null) {
        continue;
      }
      if (occurrenceIds.has(projected.id)) {
        gaps.push({
          code: "visual-instance-collision",
          sourceAnchorId: anchor.sourceAnchorId,
          pageIndex: projection.pageIndex,
          message: `Visual occurrence id "${projected.id}" is duplicated.`
        });
        continue;
      }
      occurrenceIds.add(projected.id);
      anchors.push(projected);
    }
  }

  return { anchors, gaps };
}

/**
 * Projects one logical anchor into one exact retained page occurrence.
 *
 * @param anchor - Logical source anchor in source-flow coordinates.
 * @param projection - Exact visual projection receiving the anchor.
 * @param gaps - Mutable typed-gap sink.
 * @returns Projected occurrence, or null when owner identity is incomplete.
 */
function projectAnchorOccurrence(
  anchor: QuireLayoutAnchor,
  projection: QuireInlineSourceOccurrenceProjection,
  gaps: QuireInlineSourceVisualOccurrenceGap[]
): QuireLayoutAnchor | null {
  if (!hasCompleteOwnerIdentity(anchor.owner)) {
    gaps.push({
      code: "invalid-owner-identity",
      sourceAnchorId: anchor.sourceAnchorId,
      pageIndex: projection.pageIndex,
      message: `Source anchor "${anchor.sourceAnchorId}" lacks exact source, root, or region identity.`
    });
    return null;
  }

  const visualInstanceId = createOwnerVisualInstanceId(anchor, projection);
  const owner: QuireLayoutOwnerFacts = {
    ...anchor.owner,
    region: {
      ...anchor.owner.region,
      visualInstanceId
    }
  };
  const translated = translateQuireLayoutAnchor(anchor, projection);
  return {
    ...translated,
    id: `${anchor.sourceAnchorId}:occurrence:${visualInstanceId}`,
    occurrence: {
      kind: "page",
      pageIndex: projection.pageIndex,
      visualInstanceId
    },
    placementReferences: {
      ...translated.placementReferences,
      column: projection.columnRect,
      margin: projection.marginRect,
      page: projection.pageRect
    },
    owner
  };
}

/**
 * Derives exact owner-occurrence identity from projection and logical owner.
 *
 * @param anchor - Logical source anchor with exact retained owner facts.
 * @param projection - Concrete projection occurrence.
 * @returns Stable snapshot-local visual-instance id.
 */
function createOwnerVisualInstanceId(
  anchor: QuireLayoutAnchor,
  projection: QuireInlineSourceOccurrenceProjection
): string {
  const region = anchor.owner.region;
  const logicalOwnerId = region.visualInstanceId
    ?? `${region.rootId.value}:${region.regionId.value}`;
  return `${projection.visualInstanceId}:${logicalOwnerId}`;
}

/**
 * Checks whether required owner facts are explicit and non-empty.
 *
 * @param owner - Retained owner facts carried by a logical source anchor.
 * @returns Whether occurrence identity can be derived without a fallback.
 */
function hasCompleteOwnerIdentity(owner: QuireLayoutOwnerFacts): boolean {
  return owner.source.sourceId.trim().length > 0
    && owner.region.rootId.value.trim().length > 0
    && owner.region.regionId.value.trim().length > 0;
}
