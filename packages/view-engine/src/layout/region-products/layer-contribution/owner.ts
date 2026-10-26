import type {
  QuireLayoutRegion,
  QuireLayoutRoot
} from "@quirekit/layout/identity";
import type { QuireRetainedRegionProductGap } from "../declaration/types";
import type { QuireRetainedLayerContributionDeclaration } from "./types";

/** Exact canonical owner resolved for one layer declaration. */
export interface QuireResolvedLayerContributionOwner {
  /** Enclosing canonical retained root. */
  readonly root: QuireLayoutRoot;
  /** Region occurrence matching root, region, and visual-instance identity. */
  readonly region: QuireLayoutRegion;
}

/** Producer facts attached to owner-resolution gaps. */
export interface QuireLayerContributionOwnerContext {
  /** Stable producer id, when valid. */
  readonly producerId?: string | undefined;
  /** Source kind, when valid. */
  readonly sourceKind?: string | undefined;
}

/**
 * Resolves exact root, region, and visual-instance ownership.
 *
 * @param declaration - Layer declaration carrying region occurrence identity.
 * @param root - Enclosing canonical retained root.
 * @param regions - Canonical retained region occurrences for the root.
 * @param context - Producer facts attached to gaps.
 * @param gaps - Mutable canonical gap sink.
 * @returns Exact canonical owner, or undefined when identity is incomplete.
 */
export function resolveQuireLayerContributionOwner(
  declaration: QuireRetainedLayerContributionDeclaration,
  root: QuireLayoutRoot | undefined,
  regions: readonly QuireLayoutRegion[],
  context: QuireLayerContributionOwnerContext,
  gaps: QuireRetainedRegionProductGap[]
): QuireResolvedLayerContributionOwner | undefined {
  if (root === undefined) {
    pushOwnerGap(
      "missing-layer-contribution-root",
      "Layer contribution requires an enclosing retained root.",
      declaration,
      context,
      gaps
    );
    return undefined;
  }
  const regionId = readIdentity(declaration.regionId);
  if (regionId === undefined) {
    pushOwnerGap(
      "missing-layer-contribution-region-id",
      "Layer contribution requires a retained region id.",
      declaration,
      context,
      gaps
    );
    return undefined;
  }
  const visualInstanceId = readIdentity(declaration.visualInstanceId);
  if (declaration.visualInstanceId !== undefined && visualInstanceId === undefined) {
    pushOwnerGap(
      "missing-layer-contribution-visual-instance",
      "Layer contribution visual-instance id cannot be blank.",
      declaration,
      context,
      gaps
    );
    return undefined;
  }

  // Candidate narrowing uses the full enclosing root and logical region before
  // matching the concrete visual occurrence; no region-id map can overwrite it.
  const candidates = regions.filter((region) =>
    region.ref.rootId.value === root.id.value
      && region.ref.regionId.value === regionId
  );
  if (candidates.length === 0) {
    pushOwnerGap(
      "missing-layer-contribution-region",
      "Layer contribution region does not exist under its retained root.",
      declaration,
      context,
      gaps
    );
    return undefined;
  }
  if (visualInstanceId === undefined && candidates.length !== 1) {
    pushOwnerGap(
      "missing-layer-contribution-visual-instance",
      "Layer contribution must identify one of multiple retained region occurrences.",
      declaration,
      context,
      gaps
    );
    return undefined;
  }
  const region = visualInstanceId === undefined
    ? candidates[0]
    : candidates.find((candidate) =>
        candidate.ref.visualInstanceId === visualInstanceId
  );
  if (region === undefined) {
    pushOwnerGap(
      "layer-contribution-visual-instance-mismatch",
      "Layer contribution visual instance does not match its retained region occurrence.",
      declaration,
      context,
      gaps
    );
    return undefined;
  }

  return { root, region };
}

/**
 * Reads one non-blank identity value.
 *
 * @param value - Candidate identity text.
 * @returns Trimmed identity, or undefined when absent or blank.
 */
function readIdentity(value: string | undefined): string | undefined {
  const text = value?.trim();
  return text === undefined || text.length === 0 ? undefined : text;
}

/**
 * Appends one owner-resolution gap.
 *
 * @param code - Stable owner gap code.
 * @param message - Human-readable diagnostic.
 * @param declaration - Rejected layer declaration.
 * @param context - Producer facts attached to the gap.
 * @param gaps - Mutable canonical gap sink.
 */
function pushOwnerGap(
  code: QuireRetainedRegionProductGap["code"],
  message: string,
  declaration: QuireRetainedLayerContributionDeclaration,
  context: QuireLayerContributionOwnerContext,
  gaps: QuireRetainedRegionProductGap[]
): void {
  gaps.push({
    code,
    message,
    ...context,
    ...(declaration.regionId === undefined ? {} : { regionId: declaration.regionId }),
    ...(declaration.contributionId === undefined
      ? {}
      : { contributionId: declaration.contributionId })
  });
}
