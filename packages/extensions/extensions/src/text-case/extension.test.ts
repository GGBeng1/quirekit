import { createEditor, Extension, Mark, Node, type QuireAnyExtension } from "@quirekit/core";
import { Plugin } from "@quirekit/pm";
import { describe, expect, it } from "vitest";
import { UndoRedo } from "../undo-redo";
import { TextCase } from "./extension";

const Document = Node.create({ name: "doc", topNode: true, content: "block+" });
const Paragraph = Node.create({ name: "paragraph", group: "block", content: "inline*" });
const Text = Node.create({ name: "text", group: "inline" });
const Bold = Mark.create({ name: "bold" });

/**
 * Creates an editor with two paragraphs, the first partly bold.
 * @param extra - Additional extensions.
 * @returns Editor instance.
 */
function editor(extra: readonly QuireAnyExtension[] = []) {
  return createEditor({
    extensions: [Document, Paragraph, Text, Bold, UndoRedo, TextCase, ...extra],
    content: { type: "doc", content: [
      { type: "paragraph", content: [{ type: "text", text: "hello " }, { type: "text", text: "big", marks: [{ type: "bold" }] }, { type: "text", text: " world" }] },
      { type: "paragraph", content: [{ type: "text", text: "second line" }] }
    ] }
  });
}

/**
 * Reads paragraph texts.
 * @param instance - Editor.
 * @returns Text per paragraph.
 */
function texts(instance: ReturnType<typeof editor>): string[] {
  return (instance.getJSON().content ?? []).map(block => (block.content ?? []).map(node => node.text).join(""));
}

describe("TextCase", () => {
  it("rewrites across formatting runs and paragraphs in one undoable step, keeping marks", () => {
    const instance = editor();
    instance.commands.setTextSelection({ from: 1, to: 29 });
    expect(instance.commands.changeTextCase("upper")).toBe(true);
    expect(texts(instance)).toEqual(["HELLO BIG WORLD", "SECOND LINE"]);
    expect(instance.getJSON().content?.[0]?.content?.[1]).toEqual({ type: "text", text: "BIG", marks: [{ type: "bold" }] });
    instance.commands.undo();
    expect(texts(instance)).toEqual(["hello big world", "second line"]);
  });

  it("uses the word at a collapsed caret", () => {
    const instance = editor();
    instance.commands.setTextSelection(3);
    expect(instance.commands.changeTextCase("capitalize")).toBe(true);
    expect(texts(instance)).toEqual(["Hello big world", "second line"]);
  });

  it("skips text rejected by the host rule or by a transaction filter", () => {
    const Guard = Extension.create({
      name: "guard",
      addProseMirrorPlugins() {
        return [new Plugin({ filterTransaction: tr => !tr.docChanged || tr.steps.every(step => (step as unknown as { from: number }).from >= 16) })];
      }
    });
    const instance = editor([Guard, TextCase.configure({ checkChangeable: (_state, from) => from !== 7 })]);
    instance.commands.setTextSelection({ from: 1, to: 29 });
    expect(instance.commands.changeTextCase("upper")).toBe(true);
    expect(texts(instance)).toEqual(["hello big world", "SECOND LINE"]);
  });

  it("cycles lowercase, UPPERCASE and Capitalize Each Word on repeated Shift+F3", () => {
    const instance = editor();
    instance.commands.setTextSelection({ from: 1, to: 16 });
    const seen: string[] = [];
    for (let index = 0; index < 4; index += 1) {
      instance.commands.cycleTextCase();
      seen.push(texts(instance)[0]!);
    }
    expect(seen).toEqual(["HELLO BIG WORLD", "Hello Big World", "hello big world", "HELLO BIG WORLD"]);
  });
});
