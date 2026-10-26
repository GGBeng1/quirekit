import { QuireEditor } from "@quirekit/core";
import { generateHTML, generateJSON } from "@quirekit/html/server";
import {
  type EditorView,
  NodeSelection,
  type Transaction
} from "@quirekit/pm";
import {
  Document,
  Paragraph,
  StarterKit,
  Text
} from "@quirekit/starter-kit";
import { QuireView } from "@quirekit/view";
import { buildQuireLayoutSnapshot } from "@quirekit/view-engine";
import { describe, expect, it } from "vitest";
import { FloatingObject } from "./floating-object";

/** Public layout node shape inferred from the retained snapshot contract. */
type FloatingObjectSnapshot = ReturnType<typeof buildQuireLayoutSnapshot>;

/** Public layout node shape inferred from the retained snapshot contract. */
type FloatingObjectLayoutNode = FloatingObjectSnapshot["root"];

describe("FloatingObject", () => {
  it("normalizes persisted geometry and updates it through transactions", () => {
    const editor = createFloatingObjectEditor();

    expect(editor.commands.moveFloatingObject({
      inlineDelta: 16,
      blockDelta: 8
    })).toBe(true);
    expect(editor.commands.resizeFloatingObject({
      direction: "south-east",
      inlineDelta: 24,
      blockDelta: 12
    })).toBe(true);

    expect(readFloatingObjectAttributes(editor)).toMatchObject({
      width: 264,
      minHeight: 108,
      inlineOffset: 16,
      blockOffset: 8
    });
  });

  it("keeps geometry changes transaction-owned across undo and redo", () => {
    const editor = createFloatingObjectEditor();

    expect(editor.commands.moveFloatingObject({
      inlineDelta: 16,
      blockDelta: 8
    })).toBe(true);
    expect(readFloatingObjectAttributes(editor)).toMatchObject({
      inlineOffset: 16,
      blockOffset: 8
    });

    expect(editor.commands.undo()).toBe(true);
    expect(readFloatingObjectAttributes(editor)).toMatchObject({
      inlineOffset: 0,
      blockOffset: 0
    });
    expect(editor.commands.redo()).toBe(true);
    expect(readFloatingObjectAttributes(editor)).toMatchObject({
      inlineOffset: 16,
      blockOffset: 8
    });
  });

  it("preserves exact object selection across manipulation transactions", () => {
    const editor = createFloatingObjectEditor();

    expect(editor.commands.selectFloatingObject()).toBe(true);
    expect(editor.commands.resizeFloatingObject({
      direction: "south-east",
      inlineDelta: 24,
      blockDelta: 12
    })).toBe(true);

    expect(editor.state.pm.selection).toBeInstanceOf(NodeSelection);
    expect(editor.state.pm.selection.from).toBe(0);
    expect(editor.state.pm.selection.to).toBe(editor.state.doc.firstChild?.nodeSize);
  });

  it("selects the object and enters its nested editable text", () => {
    const editor = createFloatingObjectEditor();

    expect(editor.commands.selectFloatingObject()).toBe(true);
    expect(editor.state.pm.selection.from).toBe(0);
    expect(editor.state.pm.selection.to).toBeGreaterThan(0);

    expect(editor.commands.enterFloatingObject()).toBe(true);
    expect(editor.state.pm.selection.empty).toBe(true);
    expect(editor.state.pm.selection.$from.parent.type.name).toBe("paragraph");
  });

  it("enters and leaves nested text through canonical keyboard commands", () => {
    const editor = createFloatingObjectEditor();

    expect(editor.commands.selectFloatingObject()).toBe(true);
    expect(editor.state.pm.selection).toBeInstanceOf(NodeSelection);
    expect(dispatchKeyboardShortcut(editor, "Enter", 13)).toBe(true);
    expect(editor.state.pm.selection.empty).toBe(true);
    expect(editor.state.pm.selection.$from.parent.type.name).toBe("paragraph");
    expect(Array.from(
      { length: editor.state.pm.selection.$from.depth + 1 },
      (_, depth) => editor.state.pm.selection.$from.node(depth).type.name
    )).toEqual(["doc", "floatingObject", "paragraph"]);
    expect(editor.can().leaveFloatingObject()).toBe(true);
    expect(dispatchKeyboardShortcut(editor, "Escape", 27)).toBe(true);
    expect(editor.state.pm.selection).toBeInstanceOf(NodeSelection);
  });

  it("produces object, nested text-box, controls, semantics, and layers", () => {
    const editor = createFloatingObjectEditor();
    expect(editor.commands.selectFloatingObject()).toBe(true);
    const snapshot = buildFloatingObjectSnapshot(editor);
    const object = findNodeById(snapshot, "document-node:floatingObject-0");
    const layerContributions = snapshot.layerContributions ?? [];

    expect(object).toBeDefined();
    expect(object?.children).toHaveLength(2);
    expect(object?.children?.[0]?.viewRoot?.kind).toBe("text-box");
    expect(object?.children?.[0]?.viewRegion?.kind).toBe("text-box");
    expect(object?.children?.[1]?.viewRegion?.kind).toBe("control");
    expect(layerContributions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        contributionId: "floating-object-surface",
        paintSurface: "content"
      }),
      expect.objectContaining({
        contributionId: "floating-object-controls",
        paintSurface: "overlay"
      })
    ]));
    const controls = layerContributions.find(
      (contribution) => contribution.contributionId === "floating-object-controls"
    );
    expect(controls?.activation).toEqual({ kind: "selected-owner" });
    expect(controls?.targets.filter((target) =>
      target.part?.startsWith("move-")
    )).toHaveLength(4);
    expect(controls?.targets.filter((target) =>
      target.part?.startsWith("resize-")
    )).toHaveLength(8);
    expect(controls?.targets).toEqual(expect.arrayContaining([
      expect.objectContaining({
        part: "move-north",
        events: expect.objectContaining({
          pointerDown: {
            handler: "floatingObject.manipulate",
            payload: { kind: "move" }
          },
          pointerMove: {
            handler: "floatingObject.manipulate",
            payload: { kind: "move" }
          }
        })
      }),
      expect.objectContaining({
        part: "resize-south-east",
        events: expect.objectContaining({
          pointerDown: {
            handler: "floatingObject.manipulate",
            payload: { kind: "resize", direction: "south-east" }
          },
          pointerMove: {
            handler: "floatingObject.manipulate",
            payload: { kind: "resize", direction: "south-east" }
          }
        })
      })
    ]));
    expect(snapshot.hitTargets).toEqual(expect.arrayContaining([
      expect.objectContaining({
        interactionHit: expect.objectContaining({ kind: "object" })
      })
    ]));
    expect(snapshot.hitTargets.filter((target) =>
      target.interactionHit?.kind === "object"
    ).map((target) => target.id)).toEqual([
      "floating-object-flow:object-selection-surface",
      "floating-object-flow:object-selection-frame:top",
      "floating-object-flow:object-selection-frame:right",
      "floating-object-flow:object-selection-frame:bottom",
      "floating-object-flow:object-selection-frame:left"
    ]);
    const renderResult = new QuireView({ editor }).buildRenderResult({
      viewportRect: { x: 0, y: 0, width: 640, height: 480 }
    });
    expect(renderResult.interactionSnapshot.hitTargets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          interactionHit: expect.objectContaining({
            kind: "widget",
            part: "move-north"
          })
        }),
        expect.objectContaining({
          interactionHit: expect.objectContaining({
            kind: "widget",
            part: "resize-south-east"
          })
        })
      ])
    );
    const descriptors = Object.values(
      snapshot.consumerCompilation.kind === "ready"
        ? snapshot.consumerCompilation.descriptorsByOwner
        : {}
    );
    expect(descriptors.map((descriptor) => descriptor.semantics)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: "object", label: "Floating object" }),
        expect.objectContaining({ role: "text-box", label: "Floating object text" }),
        expect.objectContaining({ role: "control" })
      ])
    );
  });

  it("realizes manipulation chrome only for exact object selection", () => {
    const editor = createFloatingObjectEditor();
    const view = new QuireView({ editor });
    const viewportRect = { x: 0, y: 0, width: 640, height: 480 };
    const inactive = view.buildRenderResult({ viewportRect });
    expect(inactive.layoutSnapshot.layerContributions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          contributionId: "floating-object-controls",
          activation: { kind: "selected-owner" }
        })
      ])
    );
    expect(hasFloatingObjectManipulationTarget(inactive)).toBe(false);

    expect(editor.commands.selectFloatingObject()).toBe(true);
    const selected = view.buildRenderResult({ viewportRect });
    expect(hasFloatingObjectManipulationTarget(selected)).toBe(true);

    expect(editor.commands.enterFloatingObject()).toBe(true);
    const editing = view.buildRenderResult({ viewportRect });
    expect(hasFloatingObjectManipulationTarget(editing)).toBe(false);
  });

  it("anchors opposite edges during all directional resize families", () => {
    const editor = createFloatingObjectEditor();
    expect(editor.commands.moveFloatingObject({
      inlineDelta: 40,
      blockDelta: 30
    })).toBe(true);
    expect(editor.commands.resizeFloatingObject({
      direction: "north-west",
      inlineDelta: 10,
      blockDelta: 12
    })).toBe(true);
    expect(readFloatingObjectAttributes(editor)).toMatchObject({
      width: 230,
      minHeight: 84,
      inlineOffset: 50,
      blockOffset: 42
    });

    expect(editor.commands.resizeFloatingObject({
      direction: "south-east",
      inlineDelta: 20,
      blockDelta: 16
    })).toBe(true);
    expect(readFloatingObjectAttributes(editor)).toMatchObject({
      width: 250,
      minHeight: 100,
      inlineOffset: 50,
      blockOffset: 42
    });
  });

  it("keeps persisted offsets inside the authoritative flow envelope", () => {
    const editor = createFloatingObjectEditor();
    expect(editor.commands.moveFloatingObject({
      inlineDelta: 32,
      blockDelta: 16
    })).toBe(true);

    const snapshot = buildFloatingObjectSnapshot(editor);
    const object = findNodeById(snapshot, "document-node:floatingObject-0");
    const surface = snapshot.layerContributions?.find(
      (contribution) => contribution.contributionId === "floating-object-surface"
    );

    expect(object?.rect).toMatchObject({ x: 0, width: 272 });
    expect(surface?.rect).toMatchObject({ x: 32, y: 16, width: 240 });
  });

  it("projects selection changes to overlay lanes without rebuilding content", () => {
    const editor = createFloatingObjectEditor();
    const view = new QuireView({ editor });
    const viewportRect = { x: 0, y: 0, width: 640, height: 480 };
    view.buildRenderResult({ viewportRect });
    const transaction = editor.state.pm.tr.setSelection(
      NodeSelection.create(editor.state.doc, 0)
    );
    editor.dispatchTransaction(transaction);

    const result = view.buildRenderResult({
      viewportRect,
      updatePatch: {
        sourceReason: "transaction",
        transactionCount: 1,
        docChanged: false,
        selectionChanged: true,
        compositionChanged: false,
        causes: ["selection"],
        invalidatedProducts: ["overlay"],
        layoutDirtyRange: null
      }
    });

    expect(result.displayOwnerDiagnostics.projectedContentLanes).toBe(0);
    expect(result.displayOwnerDiagnostics.projectedOverlayLanes).toBeGreaterThan(0);
    expect(result.displayInvalidation.owners.every(
      (owner) => owner.lanes.length === 1 && owner.lanes[0] === "overlay"
    )).toBe(true);
  });

  it("bounds geometry invalidation to the floating-object dependency set", () => {
    const editor = createFloatingObjectEditorWithSurroundingParagraphs();
    const view = new QuireView({ editor });
    const viewportRect = { x: 0, y: 0, width: 640, height: 480 };
    view.buildRenderResult({ viewportRect });
    const objectPosition = editor.state.doc.child(0).nodeSize;
    const object = editor.state.doc.nodeAt(objectPosition);
    if (object === null) {
      throw new Error("Floating-object fixture did not resolve its object node.");
    }
    const objectRange = {
      from: objectPosition,
      to: objectPosition + object.nodeSize
    };
    const transaction = editor.state.pm.tr.setNodeMarkup(
      objectPosition,
      undefined,
      { ...object.attrs, width: object.attrs.width + 16 }
    );
    editor.dispatchTransaction(transaction);

    const result = view.buildRenderResult({
      viewportRect,
      layoutDirtyRange: {
        reason: "content",
        changedRange: objectRange,
        firstTopLevelBlockIndex: 1,
        firstTopLevelBlockRange: objectRange
      },
      updatePatch: {
        sourceReason: "transaction",
        transactionCount: 1,
        docChanged: true,
        selectionChanged: false,
        compositionChanged: false,
        causes: ["content"],
        invalidatedProducts: ["layout", "content", "overlay"],
        layoutDirtyRange: {
          reason: "content",
          changedRange: objectRange,
          firstTopLevelBlockIndex: 1,
          firstTopLevelBlockRange: objectRange
        }
      }
    });
    const invalidatedLanesByKey = new Map(
      result.displayInvalidation.owners.map((owner) => [owner.ownerKey, owner.lanes])
    );
    const unrelatedOwners = result.displayOwnerIndex.owners.filter((owner) =>
      owner.range.to <= objectRange.from
      || owner.range.from >= objectRange.to
    );

    expect(
      unrelatedOwners.length,
      JSON.stringify(result.displayOwnerIndex.owners.map((owner) => ({
        key: owner.key,
        productId: owner.productId,
        range: owner.range
      })))
    ).toBeGreaterThan(0);
    expect(unrelatedOwners.every((owner) =>
      !invalidatedLanesByKey.get(owner.key)?.includes("content")
    )).toBe(true);
    expect(result.displayOwnerDiagnostics.projectedContentLanes).toBeGreaterThan(0);
    expect(result.displayOwnerDiagnostics.projectedContentLanes)
      .toBeLessThan(result.displayOwnerDiagnostics.contentOwners);
  });

  it("rejects malformed geometry instead of inventing defaults", () => {
    const editor = createFloatingObjectEditor();

    expect(editor.commands.resizeFloatingObject({
      direction: "east",
      inlineDelta: Number.NaN,
      blockDelta: 0
    })).toBe(false);
    expect(readFloatingObjectAttributes(editor)).toMatchObject({
      width: 240,
      minHeight: 96
    });

    const extensions = [Document, Paragraph, Text, FloatingObject];
    const imported = generateJSON(
      '<figure data-qk-floating-object="true" '
      + 'data-qk-floating-object-width="invalid">bad geometry</figure>',
      extensions
    );
    expect(imported.content).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "floatingObject" })
    ]));
  });

  it("reuses only exact provider continuation plans", () => {
    const editor = createFloatingObjectEditor();
    const view = new QuireView({ editor });
    const viewportRect = { x: 0, y: 0, width: 640, height: 480 };

    view.buildRenderResult({ viewportRect });
    const second = view.buildRenderResult({ viewportRect });
    expect(second.cacheCounters?.retainedBlock.providerExecution).toEqual({
      snapshotEpochs: 2,
      openedExecutions: 2,
      suppliedContinuations: 1,
      committedContinuations: 2,
      discardedContinuations: 0,
      canceledJobs: 0
    });

    expect(editor.commands.resizeFloatingObject({
      direction: "east",
      inlineDelta: 16,
      blockDelta: 0
    })).toBe(true);
    const resized = view.buildRenderResult({ viewportRect });
    expect(resized.cacheCounters?.retainedBlock.providerExecution).toEqual({
      snapshotEpochs: 3,
      openedExecutions: 3,
      suppliedContinuations: 2,
      committedContinuations: 3,
      discardedContinuations: 0,
      canceledJobs: 0
    });
    const object = findNodeById(
      resized.layoutSnapshot,
      "document-node:floatingObject-0"
    );
    expect(object?.rect.width).toBe(256);
  });

  it("round-trips source-order HTML without paginated positioning", () => {
    const extensions = [Document, Paragraph, Text, FloatingObject];
    const html = generateHTML(createFloatingObjectEditor().getJSON(), extensions);

    expect(html).toContain('data-qk-floating-object="true"');
    expect(html).toContain('data-qk-floating-object-width="240"');
    expect(html).toContain("Editable floating text");
    expect(html).not.toContain("position: absolute");
    expect(html).not.toContain("Move object");
    expect(html).not.toContain("Resize object");
    expect(generateJSON(html, extensions)).toMatchObject({
      content: [expect.objectContaining({
        type: "floatingObject",
        attrs: expect.objectContaining({ width: 240, minHeight: 96 })
      })]
    });
  });
});

