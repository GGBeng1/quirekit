import { createEditor, type QuireEditor } from "@quirekit/core";
import { TextSelection, type ResolvedPos, type Selection } from "@quirekit/pm";
import { StarterKit } from "@quirekit/starter-kit";
import { describe, expect, it } from "vitest";
import type { QuireLayoutSnapshot } from "@quirekit/view-engine";
import type { QuireLayoutOwnerFacts } from "@quirekit/layout/products";
import { createQuireView } from ".";
import {
  selectQuireViewPointerExpandedHit,
  selectQuireViewPointerHit,
  selectQuireViewPointerHitFromSelectionAnchor,
  selectQuireViewPointerRangeHits
} from "./facade/pointer";
import type {
  QuireViewPointerRangeSelectionResult,
  QuireViewPointerSelectionResult
} from "./types";

describe("QuireView pointer selection", () => {
  it("applies a hit-tested pointer position to the editor selection", () => {
    const editor = createEditorWithParagraphs(["One", "Two"]);
    const view = createQuireView({ editor });

    const result = applyResolvedPointerHit(view, editor, {
      viewportRect: { x: 40, y: 44, width: 300, height: 200 },
      clientPoint: { clientX: 360, clientY: 254 },
      canvasClientRect: { left: 100, top: 200, width: 840, height: 360 }
    });

    expect(result.updated).toBe(true);
    expect(result.selectionDomain).toBe("text");
    expect(result.interactionTarget).toEqual(
      expect.objectContaining({
        domain: "text",
        commandTarget: "editable-text",
        hitKind: "position"
      })
    );
    expect(result.hitTestResult).toEqual(
      expect.objectContaining({
        kind: "position",
        position: { pos: 4, bias: -1 }
      })
    );
    expect(result.hitTestResult.diagnostics?.selection).toEqual(
      expect.objectContaining({
        domain: "text",
        commandTarget: "editable-text",
        hitKind: "position"
      })
    );
    expect(editor.state.pm.selection.from).toBe(4);
    expect(editor.state.pm.selection.empty).toBe(true);
  });

  it("leaves the editor selection unchanged when the pointer misses", () => {
    const editor = createEditorWithParagraphs(["One", "Two"]);
    const view = createQuireView({ editor });
    const previousSelection = editor.state.pm.selection;

    const result = applyResolvedPointerHit(view, editor, {
      viewportRect: { x: 40, y: 44, width: 300, height: 200 },
      clientPoint: { clientX: 120, clientY: 220 },
      canvasClientRect: { left: 100, top: 200, width: 840, height: 360 }
    });

    expect(result.updated).toBe(false);
    expect(result.selectionDomain).toBeUndefined();
    expect(result.interactionTarget).toBeNull();
    expect(result.hitTestResult).toEqual(expect.objectContaining({
      kind: "miss",
      diagnostics: expect.objectContaining({
        querySource: "retained-nearest-caret"
      })
    }));
    expect(editor.state.pm.selection).toBe(previousSelection);
  });

  it("hit-tests same-line page padding as the nearest text caret", () => {
    const editor = createEditorWithParagraphs(["One"]);
    const view = createQuireView({ editor });
    const geometrySnapshot = createPagePaddingTextSnapshot(editor);

    const result = view.hitTestPointer({
      clientPoint: { clientX: 160, clientY: 54 },
      canvasClientRect: { left: 0, top: 0, width: 300, height: 200 },
      geometrySnapshot
    });

    expect(result.hitTestResult).toEqual(
      expect.objectContaining({
        kind: "position",
        position: { pos: 4, bias: -1 }
      })
    );
    expect(result.interactionTarget).toEqual(
      expect.objectContaining({
        domain: "text",
        commandTarget: "editable-text",
        hitKind: "position"
      })
    );
  });

  it("applies pointer selection from same-line page padding", () => {
    const editor = createEditorWithParagraphs(["One"]);
    const view = createQuireView({ editor });
    const geometrySnapshot = createPagePaddingTextSnapshot(editor);

    const result = applyResolvedPointerHit(view, editor, {
      viewportRect: geometrySnapshot.viewportRect,
      clientPoint: { clientX: 160, clientY: 54 },
      canvasClientRect: { left: 0, top: 0, width: 300, height: 200 },
      geometrySnapshot
    });

    expect(result.updated).toBe(true);
    expect(result.hitTestResult).toEqual(
      expect.objectContaining({
        kind: "position",
        position: { pos: 4, bias: -1 }
      })
    );
    expect(editor.state.pm.selection.from).toBe(4);
    expect(editor.state.pm.selection.empty).toBe(true);
  });

  it("uses a caller-provided geometry snapshot for pointer selection", () => {
    const editor = createEditorWithParagraphs(["One", "Two"]);
    const view = createQuireView({ editor });
    const viewportRect = { x: 40, y: 44, width: 300, height: 200 };
    const canvasClientRect = { left: 100, top: 200, width: 840, height: 360 };
    const geometrySnapshot = buildTestPointerGeometrySnapshot(view, {
      viewportRect,
      textMeasurer: {
        measureText: measureFixedText
      }
    });

    const result = applyResolvedPointerHit(view, editor, {
      viewportRect,
      clientPoint: { clientX: 360, clientY: 254 },
      canvasClientRect,
      geometrySnapshot,
      textMeasurer: {
        measureText() {
          throw new Error("point hit testing rebuilt layout instead of reusing snapshot");
        }
      }
    });

    expect(result.updated).toBe(true);
    expect(result.geometrySnapshot).toBe(geometrySnapshot);
    expect(editor.state.pm.selection.from).toBe(4);
  });

  it("applies a pointer drag range as a ProseMirror text selection", () => {
    const editor = createEditorWithParagraphs(["One", "Two"]);
    const view = createQuireView({ editor });

    const result = applyResolvedPointerRangeHits(view, editor, {
      viewportRect: { x: 40, y: 44, width: 300, height: 200 },
      anchorClientPoint: { clientX: 140, clientY: 254 },
      headClientPoint: { clientX: 360, clientY: 254 },
      canvasClientRect: { left: 100, top: 200, width: 840, height: 360 }
    });

    expect(result.updated).toBe(true);
    expect(result.selectionDomain).toBe("text");
    expect(result.anchorHitTestResult.kind).toBe("position");
    expect(result.headHitTestResult.kind).toBe("position");
    expect(editor.state.pm.selection.empty).toBe(false);
    expect(editor.state.pm.selection.from).toBe(1);
    expect(editor.state.pm.selection.to).toBe(4);
  });

  it("extends pointer drag ranges when the head enters page-margin blank space", () => {
    const editor = createEditorWithParagraphs(["One"]);
    const view = createQuireView({ editor });
    const geometrySnapshot = createPageMarginTextSnapshot(editor);

    const result = applyResolvedPointerRangeHits(view, editor, {
      viewportRect: geometrySnapshot.viewportRect,
      anchorClientPoint: { clientX: 42, clientY: 54 },
      headClientPoint: { clientX: 160, clientY: 120 },
      canvasClientRect: { left: 0, top: 0, width: 300, height: 200 },
      geometrySnapshot
    });

    expect(result.updated).toBe(true);
    expect(result.anchorHitTestResult.kind).toBe("position");
    expect(result.headHitTestResult).toEqual(
      expect.objectContaining({
        kind: "position",
        position: { pos: 4, bias: -1 }
      })
    );
    expect(editor.state.pm.selection.empty).toBe(false);
    expect(editor.state.pm.selection.from).toBe(1);
    expect(editor.state.pm.selection.to).toBe(4);
  });

  it("uses a caller-provided geometry snapshot for pointer drag ranges", () => {
    const editor = createEditorWithParagraphs(["One", "Two"]);
    const view = createQuireView({ editor });
    const viewportRect = { x: 40, y: 44, width: 300, height: 200 };
    const canvasClientRect = { left: 100, top: 200, width: 840, height: 360 };
    const geometrySnapshot = buildTestPointerGeometrySnapshot(view, {
      viewportRect,
      textMeasurer: {
        measureText: measureFixedText
      }
    });

    const result = applyResolvedPointerRangeHits(view, editor, {
      viewportRect,
      anchorClientPoint: { clientX: 140, clientY: 254 },
      headClientPoint: { clientX: 360, clientY: 254 },
      canvasClientRect,
      geometrySnapshot,
      textMeasurer: {
        measureText() {
          throw new Error("range hit testing rebuilt layout instead of reusing snapshot");
        }
      }
    });

    expect(result.updated).toBe(true);
    expect(result.geometrySnapshot).toBe(geometrySnapshot);
    expect(editor.state.pm.selection.from).toBe(1);
    expect(editor.state.pm.selection.to).toBe(4);
  });

  it("extends pointer selection from the current selection anchor", () => {
    const editor = createEditorWithParagraphs(["One", "Two"]);
    const view = createQuireView({ editor });

    editor.dispatchTransaction(
      editor.state.pm.tr.setSelection(TextSelection.create(editor.state.doc, 1))
    );

    const result = applyResolvedPointerHitFromSelectionAnchor(view, editor, {
      viewportRect: { x: 40, y: 44, width: 300, height: 200 },
      clientPoint: { clientX: 360, clientY: 254 },
      canvasClientRect: { left: 100, top: 200, width: 840, height: 360 }
    });

    expect(result.updated).toBe(true);
    expect(result.hitTestResult.kind).toBe("position");
    expect(editor.state.pm.selection.empty).toBe(false);
    expect(editor.state.pm.selection.from).toBe(1);
    expect(editor.state.pm.selection.to).toBe(4);
  });

  it("lets callers override pointer drag selection creation", () => {
    const editor = createEditorWithParagraphs(["One", "Two"]);
    const view = createQuireView({ editor });
    const calls: string[] = [];

    const result = applyResolvedPointerRangeHits(view, editor, {
      viewportRect: { x: 40, y: 44, width: 300, height: 200 },
      anchorClientPoint: { clientX: 140, clientY: 254 },
      headClientPoint: { clientX: 360, clientY: 254 },
      canvasClientRect: { left: 100, top: 200, width: 840, height: 360 },
      createSelectionBetween(anchor, head) {
        calls.push(`${anchor.pos}:${head.pos}`);

        return TextSelection.create(editor.state.doc, head.pos);
      }
    });

    expect(result.updated).toBe(true);
    expect(calls).toEqual(["1:4"]);
    expect(editor.state.pm.selection.empty).toBe(true);
    expect(editor.state.pm.selection.from).toBe(4);
  });

  it("applies a double-click word selection from a hit-tested pointer position", () => {
    const editor = createEditorWithParagraphs(["hello world"]);
    const view = createQuireView({ editor });

    const result = applyResolvedPointerExpandedHit(view, editor, {
      viewportRect: { x: 40, y: 44, width: 300, height: 200 },
      clientPoint: { clientX: 165, clientY: 254 },
      canvasClientRect: { left: 100, top: 200, width: 840, height: 360 },
      kind: "word"
    });

    expect(result.updated).toBe(true);
    expect(result.hitTestResult.kind).toBe("position");
    expect(editor.state.pm.selection.empty).toBe(false);
    expect(editor.state.pm.selection.from).toBe(1);
    expect(editor.state.pm.selection.to).toBe(6);
  });

  it("applies a triple-click textblock selection from a hit-tested pointer position", () => {
    const editor = createEditorWithParagraphs(["hello world"]);
    const view = createQuireView({ editor });

    const result = applyResolvedPointerExpandedHit(view, editor, {
      viewportRect: { x: 40, y: 44, width: 300, height: 200 },
      clientPoint: { clientX: 205, clientY: 254 },
      canvasClientRect: { left: 100, top: 200, width: 840, height: 360 },
      kind: "textblock"
    });

    expect(result.updated).toBe(true);
    expect(result.hitTestResult.kind).toBe("position");
    expect(editor.state.pm.selection.empty).toBe(false);
    expect(editor.state.pm.selection.from).toBe(1);
    expect(editor.state.pm.selection.to).toBe(12);
  });
});

