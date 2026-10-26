// @vitest-environment happy-dom
import { expect, it } from "vitest";
import { createEditor } from "@quirekit/core";
import { StarterKit } from "@quirekit/starter-kit";
import { createMindMapEmbed, readMindMapEmbed } from "@quirekit/mind-map";
import { MindMap } from "./extension";

it("round-trips complete editable source through escaped HTML instead of flattening to an image", () => {
  const base = createMindMapEmbed("html-copy", '项目 <计划> & "验收"');
  const mind = readMindMapEmbed({ ...base, document: { ...base.document, floatingTopics: [{
    root: { id: "free-html", text: "保留独立主题", collapsed: false, children: [] },
    position: { x: 100, y: 200 }, side: "right",
  }] }, preview: { dataUrl: "data:image/png;base64,AAAA", width: 100, height: 60 } });
  const editor = createEditor({ extensions: [StarterKit, MindMap], content: { type: "doc", content: [{ type: "mindMap", attrs: { mind } }] } });
  try {
    const html = editor.getHTML();
    expect(html).toContain("data-qk-mind-map-source=");
    const parsed = new DOMParser().parseFromString(html, "text/html");
    expect(parsed.querySelector("img")?.getAttribute("alt")).toBe(mind.title);
    expect(parsed.querySelectorAll("figure,img")).toHaveLength(2);
    expect(editor.commands.setContent(html)).toBe(true);
    expect(editor.state.doc.firstChild?.type.name).toBe("mindMap");
    expect(editor.state.doc.firstChild?.attrs.mind).toEqual(mind);
  } finally { editor.destroy(); }
});
