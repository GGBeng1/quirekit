// @vitest-environment happy-dom

import { Extension, QuireEditor, type CommandProps, type JSONContent } from "@quirekit/core";
import { Plugin, type EditorState } from "@quirekit/pm";
import { StarterKit } from "@quirekit/starter-kit";
import { describe, expect, it } from "vitest";
import { updateSearchMatches } from "./match/incremental";
import { resolveSearchScope, scanSearchScope } from "./match/scan";
import { readSearchMatchSnippet } from "./match/snippet";
import { getSearchPluginState, getSearchSnapshot } from "./plugin/state";
import { Search } from "./extension";
import type { SearchExtensionOptions } from "./types";

describe("Search", () => {
  it("matches across marks and folds case by default", () => {
    const editor = createSearchEditor([paragraph(text("Foo"), text("Bar", ["bold"]), text(" foobar"))]);
    editor.commands.setSearchQuery("obar");

    expect(readMatches(editor)).toEqual(["oBar", "obar"]);
    editor.commands.setSearchQuery("obar", { caseSensitive: true });
    expect(readMatches(editor)).toEqual(["obar"]);
  });

  it("maps length-changing case folds back to whole source characters", () => {
    const editor = createSearchEditor([paragraph(text("xİy"))]);
    editor.commands.setSearchQuery("i");

    expect(readMatches(editor)).toEqual(["İ"]);
  });

  it("matches whole words only when requested, without consuming rejected candidates", () => {
    const editor = createSearchEditor([paragraph(text("cat catalog scat cat. 猫cat"))]);
    editor.commands.setSearchQuery("cat", { wholeWord: true });

    expect(readRanges(editor)).toEqual([[1, 4], [18, 21]]);
    editor.commands.setSearchQuery("aa", { wholeWord: true });
    editor.commands.setContent({ type: "doc", content: [paragraph(text("aaa aa"))] });
    expect(readMatches(editor)).toEqual(["aa"]);
  });

  it("treats full-width and half-width forms as equal when requested", () => {
    const editor = createSearchEditor([paragraph(text("ＡＢＣ　abc ｶﾞイド ガイド ﬁ"))]);
    editor.commands.setSearchQuery("abc ", { ignoreWidth: true });
    expect(readMatches(editor)).toEqual(["ＡＢＣ　", "abc "]);

    editor.commands.setSearchQuery("ガイド", { ignoreWidth: true });
    expect(readMatches(editor)).toEqual(["ｶﾞイド", "ガイド"]);
    editor.commands.setSearchQuery("fi", { ignoreWidth: true });
    expect(readMatches(editor)).toEqual([]);
    editor.commands.setSearchQuery("ガイド");
    expect(readMatches(editor)).toEqual(["ガイド"]);
  });

  it("reads match snippets inside the owning textblock", () => {
    const editor = createSearchEditor([paragraph(text("first")), paragraph(text("alpha cat omega"))]);
    editor.commands.setSearchQuery("cat");
    const match = getSearchPluginState(editor.state.pm).matches[0]!;

    expect(readSearchMatchSnippet(editor.state.pm.doc, match, 3)).toEqual({
      before: "ha ",
      text: "cat",
      after: " om",
      truncatedBefore: true,
      truncatedAfter: true
    });
    expect(readSearchMatchSnippet(editor.state.pm.doc, match).before).toBe("alpha ");
  });

  it("finds non-overlapping matches and never matches across inline leaves", () => {
    const editor = createSearchEditor([
      paragraph(text("aaaa")),
      paragraph(text("a"), { type: "hardBreak" }, text("b"))
    ]);
    editor.commands.setSearchQuery("aa");
    expect(getSearchSnapshot(editor.state.pm).count).toBe(2);

    editor.commands.setSearchQuery("ab");
    expect(getSearchSnapshot(editor.state.pm).count).toBe(0);
  });

  it("navigates from the selection and wraps in both directions", () => {
    const editor = createSearchEditor([paragraph(text("cat dog cat dog cat"))]);
    editor.commands.setSearchQuery("cat");
    editor.commands.setTextSelection(6);

    editor.commands.findNext();
    expect(readSelection(editor)).toEqual({ from: 9, to: 12 });
    expect(getSearchSnapshot(editor.state.pm).activeIndex).toBe(1);
    editor.commands.findNext();
    editor.commands.findNext();
    expect(readSelection(editor)).toEqual({ from: 1, to: 4 });
    editor.commands.findPrevious();
    expect(readSelection(editor)).toEqual({ from: 17, to: 20 });
  });

  it("keeps query and navigation transactions out of history", () => {
    const editor = createSearchEditor([paragraph(text("cat"))]);
    editor.commands.setSearchQuery("cat");
    editor.commands.findNext();

    expect(editor.can().undo()).toBe(false);
  });

  it("updates matches incrementally to the same result as a full rescan", () => {
    const editor = createSearchEditor([
      paragraph(text("ab ab ab")),
      paragraph(text("xab bab")),
      paragraph(text("ba ab"))
    ]);
    editor.commands.setSearchQuery("ab");
    let seed = 7;
    const random = (limit: number): number => {
      seed = (seed * 48271) % 2147483647;
      return seed % limit;
    };
    for (let step = 0; step < 200; step += 1) {
      const size = editor.state.doc.content.size;
      const position = 1 + random(Math.max(1, size - 2));
      const resolved = editor.state.doc.resolve(position);
      if (!resolved.parent.isTextblock) continue;
      if (random(8) === 0) {
        // Two distant edits in one transaction exercise the multi-step diff.
        editor.commands.command(({ tr }: CommandProps) => {
          tr.insertText("ab", tr.doc.content.size - 2).insertText("b", position);
          return true;
        });
      } else if (random(3) === 0 && resolved.parentOffset < resolved.parent.content.size) {
        editor.commands.deleteRange({ from: position, to: position + 1 });
      } else {
        editor.commands.insertContentAt(position, ["a", "b", "x", "ab"][random(4)]!);
      }
      expect(readRanges(editor)).toEqual(readFullRescan(editor));
    }
  });

  it("bounds incremental work to the edited textblock", () => {
    const editor = createSearchEditor(Array.from({ length: 200 }, () => paragraph(text("cat and cat"))));
    editor.commands.setSearchQuery("cat");
    const { matches, query } = getSearchPluginState(editor.state.pm);
    const segments = resolveSearchScope({}, editor.state.pm);

    const keystroke = updateSearchMatches(matches, editor.state.pm.tr.insertText("x", 1500), segments, query!);
    expect(keystroke.rescanned).toHaveLength(1);
    expect(keystroke.matches).toHaveLength(400);

    editor.commands.replaceAllSearchMatches("dog");
    expect(editor.state.doc.textContent).not.toContain("cat");
    editor.commands.undo();
    expect(getSearchSnapshot(editor.state.pm).count).toBe(400);
  });

  it("counts matches in excluded intervals and refreshes the count only when they change", () => {
    // Only the first paragraph is searchable; the second stands in for a header story.
    const firstOnly = (state: EditorState) => [{ from: 0, to: state.doc.child(0).nodeSize, kind: "body" }];
    const restOnly = (state: EditorState) => [{ from: state.doc.child(0).nodeSize, to: state.doc.content.size, kind: "header" }];
    const editor = createSearchEditor(
      [paragraph(text("cat")), paragraph(text("cat cat"))],
      { resolveScope: firstOnly, resolveExcludedScope: restOnly }
    );
    editor.commands.setSearchQuery("cat");
    expect(getSearchSnapshot(editor.state.pm)).toMatchObject({ count: 1, excludedCount: 2 });

    editor.commands.insertContentAt(editor.state.doc.content.size - 1, " cat");
    expect(getSearchSnapshot(editor.state.pm)).toMatchObject({ count: 1, excludedCount: 3 });
    editor.commands.replaceAllSearchMatches("dog");
    expect(getSearchSnapshot(editor.state.pm)).toMatchObject({ count: 0, excludedCount: 3 });
  });

  it("limits search and replace-all to a range that follows edits", () => {
    const editor = createSearchEditor([paragraph(text("cat one")), paragraph(text("cat two cat")), paragraph(text("cat three"))]);
    const second = editor.state.doc.child(0).nodeSize;
    const limit = { from: second, to: second + editor.state.doc.child(1).nodeSize };
    editor.commands.setSearchQuery("cat", {}, limit);
    expect(getSearchSnapshot(editor.state.pm)).toMatchObject({ count: 2, limited: true });

    editor.commands.insertContentAt(second + 1, "cat ");
    expect(getSearchSnapshot(editor.state.pm).count).toBe(3);
    editor.commands.replaceAllSearchMatches("dog");
    expect(editor.state.doc.child(0).textContent).toBe("cat one");
    expect(editor.state.doc.child(1).textContent).toBe("dog dog two dog");
    expect(editor.state.doc.child(2).textContent).toBe("cat three");
    expect(editor.commands.setSearchQuery("cat", {}, { from: 5, to: 5 })).toBe(false);
  });

  it("locates first, then replaces the active match and advances", () => {
    const editor = createSearchEditor([paragraph(text("one "), text("cat", ["bold"]), text(" two cat"))]);
    editor.commands.setSearchQuery("cat");

    editor.commands.replaceSearchMatch("dog");
    expect(editor.state.doc.textContent).toBe("one cat two cat");
    expect(readSelection(editor)).toEqual({ from: 5, to: 8 });

    editor.commands.replaceSearchMatch("dog");
    expect(editor.state.doc.textContent).toBe("one dog two cat");
    expect(editor.state.doc.nodeAt(5)?.marks.map((mark) => mark.type.name)).toEqual(["bold"]);
    expect(readSelection(editor)).toEqual({ from: 13, to: 16 });
    expect(getSearchSnapshot(editor.state.pm).count).toBe(1);
  });

  it("replaces every approved match in one undoable step", () => {
    const editor = createSearchEditor(
      [paragraph(text("cat cat")), paragraph(text("cat"))],
      { checkReplaceable: (_state, match) => match.from > 8 ? { replaceable: false, reason: "locked" } : { replaceable: true } }
    );
    editor.commands.setSearchQuery("cat");
    editor.commands.replaceAllSearchMatches("lion");

    expect(editor.state.doc.textContent).toBe("lion lioncat");
    expect(getSearchSnapshot(editor.state.pm).lastReplaceAll).toEqual({
      replaced: 2,
      skipped: 1,
      total: 3,
      skippedByReason: { locked: 1 }
    });
    editor.commands.undo();
    expect(editor.state.doc.textContent).toBe("cat catcat");
    expect(getSearchSnapshot(editor.state.pm)).toMatchObject({ count: 3, lastReplaceAll: null });
  });

  it("skips matches a transaction filter rejects and replaces the rest", () => {
    // Rejects any step reaching into the second paragraph, like document protection does.
    const Protect = Extension.create({
      name: "protectSecondParagraph",
      addProseMirrorPlugins() {
        return [new Plugin({
          filterTransaction: (tr) => tr.steps.every((step, index) => {
            let allowed = true;
            step.getMap().forEach((_from, to) => {
              if (to > tr.docs[index]!.child(0).nodeSize) allowed = false;
            });
            return allowed;
          })
        })];
      }
    });
    const editor = new QuireEditor({
      extensions: [StarterKit, Search, Protect],
      content: { type: "doc", content: [paragraph(text("cat cat")), paragraph(text("cat"))] }
    });
    editor.commands.setSearchQuery("cat");
    editor.commands.replaceAllSearchMatches("dog");

    expect(editor.state.doc.textContent).toBe("dog dogcat");
    expect(getSearchSnapshot(editor.state.pm).lastReplaceAll).toMatchObject({
      replaced: 2,
      skipped: 1,
      skippedByReason: { protected: 1 }
    });
  });

  it("keeps the paragraph when an empty replacement removes all of its text", () => {
    const editor = createSearchEditor([paragraph(text("cat")), paragraph(text("dog"))]);
    editor.commands.setSearchQuery("cat");
    editor.commands.replaceAllSearchMatches("");

    expect(editor.state.doc.childCount).toBe(2);
    expect(editor.state.doc.textContent).toBe("dog");
  });

  it("clears matches and highlights", () => {
    const editor = createSearchEditor([paragraph(text("cat"))]);
    editor.commands.setSearchQuery("cat");
    expect(getSearchPluginState(editor.state.pm).decorations.find()).toHaveLength(1);

    editor.commands.clearSearch();
    expect(getSearchSnapshot(editor.state.pm).query).toBeNull();
    expect(getSearchPluginState(editor.state.pm).decorations.find()).toHaveLength(0);
  });

  it("refuses replacement in a read-only editor", () => {
    const editor = createSearchEditor([paragraph(text("cat"))]);
    editor.setEditable(false);
    editor.commands.setSearchQuery("cat");

    expect(editor.commands.replaceAllSearchMatches("dog")).toBe(false);
  });
});

