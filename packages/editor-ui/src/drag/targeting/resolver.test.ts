import type { QuireLayoutSnapshot } from "@quirekit/view-engine";
import { describe, expect, it } from "vitest";
import { resolveEditorUIBlockDropTarget } from ".";
import {
  createBlockResolverOptions,
  createBlockSnapshot,
  createBlockSourceSelection,
  createReadyBlockTarget
} from "./test-support/fixture";

describe("headless block drop target", () => {
  it("produces equivalent Canvas and SVG targets from one document point", () => {
    const snapshot = createBlockSnapshot();
    const canvas = resolveEditorUIBlockDropTarget({
      ...createBlockResolverOptions(snapshot),
      clientPoint: { x: 180, y: 155 },
      surfaceClientRect: { left: 100, top: 50, width: 400, height: 400 },
      surfaceBounds: { x: 0, y: 0, width: 400, height: 400 }
    });
    const svg = resolveEditorUIBlockDropTarget({
      ...createBlockResolverOptions(snapshot),
      clientPoint: { x: 180, y: 240 },
      surfaceClientRect: { left: 20, top: 30, width: 800, height: 800 },
      surfaceBounds: { x: 0, y: 0, width: 400, height: 400 }
    });

    expect(canvas).toEqual(createReadyBlockTarget());
    expect(svg).toEqual(canvas);
  });

  it("reverses horizontal before/after under RTL without changing identity", () => {
    const snapshot = createBlockSnapshot();
    const ltr = resolveEditorUIBlockDropTarget({
      ...createBlockResolverOptions(snapshot),
      blockAxis: "horizontal",
      writingDirection: "ltr",
      clientPoint: { x: 45, y: 120 }
    });
    const rtl = resolveEditorUIBlockDropTarget({
      ...createBlockResolverOptions(snapshot),
      blockAxis: "horizontal",
      writingDirection: "rtl",
      clientPoint: { x: 45, y: 120 }
    });

    expect(ltr).toMatchObject({ status: "ready", placement: "before" });
    expect(rtl).toMatchObject({ status: "ready", placement: "after" });
    expect(ltr.status === "ready" ? ltr.identity : undefined)
      .toEqual(rtl.status === "ready" ? rtl.identity : undefined);
  });

  it("returns explicit stale, policy, cross-root, and self reasons", () => {
    const snapshot = createBlockSnapshot();
    expect(resolveEditorUIBlockDropTarget({
      ...createBlockResolverOptions(snapshot),
      insideDropZone: false
    })).toEqual({ status: "rejected", reason: "outside", snapshotVersion: 7 });

    expect(resolveEditorUIBlockDropTarget({
      ...createBlockResolverOptions(snapshot),
      expectedSnapshotVersion: 6
    })).toEqual({ status: "rejected", reason: "stale", snapshotVersion: 7 });

    expect(resolveEditorUIBlockDropTarget({
      ...createBlockResolverOptions(createBlockSnapshot(false)),
      policy: { targetEditable: true }
    })).toEqual({ status: "rejected", reason: "read-only", snapshotVersion: 7 });

    for (const [policy, reason] of [
      [{ protected: true }, "protected"],
      [{ locked: true }, "locked"],
      [{ schemaCompatible: false }, "schema-incompatible"],
      [{ permitted: false }, "permission-denied"]
    ] as const) {
      expect(resolveEditorUIBlockDropTarget({
        ...createBlockResolverOptions(snapshot),
        policy
      })).toEqual({ status: "rejected", reason, snapshotVersion: 7 });
    }

    expect(resolveEditorUIBlockDropTarget({
      ...createBlockResolverOptions(snapshot),
      sourceSelection: createBlockSourceSelection(7, "header")
    })).toEqual({ status: "rejected", reason: "cross-root", snapshotVersion: 7 });

    expect(resolveEditorUIBlockDropTarget({
      ...createBlockResolverOptions(snapshot),
      sourceSelection: createBlockSourceSelection(7, "body", "target")
    })).toEqual({
      status: "rejected",
      reason: "source-contains-target",
      snapshotVersion: 7
    });
  });

  it("uses the exact occurrence and rejects incomplete retained facts", () => {
    const snapshot = createBlockSnapshot();
    expect(resolveEditorUIBlockDropTarget({
      ...createBlockResolverOptions(snapshot),
      clientPoint: { x: 390, y: 390 }
    })).toEqual({ status: "rejected", reason: "no-target", snapshotVersion: 7 });

    const repeated = {
      ...snapshot,
      hitTargets: [
        ...snapshot.hitTargets,
        {
          ...snapshot.hitTargets[1]!,
          id: "node:target:repeat",
          rect: { x: 40, y: 160, width: 200, height: 40 }
        }
      ]
    } as QuireLayoutSnapshot;
    expect(resolveEditorUIBlockDropTarget({
      ...createBlockResolverOptions(repeated)
    })).toEqual(createReadyBlockTarget());

    const overlapping = {
      ...snapshot,
      hitTargets: [
        ...snapshot.hitTargets,
        {
          ...snapshot.hitTargets[1]!,
          id: "node:target:ambiguous"
        }
      ]
    } as QuireLayoutSnapshot;
    expect(resolveEditorUIBlockDropTarget({
      ...createBlockResolverOptions(overlapping)
    })).toEqual(createReadyBlockTarget());

    const target = snapshot.hitTargets[1]!;
    const { source: _source, capabilities: _capabilities, ...incompleteHit } =
      target.interactionHit!;
    const incomplete = {
      ...snapshot,
      hitTargets: [
        snapshot.hitTargets[0]!,
        {
          ...target,
          interactionHit: incompleteHit,
          capabilities: undefined
        }
      ]
    } as QuireLayoutSnapshot;
    expect(resolveEditorUIBlockDropTarget({
      ...createBlockResolverOptions(incomplete)
    })).toEqual({ status: "rejected", reason: "invalid-target", snapshotVersion: 7 });
  });
});