/** Options used by tests to exercise the resolved-hit pointer point path. */
interface TestPointerSelectionOptions {
  /** Viewport rectangle used to build or reuse pointer geometry. */
  readonly viewportRect: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
  /** Browser client point that should be hit-tested. */
  readonly clientPoint: { readonly clientX: number; readonly clientY: number };
  /** Mounted surface client rectangle used to project client coordinates. */
  readonly canvasClientRect: {
    readonly left: number;
    readonly top: number;
    readonly width: number;
    readonly height: number;
  };
  /** Optional prebuilt geometry snapshot reused by hit testing. */
  readonly geometrySnapshot?: QuireLayoutSnapshot | undefined;
  /** Optional text measurer passed to endpoint hit testing. */
  readonly textMeasurer?:
    | { measureText(text: string, font?: string): { readonly width: number } }
    | undefined;
}

/** Options used by tests to exercise resolved-hit expanded pointer selection. */
interface TestPointerExpandedSelectionOptions extends TestPointerSelectionOptions {
  /** Expanded text selection kind to apply to the resolved hit. */
  readonly kind: "word" | "textblock";
}

/**
 * Applies pointer selection through the canonical resolved-hit path.
 *
 * @param view - View facade used only for endpoint hit production.
 * @param editor - Editor whose PM state should receive the selection.
 * @param options - Pointer point and optional geometry/test hooks.
 * @returns Pointer selection result produced by shared selection semantics.
 */
