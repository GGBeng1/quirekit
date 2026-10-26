import { describe, expect, it, vi } from "vitest";
import { EditorState } from "@quirekit/cm-state";
import type { MsfeEditor, MsfeSourceRange } from "@quirekit/msfe-core";
import { toolbarItems } from "./configuration";

describe("always-mounted toolbar work", () => {
  it("queries only selection starts and never executes edit planners or serializes a document", () => {
    const state = EditorState.create({ doc: "A paragraph.\n".repeat(10_000), selection: { anchor: 0, head: 90_000 } });
    const querySource = vi.fn((_name: string, range: MsfeSourceRange) => {
      expect(range.from).toBe(range.to);
      return { status: "ready", matches: [] };
    });
    const editor = { state, storage: {}, querySource, history: { canUndo: false, canRedo: false },
      can: () => { throw new Error("Status must not plan a mutation"); },
      getMarkdown: () => { throw new Error("Status must not copy source"); },
    } as unknown as MsfeEditor;
    toolbarItems(editor, "zh-CN");
    expect(querySource.mock.calls.length).toBeLessThanOrEqual(9);
  });
});
