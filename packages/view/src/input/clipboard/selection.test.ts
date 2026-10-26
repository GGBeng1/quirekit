import { Editor } from "@quirekit/core";
import { TextSelection } from "@quirekit/pm";
import { StarterKit } from "@quirekit/starter-kit";
import { describe, expect, it } from "vitest";
import type { QuireCommandRoutingScope } from "@quirekit/view-engine";
import type { QuireRetainedLayoutSnapshot } from "@quirekit/view-engine";
import { writeQuireOwnedClipboardSelection } from "./selection";

describe("owned clipboard selection", () => {
  it("delegates standard MIME realization to the mounted output strategy", () => {
    const editor = createEditor();
    const values = new Map<string, string>();
    let calls = 0;
    const result = writeQuireOwnedClipboardSelection({
      editor,
      clipboardData: {
        getData: (type) => values.get(type) ?? "",
        setData: (type, value) => values.set(type, value)
      },
      outputStrategy: ({ clipboardData }) => {
        calls += 1;
        clipboardData.setData("text/html", "<p>mounted</p>");
        clipboardData.setData("text/plain", "mounted");
        return true;
      }
    });

    expect(result.handled).toBe(true);
    expect(calls).toBe(1);
    expect(values.get("text/html")).toBe("<p>mounted</p>");
  });

  it("queries provider fallback by the command route exact owner", () => {
    const editor = createEditor();
    const owner = {
      rootId: { value: "root:provider" },
      regionId: { value: "region:provider" },
      kind: "node-body" as const,
      visualInstanceId: "instance:one"
    };
    const descriptor = {
      owner: {
        root: {
          id: owner.rootId,
          kind: "block-container" as const,
          source: { sourceId: "source:provider", range: { from: 0, to: 7 } },
          capabilities
        },
        region: owner,
        source: { sourceId: "source:provider", range: { from: 0, to: 7 } }
      },
      kind: owner.kind,
      capabilities,
      rect: { x: 0, y: 0, width: 100, height: 20 },
      coordinateSpace: "document" as const,
      exportFallbacks: [{ kind: "semantic-degraded" as const }]
    };
    const key = "root:provider\u0000region:provider\u0000instance:one";
    const snapshot = createSnapshot(editor, {
      kind: "ready",
      descriptorsByOwner: { [key]: descriptor },
      indexedOwnerKeys: [key]
    });
    const scope = createScope(editor, owner);
    const values = new Map<string, string>();
    const result = writeQuireOwnedClipboardSelection({
      editor,
      snapshot,
      scope,
      clipboardData: {
        getData: (type) => values.get(type) ?? "",
        setData: (type, value) => values.set(type, value)
      }
    });

    expect(result.handled).toBe(true);
    expect(result.descriptor).toBe(descriptor);
    expect(result.fallback?.kind).toBe("semantic-degraded");
    expect(values.get("text/html")).toContain("alpha");
    expect(JSON.parse(
      values.get("application/x-quirekit-view-export-fallback+json") ?? "{}"
    )).toEqual({
      version: 1,
      owner: {
        rootId: "root:provider",
        regionId: "region:provider",
        visualInstanceId: "instance:one"
      },
      sourceId: "source:provider",
      fallback: { kind: "semantic-degraded" }
    });
  });

  it("does not infer a provider descriptor across visual instances", () => {
    const editor = createEditor();
    const snapshot = createSnapshot(editor, {
      kind: "ready",
      descriptorsByOwner: {},
      indexedOwnerKeys: []
    });
    const owner = {
      rootId: { value: "root:provider" },
      regionId: { value: "region:provider" },
      kind: "node-body" as const,
      visualInstanceId: "instance:other"
    };
    const result = writeQuireOwnedClipboardSelection({
      editor,
      snapshot,
      scope: createScope(editor, owner),
      clipboardData: {
        getData: () => "",
        setData: () => {}
      }
    });

    expect(result.handled).toBe(true);
    expect(result.descriptor).toBeUndefined();
    expect(result.gaps.map((gap) => gap.code))
      .toEqual(["missing-consumer-query-index"]);
  });
});

const capabilities = {
  editable: true,
  selectable: true,
  focusable: true,
  copyable: true,
  commandable: true,
  accessible: true
} as const;

/**
 * Creates an editor with a non-empty text selection.
 *
 * @returns Editor whose selection can be serialized.
 */
function createEditor(): Editor {
  const editor = new Editor({
    extensions: [StarterKit],
    content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "alpha" }] }] }
  });
  editor.dispatchTransaction(editor.state.pm.tr.setSelection(
    TextSelection.create(editor.state.doc, 1, 6)
  ));
  return editor;
}

/**
 * Creates the retained snapshot fields consumed by exact-owner clipboard lookup.
 *
 * @param editor - Editor whose state owns the snapshot.
 * @param consumerCompilation - Ready consumer compilation under test.
 * @returns Minimal retained layout snapshot.
 */
function createSnapshot(
  editor: Editor,
  consumerCompilation: QuireRetainedLayoutSnapshot["consumerCompilation"]
): QuireRetainedLayoutSnapshot {
  const rect = { x: 0, y: 0, width: 100, height: 20 };
  return {
    state: editor.state,
    root: { id: "doc", kind: "block", range: { from: 0, to: 7 }, rect },
    documentRect: rect,
    viewportRect: rect,
    domOverlays: [],
    hitTargets: [],
    viewGraph: {
      version: 1,
      roots: [],
      regions: [],
      performance: {
        invariants: [],
        invalidationScopes: [],
        queryBudget: { kind: "viewport-indexed" }
      }
    },
    consumerCompilation
  };
}

/**
 * Creates a command scope with one exact provider owner.
 *
 * @param editor - Editor whose selection is routed.
 * @param region - Exact retained region occurrence.
 * @returns Command routing scope for provider copy.
 */
function createScope(
  editor: Editor,
  region: NonNullable<QuireCommandRoutingScope["activeRegion"]>
): QuireCommandRoutingScope {
  return {
    selection: editor.state.pm.selection,
    selectionDomain: "text",
    targetKind: "editable-text",
    activeRoot: region.rootId,
    activeRegion: region
  };
}
