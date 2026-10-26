// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { EditorView } from "@quirekit/cm-view";
import { forceParsing } from "@quirekit/cm-language";
import type { MsfeEditor } from "@quirekit/msfe-core";
import { createMdEditor } from "../editor";
import { buildMdOutlineTree, findMdOutlineHeading, readMdOutline, type MdOutlineEntry } from ".";

const editors: MsfeEditor[] = [];
/** @param markdown - Canonical source. @returns A fully parsed editor. */
function mount(markdown: string): MsfeEditor {
  const parent = document.createElement("div"); document.body.append(parent);
  const editor = createMdEditor({ parent, markdown }); editors.push(editor);
  const view = EditorView.findFromDOM(editor.element)!;
  expect(forceParsing(view, view.state.doc.length, 5000)).toBe(true);
  return editor;
}
afterEach(() => { for (const editor of editors.splice(0)) editor.destroy(); document.body.replaceChildren(); });

/** @param level - Depth. @param from - Source start. @returns A synthetic entry. */
function entry(level: number, from: number): MdOutlineEntry { return { id: `heading-${from}`, level, text: `H${from}`, from }; }

describe("md outline", () => {
  it("reads ATX and Setext headings as visible text in document order", () => {
    const editor = mount("# **Bold** and `code`\n\nbody\n\nSetext *title*\n---\n\n### [Link](https://x.test \"t\") ![alt](a.png)\n\n##\n\n```\n# not heading\n```\n");
    expect(readMdOutline(editor, "无标题")?.map(({ level, text }) => [level, text])).toEqual([
      [1, "Bold and code"], [2, "Setext title"], [3, "Link alt"], [2, "无标题"],
    ]);
  });

  it("nests skipped levels under the nearest shallower heading", () => {
    const tree = buildMdOutlineTree([entry(2, 0), entry(4, 10), entry(3, 20), entry(1, 30), entry(2, 40)]);
    expect(tree.nodes).toEqual([
      { id: "heading-0", label: "H0", children: [{ id: "heading-10", label: "H10" }, { id: "heading-20", label: "H20" }] },
      { id: "heading-30", label: "H30", children: [{ id: "heading-40", label: "H40" }] },
    ]);
    expect(tree.branches).toEqual(["heading-0", "heading-30"]);
  });

  it("binary-searches the heading that owns the reading line", () => {
    const entries = [entry(1, 0), entry(2, 10), entry(2, 20), entry(2, 30)];
    const top = (from: number): number => from * 10 - 150;
    expect(findMdOutlineHeading([], top, 0)).toBeUndefined();
    expect(findMdOutlineHeading(entries, top, -200)).toBe("heading-0");
    expect(findMdOutlineHeading(entries, top, 50)).toBe("heading-20");
    expect(findMdOutlineHeading(entries, top, 150)).toBe("heading-30");
    expect(findMdOutlineHeading(entries, top, 1000)).toBe("heading-30");
  });
});
