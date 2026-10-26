import { describe, expect, it, vi } from "vitest";
import { EditorSelection, EditorState } from "@quirekit/cm-state";
import type { MsfeEditor, MsfeTarget } from "@quirekit/msfe-core";
import { compositionEffect, compositionField } from "@quirekit/msfe-core/state";
import { previewTarget } from "./target";

describe("host preview editing", () => {
  it("passes the freshly mapped interval, preserves default reveal, and rejects stale/read-only requests", () => {
    let target: MsfeTarget | null = { instanceId: "editor", documentId: "document", revision: 2, selection: EditorSelection.single(20, 30) };
    const release = vi.fn(), setSelection = vi.fn(), focus = vi.fn(), edit = vi.fn(() => true);
    let state = EditorState.create({ extensions: [compositionField] });
    const editor = { get state() { return state; }, mode: "live", captureAnchor: () => ({ target: () => target, release }), setSelection, focus } as unknown as MsfeEditor;
    const preview = previewTarget(editor, { from: 5, to: 15 }, edit, "inlineMath");
    expect(preview.reveal()).toBe(true);
    expect(edit).toHaveBeenCalledWith({ editor, range: { from: 20, to: 30 }, kind: "inlineMath" });
    expect(setSelection).not.toHaveBeenCalled();
    const basic = previewTarget(editor, { from: 20, to: 30 });
    expect(basic.reveal()).toBe(true);
    expect(setSelection.mock.calls[0]![0].main.head).toBe(20);
    state = state.update({ effects: compositionEffect.of(true) }).state;
    expect(preview.reveal()).toBe(false); expect(basic.reveal()).toBe(false);
    expect(setSelection).toHaveBeenCalledOnce(); expect(focus).toHaveBeenCalledOnce();
    state = EditorState.create({ extensions: [EditorState.readOnly.of(true)] });
    expect(preview.reveal()).toBe(false);
    state = EditorState.create(); target = null; expect(preview.reveal()).toBe(false);
    expect(edit).toHaveBeenCalledTimes(1);
    preview.release(); expect(release).toHaveBeenCalledOnce();
  });
});
