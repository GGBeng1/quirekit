import { describe, expect, it, vi } from "vitest";
import { DragSession } from ".";
import type {
  EditorUIDragAutoScrollDecision,
  EditorUIDragIndicator,
  EditorUIDragTargetResolution
} from ".";
import { NodeRangeSelection } from "../node-range-selection";

describe("DragSession", () => {
  it("keeps the threshold armed across a geometry-only source refresh", () => {
    const fixture = createSessionFixture();
    fixture.session.arm(createArmInput());
    fixture.session.remapSource(createSelection(6));
    expect(fixture.session.state.phase).toBe("armed");
    expect(fixture.session.update({ ...createUpdateInput(3, 4), snapshotVersion: 6 })).toEqual({ status: "armed" });
    expect(fixture.resolveTarget).not.toHaveBeenCalled();
  });
  it("arms below the CSS-pixel threshold and targets only after crossing it", () => {
    const fixture = createSessionFixture();
    expect(fixture.session.arm(createArmInput())).toEqual({ status: "armed" });

    expect(fixture.session.update(createUpdateInput(3, 4))).toEqual({
      status: "armed"
    });
    expect(fixture.resolveTarget).not.toHaveBeenCalled();
    expect(fixture.indicators).toEqual([]);

    const decision: EditorUIDragAutoScrollDecision = {
      kind: "scroll",
      deltaX: 0,
      deltaY: 12,
      edges: ["block-end"]
    };
    expect(fixture.session.update(createUpdateInput(6, 0, decision))).toEqual({
      status: "targeting",
      target: createReadyTarget()
    });
    expect(fixture.resolveTarget).toHaveBeenCalledOnce();
    expect(fixture.indicators).toEqual([createIndicator()]);
    expect(fixture.autoScrollUpdates).toEqual([decision]);
    expect(fixture.lockAcquires).toHaveBeenCalledOnce();
  });

  it("commits only a typed drop intent and cleans every transient port", () => {
    const fixture = createSessionFixture();
    fixture.session.arm(createArmInput());
    fixture.session.update(createUpdateInput(8, 0, createAutoScrollDecision()));

    expect(fixture.session.drop({ pointerId: 4, snapshotVersion: 5 })).toEqual({
      status: "committed",
      intent: {
        kind: "drop",
        snapshotVersion: 5,
        source: {
          selection: createSelection().snapshot,
          payload: { blockKind: "paragraph" }
        },
        target: {
          identity: { rootId: "body", nodeId: "target" },
          placement: "before",
          payload: { targetPosition: 31 }
        }
      }
    });
    expect(fixture.session.state.phase).toBe("committed");
    expect(fixture.indicatorClears).toHaveBeenCalledOnce();
    expect(fixture.autoScrollStops).toHaveBeenCalledOnce();
    expect(fixture.lockReleases).toHaveBeenCalledOnce();
    expect(fixture.listenerReleases).toHaveBeenCalledOnce();
  });

  it("keeps rejected targets explicit and never reuses the previous indicator", () => {
    const targetResults: EditorUIDragTargetResolution<{ targetPosition: number }>[] = [
      createReadyTarget(),
      { status: "rejected", reason: "protected", snapshotVersion: 5 }
    ];
    const fixture = createSessionFixture(() => targetResults.shift()!);
    fixture.session.arm(createArmInput());
    fixture.session.update(createUpdateInput(8, 0));

    expect(fixture.session.update(createUpdateInput(9, 0))).toEqual({
      status: "targeting",
      target: { status: "rejected", reason: "protected", snapshotVersion: 5 }
    });
    expect(fixture.indicatorClears).toHaveBeenCalledOnce();
    expect(fixture.session.drop({ pointerId: 4, snapshotVersion: 5 })).toEqual({
      status: "rejected",
      reason: "protected"
    });
    expect(fixture.lockReleases).toHaveBeenCalledOnce();
  });

  it("rejects cross-root and stale resolver output before it becomes committable", () => {
    const crossRoot = createSessionFixture(() => ({
      ...createReadyTarget(),
      identity: { rootId: "header", nodeId: "target" }
    }));
    crossRoot.session.arm(createArmInput());
    expect(crossRoot.session.update(createUpdateInput(8, 0))).toEqual({
      status: "targeting",
      target: { status: "rejected", reason: "cross-root", snapshotVersion: 5 }
    });

    const stale = createSessionFixture(() => ({
      ...createReadyTarget(),
      snapshotVersion: 4
    }));
    stale.session.arm(createArmInput());
    expect(stale.session.update(createUpdateInput(8, 0))).toEqual({
      status: "cancelled",
      reason: "stale"
    });
    expect(stale.lockReleases).toHaveBeenCalledOnce();
  });

  it("ignores updates and drops from a pointer that does not own the session", () => {
    const fixture = createSessionFixture();
    fixture.session.arm(createArmInput());

    expect(fixture.session.update({
      ...createUpdateInput(8, 0),
      pointerId: 99
    })).toEqual({ status: "ignored" });
    expect(fixture.session.drop({ pointerId: 99, snapshotVersion: 5 }))
      .toEqual({ status: "ignored" });
    expect(fixture.session.state.phase).toBe("armed");
    expect(fixture.listenerReleases).not.toHaveBeenCalled();
  });

  it("cancels on outside, pointer cancel, Escape, and destroy with idempotent cleanup", () => {
    for (const cancel of [
      (session: DragSession<SourcePayload, TargetPayload>) =>
        session.update({ ...createUpdateInput(8, 0), insideDropZone: false }),
      (session: DragSession<SourcePayload, TargetPayload>) =>
        session.cancel("pointer-cancel"),
      (session: DragSession<SourcePayload, TargetPayload>) =>
        session.handleKey({ key: "Escape", isComposing: false }),
      (session: DragSession<SourcePayload, TargetPayload>) =>
        session.cancel("window-blur"),
      (session: DragSession<SourcePayload, TargetPayload>) =>
        session.cancel("view-destroy"),
      (session: DragSession<SourcePayload, TargetPayload>) =>
        session.destroy()
    ]) {
      const fixture = createSessionFixture();
      fixture.session.arm(createArmInput());
      fixture.session.update(createUpdateInput(8, 0, createAutoScrollDecision()));
      cancel(fixture.session);
      fixture.session.destroy();

      expect(fixture.indicatorClears).toHaveBeenCalledOnce();
      expect(fixture.autoScrollStops).toHaveBeenCalledOnce();
      expect(fixture.lockReleases).toHaveBeenCalledOnce();
      expect(fixture.listenerReleases).toHaveBeenCalledOnce();
    }
  });

  it("accepts a stable collaboration remap and cancels when source remap is stale", () => {
    const fixture = createSessionFixture();
    fixture.session.arm(createArmInput());
    fixture.session.update(createUpdateInput(8, 0, createAutoScrollDecision()));

    const remapped = fixture.session.remapSource(createSelection(6));
    expect(remapped).toEqual({ status: "remapped", snapshotVersion: 6 });
    expect(fixture.session.state).toMatchObject({
      phase: "dragging",
      snapshotVersion: 6
    });
    expect(fixture.indicatorClears).toHaveBeenCalledOnce();

    expect(fixture.session.update(createUpdateInput(9, 0))).toEqual({
      status: "cancelled",
      reason: "stale"
    });
    expect(fixture.lockReleases).toHaveBeenCalledOnce();
  });

  it("cancels and releases listeners when collaboration deletes a stable endpoint", () => {
    const fixture = createSessionFixture();
    fixture.session.arm(createArmInput());
    fixture.session.update(createUpdateInput(8, 0, createAutoScrollDecision()));

    const remap = createSelection().remap({
      snapshotVersion: 6,
      nodes: [{
        identity: { rootId: "body", nodeId: "target" },
        order: 0,
        range: { from: 1, to: 10 }
      }]
    });
    expect(fixture.session.remapSource(remap)).toEqual({
      status: "rejected",
      reason: "source-unavailable"
    });
    expect(fixture.session.state).toEqual({
      phase: "cancelled",
      reason: "source-remap-failed"
    });
    expect(fixture.indicatorClears).toHaveBeenCalledOnce();
    expect(fixture.autoScrollStops).toHaveBeenCalledOnce();
    expect(fixture.lockReleases).toHaveBeenCalledOnce();
    expect(fixture.listenerReleases).toHaveBeenCalledOnce();
  });

  it("fails closed when the preview lock cannot be acquired", () => {
    const listenerReleases = vi.fn();
    const resolveTarget = vi.fn(createReadyTarget);
    const session = new DragSession<SourcePayload, TargetPayload>({
      resolveTarget,
      lock: { acquire: () => false, release: vi.fn() },
      listeners: { release: listenerReleases }
    });

    expect(session.arm(createArmInput())).toEqual({
      status: "rejected",
      reason: "lock-unavailable"
    });
    expect(session.state).toEqual({
      phase: "cancelled",
      reason: "lock-unavailable"
    });
    expect(resolveTarget).not.toHaveBeenCalled();
    expect(listenerReleases).toHaveBeenCalledOnce();
  });
});

