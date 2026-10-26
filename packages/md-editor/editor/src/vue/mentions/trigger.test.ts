import { describe, expect, it, vi } from "vitest";
import { EditorState } from "@quirekit/cm-state";
import { EditorView } from "@quirekit/cm-view";
import { createMdDocumentLinkTrigger, createMdMentionTrigger } from "./trigger";

describe("mention trigger initialization", () => {
  it("compiles before an editor exists and defers instance access until accepted input", () => {
    const readEditor = vi.fn(() => { throw new Error("editor-not-created"); });
    const open = vi.fn();
    const trigger = createMdMentionTrigger(open);
    if (!("resolve" in trigger)) throw new Error("Expected an authored extension");
    const feature = trigger.resolve(readEditor);
    const state = EditorState.create({ extensions: feature.extensions ?? [] });
    expect(state.facet(EditorView.updateListener)).toHaveLength(1);
    expect(readEditor).not.toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled();
  });

  it("compiles the [[ document link trigger the same way", () => {
    const trigger = createMdDocumentLinkTrigger(() => {});
    if (!("resolve" in trigger)) throw new Error("Expected an authored extension");
    const feature = trigger.resolve(() => { throw new Error("editor-not-created"); });
    expect(EditorState.create({ extensions: feature.extensions ?? [] }).facet(EditorView.updateListener)).toHaveLength(1);
  });
});