function applyResolvedPointerHit(
  view: ReturnType<typeof createQuireView>,
  editor: QuireEditor,
  options: TestPointerSelectionOptions
): QuireViewPointerSelectionResult {
  const hit = resolveTestPointerHit(view, options);

  return selectQuireViewPointerHit({
    state: editor.state.pm,
    dispatchTransaction: (transaction) =>
      editor.dispatchTransaction(transaction),
    geometrySnapshot: hit.geometrySnapshot,
    hitTestResult: hit.hitTestResult
  });
}

/**
 * Extends pointer selection from the current selection anchor through a resolved hit.
 *
 * @param view - View facade used only for endpoint hit production.
 * @param editor - Editor whose PM state should receive the selection.
 * @param options - Pointer point and optional geometry/test hooks.
 * @returns Pointer selection result produced by shared selection semantics.
 */
function applyResolvedPointerHitFromSelectionAnchor(
  view: ReturnType<typeof createQuireView>,
  editor: QuireEditor,
  options: TestPointerSelectionOptions
): QuireViewPointerSelectionResult {
  const hit = resolveTestPointerHit(view, options);

  return selectQuireViewPointerHitFromSelectionAnchor({
    state: editor.state.pm,
    dispatchTransaction: (transaction) =>
      editor.dispatchTransaction(transaction),
    geometrySnapshot: hit.geometrySnapshot,
    hitTestResult: hit.hitTestResult
  });
}

