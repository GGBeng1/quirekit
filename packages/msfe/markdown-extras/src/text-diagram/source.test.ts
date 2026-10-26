import { describe, expect, it } from "vitest";
import { EditorState } from "@quirekit/cm-state";
import { parser } from "@quirekit/lezer-markdown";
import { TextDiagrams } from "./extension";

const source = TextDiagrams.resolve(() => { throw new Error("This source test does not mount a view"); }).source!.codec;
/** @param markdown - Exact source. @returns Bodies accepted by the optional grammar owner. */
function bodies(markdown: string): unknown[] {
  const state = EditorState.create({ doc: markdown }), output: unknown[] = [];
  parser.parse(markdown).iterate({ enter(node) { if (node.name === "FencedCode") output.push(source.read(state, node.node)); } });
  return output;
}
describe("standard text diagram fences", () => {
  it.each(["plantuml", "puml", "dot", "graphviz"])("recognizes the exact %s alias and preserves body whitespace", language => {
    expect(bodies(`\`\`\`${language}\n  first\n\nsecond\n\`\`\``)).toEqual([{ language: language === "puml" ? "plantuml" : language === "graphviz" ? "dot" : language, text: "  first\n\nsecond" }]);
  });
  it("removes quote/list prefixes and leaves Mermaid, unrelated and incomplete fences to their owners", () => {
    expect(bodies("> ```puml\n> @startuml\n>   A -> B\n> @enduml\n> ```")).toEqual([{ language: "plantuml", text: "@startuml\n  A -> B\n@enduml" }]);
    expect(bodies("- ```dot\n  digraph { a -> b }\n  ```")).toEqual([{ language: "dot", text: "digraph { a -> b }" }]);
    for (const value of ["```dot\ndigraph { a -> b }", "```mermaid\ngraph TD\n```", "```dot-extra\nx\n```", "```js\nx\n```"]) expect(bodies(value)).toEqual([null]);
  });
});
