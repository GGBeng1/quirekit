// @vitest-environment happy-dom

import { QuireEditor } from "@quirekit/core";
import { StarterKit } from "@quirekit/starter-kit";
import { describe, expect, it } from "vitest";
import {
  Link,
  defaultLinkDisplayTextMaximumLength,
  defaultLinkHrefMaximumLength,
  isAllowedLinkHref,
  normalizeLinkDisplayText,
  normalizeLinkHref
} from "./link";

describe("Link", () => {
  it("accepts bounded external, internal, and relative targets", () => {
    expect(normalizeLinkHref("  https://example.com/docs  "))
      .toBe("https://example.com/docs");
    expect(isAllowedLinkHref("mailto:editor@example.com")).toBe(true);
    expect(isAllowedLinkHref("tel:+8613800138000")).toBe(true);
    expect(isAllowedLinkHref("#appendix-a")).toBe(true);
    expect(isAllowedLinkHref("../guide/getting-started")).toBe(true);
    expect(isAllowedLinkHref("a".repeat(defaultLinkHrefMaximumLength))).toBe(true);
    expect(isAllowedLinkHref("a".repeat(defaultLinkHrefMaximumLength + 1))).toBe(false);
  });

  it("rejects unsafe schemes, whitespace smuggling, and empty targets", () => {
    expect(isAllowedLinkHref("javascript:alert(1)")).toBe(false);
    expect(isAllowedLinkHref("data:text/html,<script>alert(1)</script>")).toBe(false);
    expect(isAllowedLinkHref("https://example.com/\njavascript:alert(1)")).toBe(false);
    expect(isAllowedLinkHref("https://example.com/\u0000control")).toBe(false);
    expect(isAllowedLinkHref("https://example.com/\u0085control")).toBe(false);
    expect(isAllowedLinkHref("   ")).toBe(false);
  });

  it("sets, edits, and removes one selected link without changing its text", () => {
    const editor = createLinkEditor();
    editor.commands.setTextSelection({ from: 1, to: 6 });

    expect(editor.commands.setLink({ href: "https://example.com/first" })).toBe(true);
    expect(readFirstTextMarks(editor)).toEqual([{
      type: "link",
      attrs: { href: "https://example.com/first" }
    }]);
    const mark = editor.state.doc.child(0).child(0).marks[0];
    expect(mark).toBeDefined();
    expect(Link.canvasStyle?.link?.(mark!)).toEqual({
      color: "#0563c1",
      textDecoration: ["underline"]
    });
    expect(Link.configure({
      color: "#7257d5"
    }).canvasStyle?.link?.(mark!)).toEqual({
      color: "#7257d5",
      textDecoration: ["underline"]
    });

    expect(editor.commands.setLink({ href: "https://example.com/second" })).toBe(true);
    expect(readFirstTextMarks(editor)).toEqual([{
      type: "link",
      attrs: { href: "https://example.com/second" }
    }]);

    editor.commands.setTextSelection(3);
    expect(editor.commands.unsetLink()).toBe(true);
    expect(editor.state.doc.textContent).toBe("alpha");
    expect(readFirstTextMarks(editor)).toBeUndefined();
  });

  it("rejects an unsafe command payload without changing marks", () => {
    const editor = createLinkEditor();
    editor.commands.setTextSelection({ from: 1, to: 6 });
    let transactionCount = 0;
    editor.on("transaction", () => {
      transactionCount += 1;
    });

    expect(editor.commands.setLink({ href: "javascript:alert(1)" })).toBe(false);
    expect(transactionCount).toBe(1);
    expect(readFirstTextMarks(editor)).toBeUndefined();
  });

  it("inserts custom display text at a collapsed caret in one transaction", () => {
    const editor = createLinkEditor();
    editor.commands.setTextSelection(3);
    let transactionCount = 0;
    editor.on("transaction", () => {
      transactionCount += 1;
    });

    expect(editor.can().insertLink({
      href: "https://example.com/docs",
      text: "Quire 文档"
    })).toBe(true);
    expect(editor.commands.insertLink({
      href: "https://example.com/docs",
      text: "Quire 文档"
    })).toBe(true);

    expect(transactionCount).toBe(1);
    expect(editor.state.doc.textContent).toBe("alQuire 文档pha");
    expect(editor.state.pm.selection.from).toBe(11);
    expect(editor.getJSON().content?.[0]?.content).toEqual([
      { type: "text", text: "al" },
      {
        type: "text",
        marks: [{
          type: "link",
          attrs: { href: "https://example.com/docs" }
        }],
        text: "Quire 文档"
      },
      { type: "text", text: "pha" }
    ]);

    expect(editor.commands.insertContent("!")).toBe(true);
    expect(editor.getJSON().content?.[0]?.content?.[2]).toEqual({
      type: "text",
      text: "!pha"
    });
  });

  it("falls back to the normalized target and undoes insertion as one step", () => {
    const editor = createLinkEditor();
    editor.commands.setTextSelection(6);

    expect(editor.commands.insertLink({
      href: "  https://example.com/docs  ",
      text: "   "
    })).toBe(true);
    expect(editor.state.doc.textContent).toBe(
      "alphahttps://example.com/docs"
    );
    expect(editor.commands.undo()).toBe(true);
    expect(editor.state.doc.textContent).toBe("alpha");
  });

  it("rejects invalid display text and non-collapsed insertion atomically", () => {
    const editor = createLinkEditor();
    let transactionCount = 0;
    editor.on("transaction", () => {
      transactionCount += 1;
    });

    expect(normalizeLinkDisplayText("  Quire 文档  ", "fallback")).toBe(
      "  Quire 文档  "
    );
    expect(normalizeLinkDisplayText("   ", "fallback")).toBe("fallback");
    expect(normalizeLinkDisplayText("line\nbreak", "fallback")).toBeNull();
    expect(normalizeLinkDisplayText(
      "x".repeat(defaultLinkDisplayTextMaximumLength + 1),
      "fallback"
    )).toBeNull();

    editor.commands.setTextSelection(3);
    transactionCount = 0;
    expect(editor.commands.insertLink({
      href: "https://example.com/docs",
      text: "line\nbreak"
    })).toBe(false);
    expect(transactionCount).toBe(1);

    editor.commands.setTextSelection({ from: 1, to: 3 });
    transactionCount = 0;
    expect(editor.commands.insertLink({
      href: "https://example.com/docs",
      text: "replacement"
    })).toBe(false);
    expect(transactionCount).toBe(1);
    expect(editor.state.doc.textContent).toBe("alpha");
  });

  it("does not carry the active Link Mark across a block split", () => {
    const editor = createLinkEditor();
    editor.commands.setTextSelection({ from: 1, to: 6 });
    editor.commands.setLink({ href: "https://example.com/docs" });
    editor.commands.setTextSelection(3);

    expect(editor.commands.splitBlock()).toBe(true);
    expect(editor.commands.insertContent("x")).toBe(true);
    expect(editor.getJSON().content?.[1]?.content).toEqual([
      { type: "text", text: "x" },
      {
        type: "text",
        marks: [{
          type: "link",
          attrs: { href: "https://example.com/docs" }
        }],
        text: "pha"
      }
    ]);
  });

  it("round-trips link targets through Markdown and semantic HTML", () => {
    const editor = createLinkEditor();
    editor.commands.setTextSelection({ from: 1, to: 6 });
    editor.commands.setLink({ href: "https://example.com/docs" });

    expect(editor.getMarkdown()).toBe("[alpha](https://example.com/docs)");
    expect(editor.getHTML()).toContain(
      '<a href="https://example.com/docs">alpha</a>'
    );

    editor.setContent("[guide](#chapter-2)", { contentType: "markdown" });
    expect(readFirstTextMarks(editor)).toEqual([{
      type: "link",
      attrs: { href: "#chapter-2" }
    }]);
  });

  it("parses safe HTML anchors and flattens unsafe anchors to text", () => {
    const editor = createLinkEditor();

    editor.setContent(
      '<p><a href="https://example.com/safe">safe</a></p>',
      { contentType: "html" }
    );
    expect(readFirstTextMarks(editor)).toEqual([{
      type: "link",
      attrs: { href: "https://example.com/safe" }
    }]);

    editor.setContent(
      '<p><a href="javascript:alert(1)">unsafe</a></p>',
      { contentType: "html" }
    );
    expect(editor.state.doc.textContent).toBe("unsafe");
    expect(readFirstTextMarks(editor)).toBeUndefined();

    editor.setContent({
      type: "doc",
      content: [{
        type: "paragraph",
        content: [{
          type: "text",
          text: "unsafe",
          marks: [{
            type: "link",
            attrs: { href: "javascript:alert(1)" }
          }]
        }]
      }]
    });
    expect(editor.getHTML()).not.toContain("<a");
    expect(editor.getHTML()).not.toContain("javascript:");
    expect(editor.getMarkdown()).toBe("unsafe");
  });
});

/**
 * Creates one editor with a single plain paragraph and the Link Mark.
 *
 * @returns Editor ready for Link command and serialization assertions.
 */
function createLinkEditor(): QuireEditor {
  return new QuireEditor({
    extensions: [StarterKit, Link],
    content: {
      type: "doc",
      content: [{
        type: "paragraph",
        content: [{ type: "text", text: "alpha" }]
      }]
    }
  });
}

/**
 * Reads marks from the first text leaf in the fixture document.
 *
 * @param editor - Link fixture editor.
 * @returns Serialized first-leaf marks.
 */
function readFirstTextMarks(
  editor: QuireEditor
) {
  return editor.getJSON().content?.[0]?.content?.[0]?.marks;
}