/**
 * Applies expanded pointer selection through the canonical resolved-hit path.
 *
 * @param view - View facade used only for endpoint hit production.
 * @param editor - Editor whose PM state should receive the selection.
 * @param options - Pointer point, expanded kind, and optional geometry/test hooks.
 * @returns Pointer selection result produced by shared selection semantics.
 */
function applyResolvedPointerExpandedHit(
  view: ReturnType<typeof createQuireView>,
  editor: QuireEditor,
  options: TestPointerExpandedSelectionOptions
): QuireViewPointerSelectionResult {
  const hit = resolveTestPointerHit(view, options);

  return selectQuireViewPointerExpandedHit({
    state: editor.state.pm,
    dispatchTransaction: (transaction) =>
      editor.dispatchTransaction(transaction),
    geometrySnapshot: hit.geometrySnapshot,
    hitTestResult: hit.hitTestResult,
    kind: options.kind
  });
}

/**
 * Resolves a pointer hit for selection tests without applying selection semantics.
 *
 * @param view - View facade used for endpoint hit production.
 * @param options - Pointer point and optional geometry/test hooks.
 * @returns Pointer hit-test result from the view facade.
 */
function resolveTestPointerHit(
  view: ReturnType<typeof createQuireView>,
  options: TestPointerSelectionOptions
): ReturnType<ReturnType<typeof createQuireView>["hitTestPointer"]> {
  const geometrySnapshot =
    options.geometrySnapshot ?? buildTestPointerGeometrySnapshot(view, options);

  return view.hitTestPointer({
    geometrySnapshot,
    clientPoint: options.clientPoint,
    canvasClientRect: options.canvasClientRect
  });
}

