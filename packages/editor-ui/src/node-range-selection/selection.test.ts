import { describe, expect, it } from "vitest";
import { NodeRangeSelection } from ".";
import type {
  EditorUINodeIdentity,
  EditorUINodeOrderFact
} from "../node-identity";

describe("NodeRangeSelection", () => {
  it("derives one inclusive same-root range from stable identities", () => {
    const result = NodeRangeSelection.create({
      snapshotVersion: 10,
      writingDirection: "ltr",
      nodes: createFacts("a", "b", "c", "d"),
      anchor: identity("a"),
      focus: identity("c")
    });

    expect(result.status).toBe("ready");
    if (result.status !== "ready") return;

    expect(result.selection.snapshot).toEqual({
      snapshotVersion: 10,
      rootId: "body",
      writingDirection: "ltr",
      direction: "forward",
      visualDirection: "forward",
      anchor: identity("a"),
      focus: identity("c"),
      members: createFacts("a", "b", "c")
    });
    expect(result.selection.contains(identity("b"))).toBe(true);
    expect(result.selection.contains(identity("d"))).toBe(false);
  });

  it("keeps document order separate from RTL visual direction", () => {
    const result = NodeRangeSelection.create({
      snapshotVersion: 4,
      writingDirection: "rtl",
      nodes: createFacts("a", "b", "c"),
      anchor: identity("c"),
      focus: identity("a")
    });

    expect(result.status).toBe("ready");
    if (result.status !== "ready") return;

    expect(result.selection.snapshot.direction).toBe("backward");
    expect(result.selection.snapshot.visualDirection).toBe("forward");
    expect(result.selection.snapshot.members.map((fact) => fact.identity.nodeId))
      .toEqual(["a", "b", "c"]);
  });

  it("extends from the stable anchor on a newer snapshot", () => {
    const initial = requireSelection(NodeRangeSelection.create({
      snapshotVersion: 7,
      writingDirection: "ltr",
      nodes: createFacts("a", "b", "c"),
      anchor: identity("b"),
      focus: identity("b")
    }));

    const extended = initial.extend({
      snapshotVersion: 8,
      nodes: createFacts("a", "b", "c", "d"),
      focus: identity("d")
    });

    expect(extended.status).toBe("ready");
    if (extended.status !== "ready") return;
    expect(extended.selection.snapshot.anchor).toEqual(identity("b"));
    expect(extended.selection.snapshot.focus).toEqual(identity("d"));
    expect(extended.selection.snapshot.members.map((fact) => fact.identity.nodeId))
      .toEqual(["b", "c", "d"]);
  });

  it("remaps collaboration insertions and interior deletions by stable identity", () => {
    const initial = requireSelection(NodeRangeSelection.create({
      snapshotVersion: 20,
      writingDirection: "ltr",
      nodes: createFacts("a", "b", "c"),
      anchor: identity("a"),
      focus: identity("c")
    }));

    const inserted = initial.remap({
      snapshotVersion: 21,
      nodes: createFacts("a", "remote", "b", "c")
    });
    expect(inserted.status).toBe("ready");
    if (inserted.status !== "ready") return;
    expect(inserted.selection.snapshot.members.map((fact) => fact.identity.nodeId))
      .toEqual(["a", "remote", "b", "c"]);

    const deleted = inserted.selection.remap({
      snapshotVersion: 22,
      nodes: createFacts("a", "remote", "c")
    });
    expect(deleted.status).toBe("ready");
    if (deleted.status !== "ready") return;
    expect(deleted.selection.snapshot.members.map((fact) => fact.identity.nodeId))
      .toEqual(["a", "remote", "c"]);
  });

  it("rejects deleted endpoints, duplicate identities, cross-root ranges, and stale remaps", () => {
    const selection = requireSelection(NodeRangeSelection.create({
      snapshotVersion: 9,
      writingDirection: "ltr",
      nodes: createFacts("a", "b"),
      anchor: identity("a"),
      focus: identity("b")
    }));

    expect(selection.remap({
      snapshotVersion: 10,
      nodes: createFacts("a")
    })).toEqual({
      status: "rejected",
      reason: "identity-unavailable",
      snapshotVersion: 10,
      identity: identity("b")
    });

    expect(NodeRangeSelection.create({
      snapshotVersion: 2,
      writingDirection: "ltr",
      nodes: [fact("a", 0), fact("a", 1)],
      anchor: identity("a"),
      focus: identity("a")
    })).toEqual({
      status: "rejected",
      reason: "duplicate-identity",
      snapshotVersion: 2,
      identity: identity("a")
    });

    expect(NodeRangeSelection.create({
      snapshotVersion: 2,
      writingDirection: "ltr",
      nodes: [fact("a", 0), fact("x", 1, "header")],
      anchor: identity("a"),
      focus: identity("x", "header")
    })).toEqual({
      status: "rejected",
      reason: "cross-root",
      snapshotVersion: 2,
      anchorRootId: "body",
      focusRootId: "header"
    });

    expect(selection.remap({
      snapshotVersion: 8,
      nodes: createFacts("a", "b")
    })).toEqual({
      status: "rejected",
      reason: "snapshot-regressed",
      snapshotVersion: 8,
      previousSnapshotVersion: 9
    });
  });
});

/**
 * Creates one stable identity fixture.
 *
 * @param nodeId - Stable node identity inside the root.
 * @param rootId - Stable root identity.
 * @returns Stable identity fixture.
 */
function identity(nodeId: string, rootId = "body"): EditorUINodeIdentity {
  return { rootId, nodeId };
}

/**
 * Creates one ordered occurrence fact.
 *
 * @param nodeId - Stable node identity inside the root.
 * @param order - Structural order in the root.
 * @param rootId - Stable root identity.
 * @returns Ordered node fact.
 */
function fact(
  nodeId: string,
  order: number,
  rootId = "body"
): EditorUINodeOrderFact {
  return {
    identity: identity(nodeId, rootId),
    order,
    range: { from: order * 10 + 1, to: order * 10 + 9 }
  };
}

/**
 * Creates monotonically ordered body-node facts.
 *
 * @param nodeIds - Stable node identities in structural order.
 * @returns Ordered body-node facts.
 */
function createFacts(...nodeIds: readonly string[]): readonly EditorUINodeOrderFact[] {
  return nodeIds.map((nodeId, order) => fact(nodeId, order));
}

/**
 * Requires a ready range-selection result for fixture setup.
 *
 * @param result - Creation result to unwrap.
 * @returns Ready selection.
 */
function requireSelection(
  result: ReturnType<typeof NodeRangeSelection.create>
): NodeRangeSelection {
  if (result.status !== "ready") {
    throw new Error(`Expected a ready node range, received ${result.reason}.`);
  }
  return result.selection;
}
