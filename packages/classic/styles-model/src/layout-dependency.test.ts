import { afterEach, describe, expect, it } from "vitest";
import { createEditor, readQuireEditorLayoutAuthority, type QuireEditor } from "@quirekit/core";
import { WordStyles } from "./extension";
import { createDefaultWordParagraphStyleRegistry } from "./model";

const editors: QuireEditor[] = [];
afterEach(() => {
  for (const editor of editors.splice(0)) editor.destroy();
});

describe("WordStyles layout dependency", () => {
  it("observes the current registry and mapping types without rebuilding them on selection", () => {
    const styles = WordStyles.configure({ types: ["paragraph"] });
    const editor = createEditor({
      extensions: [styles],
      content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "body" }] }] }
    });
    editors.push(editor);
    const first = readTokens(editor);
    const document = editor.state.doc;
    editor.commands.setTextSelection(3);
    expect(sameTokens(first, readTokens(editor))).toBe(true);

    styles.storage.registry = createDefaultWordParagraphStyleRegistry();
    const second = readTokens(editor);
    expect(editor.state.doc).toBe(document);
    expect(second).toContain(styles.storage.registry);
    expect(sameTokens(first, second)).toBe(false);

    (styles.options.types as string[]).push("callout");
    expect(sameTokens(second, readTokens(editor))).toBe(false);
  });

  it("uses the registry synchronized by PM apply for a document-attribute update", () => {
    const styles = WordStyles.configure();
    const editor = createEditor({ extensions: [styles] });
    editors.push(editor);
    const first = readTokens(editor);
    const registry = createDefaultWordParagraphStyleRegistry();
    editor.dispatchTransaction(editor.state.pm.tr.setDocAttribute("wordStyleRegistry", registry));
    const current = readTokens(editor);
    expect(current).toContain(styles.storage.registry);
    expect(sameTokens(first, current)).toBe(false);
    expect(styles.storage.registry).toEqual(registry);
  });
});

/** @param editor - Current style owner. @returns Proven dependency values. */
function readTokens(editor: QuireEditor): readonly unknown[] {
  const result = readQuireEditorLayoutAuthority(editor, editor.state);
  if (!result.known) throw new Error(result.reason);
  return result.tokens;
}

/** @param left - Previous values. @param right - Current values. @returns Exact equality. */
function sameTokens(left: readonly unknown[], right: readonly unknown[]): boolean {
  return left.length === right.length && left.every((value, index) => Object.is(value, right[index]));
}
