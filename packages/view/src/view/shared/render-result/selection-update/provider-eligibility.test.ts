import { createQuireView } from "../../../facade";
import { createEditor, Mark, type QuireAnyExtension } from "@quirekit/core";
import { Decoration, DecorationSet, Plugin, PluginKey, type EditorState } from "@quirekit/pm";
import { StarterKit } from "@quirekit/starter-kit";
import {
  deriveQuireViewUpdatePatch,
  type QuireDecorationSourceView
} from "@quirekit/view-engine";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { QuireViewBuildOptions, QuireViewRenderResult } from "../../../types";
import {
  canReuseMountedSelectionOverlayRenderResult,
  createMountedSelectionUpdateRenderResult
} from ".";

const editors: ReturnType<typeof createEditor>[] = [];
afterEach(() => editors.splice(0).forEach(editor => editor.destroy()));

describe("selection reuse with real decoration providers", () => {
  it("requires current geometry and invalidation authority even with no decoration providers", () => {
    const fixture = createFixture();
    const source: QuireDecorationSourceView = { state: fixture.editor.state.pm, someProp: () => undefined };
    const previous = fixture.full(source);
    fixture.editor.commands.setTextSelection(3);
    expect(fixture.canReuse(previous, source)).toBe(true);
    expect(fixture.canReuse(previous, source, {
      viewportRect: { x: 0, y: 0, width: 160, height: 200 }
    })).toBe(false);
    expect(fixture.canReuse(previous, source, {
      updatePatch: deriveQuireViewUpdatePatch({ reason: "image-epoch" })
    })).toBe(false);
    expect(fixture.canReuse(previous, source, {
      displayListStyles: { textFillStyle: "#ff0000" }
    })).toBe(false);
    expect(canReuseMountedSelectionOverlayRenderResult({
      previousRenderResult: previous,
      state: fixture.editor.state,
      decorationSourceView: source
    })).toBe(false);
  });

  it("captures mutable paint values and rejects opaque transforms", () => {
    const fixture = createFixture();
    const source: QuireDecorationSourceView = {
      state: fixture.editor.state.pm, someProp: () => undefined
    };
    const displayListStyles = { textFillStyle: "#111111" };
    const previous = fixture.full(source, { displayListStyles });
    expect(fixture.canReuse(previous, source, { displayListStyles })).toBe(true);
    displayListStyles.textFillStyle = "#ffffff";
    expect(fixture.canReuse(previous, source, { displayListStyles })).toBe(false);
    const displayListTransform: NonNullable<QuireViewBuildOptions["displayListTransform"]> = (list) => list;
    const transformed = fixture.full(source, { displayListTransform });
    expect(fixture.canReuse(transformed, source, { displayListTransform })).toBe(false);
  });

  it("retains the layout proof through consecutive overlay-only snapshot copies", () => {
    const fixture = createFixture();
    const source: QuireDecorationSourceView = { state: fixture.editor.state.pm, someProp: () => undefined };
    let previous = fixture.full(source);
    for (const position of [2, 4, 1]) {
      fixture.editor.commands.setTextSelection(position);
      expect(fixture.canReuse(previous, source)).toBe(true);
      previous = fixture.update(previous, source);
      expect(previous.layoutSnapshot.state).toBe(fixture.editor.state);
    }
    expectPaintParity(previous, fixture.full(source));
  });

  it("does not bypass an unknown style resolver through the mounted fast path", () => {
    const fixture = createFixture([Mark.create({
      name: "dynamic-layout",
      canvasStyle: () => ({ color: "#123456" })
    })]);
    const source: QuireDecorationSourceView = { state: fixture.editor.state.pm, someProp: () => undefined };
    const previous = fixture.full(source);
    fixture.editor.commands.setTextSelection(3);
    expect(fixture.canReuse(previous, source)).toBe(false);
  });

  it("matches full paint when a selection provider changes empty to nonempty and back", () => {
    const fixture = createFixture();
    const provider = vi.fn((state: EditorState) => (
      state.selection.empty ? null : createDecoration(state)
    ));
    fixture.editor.setEditorProps({ decorations: provider });
    const previous = fixture.full();
    expect(previous.decorationLane.backgrounds).toHaveLength(0);
    fixture.editor.commands.setTextSelection({ from: 1, to: 4 });
    const selected = fixture.update(previous);
    expect(provider).toHaveBeenCalledTimes(2);
    expect(selected.decorationLane.backgrounds.length).toBeGreaterThan(0);
    expect(selected.viewTargets.length).toBeGreaterThan(0);
    expectPaintParity(selected, fixture.full());
    fixture.editor.commands.setTextSelection(2);
    const collapsed = fixture.update(selected);
    expect(collapsed.decorationLane.backgrounds).toHaveLength(0);
    expect(collapsed.viewTargets).toHaveLength(0);
    expectPaintParity(collapsed, fixture.full());
  });

  it("observes same-document plugin metadata without running the provider during admission", () => {
    const fixture = createFixture();
    const key = new PluginKey<boolean>("selection-decoration-meta");
    const provider = vi.fn((state: EditorState) => (
      key.getState(state) ? createDecoration(state) : null
    ));
    fixture.editor.registerPlugin(new Plugin({
      key,
      state: {
        init: () => false,
        apply: (transaction, previous) => transaction.getMeta(key) ?? previous
      },
      props: { decorations: provider }
    }));
    const previous = fixture.full();
    const doc = fixture.editor.state.doc;
    fixture.editor.view.dispatch(fixture.editor.state.pm.tr.setMeta(key, true));
    expect(fixture.editor.state.doc).toBe(doc);
    expect(fixture.canReuse(previous)).toBe(false);
    expect(provider).toHaveBeenCalledOnce();
    const enabled = fixture.update(previous);
    expectPaintParity(enabled, fixture.full());
    expect(enabled.decorationLane.backgrounds.length).toBeGreaterThan(0);
    fixture.editor.view.dispatch(fixture.editor.state.pm.tr.setMeta(key, false));
    const disabled = fixture.update(enabled);
    expect(disabled.decorationLane.backgrounds).toHaveLength(0);
    expectPaintParity(disabled, fixture.full());
  });

  it("rechecks direct providers added or replaced after an empty frame", () => {
    const fixture = createFixture();
    const previous = fixture.full();
    const empty = vi.fn(() => null);
    fixture.editor.setEditorProps({ decorations: empty });
    expect(fixture.canReuse(previous)).toBe(false);
    expect(empty).not.toHaveBeenCalled();
    const readFrameOptions = vi.fn(() => undefined);
    expect(canReuseMountedSelectionOverlayRenderResult({
      previousRenderResult: previous,
      state: fixture.editor.state,
      decorationSourceView: fixture.editor.view,
      frameOptions: readFrameOptions
    })).toBe(false);
    expect(readFrameOptions).not.toHaveBeenCalled();
    fixture.editor.setEditorProps({ decorations: createDecoration });
    const decorated = fixture.update(previous);
    expect(decorated.decorationLane.backgrounds.length).toBeGreaterThan(0);
    expectPaintParity(decorated, fixture.full());
  });

  it("clears retained paint after removing its provider before admitting reuse", () => {
    const fixture = createFixture();
    fixture.editor.setEditorProps({ decorations: createDecoration });
    const decorated = fixture.full();
    const emptySource: QuireDecorationSourceView = {
      state: fixture.editor.state.pm,
      someProp: () => undefined
    };
    expect(fixture.canReuse(decorated, emptySource)).toBe(false);
    const cleared = fixture.full(emptySource);
    expect(cleared.decorationLane.backgrounds).toHaveLength(0);
    expect(fixture.canReuse(cleared, emptySource)).toBe(true);
  });

  it("requires source proof while retaining the no-provider fast path", () => {
    const fixture = createFixture();
    const source: QuireDecorationSourceView = {
      state: fixture.editor.state.pm,
      someProp: () => undefined
    };
    const previous = fixture.full(source);
    fixture.editor.commands.setTextSelection({ from: 1, to: 4 });
    expect(fixture.canReuse(previous, source)).toBe(true);
    expect(canReuseMountedSelectionOverlayRenderResult({
      previousRenderResult: previous,
      state: fixture.editor.state
    })).toBe(false);
    expectPaintParity(fixture.update(previous, source), fixture.full(source));
  });
});

