import type { QuireKitToolbarEntry } from "@quirekit/ui";
import { EditorSelection } from "@quirekit/cm-state";
import { removeSourceBlock, sourceBlockAt, withSourceOperation, type MsfeCommand, type MsfeEditor, type MsfeSourceRange } from "@quirekit/msfe-core";
import { openMsfeMindMap } from "@quirekit/msfe-mind-map";
import { openMsfeFlowchart } from "@quirekit/msfe-flowchart";
import { openMsfeWhiteboard } from "@quirekit/msfe-whiteboard";
import { openMsfeDataView } from "@quirekit/msfe-data-view";
import type { DataViewEmbed } from "@quirekit/data-view";
import { openMdDataView } from "../data-view/open";
import type { MindMapEmbed } from "@quirekit/mind-map";
import type { FlowchartEmbed } from "@quirekit/flowchart";
import type { WhiteboardDocument } from "@quirekit/whiteboard";
import { openMdMindMapDialog } from "../mind-map/open";
import { openMdFlowchartDialog } from "../flowchart/open";
import { openMdWhiteboardDialog, renameMdWhiteboard } from "../whiteboard/open";
import type { mdEditorMessages } from "../messages";
import type { MdNativeDiagramKind, MdObjectFacts, MdObjectKind } from "./types";

/** Action bar labels drawn from the product messages. */
type Labels = (typeof mdEditorMessages)["zh-CN"];

/**
 * @param kind - Selected feature.
 * @param facts - Current source facts.
 * @param readOnly - Whether the source accepts edits.
 * @param text - Product labels.
 * @returns Ordered toolbar entries; read-only objects keep only non-mutating actions.
 */
export function mdObjectActions(kind: MdObjectKind, facts: MdObjectFacts, readOnly: boolean, text: Labels): readonly QuireKitToolbarEntry[] {
  const diagram = kind !== "image", picture = kind !== "math" && kind !== "dataView";
  const entry = (value: string, label: string, icon: string, extra: Partial<QuireKitToolbarEntry> = {}): QuireKitToolbarEntry => ({ value, label, icon, ...extra });
  return [
    ...(readOnly ? [] : [entry("edit", diagram ? text.objectEdit : text.editImage, "edit")]),
    ...(kind === "whiteboard" && !readOnly ? [entry("rename", text.objectRename, "type")] : []),
    ...(picture ? [entry("preview", text.objectPreview, "maximize", { disabled: !facts.src })] : []),
    ...(diagram && picture ? [entry("download", text.objectDownload, "download", { disabled: !facts.src })] : []),
    { value: "divider", label: "", kind: "separator" },
    entry("copy", text.objectCopy, "copy"),
    ...(readOnly ? [] : [entry("cut", text.objectCut, "scissors"), entry("delete", text.objectDelete, "trash")]),
  ];
}

/**
 * Opens the feature's configured editing task for the exact current source.
 * @param editor - Canonical source owner.
 * @param kind - Selected feature.
 * @param range - Current mapped object range.
 * @param rename - Open the whiteboard title task instead of drawing.
 * @returns Whether a task opened.
 */
export function editMdObject(editor: MsfeEditor, kind: MdNativeDiagramKind | "dataView", range: MsfeSourceRange, rename = false): boolean {
  const match = editor.querySource(kind, range).matches.find(item => item.from === range.from && item.to === range.to);
  if (!match) return false;
  if (kind === "dataView") return openMsfeDataView(editor, openMdDataView, range, match.attrs.dataView as DataViewEmbed);
  if (kind === "mindMap") return openMsfeMindMap(editor, openMdMindMapDialog, range, match.attrs.mind as MindMapEmbed);
  if (kind === "flowchart") return openMsfeFlowchart(editor, openMdFlowchartDialog, range, match.attrs.flow as FlowchartEmbed);
  return openMsfeWhiteboard(editor, rename ? renameMdWhiteboard : openMdWhiteboardDialog, range, match.attrs.board as WhiteboardDocument);
}

/**
 * @param kind - Selected feature.
 * @param range - Captured object range.
 * @param cut - Record the removal as a cut.
 * @returns One source deletion: a complete block for diagrams, the inline syntax for images.
 */
export function removeMdObject(kind: MdObjectKind, range: MsfeSourceRange, cut = false): MsfeCommand {
  const operation = { kind: cut ? "text.cut" : kind === "image" ? "text.delete" : "block.remove" };
  if (kind !== "image") {
    return withSourceOperation(state => {
      const block = sourceBlockAt(state, range.from);
      return block && block.from <= range.from && block.to >= range.to ? removeSourceBlock(block)(state) : null;
    }, operation);
  }
  return withSourceOperation(state => range.to <= state.doc.length
    ? { changes: { from: range.from, to: range.to }, selection: EditorSelection.cursor(range.from) } : null, operation);
}

/** @param owner - Active document. @param src - PNG data URL. @param name - Suggested file name. */
export function downloadMdObject(owner: Document, src: string, name: string): void {
  const link = owner.createElement("a");
  link.href = src; link.download = name; link.click();
}
