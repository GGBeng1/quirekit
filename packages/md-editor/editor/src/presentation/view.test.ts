// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import type { MsfeEditor } from "@quirekit/msfe-core";
import { createMdEditor } from "../editor";
import { getMdView, setMdView } from "./mode";

const editors: MsfeEditor[] = [];
afterEach(() => { editors.splice(0).forEach(editor => editor.destroy()); document.body.replaceChildren(); });

/** @param view - Initial view. @returns Mounted product editor. */
function mount(view?: "document" | "preview" | "source"): MsfeEditor {
  const editor = createMdEditor({ parent: document.body.appendChild(document.createElement("div")), markdown: "# Title\n\n**bold** text\n", ...(view ? { view } : {}) });
  editors.push(editor);
  return editor;
}

describe("MD Editor views", () => {
  it("starts in the requested view and defaults to document view", () => {
    expect(getMdView(mount())).toBe("document");
    expect(getMdView(mount("preview"))).toBe("preview");
    const source = mount("source");
    expect([getMdView(source), source.mode]).toEqual(["source", "source"]);
  });

  it("switches views over the same source and history", () => {
    const editor = mount();
    const markdown = editor.getMarkdown();
    for (const view of ["preview", "source", "document"] as const) {
      expect(setMdView(editor, view).ok).toBe(true);
      expect(getMdView(editor)).toBe(view);
      expect(editor.getMarkdown()).toBe(markdown);
    }
  });

  it("keeps read-only across views until it is turned off", () => {
    const editor = mount();
    setMdView(editor, "preview", true);
    expect([editor.mode, getMdView(editor), editor.state.readOnly]).toEqual(["live", "preview", true]);
    setMdView(editor, "source");
    expect([editor.mode, editor.state.readOnly]).toEqual(["source", true]);
    setMdView(editor, "document", false);
    expect([editor.mode, editor.state.readOnly]).toEqual(["live", false]);
  });
});
