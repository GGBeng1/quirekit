import { describe, expect, it } from "vitest";
import { EditorState } from "@quirekit/cm-state";
import { markdown } from "@quirekit/cm-lang-markdown";
import { Math as MathFeature } from "@quirekit/msfe-markdown-extras";
import { replaceMdPreview } from "./preview";
import { toggleMdInlineCode } from "./inline";
const mathSyntax = MathFeature.resolve(() => { throw new Error("This grammar test does not mount an editor"); }).syntax!;

describe("product source editors", () => {
  it.each([
    ["before $x^2$ after", "$x^2$", "before $y^2$ after"],
    ["> $$\n> x^2\n> $$", "$$", "> $$\n> y^2\n> $$"],
    ["$$ x^2 $$", "$$", "$$y^2$$"],
    ["- formula\n\n  $$\n  x^2\n  $$", "$$", "- formula\n\n  $$\n  y^2\n  $$"],
  ])("preserves surrounding formula syntax and container prefixes", (doc, landmark, result) => {
    const state = EditorState.create({ doc, selection: { anchor: doc.indexOf(landmark) + 2 }, extensions: markdown({ extensions: mathSyntax }) });
    expect(state.update(replaceMdPreview("y^2")(state)!).state.doc.toString()).toBe(result);
  });
  it("preserves diagram fence spelling and grows it to retain literal delimiters", () => {
    const doc = "> ~~~~mermaid\n> graph TD\n> A-->B\n> ~~~~";
    const state = EditorState.create({ doc, selection: { anchor: 4 }, extensions: markdown() });
    expect(state.update(replaceMdPreview("graph LR\nA-->C")(state)!).state.doc.toString()).toBe("> ~~~~mermaid\n> graph LR\n> A-->C\n> ~~~~");
    expect(state.update(replaceMdPreview("graph LR\n~~~~")(state)!).state.doc.toString()).toBe("> ~~~~~mermaid\n> graph LR\n> ~~~~\n> ~~~~~");
  });
  it("changes diagram languages in nested fences without losing container prefixes", () => {
    const doc = "> ```puml\n> @startuml\n> A -> B\n> @enduml\n> ```";
    const state = EditorState.create({ doc, selection: { anchor: 4 }, extensions: markdown() });
    expect(state.update(replaceMdPreview("digraph { a -> b }", "dot")(state)!).state.doc.toString()).toBe("> ```dot\n> digraph { a -> b }\n> ```");
  });
  it("uses a valid longer inline-code fence and toggles back to the same text", () => {
    const doc = "a ` b";
    const state = EditorState.create({ doc, selection: { anchor: 0, head: doc.length }, extensions: markdown() });
    const next = state.update(toggleMdInlineCode()(state)!).state;
    expect(next.doc.toString()).toBe("``a ` b``");
    expect(next.update(toggleMdInlineCode()(next)!).state.doc.toString()).toBe(doc);
  });
});
