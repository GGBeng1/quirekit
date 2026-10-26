import { bindBlockNodeLocale, blockEditorText } from "../localization/node-view";
import { validInlineDate } from "./value";
import type { Node } from "@quirekit/pm";
import type { QuireNodeViewRenderer } from "@quirekit/core";
import { quireIconRegistry } from "@quirekit/ui";
import { openInlineContent } from "./tasks";
/** Retained date atom; the same source-bound authoring task handles keyboard and pointer editing. */
export const renderInlineDate: QuireNodeViewRenderer = props => {
  const dom = props.view.dom.ownerDocument.createElement("time");
  dom.className = "qk-block-date qk-tag qk-tag--primary qk-tag--soft qk-tag--sm"; dom.contentEditable = "false";
  let currentDate = props.node.attrs.date;
  const document = dom.ownerDocument;
  const icon = document.createElement("span"), label = document.createElement("span");
  icon.className = "qk-tag__decoration qk-block-date__icon"; icon.setAttribute("aria-hidden", "true");
  // Registry markup is trusted UI decoration; document values remain plain text in the date label.
  icon.innerHTML = quireIconRegistry.resolve("calendar")!.svg;
  label.className = "qk-tag__content"; dom.append(icon, label);
  let pressed: PointerEvent | null = null;
  let alive = true;
  /** @param date - Canonical ISO value, including recoverable malformed imports. */
  function project(date: string): void { currentDate = date; dom.dateTime = date; label.textContent = validInlineDate(date) ? date : blockEditorText(props.editor, "{date}（无效日期）", { date: date || blockEditorText(props.editor, "空日期") }); }
  /** Releases the short-lived pointer lease; View keeps selection and capture ownership. */
  function cancel(): void { pressed = null; document.removeEventListener("pointerup", finish); document.removeEventListener("pointercancel", cancel); }
  /** @param event - Completed click, after View has finished its selection gesture. */
  function finish(event: PointerEvent): void {
    if (pressed?.pointerId !== event.pointerId) return;
    const start = pressed; cancel();
    if (!start || Math.hypot(event.clientX - start.clientX, event.clientY - start.clientY) > 4) return;
    const editor = props.editor, source = editor.state.doc, view = editor.mountedView;
    // View finishes the pointer selection first; the calendar then owns the selected atom.
    queueMicrotask(() => {
      if (!alive || editor.isDestroyed || !editor.isEditable || editor.state.doc !== source || editor.mountedView !== view) return;
      const position = props.getPos();
      if (position === undefined) return;
      editor.commands.setNodeSelection(position);
      openInlineContent(editor, "date", { position });
    });
  }
  /** @param event - Only unmodified primary gestures can request the calendar. */
  function begin(event: PointerEvent): void {
    cancel();
    if (event.button || event.isPrimary === false || event.shiftKey || event.metaKey || event.ctrlKey || event.altKey || !props.editor.isEditable) return;
    pressed = event; document.addEventListener("pointerup", finish); document.addEventListener("pointercancel", cancel);
  }
  dom.addEventListener("pointerdown", begin);
  const releaseLocale = bindBlockNodeLocale(props.editor, () => { dom.title = blockEditorText(props.editor, "点击或选中后按 Enter 修改日期"); project(currentDate); });
  return { dom,
    /** @param node - Next source. @returns Whether the atom can be reused. */
    update: (node: Node) => { if (node.type !== props.node.type) return false; project(node.attrs.date); return true; },
    /** @returns The generated atom contains no editable DOM. */
    ignoreMutation: () => true,
    /** Releases the native editing subscription. */
    destroy: () => { alive = false; releaseLocale(); cancel(); dom.removeEventListener("pointerdown", begin); } };
};
