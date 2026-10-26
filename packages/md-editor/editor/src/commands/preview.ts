import { textDiagramLanguage, type TextDiagramLanguage } from "@quirekit/text-diagram";
import { EditorSelection } from "@quirekit/cm-state";
import type { MsfeCommand } from "@quirekit/msfe-core";
import { selectedNode } from "./context";

/**
 * Change only a confirmed formula/diagram body; original fence spelling and nested prefixes survive.
 * @param body - Source accepted by the host editor.
 * @param language - Optional new grammar for a confirmed code fence.
 * @returns A guarded source planner for use with a mapped anchor target.
 */
export function replaceMdPreview(body: string, language?: TextDiagramLanguage): MsfeCommand {
  return state => {
    const node = selectedNode(state, ["InlineMath", "DisplayMath", "FencedCode"]);
    if (!node || !body.trim() || body.includes("\r")) return null;
    const code = node.name === "FencedCode", marks = node.getChildren(code ? "CodeMark" : `${node.name}Mark`);
    const first = marks[0], last = marks[1];
    if (marks.length !== 2 || !first || !last) return null;
    const info = node.getChild("CodeInfo");
    if (code && (!info || !textDiagramLanguage(state.sliceDoc(info.from, info.to)))) return null;
    const start = state.doc.lineAt(first.to), end = state.doc.lineAt(last.from);
    if (node.name === "InlineMath" || start.number === end.number) {
      if (body.includes("\n") || /(?<!\\)\$/u.test(body)) return null;
      return { changes: { from: first.to, to: last.from, insert: body }, selection: EditorSelection.cursor(first.to + body.length) };
    }
    const closing = state.sliceDoc(last.from, last.to);
    if (!code && body.split("\n").some(line => line.trim() === "$$")) return null;
    const prefix = state.sliceDoc(end.from, last.from);
    const insert = body.replace(/\n$/u, "").split("\n").map(line => prefix + line).join("\n") + "\n";
    // Preserve the original fence and container prefix unless a longer delimiter
    // is needed to keep the new source inside the same canonical block.
    const character = closing[0]!, runs = code ? body.match(character === "`" ? /`+/gu : /~+/gu) ?? [] : [];
    const length = Math.max(closing.length, ...runs.map(run => run.length + 1));
    const changes = [{ from: start.to + 1, to: end.from, insert }];
    if (code && length > closing.length) {
      changes.push({ from: first.from, to: first.to, insert: character.repeat(length) }, { from: last.from, to: last.to, insert: character.repeat(length) });
    }
    if (code && info && language && textDiagramLanguage(state.sliceDoc(info.from, info.to)) !== language) changes.push({ from: info.from, to: info.to, insert: language });
    return { changes: changes.sort((a, b) => a.from - b.from) };
  };
}
