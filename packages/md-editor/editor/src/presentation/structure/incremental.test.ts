// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { EditorView, type BlockWrapper } from "@quirekit/cm-view";
import type { RangeSet } from "@quirekit/cm-state";
import { forceParsing } from "@quirekit/cm-language";
import type { MsfeEditor } from "@quirekit/msfe-core";
import { compositionEffect } from "@quirekit/msfe-core/state";
import { createMdEditor } from "../../editor";
import type { MdEditorOptions } from "../../types";
import { getProseStructureWork, proseStructure, proseStructureField } from "./runtime";

const editors: MsfeEditor[] = [];
/** @param source - Canonical Markdown. @param options - Editor overrides. @returns A completely parsed document before measuring edits. */
function mount(source: string, options: Omit<MdEditorOptions, "parent" | "markdown"> = {}) {
  const parent = document.createElement("div"); document.body.append(parent);
  const editor = createMdEditor({ ...options, parent, markdown: source }); editors.push(editor);
  const view = EditorView.findFromDOM(editor.element)!;
  expect(forceParsing(view, view.state.doc.length, 5000)).toBe(true);
  return { editor, view };
}
/** @param ranges - Projected source ranges. @returns Observable semantic roles and coordinates for a full-rebuild oracle. */
function signature(ranges: RangeSet<BlockWrapper>): unknown[] {
  const result: unknown[] = [];
  for (const cursor = ranges.iter(); cursor.value; cursor.next()) result.push([cursor.from, cursor.to, cursor.value]);
  return result;
}

/** @param view - Native view with direct block layers. @returns Source ranges and preview content, independent of generated component ids. */
function directOutput(view: EditorView): unknown[] {
  return view.state.facet(EditorView.decorations).filter(value => typeof value !== "function").map(set => {
    const result: unknown[] = [];
    for (const cursor = set.iter(); cursor.value; cursor.next()) {
      const { widget, ...spec } = cursor.value.spec;
      result.push([cursor.from, cursor.to, spec, widget?.text, widget?.component?.props?.kind, widget?.component?.props?.source]);
    }
    return result;
  });
}
afterEach(() => { for (const editor of editors.splice(0)) editor.destroy(); document.body.replaceChildren(); });

