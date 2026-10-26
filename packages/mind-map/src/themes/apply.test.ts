import { expect, it } from "vitest";
import { applyMindMapTheme, mindMapThemes, createMindMapTemplate, setMindMapTopicDetails, putMindMapAnnotation } from "../index";
it("replaces all appearance while retaining identity, details, folding, layout and annotations", () => {
  let source = createMindMapTemplate("project"); const id = source.root.children[0]!.id;
  source = setMindMapTopicDetails(source, [id], { note: "重要备注", link: "https://example.com" });
  source = putMindMapAnnotation(source, { id: "rel", kind: "relation", from: source.root.id, to: id, text: "联系" });
  for (const theme of mindMapThemes) {
    const next = applyMindMapTheme(source, theme.id);
    expect(next.root.style!.fill).toBe(theme.colors[0]); expect(next.root.children[0]!.details).toEqual(source.root.children[0]!.details);
    expect(next.annotations).toEqual(source.annotations); expect(next.layout).toBe(source.layout);
    expect(applyMindMapTheme(next, theme.id)).toBe(next);
  }
  expect(() => applyMindMapTheme(source, "constructor" as never)).toThrow("unknown");
});