/**
 * Creates an editor with one provider-backed floating object.
 *
 * @returns Editor whose selection starts inside the nested text root.
 */
function createFloatingObjectEditor(): QuireEditor {
  return new QuireEditor({
    extensions: [StarterKit, FloatingObject],
    content: {
      type: "doc",
      content: [{
        type: "floatingObject",
        content: [{
          type: "paragraph",
          content: [{ type: "text", text: "Editable floating text" }]
        }]
      }]
    }
  });
}

/**
 * Creates an editor whose floating object is bounded by unrelated blocks.
 *
 * @returns Editor suitable for retained invalidation assertions.
 */
function createFloatingObjectEditorWithSurroundingParagraphs(): QuireEditor {
  return new QuireEditor({
    extensions: [StarterKit, FloatingObject],
    content: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Before object" }]
        },
        {
          type: "floatingObject",
          content: [{
            type: "paragraph",
            content: [{ type: "text", text: "Editable floating text" }]
          }]
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "After object" }]
        }
      ]
    }
  });
}

/**
 * Dispatches one key through the installed ProseMirror keymap authority.
 *
 * @param editor - Editor whose plugins should receive the key.
 * @param key - Browser KeyboardEvent key value.
 * @param keyCode - Legacy key code consumed by PM key matching.
 * @returns Whether an installed keymap handled the event.
 */
