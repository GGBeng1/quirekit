import { describe, expect, it } from "vitest";
import { ClassicEditorTargetFreshnessRegistry } from "./freshness";

const editable = {
  policyRevision: "policy-1", operationActive: true, editorAvailable: true,
  ownerAvailable: true, schemaAvailable: true, unlocked: true, permitted: true,
  editable: true, generation: 999, resolvedTarget: null, resolvedOwner: null, policyAllowed: true
};

describe("Classic Editor target freshness", () => {
  it("keeps all three target kinds distinct and ready while current", () => {
    const registry = new ClassicEditorTargetFreshnessRegistry();
    const targets = [
      { kind: "insertion-bookmark" as const, bookmarkId: "bookmark", storyId: "body", expectedOwner: "image" },
      { kind: "node-target" as const, targetId: "image-1", nodeKind: "image" as const, expectedOwner: "image" },
      { kind: "document-target" as const, documentId: "doc", expectedRevision: "1" }
    ];

    expect(targets.map((target) => registry.recheck(registry.capture(target, "policy-1"), {
      ...editable, resolvedTarget: target, resolvedOwner: "expectedOwner" in target ? target.expectedOwner : null
    }).status))
      .toEqual(["ready", "ready", "ready"]);
  });

  it("returns stale for deleted/remapped ownership and never a current-caret target", () => {
    const registry = new ClassicEditorTargetFreshnessRegistry();
    const target = { kind: "insertion-bookmark" as const, bookmarkId: "bookmark", storyId: "body", expectedOwner: "image" };
    const bookmark = registry.capture(target, "policy-1");
    registry.invalidate(target);

    expect(registry.recheck(bookmark, { ...editable, resolvedTarget: target, resolvedOwner: "image" })).toEqual({
      status: "stale", target: null, reason: "target-unavailable"
    });
  });

  it("denies policy and editable changes before a feature can call can()", () => {
    const registry = new ClassicEditorTargetFreshnessRegistry();
    const bookmark = registry.capture({
      kind: "node-target", targetId: "attachment-1", nodeKind: "attachment", expectedOwner: "attachment"
    }, "policy-1");

    const current = { ...editable, resolvedTarget: bookmark.target, resolvedOwner: "attachment" };
    expect(registry.recheck(bookmark, { ...current, policyRevision: "policy-2" }).status)
      .toBe("denied");
    expect(registry.recheck(bookmark, { ...current, editable: false })).toMatchObject({
      status: "denied", reason: "not-editable"
    });
  });

  it("fails closed for owner, story, node-kind, document revision, schema, lock, permission, and policy drift", () => {
    const registry = new ClassicEditorTargetFreshnessRegistry();
    const insertion = { kind: "insertion-bookmark" as const, bookmarkId: "b", storyId: "body", expectedOwner: "image" };
    const bookmark = registry.capture(insertion, "policy-1");
    const base = { ...editable, resolvedTarget: insertion, resolvedOwner: "image" };
    expect(registry.recheck(bookmark, { ...base, resolvedOwner: "other" }).status).toBe("stale");
    expect(registry.recheck(bookmark, { ...base, resolvedTarget: { ...insertion, storyId: "header" } }).status).toBe("stale");
    expect(registry.recheck(bookmark, { ...base, schemaAvailable: false }).status).toBe("stale");
    expect(registry.recheck(bookmark, { ...base, unlocked: false }).status).toBe("denied");
    expect(registry.recheck(bookmark, { ...base, permitted: false }).status).toBe("denied");
    expect(registry.recheck(bookmark, { ...base, policyAllowed: false }).status).toBe("denied");
    const node = registry.capture({ kind: "node-target", targetId: "n", nodeKind: "image", expectedOwner: "image" }, "policy-1");
    expect(registry.recheck(node, { ...base, resolvedTarget: { kind: "node-target", targetId: "n", nodeKind: "attachment", expectedOwner: "image" } }).status).toBe("stale");
    const document = registry.capture({ kind: "document-target", documentId: "d", expectedRevision: "1" }, "policy-1");
    expect(registry.recheck(document, { ...base, resolvedTarget: { kind: "document-target", documentId: "d", expectedRevision: "2" }, resolvedOwner: null }).status).toBe("stale");
  });
});
