// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { EditorView } from "@quirekit/cm-view";
import { createMsfeEditor, type MsfeEditor } from "@quirekit/msfe-core";
import { DataUrlFold, findDataUrls } from "./data-url";

const payload = (length: number) => "A".repeat(length - 2) + "==";
const editors: MsfeEditor[] = [];
afterEach(() => { editors.splice(0).forEach(editor => editor.destroy()); document.body.replaceChildren(); });

describe("data URL fold", () => {
  it("reports long payloads with absolute ranges and decoded sizes", () => {
    const text = `{"preview":{"dataUrl":"data:image/png;base64,${payload(400)}"}}`;
    const [match] = findDataUrls(text, 100, 240);
    expect(match).toMatchObject({ type: "image/png", bytes: 298 });
    expect(text.slice(match!.from - 100, match!.to - 100)).toBe(`data:image/png;base64,${payload(400)}`);
  });

  it("keeps short inline icons and non-base64 URLs readable", () => {
    expect(findDataUrls(`data:image/svg+xml;base64,${payload(80)}`, 0, 240)).toEqual([]);
    expect(findDataUrls(`data:text/plain,${"a".repeat(400)}`, 0, 240)).toEqual([]);
  });

  it("finds every payload in one slice", () => {
    const text = `a data:image/png;base64,${payload(300)} b data:image/jpeg;base64,${payload(260)}`;
    expect(findDataUrls(text, 0, 240).map(match => match.type)).toEqual(["image/png", "image/jpeg"]);
  });

  it("keeps folded payloads in untouched blocks when editing elsewhere, in every mode", () => {
    const markdown = `text\n\n![a](data:image/png;base64,${payload(400)})`;
    for (const mode of ["live", "source"] as const) {
      const editor = createMsfeEditor({ parent: document.body.appendChild(document.createElement("div")), markdown, mode, extensions: [DataUrlFold] });
      editors.push(editor);
      const chip = editor.element.querySelector(".msfe-data-url");
      expect(chip?.textContent).toBe("data:image/png · 298 B");
      EditorView.findFromDOM(editor.element)!.dispatch({ changes: { from: 0, insert: "more " } });
      expect(editor.element.querySelector(".msfe-data-url")).toBe(chip);
      expect(editor.getMarkdown()).toBe(`more ${markdown}`);
    }
  });
});