function dispatchKeyboardShortcut(
  editor: QuireEditor,
  key: string,
  keyCode: number
): boolean {
  const view = {
    get state() {
      return editor.state.pm;
    },
    dispatch(transaction: Transaction): void {
      editor.dispatchTransaction(transaction);
    },
    editable: true
  } as unknown as EditorView;
  const event = {
    key,
    keyCode,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    preventDefault: () => {},
    stopPropagation: () => {}
  } as unknown as KeyboardEvent;

  return editor.state.pm.plugins.some((plugin) =>
    plugin.props.handleKeyDown?.call(plugin, view, event)
  );
}

/**
 * Reads the sole floating object's persisted attributes.
 *
 * @param editor - Editor containing one floating object.
 * @returns Current node attributes.
 */
function readFloatingObjectAttributes(
  editor: QuireEditor
): Readonly<Record<string, unknown>> {
  return editor.state.doc.firstChild?.attrs ?? {};
}

/**
 * Builds one renderer-neutral snapshot for the fixture editor.
 *
 * @param editor - Editor whose provider should execute.
 * @returns Retained layout snapshot.
 */
function buildFloatingObjectSnapshot(editor: QuireEditor): FloatingObjectSnapshot {
  return buildQuireLayoutSnapshot({
    state: editor.state,
    editor,
    viewportRect: { x: 0, y: 0, width: 640, height: 480 }
  });
}