/** Options used by tests to exercise the resolved-hit pointer range path. */
interface TestPointerRangeSelectionOptions {
  /** Viewport rectangle used to build or reuse pointer geometry. */
  readonly viewportRect: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
  /** Browser client point that anchors the range. */
  readonly anchorClientPoint: { readonly clientX: number; readonly clientY: number };
  /** Browser client point that becomes the moving range head. */
  readonly headClientPoint: { readonly clientX: number; readonly clientY: number };
  /** Mounted surface client rectangle used to project client coordinates. */
  readonly canvasClientRect: {
    readonly left: number;
    readonly top: number;
    readonly width: number;
    readonly height: number;
  };
  /** Optional prebuilt geometry snapshot reused by both endpoint hit tests. */
  readonly geometrySnapshot?: QuireLayoutSnapshot | undefined;
  /** Optional text measurer passed to endpoint hit testing. */
  readonly textMeasurer?:
    | { measureText(text: string, font?: string): { readonly width: number } }
    | undefined;
  /** Optional PM selection-between hook used by range semantics. */
  readonly createSelectionBetween?:
    | ((anchor: ResolvedPos, head: ResolvedPos) => Selection | null)
    | undefined;
}

/**
 * Applies pointer range selection through the canonical resolved-hit path.
 *
 * @param view - View facade used only for endpoint hit production.
 * @param editor - Editor whose PM state should receive the range selection.
 * @param options - Endpoint points and optional geometry/test hooks.
 * @returns Pointer range selection result produced by shared selection semantics.
 */
function applyResolvedPointerRangeHits(
  view: ReturnType<typeof createQuireView>,
  editor: QuireEditor,
  options: TestPointerRangeSelectionOptions
): QuireViewPointerRangeSelectionResult {
  const geometrySnapshot =
    options.geometrySnapshot ?? buildTestPointerGeometrySnapshot(view, options);
  const anchorHit = view.hitTestPointer({
    geometrySnapshot,
    clientPoint: options.anchorClientPoint,
    canvasClientRect: options.canvasClientRect
  });
  const headHit = view.hitTestPointer({
    geometrySnapshot,
    clientPoint: options.headClientPoint,
    canvasClientRect: options.canvasClientRect
  });

  return selectQuireViewPointerRangeHits({
    state: editor.state.pm,
    dispatchTransaction: (transaction) =>
      editor.dispatchTransaction(transaction),
    geometrySnapshot,
    anchorHitTestResult: anchorHit.hitTestResult,
    headHitTestResult: headHit.hitTestResult,
    ...(options.createSelectionBetween === undefined
      ? {}
      : { createSelectionBetween: options.createSelectionBetween })
  });
}

/**
 * Builds the retained interaction snapshot that production pointer hit testing
 * receives from a render pass.
 *
 * @param view - View facade used to build render artifacts.
 * @param options - Test options carrying viewport and optional text measurement.
 * @returns Render-time interaction geometry snapshot.
 */
function buildTestPointerGeometrySnapshot(
  view: ReturnType<typeof createQuireView>,
  options: {
    readonly viewportRect: TestPointerSelectionOptions["viewportRect"];
    readonly textMeasurer?: TestPointerSelectionOptions["textMeasurer"];
  }
): QuireLayoutSnapshot {
  return view.buildRenderResult({
    viewportRect: options.viewportRect,
    ...(options.textMeasurer === undefined
      ? {}
      : { textMeasurer: options.textMeasurer })
  }).interactionSnapshot;
}

/**
 * Creates an editor whose document contains one paragraph for each text value.
 *
 * @param texts - Paragraph text content values.
 * @returns Editor containing the requested paragraph document.
 */
function createEditorWithParagraphs(texts: readonly string[]): QuireEditor {
  const editor = createEditor({
    extensions: [StarterKit.configure({ undoRedo: false })]
  });
  const paragraphType = editor.state.schema.nodes.paragraph;
  const docType = editor.state.schema.nodes.doc;

  if (!paragraphType || !docType) {
    throw new Error("Starter kit schema did not provide doc and paragraph nodes.");
  }

  editor.setContent(
    docType.create(
      null,
      texts.map((text) => paragraphType.create(null, editor.state.schema.text(text)))
    )
  );

  return editor;
}