/** Source payload used by the typed drag fixture. */
interface SourcePayload {
  /** Source block kind forwarded without command semantics. */
  readonly blockKind: string;
}

/** Target payload used by the typed drag fixture. */
interface TargetPayload {
  /** Feature-owned canonical target position for a later command. */
  readonly targetPosition: number;
}

/**
 * Creates one stable source node range.
 *
 * @param snapshotVersion - Retained snapshot version for the range.
 * @returns Ready structural selection.
 */
function createSelection(snapshotVersion = 5): NodeRangeSelection {
  const result = NodeRangeSelection.create({
    snapshotVersion,
    writingDirection: "ltr",
    nodes: [
      { identity: { rootId: "body", nodeId: "source" }, order: 0, range: { from: 1, to: 10 } },
      { identity: { rootId: "body", nodeId: "target" }, order: 1, range: { from: 11, to: 20 } }
    ],
    anchor: { rootId: "body", nodeId: "source" },
    focus: { rootId: "body", nodeId: "source" }
  });
  if (result.status !== "ready") throw new Error(result.reason);
  return result.selection;
}

/**
 * Creates the typed arm input.
 *
 * @returns Drag arm input at the origin.
 */
function createArmInput() {
  return {
    pointerId: 4,
    pressClientPoint: { x: 0, y: 0 },
    source: {
      selection: createSelection(),
      payload: { blockKind: "paragraph" }
    }
  } as const;
}

