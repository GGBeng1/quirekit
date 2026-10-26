import { onBlockEditorLocaleChange, readBlockEditorLocale, translateBlockText } from "@quirekit/block-editor";
import type { Editor } from "@quirekit/core";
import { quireIconRegistry } from "@quirekit/ui";
import { QuireCheckbox, QuireIconProvider } from "@quirekit/ui/vue";
import { createApp, createVNode, h, shallowRef } from "vue";
import { v4 as uuidv4 } from "uuid";

const releases = new WeakMap<Node, () => void>();

/**
 * Mounts the same task control used by Markdown without introducing another checked-state owner.
 * @param element - Retained, zero-width widget mount.
 * @param editor - Canonical document session.
 * @param checked - Accepted task state.
 * @param getPos - Position after retained widget mapping.
 * @param readonly - Current editing permission.
 */
export function mountTaskCheckbox(element: HTMLElement, editor: Editor, checked: boolean, getPos: () => number | undefined, readonly: boolean): void {
  element.style.paddingInlineEnd = "0";
  element.style.verticalAlign = "top";
  element.style.setProperty("--qk-prose-list-indent", element.style.minWidth);
  // The component owns focus and Space; the editor owns only the accepted transaction.
  const locale = shallowRef(readBlockEditorLocale(editor));
  const releaseLocale = onBlockEditorLocaleChange(editor, value => { locale.value = value; });
  const app = createApp({
    /** @returns Shared control with its standard icon registry and prose geometry. */
    render() {
      return createVNode(QuireIconProvider, { registry: quireIconRegistry }, () => createVNode(QuireCheckbox, {
        class: "qk-prose-task-marker", checked, readOnly: readonly,
        label: translateBlockText(locale.value, checked ? "标记为未完成" : "标记为已完成"), "data-qk-not-prose": "",
        /** @param value - User-requested state; the document remains the only authority. */
        "onUpdate:checked": (value: boolean | "indeterminate" | undefined) => {
          const position = getPos();
          if (!editor.isEditable || readonly || position === undefined || typeof value !== "boolean" || value === checked) return;
          const focused = element.contains(element.ownerDocument.activeElement);
          editor.chain().closeHistory().toggleWordTaskAtPosition({ position: position - 1 }).run();
          editor.commands.closeHistory();
          if (focused) restoreTaskFocus(editor, element.ownerDocument, position - 1);
        }
      }, () => h("span", { class: "sr-only" }, translateBlockText(locale.value, checked ? "标记为未完成" : "标记为已完成"))));
    }
  });
  app.config.idPrefix = `block-task-${uuidv4()}`;
  app.mount(element);
  releases.set(element, () => { releaseLocale(); app.unmount(); });
}

/**
 * Returns native focus after the accepted frame replaces the old checked-state widget.
 * @param editor - Session that accepted the toggle.
 * @param document - Owner of the focused control.
 * @param position - Unchanged paragraph position.
 */
function restoreTaskFocus(editor: Editor, document: Document, position: number): void {
  const accepted = editor.state.doc;
  document.defaultView?.requestAnimationFrame(() => {
    if (editor.isDestroyed || editor.state.doc !== accepted) return;
    const paragraph = editor.view.nodeDOM?.(position);
    if (paragraph?.nodeType !== 1) return;
    (paragraph as Element).querySelector<HTMLInputElement>('[data-block-list-marker="task"] input')?.focus({ preventScroll: true });
  });
}

/** @param element - Removed widget; ordinary markers have no mounted component. */
export function destroyTaskCheckbox(element: Node): void {
  releases.get(element)?.();
  releases.delete(element);
}

/**
 * Static exports have no UI runtime or stylesheet, so preserve task semantics with a native control.
 * @param element - Serialized marker box.
 * @param checked - Canonical completion state.
 */
export function appendStaticTaskCheckbox(element: HTMLElement, checked: boolean): void {
  const input = element.ownerDocument.createElement("input");
  input.type = "checkbox";
  input.disabled = true;
  if (checked) input.setAttribute("checked", "");
  input.setAttribute("aria-label", checked ? "已完成" : "未完成");
  input.style.cssText = "width:16px;height:16px;margin:0;vertical-align:middle";
  element.replaceChildren(input);
}
