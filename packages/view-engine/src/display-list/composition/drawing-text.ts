import type { QuireLayoutSnapshot } from "../../editor-layout";
import type { QuireLayoutNode } from "../../layout";

type QuireLayerContribution = NonNullable<
  QuireLayoutSnapshot["layerContributions"]
>[number];

/** Resolves and consumes the story root paired with one accepted object shell. */
export type QuireDrawingTextContentRootResolver = (
  contribution: QuireLayerContribution
) => QuireLayoutNode | undefined;

/**
 * Indexes attached drawing-text roots by logical object and page occurrence.
 *
 * The story remains an independent layout authority. This index only binds its
 * paint commands to the accepted shell occurrence so one object crosses the
 * canonical layer stack as an atomic content group.
 *
 * @param roots - Attached drawing-text roots in stable occurrence order.
 * @returns Resolver that consumes at most one matching root per contribution.
 */
export function createQuireDrawingTextContentRootResolver(
  roots: readonly QuireLayoutNode[]
): QuireDrawingTextContentRootResolver {
  const rootsByOccurrence = new Map<string, QuireLayoutNode[]>();

  for (const root of roots) {
    const key = createDrawingTextRootOccurrenceKey(root);
    if (key === null) {
      continue;
    }
    const candidates = rootsByOccurrence.get(key);
    if (candidates === undefined) {
      rootsByOccurrence.set(key, [root]);
    } else {
      candidates.push(root);
    }
  }

  return (contribution) => {
    const key = createContributionOccurrenceKey(contribution);
    if (key === null) {
      return undefined;
    }
    return rootsByOccurrence.get(key)?.shift();
  };
}

/**
 * Creates the shell-side object occurrence key.
 *
 * @param contribution - Candidate retained layer contribution.
 * @returns Object/page key, or null for a non-object contribution.
 */
function createContributionOccurrenceKey(
  contribution: QuireLayerContribution
): string | null {
  const region = contribution.owner.region;
  const prefix = "region:anchored-object:";
  if (region.kind !== "floating-object" || !region.regionId.value.startsWith(prefix)) {
    return null;
  }
  return createOccurrenceKey(
    region.regionId.value.slice(prefix.length),
    region.visualInstanceId
  );
}

/**
 * Creates the story-side object occurrence key.
 *
 * @param root - Candidate attached drawing-text root.
 * @returns Object/page key, or null for unrelated layout content.
 */
function createDrawingTextRootOccurrenceKey(
  root: QuireLayoutNode
): string | null {
  const region = root.layoutOwner?.region;
  const prefix = "root:word-drawing-text:";
  if (region?.kind !== "drawing-text" || !region.rootId.value.startsWith(prefix)) {
    return null;
  }
  return createOccurrenceKey(
    region.rootId.value.slice(prefix.length),
    region.visualInstanceId
  );
}

/**
 * Combines logical object identity with the page-local occurrence.
 *
 * @param objectId - Stable drawing object identity.
 * @param visualInstanceId - Optional occurrence identity supplied by pagination.
 * @returns Stable paint-composition key.
 */
function createOccurrenceKey(
  objectId: string,
  visualInstanceId: string | undefined
): string {
  const pageMatch = visualInstanceId?.match(/(?:^|:)page:(\d+)(?::|$)/u);
  return `${objectId}\u0000${pageMatch?.[1] ?? "continuous"}`;
}
