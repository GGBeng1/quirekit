import type { SourceDocument, SourceNode, SourceEdit } from "@quirekit/msfe-core";
import { parseMindMapEmbed, serializeMindMapEmbed, type MindMapEmbed } from "@quirekit/mind-map";
import type { MsfeMindMapAttributes } from "./types";

/** @param mind - Validated envelope. @returns Standalone canonical Markdown fence. */
export function mindMapMarkdown(mind: MindMapEmbed): string { return `\`\`\`quirekit-mind-map\n${serializeMindMapEmbed(mind)}\n\`\`\``; }
/** @param document - Source authority. @param node - Confirmed fence. @returns Parsed mind, or unchanged source fallback. */
export function readMindMapSource(document: SourceDocument, node: SourceNode): MsfeMindMapAttributes | null {
  const info = node.child("CodeInfo"), marks = node.children("CodeMark");
  if (marks.length !== 2 || !info || node.parentKind !== "Document" || document.slice(info.from, info.to).trim() !== "quirekit-mind-map") return null;
  try { return { mind: parseMindMapEmbed(document.slice(document.lineAt(marks[0]!.from).to + 1, document.lineAt(marks[1]!.from).from)) }; }
  catch { return null; }
}
/** @param document - Source authority. @param node - Current fence. @param patch - Complete replacement mind. @returns Canonical replacement or refusal. */
export function patchMindMapSource(document: SourceDocument, node: SourceNode, patch: Partial<MsfeMindMapAttributes>): SourceEdit | null {
  const current = readMindMapSource(document, node);
  if (!current || !patch.mind || Object.keys(patch).some(key => key !== "mind") || patch.mind.id !== current.mind.id || patch.mind.document.revision !== current.mind.document.revision + 1) return null;
  try { return { from: node.from, to: node.to, insert: mindMapMarkdown(patch.mind) }; } catch { return null; }
}
