import { validateQuireViewGraphPerformanceContract } from "./performance";
import type {
  QuireLayoutRegion,
  QuireLayoutRegionAddress,
  QuireLayoutRoot
} from "@quirekit/layout/identity";
import type {
  QuireViewGraphSnapshot,
  QuireViewGraphValidationIssue,
  QuireViewGraphValidationResult
} from "./types";

/**
 * Validates canonical retained view graph invariants.
 *
 * @param snapshot - Retained view graph snapshot to validate.
 * @returns Validation result with deterministic issues.
 */
export function validateQuireViewGraphSnapshot(
  snapshot: QuireViewGraphSnapshot
): QuireViewGraphValidationResult {
  const issues: QuireViewGraphValidationIssue[] = [];
  const rootIds = new Set<string>();
  const regionKeys = new Set<string>();

  validateQuireViewGraphPerformanceContract(snapshot.performance, issues);

  for (const root of snapshot.roots) {
    validateRoot(root, rootIds, issues);
  }

  for (const region of snapshot.regions) {
    validateRegion(region, rootIds, regionKeys, issues);
  }

  for (const region of snapshot.regions) {
    validateParentRegion(region, regionKeys, issues);
  }

  return {
    valid: issues.length === 0,
    issues
  };
}

/**
 * Validates root-local invariants and records root ids.
 *
 * @param root - Root to validate.
 * @param rootIds - Mutable set of root ids seen so far.
 * @param issues - Mutable issue list.
 */
function validateRoot(
  root: QuireLayoutRoot,
  rootIds: Set<string>,
  issues: QuireViewGraphValidationIssue[]
): void {
  const rootId = root.id.value;

  if (rootId.length === 0) {
    issues.push({
      code: "empty-root-id",
      message: "View graph root id must not be empty.",
      rootId: root.id
    });
  }

  if (root.source.sourceId.length === 0) {
    issues.push({
      code: "empty-source-id",
      message: "View graph root source id must not be empty.",
      rootId: root.id
    });
  }

  if (rootIds.has(rootId)) {
    issues.push({
      code: "duplicate-root",
      message: `View graph root id "${rootId}" is duplicated.`,
      rootId: root.id
    });
    return;
  }

  rootIds.add(rootId);
}

/**
 * Validates region-local invariants and records region keys.
 *
 * @param region - Region to validate.
 * @param rootIds - Root ids known to this snapshot.
 * @param regionKeys - Mutable set of region keys seen so far.
 * @param issues - Mutable issue list.
 */
function validateRegion(
  region: QuireLayoutRegion,
  rootIds: ReadonlySet<string>,
  regionKeys: Set<string>,
  issues: QuireViewGraphValidationIssue[]
): void {
  const rootId = region.ref.rootId.value;
  const regionId = region.ref.regionId.value;
  const regionKey = createRegionKey(region.ref);

  if (regionId.length === 0) {
    issues.push({
      code: "empty-region-id",
      message: "View graph region id must not be empty.",
      rootId: region.ref.rootId,
      regionId: region.ref.regionId
    });
  }

  if (region.source !== undefined && region.source.sourceId.length === 0) {
    issues.push({
      code: "empty-source-id",
      message: "View graph region source id must not be empty.",
      rootId: region.ref.rootId,
      regionId: region.ref.regionId
    });
  }

  if (!rootIds.has(rootId)) {
    issues.push({
      code: "missing-region-root",
      message: `View graph region "${regionId}" references missing root "${rootId}".`,
      rootId: region.ref.rootId,
      regionId: region.ref.regionId
    });
  }

  if (regionKeys.has(regionKey)) {
    issues.push({
      code: "duplicate-region",
      message: `View graph region key "${regionKey}" is duplicated.`,
      rootId: region.ref.rootId,
      regionId: region.ref.regionId
    });
    return;
  }

  regionKeys.add(regionKey);
}

/**
 * Validates that parent region references point at retained regions.
 *
 * @param region - Region whose parent should be validated.
 * @param regionKeys - Region keys known to this snapshot.
 * @param issues - Mutable issue list.
 */
function validateParentRegion(
  region: QuireLayoutRegion,
  regionKeys: ReadonlySet<string>,
  issues: QuireViewGraphValidationIssue[]
): void {
  if (region.ref.parentRegion === undefined) {
    return;
  }

  const parentRegionKey = createRegionKey(region.ref.parentRegion);

  if (regionKeys.has(parentRegionKey)) {
    return;
  }

  issues.push({
    code: "missing-parent-region",
    message: `View graph region "${region.ref.regionId.value}" references missing parent region "${region.ref.parentRegion.regionId.value}".`,
    rootId: region.ref.rootId,
    regionId: region.ref.regionId
  });
}

/**
 * Creates a snapshot-unique region key.
 *
 * @param rootId - Root id that owns the region.
 * @param regionId - Region id inside the root.
 * @returns Stable region key used for validation.
 */
function createRegionKey(region: QuireLayoutRegionAddress): string {
  return `${region.rootId.value}:${region.regionId.value}:${region.visualInstanceId ?? ""}`;
}
