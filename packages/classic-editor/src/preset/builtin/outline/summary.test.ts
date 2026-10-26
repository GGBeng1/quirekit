import { declareQuireLayoutDependency, Extension, QuireEditor, type QuireJSONContent } from "@quirekit/core";
import { StarterKit } from "@quirekit/starter-kit";
import { afterEach, expect, it } from "vitest";
import type { ClassicEditorRenderContext } from "@classic/types";
import { collectClassicEditorOutlineEntries } from "./model";
import { createClassicEditorOutlineHeadingCollector } from "./summary";

const cleanup: Array<() => void> = [];
afterEach(() => cleanup.splice(0).reverse().forEach(dispose => dispose()));

/** @param text - Heading text. @param level - Heading level. @returns Heading JSON. */
const heading = (text: string, level: number): QuireJSONContent =>
  ({ type: "heading", attrs: { level }, content: text === "" ? [] : [{ type: "text", text }] });
/** @param text - Paragraph text. @returns Paragraph JSON. */
const paragraph = (text: string): QuireJSONContent => ({ type: "paragraph", content: [{ type: "text", text }] });

/**
 * @param content - Document blocks.
 * @param extensions - Extra extensions ahead of the starter kit.
 * @returns Editor and render context.
 */
function createFixture(content: QuireJSONContent[], extensions: Extension[] = []) {
  const editor = new QuireEditor({ extensions: [...extensions, StarterKit], content: { type: "doc", content } });
  cleanup.push(() => editor.destroy());
  return { editor, context: { editor, locale: "en" } as ClassicEditorRenderContext };
}

it("collects the same entries as a full classification", () => {
  const { context } = createFixture([
    heading("One", 1), paragraph("body"),
    { type: "blockquote", content: [heading("Quoted", 2), paragraph("inside")] },
    { type: "bulletList", content: [{ type: "listItem", content: [paragraph("item"), heading("Listed", 3)] }] },
    heading("", 2)
  ]);
  const collector = createClassicEditorOutlineHeadingCollector();
  expect(collector.collect(context, "Untitled")).toEqual(collectClassicEditorOutlineEntries(context, "Untitled"));
});

it("classifies only the edited path of a long document", () => {
  const blocks = Array.from({ length: 300 }, (_, index) => index % 10 === 0 ? heading(`H${index}`, 1) : paragraph(`p${index}`));
  const { editor, context } = createFixture(blocks);
  const collector = createClassicEditorOutlineHeadingCollector();
  collector.collect(context, "Untitled");
  const before = collector.readSummarizedNodes();

  let position = 0;
  editor.state.doc.forEach((_node, offset, index) => { if (index === 155) position = offset + 2; });
  editor.commands.setTextSelection(position);
  editor.commands.insertContent("typed ");

  expect(collector.collect(context, "Untitled")).toEqual(collectClassicEditorOutlineEntries(context, "Untitled"));
  expect(collector.readSummarizedNodes() - before).toBe(2);
});

it("reclassifies an unchanged document when a declared style version changes", () => {
  let version = 0;
  let level: number | undefined;
  const styles = Extension.create({
    name: "versionedOutlineStyles",
    addNodeCanvasTextStyles() {
      return { paragraph: () => level === undefined ? {} : { documentOutlineLevel: level } };
    }
  });
  declareQuireLayoutDependency(styles.config.addNodeCanvasTextStyles!, { kind: "document", getVersion: () => [version] });
  const { context } = createFixture([paragraph("body"), heading("Title", 1)], [styles]);
  const collector = createClassicEditorOutlineHeadingCollector();
  expect(collector.collect(context, "Untitled").map(entry => entry.label)).toEqual(["Title"]);

  level = 2;
  version += 1;
  expect(collector.collect(context, "Untitled").map(entry => [entry.label, entry.level])).toEqual([["body", 2], ["Title", 1]]);
});
