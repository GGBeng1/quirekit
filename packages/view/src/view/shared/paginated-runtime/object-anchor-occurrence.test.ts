import type { QuireInteractionSelectionTarget } from "@quirekit/view-engine";
import { describe, expect, it } from "vitest";
import { resolveMountedObjectAnchorOccurrence } from "./object-anchor-occurrence";

const repeatedObjectTarget = createObjectTarget(
  "picture:header-logo",
  "page:2:header-default"
);

describe("mounted object anchor occurrence", () => {
  it("preserves an explicit caller occurrence", () => {
    const occurrence = Object.freeze({ targetId: "object:picture:header-logo" });

    expect(resolveMountedObjectAnchorOccurrence(
      "picture:header-logo",
      occurrence,
      createObjectTarget("another-picture", "page:1:header-default")
    )).toBe(occurrence);
  });

  it("infers the visual occurrence only from the matching object target", () => {
    expect(resolveMountedObjectAnchorOccurrence(
      "picture:header-logo",
      undefined,
      repeatedObjectTarget
    )).toEqual({ visualInstanceId: "page:2:header-default" });

    expect(resolveMountedObjectAnchorOccurrence(
      "another-picture",
      undefined,
      repeatedObjectTarget
    )).toBeUndefined();
  });

  it("keeps resolution ambiguous without retained visual identity", () => {
    expect(resolveMountedObjectAnchorOccurrence(
      "picture:header-logo",
      undefined,
      createObjectTarget("picture:header-logo", undefined)
    )).toBeUndefined();
    expect(resolveMountedObjectAnchorOccurrence(
      "picture:header-logo",
      undefined,
      null
    )).toBeUndefined();
  });
});

/**
 * Creates one retained object target for occurrence-selection tests.
 *
 * @param objectId - Stable object identity carried by the hit.
 * @param visualInstanceId - Optional repeated visual occurrence.
 * @returns Complete retained object selection target.
 */
function createObjectTarget(
  objectId: string,
  visualInstanceId: string | undefined
): QuireInteractionSelectionTarget {
  const region = {
    rootId: { value: "root:header" },
    regionId: { value: "region:picture" },
    kind: "floating-object" as const,
    ...(visualInstanceId === undefined ? {} : { visualInstanceId })
  };
  return {
    domain: "object",
    commandTarget: "media",
    hitKind: "object",
    region,
    interactionHit: { kind: "object", region, objectId }
  };
}
