import type { SourceDocument, SourceNode, SourceEdit } from "@quirekit/msfe-core";
import type { CodeBlockAttributes } from "./types";

/** @param state - Canonical source. @param node - Confirmed fence. @returns Bounded opening line fields. */
export function readCodeBlock(state: SourceDocument, node: SourceNode): CodeBlockAttributes | null {
  const marker = node.child("CodeMark");
  if (!marker || node.children("CodeMark").length !== 2) return null;
  const info = state.slice(marker.to, state.lineAt(marker.from).to);
  return { language: /^[ \t]*([^ \t]*)/u.exec(info)?.[1] ?? "" };
}

/** @param state - Canonical source. @param node - Current fence. @param patch - Language edit. @returns Token-only change or refusal. */
export function patchCodeBlock(state: SourceDocument, node: SourceNode, patch: Partial<CodeBlockAttributes>): SourceEdit | readonly SourceEdit[] | null {
  if (Object.keys(patch).some(key => key !== "language") || typeof patch.language !== "string"
    || !/^[a-zA-Z0-9_+#.-]{0,40}$/u.test(patch.language)) return null;
  const marker = node.child("CodeMark");
  if (!marker) return null;
  const line = state.lineAt(marker.from);
  const info = state.slice(marker.to, line.to);
  const match = /^([ \t]*)([^ \t]*)/u.exec(info)!;
  if (!patch.language && info.slice(match[0].length).trim()) return null;
  const from = marker.to + match[1]!.length;
  return { from, to: from + match[2]!.length, insert: patch.language };
}