/**
 * Creates one pointer update fixture.
 *
 * @param x - Client-space horizontal coordinate.
 * @param y - Client-space vertical coordinate.
 * @param autoScroll - Mounted auto-scroll decision.
 * @returns Typed pointer update.
 */
function createUpdateInput(
  x: number,
  y: number,
  autoScroll: EditorUIDragAutoScrollDecision = { kind: "idle" }
) {
  return {
    pointerId: 4,
    clientPoint: { x, y },
    documentPoint: { x: x + 100, y: y + 200 },
    snapshotVersion: 5,
    insideDropZone: true,
    autoScroll
  } as const;
}

/**
 * Creates one active mounted auto-scroll decision.
 *
 * @returns Typed block-end scroll decision.
 */
function createAutoScrollDecision(): Extract<
  EditorUIDragAutoScrollDecision,
  { readonly kind: "scroll" }
> {
  return {
    kind: "scroll",
    deltaX: 0,
    deltaY: 12,
    edges: ["block-end"]
  };
}

/**
 * Creates one authoritative indicator fixture.
 *
 * @returns Document-space line indicator.
 */
function createIndicator(): EditorUIDragIndicator {
  return {
    kind: "line",
    coordinateSpace: "document",
    snapshotVersion: 5,
    placement: "before",
    rect: { x: 10, y: 20, width: 100, height: 2 },
    sourceTargetIds: ["target-hit"]
  };
}

/**
 * Creates one ready target fixture.
 *
 * @returns Ready command-neutral target.
 */
function createReadyTarget(): Extract<
  EditorUIDragTargetResolution<TargetPayload>,
  { readonly status: "ready" }
> {
  return {
    status: "ready",
    snapshotVersion: 5,
    identity: { rootId: "body", nodeId: "target" },
    placement: "before",
    indicator: createIndicator(),
    payload: { targetPosition: 31 }
  };
}

/**
 * Creates one fully observable drag-session fixture.
 *
 * @param targetFactory - Optional target resolver behavior.
 * @returns Session and transient-port observations.
 */
function createSessionFixture(
  targetFactory: () => EditorUIDragTargetResolution<TargetPayload> = createReadyTarget
) {
  const indicators: EditorUIDragIndicator[] = [];
  const autoScrollUpdates: EditorUIDragAutoScrollDecision[] = [];
  const lockAcquires = vi.fn(() => true);
  const lockReleases = vi.fn();
  const indicatorClears = vi.fn();
  const autoScrollStops = vi.fn();
  const listenerReleases = vi.fn();
  const resolveTarget = vi.fn(targetFactory);
  const session = new DragSession<SourcePayload, TargetPayload>({
    threshold: 5,
    resolveTarget,
    lock: { acquire: lockAcquires, release: lockReleases },
    indicator: {
      show(indicator): void {
        indicators.push(indicator);
      },
      clear: indicatorClears
    },
    autoScroll: {
      update(decision): void {
        autoScrollUpdates.push(decision);
      },
      stop: autoScrollStops
    },
    listeners: { release: listenerReleases }
  });

  return {
    session,
    resolveTarget,
    indicators,
    indicatorClears,
    autoScrollUpdates,
    autoScrollStops,
    lockAcquires,
    lockReleases,
    listenerReleases
  };
}
