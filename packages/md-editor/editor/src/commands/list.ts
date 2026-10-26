import { type ChangeSpec } from "@quirekit/cm-state";
import { syntaxTree } from "@quirekit/cm-language";
import type { MsfeCommand } from "@quirekit/msfe-core";

/** @param kind - Persisted list marker family. @returns Selected-line conversion retaining nesting, quote prefixes and task state. */
export function toggleMdList(kind: "bullet" | "ordered" | "task"): MsfeCommand {
  return state => {
    if (state.selection.ranges.length !== 1) return null;
    const selection = state.selection.main, first = state.doc.lineAt(selection.from);
    const last = state.doc.lineAt(selection.to > selection.from && state.doc.lineAt(selection.to).from === selection.to ? selection.to - 1 : selection.to);
    const lines = [];
    // Only the explicitly selected lines are visited; table/code/container delimiters cannot become list prefixes.
    for (let number = first.number; number <= last.number; number++) {
      const line = state.doc.line(number);
      if (!line.text.trim() && !selection.empty) continue;
      let node = syntaxTree(state).resolveInner(line.from + line.text.search(/\S|$/u), 1);
      while (node.parent) {
        if (["FencedCode", "CodeBlock", "Table", "DisplayMath", "Frontmatter"].includes(node.name)) return null;
        node = node.parent;
      }
      const match = /^(?<prefix>(?:[ \t]*>[ \t]?)*[ \t]*)(?:(?<marker>[-+*]|\d+[.)])(?<gap>[ \t]+)(?:(?<task>\[[ xX]\])[ \t]+)?)?/u.exec(line.text)!;
      const prefix = match.groups!.prefix!, marker = match.groups!.marker, task = match.groups!.task;
      if (/^(?:#{1,6}\s|[:`~]{3,}|\$\$|\[\^)/u.test(line.text.slice(match[0].length))) return null;
      let item = syntaxTree(state).resolveInner(line.from + match[0].length, -1);
      while (item.parent && item.name !== "ListItem") item = item.parent;
      const continuationEnd = marker && item.name === "ListItem" ? state.doc.lineAt(item.to).number : number;
      lines.push({ line, prefix, size: match[0].length, family: task ? "task" : marker ? /^\d/u.test(marker) ? "ordered" : "bullet" : null,
        task, markerWidth: (marker?.length ?? 0) + (match.groups!.gap?.length ?? 0), continuationEnd });
    }
    const remove = lines.every(line => line.family === kind), changes: ChangeSpec[] = [];
    const ordinals = new Map<string, number>(), replacements = new Map<number, { size: number; insert: string }>();
    const indentation = new Map<number, { quotes: number; delta: number }[]>();
    for (const line of lines) {
      const ordinal = (ordinals.get(line.prefix) ?? 0) + 1;
      ordinals.set(line.prefix, ordinal);
      const marker = remove ? "" : kind === "task" ? `- ${line.task ?? "[ ]"} ` : kind === "ordered" ? `${ordinal}. ` : "- ";
      replacements.set(line.line.number, { size: line.size, insert: line.prefix + marker });
      // Changing "- " to "1. " changes the item's content column. Its unselected
      // continuations must move by the same amount or nested blocks escape the item.
      const delta = (remove ? 0 : kind === "task" ? 2 : marker.length) - line.markerWidth;
      if (line.markerWidth && delta) for (let number = line.line.number + 1; number <= line.continuationEnd; number++) {
        const shifts = indentation.get(number) ?? [];
        shifts.push({ quotes: (line.prefix.match(/>/gu) ?? []).length, delta });
        indentation.set(number, shifts);
      }
    }
    for (const number of [...new Set([...replacements.keys(), ...indentation.keys()])].sort((a, b) => a - b)) {
      const line = state.doc.line(number), replacement = replacements.get(number);
      const prefix = /^(?:[ \t]*>[ \t]?)*[ \t]*/u.exec(line.text)![0];
      let insert = replacement?.insert ?? prefix;
      for (const shift of indentation.get(number) ?? []) insert = shiftIndent(insert, shift.quotes, shift.delta);
      changes.push({ from: line.from, to: line.from + (replacement?.size ?? prefix.length), insert });
    }
    return { changes, scrollIntoView: true };
  };
}

/** @param prefix - Existing line prefix. @param quotes - Outer quote depth before the affected list. @param delta - Content-column change.
 * @returns A prefix shifted inside its original quote container, preserving nested quote markers. */
function shiftIndent(prefix: string, quotes: number, delta: number): string {
  let offset = 0;
  for (let index = 0; index < quotes; index++) {
    const quote = /^[ \t]*>[ \t]?/u.exec(prefix.slice(offset));
    if (!quote) return prefix;
    offset += quote[0].length;
  }
  if (delta > 0) return prefix.slice(0, offset) + " ".repeat(delta) + prefix.slice(offset);
  const spaces = /^[ \t]*/u.exec(prefix.slice(offset))![0];
  const columns = [...spaces].reduce((width, character) => width + (character === "\t" ? 4 - width % 4 : 1), 0);
  return prefix.slice(0, offset) + " ".repeat(Math.max(0, columns + delta)) + prefix.slice(offset + spaces.length);
}