/**
 * Creates a one-paragraph snapshot with same-line page padding beside text.
 *
 * @param editor - Editor whose state owns the document positions.
 * @returns Layout snapshot used to reproduce clicks in same-line page padding.
 */
function createPagePaddingTextSnapshot(editor: QuireEditor): QuireLayoutSnapshot {
  const layoutOwner = createBodyLayoutOwner({ from: 0, to: 5 });
  return {
    state: editor.state,
    documentRect: { x: 40, y: 44, width: 300, height: 120 },
    viewportRect: { x: 40, y: 44, width: 300, height: 200 },
    domOverlays: [],
    hitTargets: [],
    root: {
      id: "doc",
      kind: "block",
      range: { from: 0, to: 5 },
      rect: { x: 40, y: 44, width: 300, height: 120 },
      children: [
        {
          id: "paragraph-0",
          kind: "block",
          range: { from: 0, to: 5 },
          rect: { x: 40, y: 44, width: 30, height: 24 },
          layoutOwner,
          textFragments: [
            {
              id: "paragraph-0:text-0",
              text: "One",
              range: { from: 1, to: 4 },
              rect: { x: 40, y: 44, width: 30, height: 24 },
              font: "16px sans-serif",
              lineHeight: 24,
              baseline: 62,
              caretStops: [
                { position: { pos: 1, bias: 1 }, localX: 0 },
                { position: { pos: 2, bias: 0 }, localX: 10 },
                { position: { pos: 3, bias: 0 }, localX: 20 },
                { position: { pos: 4, bias: -1 }, localX: 30 }
              ]
            }
          ],
          children: []
        }
      ]
    }
  };
}

/**
 * Creates a one-paragraph snapshot with page-margin blank space below text.
 *
 * @param editor - Editor whose state owns the document positions.
 * @returns Layout snapshot used to reproduce drag heads in page-margin blanks.
 */
function createPageMarginTextSnapshot(editor: QuireEditor): QuireLayoutSnapshot {
  const layoutOwner = createBodyLayoutOwner({ from: 0, to: 5 });
  return {
    state: editor.state,
    documentRect: { x: 40, y: 44, width: 300, height: 120 },
    viewportRect: { x: 40, y: 44, width: 300, height: 200 },
    domOverlays: [],
    hitTargets: [],
    root: {
      id: "doc",
      kind: "block",
      range: { from: 0, to: 5 },
      rect: { x: 40, y: 44, width: 300, height: 120 },
      children: [
        {
          id: "paragraph-0",
          kind: "block",
          range: { from: 0, to: 5 },
          rect: { x: 40, y: 44, width: 300, height: 24 },
          layoutOwner,
          textFragments: [
            {
              id: "paragraph-0:text-0",
              text: "One",
              range: { from: 1, to: 4 },
              rect: { x: 40, y: 44, width: 30, height: 24 },
              font: "16px sans-serif",
              lineHeight: 24,
              baseline: 62,
              caretStops: [
                { position: { pos: 1, bias: 1 }, localX: 0 },
                { position: { pos: 2, bias: 0 }, localX: 10 },
                { position: { pos: 3, bias: 0 }, localX: 20 },
                { position: { pos: 4, bias: -1 }, localX: 30 }
              ]
            }
          ],
          children: []
        }
      ]
    }
  };
}

/**
 * Creates explicit body owner facts for hand-built selection snapshots.
 *
 * @param range - Document range represented by the body fixture.
 * @returns Complete region-owned layout facts.
 */
function createBodyLayoutOwner(
  range: { readonly from: number; readonly to: number }
): QuireLayoutOwnerFacts {
  const capabilities = {
    editable: true,
    selectable: true,
    focusable: true,
    copyable: true,
    commandable: true,
    accessible: true
  };
  return {
    region: {
      rootId: { value: "root:body" },
      regionId: { value: "region:body" },
      kind: "body"
    },
    source: { sourceId: "doc:body", range },
    capabilities
  };
}

/**
 * Measures text with a deterministic fixed-width test font.
 *
 * @param text - Text value to measure.
 * @returns Fixed-width text metrics.
 */
function measureFixedText(text: string): { readonly width: number } {
  return { width: Array.from(text).length * 10 };
}
