import { validInlineDate } from "./value";
import { Extension, Node, selectionPreset } from "@quirekit/core";
import { closeHistory } from "@quirekit/pm";
import type { InlineContentRequest } from "./types";
import { openSelectedInlineDate } from "./tasks";
import { renderInlineDate } from "./view";
declare module "@quirekit/core" {
  /** Inline calendar dates and ordinary Unicode emoji. */
  interface Commands<ReturnType> {
    /** Source-bound insertion shared by every product entry point. */
    readonly blockInlineContent: {
      /** @param request - Captured source. @param value - Complete date or Unicode text. @returns Whether the draft applied to its original target. */
      readonly applyBlockInlineContent: (request: InlineContentRequest, value: string) => ReturnType;
    };
  }
}
/** Typed inline dates and shared emoji authoring. */
export const BlockInlineContent = Extension.create({
  name: "blockInlineContent", keyboardShortcutPriority: 200,
  /** @returns A persistent semantic date atom; emoji remains ordinary text. */
  addExtensions: () => [Node.create({ name: "inlineDate", inline: true, group: "inline", atom: true,
    /** @returns Exact persisted date source, including recoverable invalid imports. */
    addAttributes: () => ({ date: { default: "", rendered: false } }),
    /** @returns Semantic time element import rule. */
    parseHTML: () => [{ tag: "time[datetime]", getAttrs: element => ({ date: element.getAttribute("datetime") ?? "" }) }],
    /** @param context - Canonical date. @returns Portable semantic date. */
    renderHTML: ({ node }) => ["time", { datetime: node.attrs.date, "data-qk-date": "true" }, node.attrs.date || "无效日期"],
    /** @param context - Canonical date. @returns Plain-text clipboard value. */
    renderText: ({ node }) => node.attrs.date || "无效日期",
    /** @returns Existing inline atom selection policy. */
    addSelection: () => [selectionPreset.inline({ id: "inlineDate", nodeTypes: ["inlineDate"] })],
    /** @returns Retained source-bound date view. */
    addNodeView: () => renderInlineDate
  })],
  /** @returns Validated, one-history-step writes; canceling a draft never calls this command. */
  addCommands: () => ({ applyBlockInlineContent: (request, value) => ({ editor, tr, commands }) => {
    if (!editor.isEditable || tr.doc !== request.doc || (request.kind === "date" ? !validInlineDate(value) : !value.trim() || value.length > 64)) return false;
    const content = request.kind === "date" ? { type: "inlineDate", attrs: { date: value } } : { type: "text", text: value };
    closeHistory(tr);
    return request.destination ? commands.insertBlockAt({ destination: request.destination, replaceEmpty: true, content: { type: "paragraph", content: [content] } }) : commands.insertContentAt(request.range, content);
  } }),
  /** @returns Keyboard reopening for a selected date. */
  addKeyboardShortcuts() { return { Enter: () => {
    return this.editor ? openSelectedInlineDate(this.editor) : false;
  } }; }
});
