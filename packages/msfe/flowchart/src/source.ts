import type { SourceDocument, SourceNode, SourceEdit } from "@quirekit/msfe-core";
import { parseFlowchartEmbed, serializeFlowchartEmbed, type FlowchartEmbed } from "@quirekit/flowchart";
import type { MsfeFlowchartAttributes } from "./types";

/** @param flow - Validated envelope. @returns Standalone canonical Markdown fence. */
export function flowchartMarkdown(flow: FlowchartEmbed): string { return `\`\`\`quirekit-flowchart\n${serializeFlowchartEmbed(flow)}\n\`\`\``; }
/** @param document - Source authority. @param node - Confirmed fence. @returns Parsed flow, or unchanged source fallback. */
export function readFlowchartSource(document: SourceDocument, node: SourceNode): MsfeFlowchartAttributes | null {
  const info = node.child("CodeInfo"), marks = node.children("CodeMark");
  if (marks.length !== 2 || !info || node.parentKind !== "Document" || document.slice(info.from, info.to).trim() !== "quirekit-flowchart") return null;
  try { return { flow: parseFlowchartEmbed(document.slice(document.lineAt(marks[0]!.from).to + 1, document.lineAt(marks[1]!.from).from)) }; }
  catch { return null; }
}
/** @param document - Source authority. @param node - Current fence. @param patch - Complete replacement flow. @returns Canonical replacement or refusal. */
export function patchFlowchartSource(document: SourceDocument, node: SourceNode, patch: Partial<MsfeFlowchartAttributes>): SourceEdit | null {
  const current = readFlowchartSource(document, node);
  if (!current || !patch.flow || Object.keys(patch).some(key => key !== "flow") || patch.flow.id !== current.flow.id || patch.flow.document.revision !== current.flow.document.revision + 1) return null;
  try { return { from: node.from, to: node.to, insert: flowchartMarkdown(patch.flow) }; } catch { return null; }
}
