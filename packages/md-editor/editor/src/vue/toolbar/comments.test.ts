import { describe, expect, it } from "vitest";
import { EditorState } from "@quirekit/cm-state";
import type { MsfeEditor } from "@quirekit/msfe-core";
import type { MdCommentsBridge } from "../comments/types";
import { toolbarItems } from "./configuration";
import { selectionToolbarItems } from "./presentation";

/** @param writable - Write permission. @returns Minimal comment bridge. */
const bridge = (writable: boolean) => ({ writable: () => writable, exportsReview: () => false }) as unknown as MdCommentsBridge;

describe("comment toolbar entries", () => {
  it("shows comment toolbar entries only when comments are installed, enabled by write permission", () => {
    const base = { history: { canUndo: false, canRedo: false }, state: EditorState.create({ extensions: [EditorState.readOnly.of(true)] }), querySource: () => ({ matches: [] }) };
    const entries = (storage: object) => toolbarItems({ ...base, storage } as unknown as MsfeEditor, "zh-CN").filter(item => item.value.startsWith("comment"));
    expect(entries({}).map(item => item.hidden)).toEqual([true, true]);
    const writable = entries({ mdComments: { bridge: bridge(true) } });
    expect(writable.map(item => [item.value, !!item.hidden, !!item.disabled])).toEqual([["comment", false, false], ["comments", false, false]]);
    expect(entries({ mdComments: { bridge: bridge(false) } })[0]!.disabled).toBe(true);
    expect(writable[1]!.items!.map(item => item.value)).toEqual(["comment-previous", "comment-next", "comment-document", "comments-panel"]);
    const floating = selectionToolbarItems(toolbarItems({ ...base, storage: { mdComments: { bridge: bridge(true) } } } as unknown as MsfeEditor, "zh-CN"));
    expect(floating.map(item => item.kind === "separator" ? "|" : item.value)).toEqual(["heading", "|", "format", "|", "link", "|", "comment"]);
    // A readonly source keeps only the text-neutral comment action.
    const readOnly = selectionToolbarItems(toolbarItems({ ...base, storage: { mdComments: { bridge: bridge(true) } } } as unknown as MsfeEditor, "zh-CN"), true);
    expect(readOnly.map(item => item.value)).toEqual(["comment"]);
  });
});
