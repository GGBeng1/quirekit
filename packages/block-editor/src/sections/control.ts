import { bindBlockNodeLocale, blockEditorText } from "../localization/node-view";
import type { Editor } from "@quirekit/core";
import { quireIconRegistry } from "@quirekit/ui";
import { v4 } from "uuid";

const releases = new WeakMap<Node, () => void>();

/** @param node - Removed section widget. */
export function releaseSectionControl(node: Node): void { releases.get(node)?.(); releases.delete(node); }

/**
 * Anchors a disclosure to the first heading line, independently of font size or wrapping.
 * @param document - Mounted View document.
 * @param editor - Canonical command owner.
 * @param id - Stable heading identity.
 * @param collapsed - Current local folding state.
 * @returns Zero-width control; the block rail anchors beside its actual rectangle.
 */
export function sectionControl(document: Document, editor: Editor, id: string, collapsed: boolean): HTMLElement {
  const anchor = document.createElement("span"), button = document.createElement("button");
  anchor.className = "qk-block-section-control"; anchor.contentEditable = "false";
  button.type = "button"; button.className = "qk-block-section-toggle";
  button.id = `qk-block-section-${v4()}`;
  releases.set(anchor, bindBlockNodeLocale(editor, () => button.setAttribute("aria-label", blockEditorText(editor, collapsed ? "展开章节" : "折叠章节"))));
  button.setAttribute("aria-expanded", String(!collapsed));
  // This audited registry SVG is static UI data, never document-provided HTML.
  button.innerHTML = quireIconRegistry.resolve("triangleDown")!.svg;
  button.firstElementChild!.setAttribute("aria-hidden", "true");
  button.addEventListener("pointerdown", event => event.preventDefault());
  button.addEventListener("click", event => {
    event.preventDefault();
    editor.chain().toggleBlockSection(id).focus(null, { scrollIntoView: false }).run();
  });
  anchor.append(button); return anchor;
}
