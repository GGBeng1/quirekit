import { describe, expect, it } from "vitest";
import { Editor } from "@quirekit/core";
import { StarterKit } from "@quirekit/starter-kit";
import { createDomViewAdapter, DomViewExtension } from "../index";

describe("native DOM adapter registration", () => {
  it("registers a distinct opt-in mode without requiring a browser until mount", () => {
    const editor = new Editor({ extensions: [StarterKit, DomViewExtension] });
    expect(createDomViewAdapter().mode).toBe("dom");
    expect(editor.extensionManager.viewAdapters.map(adapter => adapter.mode)).toEqual(["dom"]);
    expect(editor.commands.insertContent("hello")).toBe(true);
    expect(editor.getText()).toBe("hello");
    editor.destroy();
  });
});
