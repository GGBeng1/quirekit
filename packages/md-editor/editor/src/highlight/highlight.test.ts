import { describe, expect, it } from "vitest";
import { EditorState } from "@quirekit/cm-state";
import { markdown } from "@quirekit/cm-lang-markdown";
import { ensureSyntaxTree } from "@quirekit/cm-language";
import { GFM } from "@quirekit/lezer-markdown";
import { CustomContainer } from "@quirekit/msfe-markdown-extras";
import { formatHighlightAttributes, parseHighlightAttributes, readHighlightHeader } from "./attributes";
import { updateMdHighlight } from "./commands";
import { highlightDocxAppearance } from "./docx";

const syntax = CustomContainer.configure({ types: ["note", "highlight"] }).resolve(() => { throw new Error("Grammar only"); }).syntax!;
/** @param doc - Exact canonical Markdown. @returns A fully parsed native state. */
function fixture(doc: string): EditorState {
  const state = EditorState.create({ doc, extensions: [markdown({ extensions: [GFM, syntax] })] });
  expect(ensureSyntaxTree(state, state.doc.length, 1000)).not.toBeNull();
  return state.update({}).state;
}
/** @param state - Source state. @param spec - Accepted command result. @returns Next source text. */
function apply(state: EditorState, spec: ReturnType<ReturnType<typeof updateMdHighlight>>): string {
  expect(spec).not.toBeNull();
  return state.update(spec!).state.doc.toString();
}

describe("highlight attributes", () => {
  it("parses canonical, quoted and partial attribute blocks with defaults", () => {
    expect(parseHighlightAttributes("{emoji=💡 color=blue text=red}")).toEqual({ emoji: "💡", color: "blue", text: "red" });
    expect(parseHighlightAttributes('{color="green" emoji="✅"}')).toEqual({ emoji: "✅", color: "green" });
    expect(parseHighlightAttributes("")).toEqual({ emoji: "📌", color: "orange" });
    expect(parseHighlightAttributes("A plain title")).toEqual({ emoji: "📌", color: "orange" });
  });
  it("ignores unknown keys and invalid values without failing", () => {
    expect(parseHighlightAttributes("{emoji=a=b color=pink text=teal size=2}")).toEqual({ emoji: "📌", color: "orange" });
    expect(parseHighlightAttributes("{emoji=thisiswaytoolongforanicon}").emoji).toBe("📌");
  });
  it("formats in a stable key order and omits the default text color", () => {
    expect(formatHighlightAttributes({ emoji: "📌", color: "purple" })).toBe("{emoji=📌 color=purple}");
    expect(formatHighlightAttributes({ emoji: "🔥", color: "red", text: "gray" })).toBe("{emoji=🔥 color=red text=gray}");
    expect(readHighlightHeader(":::: highlight {emoji=🔥 color=red}")).toEqual({ emoji: "🔥", color: "red" });
    expect(readHighlightHeader("::: note Title")).toBeNull();
  });
});

describe("highlight source updates", () => {
  it("rewrites only the opening attribute block, keeping fence length, body and nesting", () => {
    const doc = "intro\n\n:::: highlight {emoji=📌 color=orange}\nbody **bold**\n\n::: note Inner\ntext\n:::\n::::\n";
    const state = fixture(doc), from = doc.indexOf("::::");
    expect(apply(state, updateMdHighlight(from, { color: "blue" })(state))).toBe(doc.replace("color=orange", "color=blue"));
    expect(apply(state, updateMdHighlight(from, { text: "red", emoji: "💡" })(state))).toBe(doc.replace("{emoji=📌 color=orange}", "{emoji=💡 color=orange text=red}"));
  });
  it("adds attributes to a bare opener and replaces a plain title", () => {
    const bare = fixture("::: highlight\nbody\n:::");
    expect(apply(bare, updateMdHighlight(0, { color: "gray" })(bare))).toBe("::: highlight {emoji=📌 color=gray}\nbody\n:::");
    const titled = fixture("::: highlight Old title\nbody\n:::");
    expect(apply(titled, updateMdHighlight(0, { text: "green" })(titled))).toBe("::: highlight {emoji=📌 color=orange text=green}\nbody\n:::");
  });
  it("can move the caret to the end of the body for block menu changes", () => {
    const state = fixture("::: highlight {emoji=📌 color=blue}\nfirst\n\nlast line\n:::\n\nafter");
    const spec = updateMdHighlight(0, { color: "red" }, true)(state)!, next = state.update(spec).state;
    expect(next.selection.main.head).toBe(next.doc.toString().indexOf("last line") + "last line".length);
  });
  it("restores the default text color by removing the key", () => {
    const state = fixture("::: highlight {emoji=📌 color=blue text=red}\nbody\n:::");
    expect(apply(state, updateMdHighlight(0, { text: undefined })(state))).toBe("::: highlight {emoji=📌 color=blue}\nbody\n:::");
  });
  it("rejects stale positions, other containers, unchanged values and unsafe emoji", () => {
    const state = fixture("::: note Title\nbody\n:::\n\n::: highlight {emoji=📌 color=blue}\nbody\n:::");
    const from = state.doc.toString().indexOf("::: highlight");
    expect(updateMdHighlight(0, { color: "red" })(state)).toBeNull();
    expect(updateMdHighlight(from + 1, { color: "red" })(state)).toBeNull();
    expect(updateMdHighlight(from, { color: "blue" })(state)).toBeNull();
    expect(updateMdHighlight(from, { emoji: "a b" })(state)).toBeNull();
    expect(updateMdHighlight(10_000, { color: "red" })(state)).toBeNull();
  });
});

describe("highlight document export", () => {
  it("maps highlights to an emoji heading and borderless fill, leaving other containers to the template", () => {
    expect(highlightDocxAppearance({ name: "highlight", title: "{emoji=💡 color=blue text=red}" })).toEqual({ title: "", lead: "💡", fill: "EAF2FE", border: null, color: "C62828" });
    expect(highlightDocxAppearance({ name: "highlight", title: "" })).toMatchObject({ title: "", lead: "📌", fill: "FFF4E5" });
    expect(highlightDocxAppearance({ name: "note", title: "{emoji=💡}" })).toBeUndefined();
  });
});
