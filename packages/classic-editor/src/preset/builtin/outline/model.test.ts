import { Extension, QuireEditor } from "@quirekit/core";
import { StarterKit } from "@quirekit/starter-kit";
import { afterEach, expect, it, vi } from "vitest";
import type { ClassicEditorRenderContext } from "@classic/types";
import { collectClassicEditorOutlineEntries } from "./model";

const cleanup: Array<() => void> = [];
afterEach(() => cleanup.splice(0).reverse().forEach(dispose => dispose()));

/** @param extensions - Ordered classification fixtures. @param count - Paragraph count. @returns Canonical editor and fresh outline projection. */
function createFixture(extensions: Extension[], count = 2) {
  const editor = new QuireEditor({ extensions: [...extensions, StarterKit], content: {
    type: "doc", content: [
      ...Array.from({ length: count }, (_, index) => ({
        type: "paragraph", content: [{ type: "text", text: `Paragraph ${index}` }]
      })),
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Heading" }] }
    ]
  } });
  cleanup.push(() => editor.destroy());
  const context = { editor, locale: "en" } as ClassicEditorRenderContext;
  return { editor, project: () => collectClassicEditorOutlineEntries(context, "Untitled") };
}

it("reads each extension style factory once per projection while classifying every paragraph", () => {
  const classify = vi.fn(() => ({}));
  const factory = vi.fn(() => ({ paragraph: classify }));
  const fixture = createFixture([Extension.create({ name: "outlineWorkBudget", addNodeCanvasTextStyles: factory })], 1000);
  factory.mockClear(); classify.mockClear();
  const entries = fixture.project();
  expect(entries.map(entry => [entry.label, entry.level])).toEqual([["Heading", 2]]);
  expect(classify).toHaveBeenCalledTimes(1000);
  expect(factory).toHaveBeenCalledTimes(1);
  fixture.project();
  expect(factory).toHaveBeenCalledTimes(2);
  expect(classify).toHaveBeenCalledTimes(2000);
});

it("refreshes factory definitions on the same document and invokes mutable resolvers per node", () => {
  let enabled = false;
  let level = 0;
  const fixture = createFixture([Extension.create({ name: "dynamicOutlineDefinition", addNodeCanvasTextStyles() {
    return enabled ? { paragraph: () => ({ documentOutlineLevel: ++level }) } : {};
  } })]);
  const document = fixture.editor.state.doc;
  expect(fixture.project().map(entry => entry.label)).toEqual(["Heading"]);
  enabled = true;
  expect(fixture.project().map(entry => [entry.label, entry.level])).toEqual([
    ["Paragraph 0", 1], ["Paragraph 1", 2], ["Heading", 2]
  ]);
  expect(fixture.project().map(entry => entry.level)).toEqual([3, 4, 2]);
  enabled = false;
  expect(fixture.project().map(entry => entry.label)).toEqual(["Heading"]);
  expect(fixture.editor.state.doc).toBe(document);
});

it("keeps extension priority, invalid-level fallthrough and legacy heading fallback", () => {
  const later = vi.fn(() => ({ documentOutlineLevel: 4 }));
  const fixture = createFixture([
    Extension.create({ name: "firstOutline", priority: 300, addNodeCanvasTextStyles() { return {
      paragraph: node => ({ documentOutlineLevel: node.textContent.endsWith("0") ? 3 : 1.5 }),
      heading: () => ({ documentOutlineLevel: -1 })
    }; } }),
    Extension.create({ name: "laterOutline", priority: 200, addNodeCanvasTextStyles() { return { paragraph: later }; } })
  ]);
  // Remove only the built-in heading style contribution to exercise the legacy fallback.
  const heading = fixture.editor.state.extensions.find(extension => extension.name === "heading")!;
  vi.spyOn(heading, "canvasTextStyle", "get").mockReturnValue(undefined);
  later.mockClear();
  expect(fixture.project().map(entry => [entry.label, entry.level])).toEqual([
    ["Paragraph 0", 3], ["Paragraph 1", 4], ["Heading", 2]
  ]);
  expect(later).toHaveBeenCalledTimes(1);
});
