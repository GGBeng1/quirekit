import { expect, it } from "vitest";
import { EditorState } from "@quirekit/cm-state";
import { SourceAnchors } from "./anchors";
import type { MsfeEditor } from "../editor/types";

it("maps existing intents once while retaining anchors captured by the updated view", () => {
  let state = EditorState.create({ doc: "lead diagram" });
  const editor = { get state() { return state; }, captureTarget: () => ({ selection: state.selection }) } as MsfeEditor;
  const anchors = new SourceAnchors(() => editor);
  const existing = anchors.capture({ from: 5, to: 12 });
  const transaction = state.update({ changes: { from: 0, insert: "prefix " } });
  // CM installs the new state and mounts its widgets before the accepted update is published.
  state = transaction.state;
  const mounted = anchors.capture({ from: 12, to: 19 });
  anchors.map([transaction]);
  for (const anchor of [existing, mounted]) {
    expect(anchor.getRange()).toEqual({ from: 12, to: 19 });
    expect(anchor.target()?.selection.main).toMatchObject({ from: 12, to: 19 });
  }
  const undo = state.update({ changes: { from: 0, to: 7 } });
  state = undo.state;
  anchors.map([undo]);
  for (const anchor of [existing, mounted]) expect(anchor.target()?.selection.main).toMatchObject({ from: 5, to: 12 });
});
