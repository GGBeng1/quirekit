import { bindBlockNodeLocale, blockEditorText } from "../localization/node-view";
import type { QuireNodeViewRendererProps } from "@quirekit/core";
import type { Node } from "@quirekit/pm";
import type { BlockMediaNodeView } from "./types";
import { mediaShellStyle, readMediaPresentation } from "./presentation";
import { openBlockMediaPreview } from "./preview";
/**
 * Adds shared display geometry around an existing feature NodeView, retaining its source editor and preview.
 * @param props - Exact feature source.
 * @param inner - Existing inert preview renderer.
 * @returns HTML flow shell with no independent content model.
 */
export function wrapMediaView(props: QuireNodeViewRendererProps, inner: BlockMediaNodeView): BlockMediaNodeView {
 const document = props.view.dom.ownerDocument, dom = document.createElement("figure"), stage = document.createElement("div"), presentation = document.createElement("div"), caption = document.createElement("figcaption");
 const visual = inner.dom as HTMLElement;
 let currentNode = props.node;
 const releaseLocale = bindBlockNodeLocale(props.editor, () => dom.setAttribute("aria-label", readMediaPresentation(currentNode.attrs.media).alt || currentNode.attrs.alt || blockEditorText(props.editor, "图片")));
 let previewMaxWidth = visual.style.maxWidth || "100%";
 dom.dataset.qkBlockMedia = props.node.type.name; dom.contentEditable = "false"; dom.tabIndex = 0;
 stage.dataset.blockMediaStage = "true"; presentation.dataset.blockMediaVisual = "true"; presentation.append(visual); stage.append(presentation); dom.append(stage, caption);
 /** @param node - Latest canonical source and display geometry. */
 function project(node: Node): void {
  currentNode = node;
  const media = readMediaPresentation(node.attrs.media);
  previewMaxWidth = visual.style.maxWidth || "100%";
  dom.style.cssText = mediaShellStyle(media, previewMaxWidth); dom.setAttribute("aria-label", media.alt || visual.getAttribute("aria-label") || node.attrs.alt || blockEditorText(props.editor, "图片"));
  const fixed = media.width !== null && media.height !== null;
  const quarterTurn = media.rotation % 180 !== 0;
  stage.style.cssText = `position:relative;overflow:hidden;width:100%;${fixed ? `aspect-ratio:${media.width}/${media.height}` : "height:auto"}`;
  // Rotate the cropped viewport, not the uncropped bitmap. Its pre-rotation
  // dimensions swap on quarter turns, so the entire result fits the flow frame.
  presentation.style.cssText = fixed
   ? `position:absolute;overflow:hidden;left:50%;top:50%;width:${quarterTurn ? media.height! / media.width! * 100 : 100}%;height:${quarterTurn ? media.width! / media.height! * 100 : 100}%;transform:translate(-50%,-50%) rotate(${media.rotation}deg) scale(${media.flipX ? -1 : 1},${media.flipY ? -1 : 1})`
   : `position:relative;overflow:hidden;width:100%;transform:scale(${media.flipX ? -1 : 1},${media.flipY ? -1 : 1})`;
  visual.style.margin = "0"; visual.style.maxWidth = "100%"; visual.style.width = "100%"; visual.style.outline = "none";
  visual.style.height = fixed ? "100%" : "";
  if (fixed) visual.style.aspectRatio = "auto";
  const img = visual instanceof HTMLImageElement ? visual : visual.querySelector("img");
  if (img) {
   const { crop } = media;
   const horizontal = 1 - crop.left - crop.right, vertical = 1 - crop.top - crop.bottom;
   img.style.cssText = fixed
    ? `position:absolute;display:block;left:${-crop.left / horizontal * 100}%;top:${-crop.top / vertical * 100}%;width:${100 / horizontal}%;max-width:none;height:${100 / vertical}%;object-fit:fill`
    : "display:block;width:100%;max-width:none;height:auto";
   img.alt = media.alt || img.alt; img.draggable = false;
  }
  caption.textContent = media.caption; caption.hidden = !media.caption;
  caption.style.cssText = "margin-top:8px;text-align:center;color:var(--qk-color-text-tertiary);font-size:12px;line-height:1.5";
 }
 /** @param event - Explicit object selection, preserving the original double-click handler. */
 function select(event: PointerEvent): void {
  if ((event.button !== 0 && event.button !== 2) || event.shiftKey || (event.target instanceof Element && event.target.closest("button, input, textarea"))) return;
  if (!props.editor.isEditable) { event.preventDefault(); return; }
  const pos = props.getPos(); if (pos === undefined) return;
  props.editor.commands.setNodeSelection(pos); props.view.focus(); event.preventDefault();
 }
 /** @param event - Explicit preview gesture; diagrams retain their own editable double click. */
 function preview(event: MouseEvent | KeyboardEvent): void {
  if (event.defaultPrevented || event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.target instanceof Element && event.target.closest("button,input,textarea,a")) return;
  const editable = props.editor.isEditable;
  if (editable && props.node.type.name !== "image") return;
  if (event instanceof KeyboardEvent ? event.key !== "Enter" : event.type !== (editable ? "dblclick" : "click") || event.button !== 0) return;
  const pos = props.getPos();
  if (pos === undefined || !openBlockMediaPreview(props.editor, pos)) return;
  event.preventDefault(); event.stopPropagation();
 }
 dom.addEventListener("pointerdown", select, true);
 dom.addEventListener("click", preview, true); dom.addEventListener("dblclick", preview, true); dom.addEventListener("keydown", preview, true);
 project(props.node);
 return { dom,
  /** @param node - Next source. @param decorations - Outer decorations. @param innerDecorations - Nested decorations. @returns Whether this owner still represents the source. */
  update(node, decorations, innerDecorations) {
   // Give the feature back its constraint before it projects a changed source.
   // Explicit media dimensions only override the displayed shell, never this default.
   visual.style.maxWidth = previewMaxWidth;
   if (node.type !== props.node.type || inner.update?.(node, decorations, innerDecorations) === false) return false;
   project(node); return true;
  },
  /** Projects selection through the shared external controls. */ selectNode() { dom.dataset.selected = "true"; },
  /** Clears the selected state. */ deselectNode() { delete dom.dataset.selected; },
  /** @param event - Native event. @returns Whether the adapter or its nested feature already owns this input. */
  stopEvent(event) {
   // Preview selection has already consumed this press. Forwarding it to the
   // generic click tracker would count the same object twice across dialogs.
   return event.type === "pointerdown" && event.defaultPrevented || (inner.stopEvent?.(event) ?? false);
  },
  /** @returns The inert preview never becomes editable DOM input. */ ignoreMutation() { return true; },
  /** Releases feature resources and local input listeners. */ destroy() {
   releaseLocale(); inner.destroy?.(); dom.removeEventListener("pointerdown", select, true);
   dom.removeEventListener("click", preview, true); dom.removeEventListener("dblclick", preview, true); dom.removeEventListener("keydown", preview, true);
  }
 };
}
