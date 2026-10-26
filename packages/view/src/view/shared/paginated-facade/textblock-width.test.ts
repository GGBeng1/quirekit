import { QuireEditor } from "@quirekit/core";
import { StarterKit } from "@quirekit/starter-kit";
import { describe, expect, it } from "vitest";
import type { QuireViewRenderResult } from "../../types";
import { readMountedTextblockContentWidth } from "./textblock-width";

describe("source-bound mounted insertion width", () => {
  it("reads unscaled empty text geometry and refuses stale or non-inline positions", () => {
    const editor = new QuireEditor({ extensions: [StarterKit], content: { type: "doc", content: [{ type: "paragraph" }] } });
    const doc = editor.state.pm.doc;
    const result = { layoutSnapshot: { state: editor.state, root: {
      id: "root", kind: "block", range: { from: 0, to: doc.content.size }, rect: { x: 0, y: 0, width: 500, height: 600 },
      children: [{ id: "empty", kind: "block", range: { from: 0, to: 2 }, rect: { x: 20, y: 30, width: 460, height: 24 },
        textRuns: [], inlineContentWidth: 364 }]
    } } } as unknown as QuireViewRenderResult;
    const options = { backendLabel: "Test", readRenderResult: () => result,
      readSelectionContext: () => undefined, readSurface: () => ({ clientRect: { left: 0, top: 0, width: 250, height: 300 } }) };
    expect(readMountedTextblockContentWidth(options, 1, doc)).toBe(364);
    expect(readMountedTextblockContentWidth(options, 1, doc.type.create(doc.attrs, doc.content, doc.marks))).toBeNull();
    expect(readMountedTextblockContentWidth(options, 0, doc)).toBeNull();
    expect(readMountedTextblockContentWidth(options, -1, doc)).toBeNull();
    expect(readMountedTextblockContentWidth(options, 0.5, doc)).toBeNull();
    expect(readMountedTextblockContentWidth({ ...options, readRenderResult: () => undefined }, 1, doc)).toBeNull();
    editor.destroy();
  });
});