/**
 * Creates a real PM/Core/View Engine fixture without browser measurement.
 * @param extensions - Additional layout contributions for admission checks.
 * @returns Independent editor and full/selection render entry points.
 */
function createFixture(extensions: QuireAnyExtension[] = []) {
  const editor = createEditor({
    extensions: [StarterKit.configure({ undoRedo: false }), ...extensions],
    content: {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "abcdef" }] }]
    }
  });
  editors.push(editor);
  const view = createQuireView({ editor });
  const viewportRect = { x: 0, y: 0, width: 320, height: 200 };
  return { editor, full, canReuse, update };

  /**
   * @param source - Current mounted provider source.
   * @param frameOverrides - Exact full-build policy inputs.
   * @returns Full render oracle.
   */
  function full(
    source: QuireDecorationSourceView = editor.view,
    frameOverrides: Partial<QuireViewBuildOptions> = {}
  ): QuireViewRenderResult {
    return view.buildRenderResult({ viewportRect, decorationSourceView: source, ...frameOverrides });
  }

  /**
   * @param previous - Last committed render.
   * @param source - Current mounted provider source.
   * @param frameOverrides - Changed current layout or presentation inputs.
   * @returns Whether selection reuse is admitted without provider execution.
   */
  function canReuse(
    previous: QuireViewRenderResult,
    source: QuireDecorationSourceView = editor.view,
    frameOverrides: Partial<QuireViewBuildOptions> = {}
  ): boolean {
    const options = {
      previousRenderResult: previous,
      state: editor.state,
      decorationSourceView: source,
      requireMaterializedSelectionTextblock: true,
      frameOptions: {
        viewportRect,
        updatePatch: deriveQuireViewUpdatePatch({ reason: "selection" }),
        ...frameOverrides
      }
    };
    return canReuseMountedSelectionOverlayRenderResult(options);
  }

  /**
   * @param previous - Last committed render.
   * @param source - Current mounted provider source.
   * @returns The production admission choice projected through the real engine.
   */
  function update(previous: QuireViewRenderResult, source: QuireDecorationSourceView = editor.view): QuireViewRenderResult {
    return canReuse(previous, source)
      ? createMountedSelectionUpdateRenderResult({
          previousRenderResult: previous,
          state: editor.state,
          rebuildCompositeDisplayList: true
        })
      : full(source);
  }
}

/** @param state - Current PM state. @returns Selection-independent visible decoration. */
function createDecoration(state: EditorState): DecorationSet {
  return DecorationSet.create(state.doc, [Decoration.inline(1, 4, {
    style: "background-color: #ffff00; cursor: pointer"
  }, { key: "provider-proof" })]);
}

/**
 * @param actual - Admitted update result.
 * @param oracle - Unconditional full render for exactly the same state.
 */
function expectPaintParity(actual: QuireViewRenderResult, oracle: QuireViewRenderResult): void {
  expect(actual.decorationLane).toEqual(oracle.decorationLane);
  // Mounted backends paint retained content and overlay surfaces separately.
  expect(actual.contentDisplayList.commands).toEqual(oracle.contentDisplayList.commands);
  expect(actual.overlayDisplayList.commands).toEqual(oracle.overlayDisplayList.commands);
  expect(actual.viewTargets).toEqual(oracle.viewTargets);
  expect(actual.selectionGeometry).toEqual(oracle.selectionGeometry);
}
