import { describe, expect, it } from "vitest";
import { EditorState } from "@quirekit/cm-state";
import { parser } from "@quirekit/lezer-markdown";
import { punctuationEdits } from "./replacements";
import { quoteEdits } from "./quotes";
import { typographyRuns } from "./runs";

/** @param source - Exact Markdown paragraph. @param quotes - Display punctuation. @returns Readable result by applying presentation edits to a disposable string, never an editor transaction. */
function display(source: string, quotes: readonly [string, string, string, string] = ["“", "”", "‘", "’"]): string {
  const state = EditorState.create({ doc: source }), node = parser.parse(source).topNode.firstChild!;
  const runs = typographyRuns(state, node), edits = [...runs.flatMap(punctuationEdits), ...quoteEdits(runs, quotes)].sort((a, b) => b.from - a.from);
  return edits.reduce((text, edit) => text.slice(0, edit.from) + edit.text + text.slice(edit.to), source);
}

describe("optional source-mapped typography", () => {
  it("matches common symbols and punctuation while retaining deliberate dash runs", () => {
    expect(display("(c) (R) (TM) +- ... .. ?..... !.... ????? !!!! ,,, a--b a---b ---- a -- b a-- b"))
      .toBe("© ® ™ ± … … ?.. !.. ??? !!! , a–b a—b ---- a – b a-- b");
  });
  it("pairs nested quotes and prose apostrophes without replacing isolated double quotes", () => {
    expect(display(`He said "it's 'fine'". don't dogs' "unfinished`)).toBe(`He said “it’s ‘fine’”. don’t dogs’ "unfinished`);
    expect(display(`"one" 'two'`, ["« ", " »", "‹", "›"])).toBe("« one » ‹two›");
    expect(display(`1" 2" word"word " spaced "`)).toBe(`1" 2" word"word " spaced "`);
  });
  it("preserves Markdown formatting and pairs only within the same inline level", () => {
    expect(display(`"**strong** and *emphasis*"`)).toBe(`“**strong** and *emphasis*”`);
    expect(display(`**"inside** outside"`)).toBe(`**"inside** outside"`);
    expect(display(`"outside **inside"**`)).toBe(`"outside **inside"**`);
  });
  it("does not change code, escaped characters, autolinks, destination fields, image text or HTML attributes", () => {
    const source = '`"(c)..."` \\"escaped\\" &quot; ["label..."](https://a.test/-- "title...") !["alt..."](/a) <https://a.test/--> <span title="raw...">"text..."</span>';
    expect(display(source)).toBe('`"(c)..."` \\"escaped\\" &quot; [“label…”](https://a.test/-- "title...") !["alt..."](/a) <https://a.test/--> <span title="raw...">“text…”</span>');
  });
});