/**
 * Creates a headless editor with the Search extension.
 *
 * @param content - Top-level block content.
 * @param options - Optional Search host options.
 * @returns Editor fixture.
 */
function createSearchEditor(
  content: JSONContent[],
  options: Partial<SearchExtensionOptions> = {}
): QuireEditor {
  return new QuireEditor({
    extensions: [StarterKit, Search.configure(options)],
    content: { type: "doc", content }
  });
}

/**
 * @param content - Inline content.
 * @returns Paragraph JSON.
 */
function paragraph(...content: JSONContent[]): JSONContent {
  return { type: "paragraph", content };
}

/**
 * @param value - Text value.
 * @param marks - Mark type names.
 * @returns Text JSON.
 */
function text(value: string, marks: readonly string[] = []): JSONContent {
  return { type: "text", text: value, ...(marks.length > 0 ? { marks: marks.map((type) => ({ type })) } : {}) };
}

/**
 * @param editor - Editor fixture.
 * @returns Matched text of every match.
 */
function readMatches(editor: QuireEditor): string[] {
  return getSearchPluginState(editor.state.pm).matches
    .map((match) => editor.state.doc.textBetween(match.from, match.to));
}

/**
 * @param editor - Editor fixture.
 * @returns Match ranges.
 */
function readRanges(editor: QuireEditor): Array<[number, number]> {
  return getSearchPluginState(editor.state.pm).matches.map((match) => [match.from, match.to]);
}

/**
 * @param editor - Editor fixture.
 * @returns Match ranges from a fresh full scan.
 */
function readFullRescan(editor: QuireEditor): Array<[number, number]> {
  const query = getSearchPluginState(editor.state.pm).query!;
  return scanSearchScope(editor.state.doc, resolveSearchScope({}, editor.state.pm), query)
    .map((match) => [match.from, match.to]);
}

/**
 * @param editor - Editor fixture.
 * @returns Current selection range.
 */
function readSelection(editor: QuireEditor): { from: number; to: number } {
  return { from: editor.state.pm.selection.from, to: editor.state.pm.selection.to };
}
