import { createEditor, Node, type QuireJSONContent } from "@quirekit/core";
import { StarterKit } from "@quirekit/starter-kit";
import { describe, expect, it } from "vitest";
import { accessibilityDefaults } from "../defaults";
import { compileAccessibilityRegistry } from "../registry/registry";
import { projectReadingSegment } from "./projection";
import { renderReadingItems } from "./dom";

/** @param text - Source text. @returns Ordinary paragraph fixture. */
function paragraph(text: string): QuireJSONContent { return { type: "paragraph", content: [{ type: "text", text }] }; }

describe("contributed native reading structure", () => {
  it("keeps inline objects atomic and descriptions bounded while continuing following text", () => {
    const object = Node.create({ name: "inlineObject", inline: true, group: "inline", atom: true, content: "text*",
      addAccessibility() { return [{ kind: "node", name: this.name, describe: () => ({ kind: "description", label: "Object label" }) }]; }
    });
    const editor = createEditor({ extensions: [StarterKit, object], content: { type: "doc", content: [{ type: "paragraph", content: [
      { type: "text", text: "before" }, { type: "inlineObject", content: [{ type: "text", text: "private".repeat(100) }] },
      { type: "text", text: "😀after".repeat(12) }
    ] }] } });
    const registry = compileAccessibilityRegistry(editor.state.extensions, editor.state.schema);
    let cursor: number | null = 0;
    const texts: string[] = [];
    let count = 0;
    while (cursor !== null && count++ < 20) {
      const result = projectReadingSegment(editor.state.doc, cursor, { ...accessibilityDefaults, readingBudget: 32 }, registry);
      if (count === 1) expect(result.items[0]?.editable).toBe(false);
      expect(result.items.reduce((sum, item) => sum + item.text.length, 0)).toBeLessThanOrEqual(32);
      expect(result.next === null || result.next > cursor).toBe(true);
      texts.push(...result.items.map((item) => item.text));
      cursor = result.next;
    }
    expect(cursor).toBeNull();
    expect(texts.join("")).toBe("beforeObject label" + "😀after".repeat(12));
    editor.destroy();
  });

  it("retains nested list hierarchy and canonical item numbering in partial segments", () => {
    const editor = createEditor({ extensions: [StarterKit], content: { type: "doc", content: [
      { type: "orderedList", attrs: { start: 7 }, content: [
        { type: "listItem", content: [paragraph("first"), { type: "bulletList", content: [
          { type: "listItem", content: [paragraph("nested")] }
        ] }] }, { type: "listItem", content: [paragraph("second")] }
      ] }
    ] } });
    const registry = compileAccessibilityRegistry(editor.state.extensions, editor.state.schema);
    const options = { ...accessibilityDefaults, readingBlocks: 1 };
    const first = projectReadingSegment(editor.state.doc, 0, options, registry);
    const nested = projectReadingSegment(editor.state.doc, first.next!, options, registry);
    const last = projectReadingSegment(editor.state.doc, nested.next!, options, registry);
    const host = document.createElement("div");
    renderReadingItems(host, nested.items, options.labels, () => {});
    expect(host.querySelector("ol > li > ul > li > div > p")?.textContent).toBe("nested");
    expect(host.querySelector("ol > li")?.getAttribute("value")).toBe("7");
    renderReadingItems(host, last.items, options.labels, () => {});
    expect(host.querySelector("li")?.getAttribute("value")).toBe("8");
    expect(host.querySelector("li")?.getAttribute("aria-posinset")).toBe("2");
    expect(host.querySelector("li")?.getAttribute("aria-setsize")).toBe("2");
    expect(last.next).toBeNull();
    expect([first, nested, last].flatMap((segment) => segment.items.map((item) => item.text))).toEqual(["first", "nested", "second"]);
    editor.destroy();
  });

  it("renders marks from facts and never turns an unsafe contributed href into a link", () => {
    const editor = createEditor({ extensions: [StarterKit], content: { type: "doc", content: [
      { type: "paragraph", content: [{ type: "text", text: "styled", marks: [{ type: "bold" }, { type: "italic" }] }] }
    ] } });
    const registry = compileAccessibilityRegistry(editor.state.extensions, editor.state.schema);
    const segment = projectReadingSegment(editor.state.doc, 0, accessibilityDefaults, registry);
    const item = segment.items[0]!;
    const host = document.createElement("div");
    renderReadingItems(host, [item], accessibilityDefaults.labels, () => {});
    expect(host.querySelector("strong em")?.textContent).toBe("styled");
    for (const href of ["javascript:alert(1)", "JaVaScRiPt:alert(1)", "data:text/html,bad", "java\nscript:alert(1)"]) {
      renderReadingItems(host, [{ ...item, runs: [{ text: "link", marks: [{ kind: "link", href }] }] }], accessibilityDefaults.labels, () => {});
      expect(host.querySelector("a")).toBeNull();
      expect(host.textContent).toContain("link");
    }
    renderReadingItems(host, [{ ...item, runs: [{ text: "link", marks: [{ kind: "link", href: "https://example.com" }] }] }], accessibilityDefaults.labels, () => {});
    expect(host.querySelector("a")?.getAttribute("href")).toBe("https://example.com");
    editor.destroy();
  });

  it("bounds deep and empty structures, refusing unknown owners without walking their content", () => {
    const group = Node.create({ name: "genericGroup", group: "block", content: "block*", addAccessibility() {
      return [{ kind: "node", name: this.name, describe: () => ({ kind: "group", textNavigation: true }) }];
    } });
    const unknown = Node.create({ name: "unknownContainer", group: "block", content: "block*" });
    let deep: QuireJSONContent = paragraph("too deep");
    for (let level = 0; level < 80; level++) deep = { type: "genericGroup", content: [deep] };
    const editor = createEditor({ extensions: [StarterKit, group, unknown], content: { type: "doc", content: [
      deep, { type: "unknownContainer", content: [paragraph("must not traverse")] },
      ...Array.from({ length: 100 }, () => ({ type: "genericGroup" }))
    ] } });
    const registry = compileAccessibilityRegistry(editor.state.extensions, editor.state.schema);
    const options = { ...accessibilityDefaults, readingBlocks: 2, readingBudget: 64 };
    let cursor: number | null = 0;
    let count = 0;
    const texts: string[] = [];
    while (cursor !== null && count++ < 150) {
      const segment = projectReadingSegment(editor.state.doc, cursor, options, registry);
      expect(segment.items.length).toBeLessThanOrEqual(2);
      expect(segment.visited).toBeLessThanOrEqual(128);
      expect(segment.items.reduce((sum, item) => sum + item.text.length, 0)).toBeLessThanOrEqual(64);
      expect(segment.next === null || segment.next > cursor).toBe(true);
      texts.push(...segment.items.map((item) => item.text));
      cursor = segment.next;
    }
    expect(cursor).toBeNull();
    expect(texts.join("")).toContain("unknownContainer");
    expect(texts.join("")).not.toContain("must not traverse");
    expect(texts.join("")).not.toContain("too deep");
    editor.destroy();
  });
});
