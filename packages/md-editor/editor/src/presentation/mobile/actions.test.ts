import { expect, it, vi } from "vitest";
import { EditorSelection, EditorState } from "@quirekit/cm-state";
import type { EditorView } from "@quirekit/cm-view";
import { mobileSelectionActions, mobileSelectionActionsVisible, tapMobileSelection } from "./actions";

vi.mock("@quirekit/msfe-core", () => ({ sourceInputPosition: (_view: EditorView, point: { x: number }) => point.x }));

it("toggles only the existing selected range without changing source, selection or input focus", () => {
  let state = EditorState.create({ doc: "before selected after", selection: { anchor: 7, head: 15 }, extensions: mobileSelectionActions });
  const focus = vi.fn(), initial = state.selection;
  const view = { get state() { return state; }, focus, dispatch: (spec: Parameters<EditorState["update"]>[0]) => { state = state.update(spec).state; } } as unknown as EditorView;
  expect(tapMobileSelection(view, { x: 10, y: 0 })).toBe(true); expect(mobileSelectionActionsVisible(state)).toBe(false);
  expect(state.selection).toBe(initial); expect(state.doc.toString()).toBe("before selected after"); expect(focus).not.toHaveBeenCalled();
  expect(tapMobileSelection(view, { x: 10, y: 0 })).toBe(true); expect(mobileSelectionActionsVisible(state)).toBe(true);
  expect(tapMobileSelection(view, { x: 1, y: 0 })).toBe(false); expect(state.selection).toBe(initial);
  state = state.update({ selection: EditorSelection.single(0, 6) }).state; expect(mobileSelectionActionsVisible(state)).toBe(true);
});