/**
 * Finds one layout node by stable source identity.
 *
 * @param snapshot - Snapshot whose tree should be searched.
 * @param id - Stable layout id.
 * @returns Matching layout node, when present.
 */
function findNodeById(
  snapshot: FloatingObjectSnapshot,
  id: string
): FloatingObjectLayoutNode | undefined {
  return flattenLayoutNodes(snapshot.root).find((node) => node.id === id);
}

/**
 * Reports whether the current render realizes a floating-object manipulation target.
 *
 * @param result - Mounted renderer-neutral result to inspect.
 * @returns Whether selected-owner manipulation chrome is interactive.
 */
function hasFloatingObjectManipulationTarget(
  result: ReturnType<QuireView["buildRenderResult"]>
): boolean {
  return result.interactionSnapshot.hitTargets.some((target) =>
    target.interactionHit?.kind === "widget"
    && target.interactionHit.part?.startsWith("resize-")
  );
}

/**
 * Flattens one retained layout tree.
 *
 * @param node - Current layout node.
 * @returns Current node and every descendant.
 */
function flattenLayoutNodes(
  node: FloatingObjectLayoutNode
): readonly FloatingObjectLayoutNode[] {
  return [
    node,
    ...(node.children ?? []).flatMap((child) => flattenLayoutNodes(child))
  ];
}
