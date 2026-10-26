import { expect, it } from "vitest";
import { EditorState } from "@quirekit/cm-state";
import { highlightingFor } from "@quirekit/cm-language";
import { highlightTree } from "@lezer/highlight";
import { mdCodeLanguages } from "./languages";
import { proseHighlighting } from "../presentation/highlighting";

it.each([
  ["typescript", 'const answer: number = 42;'],
  ["javascript", 'const message = "hello";'],
  ["json", '{"answer": 42}'],
  ["css", '.x { color: red; }'],
  ["html", '<p title="hello">text</p>'],
  ["python", 'if True:\n  print("hello")'],
  ["bash", 'if true; then echo "hello"; fi'],
  ["java", 'public class A { int x = 1; }'],
  ["go", 'func main() { fmt.Println("hi") }'],
  ["c", 'int main(void) { return 0; }'],
  ["cpp", 'std::string s = "hi";'],
  ["csharp", 'var x = new List<int>();'],
  ["rust", 'fn main() { let x = 1; }'],
  ["kotlin", 'val x: Int = 1'],
  ["sql", 'SELECT id FROM users WHERE id = 1;'],
  ["yaml", 'key: value'],
  ["xml", '<a href="x">t</a>'],
  ["dockerfile", 'FROM node:22'],
])("%s shares token identities with the actual product highlighter", async (name, source) => {
  const language = await mdCodeLanguages.find(entry => entry.name === name)!.load(new AbortController().signal);
  const state = EditorState.create({ doc: source, extensions: [language, proseHighlighting] });
  const tokens: string[] = [];
  highlightTree(language.language.parser.parse(source), { style: tags => highlightingFor(state, tags) },
    (from, to) => tokens.push(source.slice(from, to)));
  expect(tokens.length).toBeGreaterThan(0);
});

it("keeps common fence aliases exact and unique", () => {
  const names = mdCodeLanguages.flatMap(entry => [entry.name, ...entry.aliases ?? []]);
  expect(new Set(names).size).toBe(names.length);
  expect(names).toEqual(expect.arrayContaining(["ts", "js", "sh", "py", "md", "golang", "rs", "kt", "yml", "c++", "cs"]));
  expect(mdCodeLanguages.every(entry => entry.label.length > 0)).toBe(true);
});
