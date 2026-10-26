import { afterEach, describe, expect, it, vi } from "vitest";
import { EditorState, type TransactionSpec } from "@quirekit/cm-state";
import { EditorView } from "@quirekit/cm-view";
import { history, undoDepth } from "@quirekit/cm-commands";
import { sourceRevealSetting } from "./visibility";
import { readSourcePresentation } from "./state";
import { revealSelectionEffect, revealSelectionField } from "./gesture";
import { compositionEffect, compositionField, modeFacet } from "../state/fields";
import type { MsfeEditor } from "../editor/types";

// The setting's input deferral is independent of the measured scroll owner.
vi.mock("../mount/scroll", () => ({ captureScrollAnchor: () => undefined, scrollAnchorEffects: () => [], restoreScrollAnchor: () => () => {} }));

afterEach(() => vi.restoreAllMocks());

describe("source visibility preference", () => {
  it("preserves the existing default for unconfigured MSFE consumers", () => {
    expect(readSourcePresentation(EditorState.create()).reveal).toBe("selection");
  });

  for (const gesture of ["pointer", "composition"] as const) it(`defers ${gesture} changes and preserves text, selection and undo`, () => {
    let state = EditorState.create({ doc: "# Heading", selection: { anchor: 5 }, extensions: [history(), modeFacet.of("live"),
      compositionField, revealSelectionField, sourceRevealSetting.extension(() => "hidden")] });
    state = state.update({ changes: { from: 9, insert: "!" } }).state;
    const doc = state.doc, selection = state.selection, depth = undoDepth(state);
    const view = { get state() { return state; }, scrollSnapshot: () => revealSelectionEffect.of(state.field(revealSelectionField)),
      dispatch: (spec: TransactionSpec) => { state = state.update(spec).state; } };
    vi.spyOn(EditorView, "findFromDOM").mockReturnValue(view as unknown as EditorView);
    const editor = { scope: { disposed: false }, element: {}, get state() { return state; } } as unknown as MsfeEditor;
    state = state.update({ effects: gesture === "pointer" ? revealSelectionEffect.of(selection) : compositionEffect.of(true) }).state;
    expect(sourceRevealSetting.set(editor, "selection")).toEqual({ ok: true });
    expect(sourceRevealSetting.requested(state)).toBe("selection");
    expect(readSourcePresentation(state).reveal).toBe("hidden");
    state = state.update({ effects: gesture === "pointer" ? revealSelectionEffect.of(null) : compositionEffect.of(false) }).state;
    expect(readSourcePresentation(state).reveal).toBe("selection");
    expect(state.doc).toBe(doc);
    expect(state.selection).toBe(selection);
    expect(undoDepth(state)).toBe(depth);
    expect(state.readOnly).toBe(false);
  });
});
