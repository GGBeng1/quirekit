import { EditorSelection } from "@quirekit/cm-state";
import { sourceBlockAt, type SourceBlock, type MsfeCommand } from "@quirekit/msfe-core";
import { toggleMdList } from "./list";

/** @param block - Complete captured block. @param kind - Explicit Markdown style. @returns A bounded, source-preserving style conversion for supported prose blocks. */
export function convertMdBlock(block: SourceBlock, kind: string): MsfeCommand {
  return state => {
    const current = sourceBlockAt(state, block.from);
    if (!current || current.to !== block.to || current.name !== block.name) return null;
    const source = state.sliceDoc(block.from, block.to);
    if (["BulletList", "OrderedList"].includes(block.name) && ["bullet", "ordered", "task"].includes(kind)) {
      return toggleMdList(kind as "bullet" | "ordered" | "task")(state);
    }
    if (!/^(Paragraph|ATXHeading[1-6])$/u.test(block.name)) return null;
    const body = block.name === "Paragraph" ? source : source.replace(/^ {0,3}#{1,6}[ \t]*/u, "").replace(/[ \t]+#+[ \t]*$/u, "");
    let insert: string;
    if (kind === "paragraph") insert = body;
    else if (/^h[1-6]$/u.test(kind) && !body.includes("\n")) insert = "#".repeat(Number(kind[1])) + " " + body;
    else if (kind === "quote") insert = body.split("\n").map(line => "> " + line).join("\n");
    else if (["bullet", "ordered", "task"].includes(kind)) insert = body.split("\n").map((line, index) =>
      (kind === "ordered" ? `${index + 1}. ` : kind === "task" ? "- [ ] " : "- ") + line).join("\n");
    else if (kind === "code") {
      const length = Math.max(3, ...[...body.matchAll(/`+/gu)].map(match => match[0].length + 1));
      const fence = "`".repeat(length); insert = fence + "\n" + body + "\n" + fence;
    } else return null;
    return { changes: { from: block.from, to: block.to, insert }, selection: EditorSelection.cursor(block.from + insert.length), scrollIntoView: true };
  };
}