describe("incremental Prose and source projection", () => {
  it("does no hidden presentation work during source edits and rebuilds current content when activated", () => {
    // Data URL folding stays visible in source mode, so only reading presentation is measured here.
    const { editor, view } = mount("# Title\n\ntext\n\n::: details Note\nbody\n:::\n\n| A | B |\n| --- | --- |\n| 1 | 2 |", { features: { dataUrlFold: false } });
    editor.setMode("source");
    const before = editor.work;
    for (let index = 0; index < 5; index++) view.dispatch({ changes: { from: 10, insert: "X" } });
    expect(forceParsing(view, view.state.doc.length, 5000)).toBe(true);
    expect(editor.work.blockBuilds).toBe(before.blockBuilds);
    expect(editor.work.inlineLayerBuilds).toBe(before.inlineLayerBuilds);
    expect(editor.work.layerVisitedNodes).toBe(before.layerVisitedNodes);
    expect(editor.work.sourceReads).toBe(before.sourceReads);
    editor.setMode("live");
    const fresh = mount(editor.getMarkdown(), { features: { dataUrlFold: false } });
    expect(signature(view.state.field(proseStructureField))).toEqual(signature(fresh.view.state.field(proseStructureField)));
    expect(directOutput(view)).toEqual(directOutput(fresh.view));
  });

  // The 5000-paragraph case measures large-document behavior and is too timing-sensitive for shared CI runners.
  it.each(process.env.CI ? [100, 1000] : [100, 1000, 5000])("keeps middle-line work local in %i multiline paragraphs", count => {
    const source = Array.from({ length: count }, (_, i) => `Paragraph ${i}: **bold**.\nSecond line [link][id].\nThird line.\n\n`).join("") + "[id]: /target\n";
    const { editor, view } = mount(source);
    // Snapshot the fully parsed structure; under load the first parse is cut off by its time budget.
    expect(forceParsing(view, view.state.doc.length, 5000)).toBe(true);
    const before = { ...editor.work }, structureBefore = getProseStructureWork(view.state), values = new Set<BlockWrapper>();
    for (const cursor = view.state.field(proseStructureField).iter(); cursor.value; cursor.next()) values.add(cursor.value);
    const from = source.indexOf("Second line", source.indexOf(`Paragraph ${Math.floor(count / 2)}:`)) + 6;
    view.dispatch({ changes: { from, insert: "X" } });
    expect(forceParsing(view, view.state.doc.length, 5000)).toBe(true);
    let retained = 0;
    const wrappers = view.state.field(proseStructureField);
    for (const cursor = wrappers.iter(); cursor.value; cursor.next()) if (values.has(cursor.value)) retained++;
    expect(retained).toBe(count - 1);
    const structureAfter = getProseStructureWork(view.state);
    expect(structureAfter.wrappers - structureBefore.wrappers).toBe(1);
    expect(structureAfter.visitedNodes - structureBefore.visitedNodes).toBeLessThan(20);
    expect(editor.work.layerVisitedNodes! - before.layerVisitedNodes!).toBeLessThan(400);
    expect(editor.work.syntaxDiffBuilds! - before.syntaxDiffBuilds!).toBe(1);
    expect(editor.work.sourceReads).toBe(before.sourceReads);
    expect(signature(wrappers)).toEqual(signature(proseStructure(view.state)));
    expect(editor.getMarkdown()).toBe(source.slice(0, from) + "X" + source.slice(from));
  });

  const padding = Array.from({ length: 30 }, (_, i) => `Unchanged paragraph ${i}.\nSecond physical line.\n\n`).join("");
  const source = padding + ["# Before", "", "[first][missing][id]", "", "first line", "middle line", "last line", "",
    ":::: note Outer", "intro", "", "::: warning Inner", "- item", "  - nested", ":::", "::::", "",
    "```typescript", "const value = 1", "```", "", "| A | B |", "| --- | --- |", "| x | y |", "",
    "$$", "x^2", "$$", "", "> first", "> second", "", "tail", "", "[id]: /one"].join("\n") + "\n\n" + padding;
  const cases = [
    ["ordinary middle text", "middle line", 6, 0, "中文"],
    ["new physical line", "middle line", 6, 0, "\n"],
    ["split paragraph", "middle line", 6, 0, "\n\n"],
    ["remove paragraph separator", "last line", 9, 2, "\n"],
    ["remove closing code fence", "```\n\n| A", 0, 3, ""],
    ["nested container body", "nested", 3, 0, "X"],
    ["remove nested closer", "\n:::\n::::", 1, 3, ""],
    ["break table delimiter", "| --- | --- |", 2, 3, "text"],
    ["break formula closer", "x^2\n$$", 4, 2, "$"],
    ["remove quote prefix", "> second", 0, 2, ""],
    ["new global reference", "[id]: /one", 10, 0, "\n[missing]: /new"],
    ["change reference destination", "/one", 0, 4, "/two"],
  ] as const;
  it.each(cases)("matches complete Prose rebuilding after %s and undo", (_name, needle, offset, removed, insert) => {
    const { editor, view } = mount(source), from = source.indexOf(needle) + offset;
    view.dispatch({ changes: { from, to: from + removed, insert } });
    expect(forceParsing(view, view.state.doc.length, 5000)).toBe(true);
    expect(signature(view.state.field(proseStructureField))).toEqual(signature(proseStructure(view.state)));
    const updated = source.slice(0, from) + insert + source.slice(from + removed);
    expect(editor.getMarkdown()).toBe(updated);
    expect(directOutput(view)).toEqual(directOutput(mount(updated).view));
    expect(editor.undo()).toBe(true);
    expect(forceParsing(view, view.state.doc.length, 5000)).toBe(true);
    expect(signature(view.state.field(proseStructureField))).toEqual(signature(proseStructure(view.state)));
    expect(editor.getMarkdown()).toBe(source);
    expect(directOutput(view)).toEqual(directOutput(mount(source).view));
  });

  it("rebuilds separated changed blocks in one transaction without losing shared ancestors", () => {
    const { editor, view } = mount(source);
    const changes = ["middle line", "nested", "x^2"].map(needle => ({ from: source.indexOf(needle), insert: "X" }));
    view.dispatch({ changes });
    expect(forceParsing(view, view.state.doc.length, 5000)).toBe(true);
    expect(signature(view.state.field(proseStructureField))).toEqual(signature(proseStructure(view.state)));
    expect(directOutput(view)).toEqual(directOutput(mount(editor.getMarkdown()).view));
  });

  it("keeps the composing line's DOM parent until IME ends, then rebuilds its new paragraph role", () => {
    const { view } = mount("first\n\n");
    const at = view.state.doc.length;
    view.dispatch({ selection: { anchor: at }, effects: compositionEffect.of(true) });
    const line = () => { const { node } = view.domAtPos(at); return (node instanceof Element ? node : node.parentElement!).closest(".cm-line")!; };
    const parent = line().parentElement;
    for (const [index, text] of ["h", "ha", "hao"].entries()) {
      view.dispatch({ changes: { from: at, to: at + index, insert: text }, userEvent: "input.type.compose" });
      expect(forceParsing(view, view.state.doc.length, 5000)).toBe(true);
      expect(line().parentElement).toBe(parent);
    }
    view.dispatch({ effects: compositionEffect.of(false) });
    expect(signature(view.state.field(proseStructureField))).toEqual(signature(proseStructure(view.state)));
    expect(line().parentElement?.getAttribute("data-qk-prose")).toBe("p");
  });

  it.each([7, 41, 173])("keeps successive structural edits equivalent to a fresh document (seed %i)", seed => {
    const { editor, view } = mount(source);
    let expected = source, random = seed;
    const tokens = ["\n", "\n\n", "", "中文", "- ", "> ", "```", "::: note", "|", "**", "$$"];
    /** @param limit - Exclusive bound. @returns Reproducible edit choice without relying on wall time. */
    function pick(limit: number): number { random = (Math.imul(random, 1664525) + 1013904223) >>> 0; return random % limit; }
    for (let step = 0; step < 40; step++) {
      const from = padding.length + pick(expected.length - padding.length * 2);
      const to = Math.min(expected.length - padding.length, from + pick(9));
      const insert = tokens[pick(tokens.length)]!;
      expected = expected.slice(0, from) + insert + expected.slice(to);
      view.dispatch({ changes: { from, to, insert }, selection: { anchor: from + insert.length } });
      expect(forceParsing(view, view.state.doc.length, 5000)).toBe(true);
      const fresh = mount(expected);
      fresh.view.dispatch({ selection: view.state.selection });
      const context = JSON.stringify({ seed, step, from, to, insert });
      expect(signature(view.state.field(proseStructureField)), context).toEqual(signature(fresh.view.state.field(proseStructureField)));
      expect(directOutput(view), context).toEqual(directOutput(fresh.view));
      expect(editor.getMarkdown(), context).toBe(expected);
      fresh.editor.destroy(); editors.splice(editors.indexOf(fresh.editor), 1);
    }
  });
});
