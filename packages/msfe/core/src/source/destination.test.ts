import { describe, expect, it } from "vitest";
import { isSafeDestination, readSourceDestination } from "./destination";
import { sourceDocument, sourceNode } from "./authoring/adapter";
import { createDocumentState } from "../mount/state";
import { ensureSyntaxTree, syntaxTree } from "@quirekit/cm-language";

describe("source destination admission", () => {
  it("admits relative resources and HTTPS without executing active URLs", () => {
    expect(isSafeDestination("./sample.svg", true)).toBe(true);
    expect(isSafeDestination("https://example.com/a?q=1&b=2")).toBe(true);
    for (const url of ["", "javascript:alert(1)", "java\nscript:alert(1)", "data:text/html,<script>", "file:///etc/passwd"]) {
      expect(isSafeDestination(url)).toBe(false);
      expect(isSafeDestination(url, true)).toBe(false);
    }
  });
  it("limits inline image data to raster MIME types", () => {
    expect(isSafeDestination("data:image/png;base64,AAAA", true)).toBe(true);
    expect(isSafeDestination("data:image/svg+xml,<svg/>", true)).toBe(false);
    expect(isSafeDestination("mailto:team@example.com")).toBe(true);
    expect(isSafeDestination("mailto:team@example.com", true)).toBe(false);
  });
});

/** @param source - Exact Markdown. @returns Decoded destinations from the installed parser. */
function destinations(source: string) {
  let state = createDocumentState(source, []);
  const result: unknown[] = [];
  // This unit tests complete semantics, not CM's time-budgeted initial parser slice.
  expect(ensureSyntaxTree(state, source.length, 3000)).not.toBeNull();
  state = state.update({}).state;
  syntaxTree(state).iterate({ enter(node) {
    if (["Link", "Image", "Autolink", "URL"].includes(node.name)) {
      const value = readSourceDestination(sourceDocument(state), sourceNode(node.node));
      if (value) result.push(value);
    }
  } });
  return result;
}

describe("Markdown destination semantics", () => {
  it("distinguishes label URLs and empty inline destinations from references", () => {
    expect(destinations('[www.a.com](https://b.com)')).toHaveLength(1);
    expect(destinations('[www.a.com](https://b.com)')[0]).toMatchObject({ url: "https://b.com" });
    expect(destinations('[x]()\n\n[x]: /reference')[0]).toMatchObject({ kind: "inline", url: "" });
    expect(destinations('> [x][a\n> b]\n\n[a b]: /target')[0]).toMatchObject({ kind: "reference", url: "/target" });
  });
  it("decodes punctuation escapes, entities and titles without changing source", () => {
    expect(destinations('[a](<./a\\(b\\)?x=1&amp;y=2> "A &amp; B")')[0]).toMatchObject({ url: "./a(b)?x=1&y=2", title: "A & B" });
  });
  it("resolves full, collapsed and shortcut references with first-definition precedence", () => {
    const source = '[Label][foo bar] [Foo  BAR][] ![Foo BAR]\n\n[Foo BAR]: /first "title"\n[foo bar]: /second';
    expect(destinations(source)).toEqual(expect.arrayContaining([
      expect.objectContaining({ url: "/first", title: "title" }),
    ]));
    expect(destinations(source)).toHaveLength(3);
    expect(destinations("[a][missing]")).toEqual([]);
  });
});
