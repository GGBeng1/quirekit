import { describe, expect, it, vi } from "vitest";
import type { QuireHitTarget } from "../../../../layout";
import type { QuireLayoutSnapshot } from "../../../../editor-layout";
import type { QuireViewInteractionHit } from "../../../../view-graph";
import { collectQuireLayerTargetCandidatesAtPoint } from "./candidates";
import { hitTestQuireLayerTargetsAtPoint } from "./resolve";

describe("retained layer target identity lookup", () => {
  it("does not revisit omitted targets on repeated queries of one snapshot", () => {
    const omittedId = vi.fn(() => "omitted");
    const retained = createTarget("retained");
    const snapshot = createSnapshot([
      retained,
      { ...createTarget("omitted"), get id() { return omittedId(); } }
    ]);
    const first = collect(snapshot);
    expect(first.candidates.map(({ target }) => target)).toEqual([retained]);
    expect(omittedId).toHaveBeenCalledTimes(1);
    omittedId.mockClear();

    for (let index = 0; index < 8; index += 1) {
      expect(collect(snapshot)).toEqual(first);
    }
    expect(omittedId).not.toHaveBeenCalled();
  });

  it("rebuilds for a replacement snapshot even when document and ids are shared", () => {
    const first = createSnapshot([createTarget("retained")]);
    expect(collect(first).candidates).toHaveLength(1);
    const replacement = createTarget("retained", 200);
    const next = { ...first, hitTargets: [replacement] };
    expect(collect(next).candidates).toEqual([]);
    expect(collectQuireLayerTargetCandidatesAtPoint({ snapshot: next, point: { x: 201, y: 1 } })
      .candidates[0]?.target).toBe(replacement);
    expect(collect(first).candidates[0]?.target).toBe(first.hitTargets[0]);
  });

  it("preserves duplicate-id precedence and does not share mutable query results", () => {
    const first = createTarget("retained", 200);
    const last = createTarget("retained");
    const snapshot = createSnapshot([first, last]);
    const result = collect(snapshot);
    expect(result.candidates[0]?.target).toBe(last);
    const candidates = result.candidates as Array<typeof result.candidates[number]>;
    candidates.pop();
    expect(collect(snapshot).candidates[0]?.target).toBe(last);
  });

  it("does not retain an obsolete map when the target array is replaced", () => {
    const snapshot = createSnapshot([createTarget("retained")]);
    expect(collect(snapshot).candidates).toHaveLength(1);
    const replacement = createTarget("retained", 200);
    Object.assign(snapshot, { hitTargets: [replacement] });

    expect(collect(snapshot).candidates).toEqual([]);
    expect(collectQuireLayerTargetCandidatesAtPoint({ snapshot, point: { x: 201, y: 1 } })
      .candidates[0]?.target).toBe(replacement);
  });

  it("preserves the unindexed fallback and its diagnostics", () => {
    const snapshot = createSnapshot([createTarget("retained"), createTarget("omitted")]);
    const { layerTargetIndex: _index, ...unindexed } = snapshot;
    const result = collect(unindexed);
    expect(result.candidates).toHaveLength(2);
    expect(result.layerTargetIndexQuery).toEqual({
      targetIds: ["retained", "omitted"],
      buckets: [],
      unbucketedTargetIds: ["retained", "omitted"],
      source: "unindexed-layer-target-scan"
    });
  });

  it.each([false, true])("preserves empty routing diagnostics with indexed=%s", (indexed) => {
    const snapshot = createSnapshot([]);
    const { layerTargetIndex: _index, ...unindexed } = snapshot;
    const options = { snapshot: indexed ? snapshot : unindexed, point: { x: 1, y: 1 } };
    expect(hitTestQuireLayerTargetsAtPoint(options)).toEqual({
      hit: null,
      layerHitChain: [],
      targetChain: [],
      layerTargetIndexQuery: collectQuireLayerTargetCandidatesAtPoint(options).layerTargetIndexQuery
    });
  });

  it("keeps structural target hits free of absent interaction facts", () => {
    const result = hitTestQuireLayerTargetsAtPoint({
      snapshot: createSnapshot([createTarget("retained")]),
      point: { x: 1, y: 1 }
    });
    expect(result.hit).toMatchObject({ kind: "position", position: { pos: 0, bias: 1 } });
    expect(result.hit).not.toHaveProperty("interactionHit");
    expect(result.hit).not.toHaveProperty("viewRegion");
  });

  it.each([[false, false], [true, false], [false, true], [true, true]])(
    "preserves explicit hit facts independently: layer=%s, pointerPolicy=%s",
    (explicitLayer, explicitPolicy) => {
      const layer = { plane: "controls", zIndex: 7 } as const;
      const pointerPolicy = { kind: "focus-only", shouldFocusEditor: false } as const;
      const interactionHit: QuireViewInteractionHit = {
        kind: "control",
        controlId: "retained",
        region: { rootId: { value: "body" }, regionId: { value: "control" }, kind: "control" },
        ...(explicitLayer ? { layer } : {}),
        ...(explicitPolicy ? { pointerPolicy } : {})
      };
      const target = { ...createTarget("retained"), interactionHit };
      const before = { ...interactionHit };
      const result = hitTestQuireLayerTargetsAtPoint({
        snapshot: createSnapshot([target]),
        point: { x: 1, y: 1 }
      });
      expect(result.hit).toMatchObject({
        interactionHit: {
          ...interactionHit,
          layer: explicitLayer ? layer : target.layer,
          pointerPolicy: explicitPolicy ? pointerPolicy : { kind: "dispatch" }
        }
      });
      expect(interactionHit).toEqual(before);
    }
  );
});

/**
 * @param snapshot - Published retained layout product.
 * @returns Exact candidates for the first target's original rectangle.
 */
function collect(snapshot: QuireLayoutSnapshot) {
  return collectQuireLayerTargetCandidatesAtPoint({ snapshot, point: { x: 1, y: 1 } });
}

/**
 * @param id - Stable target identity.
 * @param x - Current horizontal geometry origin.
 * @returns A routable target with no browser or editor state.
 */
function createTarget(id: string, x = 0): QuireHitTarget {
  return {
    id,
    range: { from: 0, to: 1 },
    rect: { x, y: 0, width: 10, height: 10 },
    layer: { plane: "floating-ui" }
  };
}

/**
 * @param hitTargets - Immutable retained targets published with this snapshot.
 * @returns Minimal product with an index deliberately omitting one target.
 */
function createSnapshot(hitTargets: readonly QuireHitTarget[]): QuireLayoutSnapshot {
  const rect = { x: 0, y: 0, width: 300, height: 100 };
  return {
    state: {} as QuireLayoutSnapshot["state"],
    documentRect: rect,
    viewportRect: rect,
    domOverlays: [],
    hitTargets,
    layerTargetIndex: {
      buckets: [],
      unbucketedTargetIds: ["retained"],
      targetCount: 1
    },
    root: { id: "root", kind: "block", rect, range: { from: 0, to: 1 }, children: [] }
  };
}
