import type { Editor } from "@quirekit/core";
import type { ResolvedWordNumberingMarker } from "@quirekit/classic-numbering-model";
import { resolveWordParagraphIndentation } from "@quirekit/classic-paragraph-model";
import { openBlockListMarkerMenu, onBlockEditorLocaleChange, readBlockEditorLocale, translateBlockText } from "@quirekit/block-editor";
import { appendStaticTaskCheckbox, mountTaskCheckbox, destroyTaskCheckbox } from "./task";

const releases = new WeakMap<Node, () => void>();
/** @param node - Removed marker or task widget. */
export function releaseMarker(node: Node): void { releases.get(node)?.(); releases.delete(node); destroyTaskCheckbox(node); }

/** @param marker - Shared resolved geometry. @returns Continuous CSS indentation in logical direction. */
export function markerIndent(marker: ResolvedWordNumberingMarker): { start: number; end: number; first: number } {
  const value = resolveWordParagraphIndentation(marker.indentation);
  return { start: value.startTwips / 15, end: value.endTwips / 15, first: value.firstLineTwips / 15 };
}

/**
 * Draws portable geometric bullets independently of a font's glyph bearings.
 * @param document - Owning browser document.
 * @param marker - Canonical marker; explicit glyph fonts retain text rendering.
 * @returns A CSS shape or null for numbering and custom symbols.
 */
function bulletShape(document: Document, marker: ResolvedWordNumberingMarker): HTMLElement | null {
  if (marker.kind !== "bullet" || marker.markerStyle?.fonts || marker.markerStyle?.underline || marker.markerStyle?.strike
    || !["•", "◦", "▪"].includes(marker.text)) return null;
  const shape = document.createElement("span");
  shape.dataset.blockBulletShape = marker.text === "▪" ? "square" : marker.text === "◦" ? "circle" : "disc";
  shape.style.cssText = "display:inline-block;box-sizing:border-box;inline-size:.28em;block-size:.28em;vertical-align:.18em;background:currentColor;pointer-events:none";
  if (marker.text !== "▪") shape.style.borderRadius = "50%";
  if (marker.text === "◦") {
    shape.style.inlineSize = ".36em"; shape.style.blockSize = ".36em";
    shape.style.background = "none"; shape.style.border = ".075em solid currentColor";
  }
  return shape;
}

/**
 * Renders an uneditable marker; task clicks use a mapped position and canonical command.
 * @param document - Owning browser document.
 * @param editor - Canonical session.
 * @param marker - Shared numbering resolver output.
 * @param getPos - Live widget position after transaction mapping.
 * @param readonly - Immutable permission projection matching this widget's key.
 * @param staticHTML - Serialize without mounting interactive components.
 * @returns Noneditable marker with no additional caret position.
 */
export function createMarker(document: Document, editor: Editor, marker: ResolvedWordNumberingMarker, getPos: () => number | undefined, readonly = false, staticHTML = false): HTMLElement {
  const interactive = !readonly && marker.kind !== "task";
  const element = document.createElement(interactive ? "button" : "span");
  const indent = markerIndent(marker), style = marker.markerStyle;
  element.contentEditable = "false";
  element.dataset.blockListMarker = marker.kind;
  element.textContent = marker.text;
  element.style.cssText = `display:inline-block;box-sizing:border-box;min-width:${Math.max(0, -indent.first)}px;margin-inline-start:${indent.first}px;padding:0;padding-inline-end:${marker.suffix === "nothing" ? 0 : 4}px;white-space:pre;text-indent:0;user-select:none;vertical-align:baseline;font:inherit;color:inherit;background:none;border:0;text-align:${marker.justification === "center" ? "center" : marker.justification === "end" ? "end" : "start"}`;
  if (marker.kind === "task") {
    element.textContent = "";
    if (staticHTML) appendStaticTaskCheckbox(element, marker.checked === true);
    else mountTaskCheckbox(element, editor, marker.checked === true, getPos, readonly);
    return element;
  }
  if (style?.fontSizePt) element.style.fontSize = `${style.fontSizePt}pt`;
  if (style?.bold !== undefined) element.style.fontWeight = style.bold ? "bold" : "normal";
  if (style?.italic !== undefined) element.style.fontStyle = style.italic ? "italic" : "normal";
  if (style?.color && style.color !== "auto") element.style.color = style.color;
  const family = style?.fonts?.ascii ?? style?.fonts?.highAnsi ?? style?.fonts?.eastAsia;
  if (family) element.style.fontFamily = family;
  if (style?.underline || style?.strike) element.style.textDecoration = [style.underline && "underline", style.strike && "line-through"].filter(Boolean).join(" ");
  const shape = bulletShape(document, marker);
  if (shape) {
    element.replaceChildren(shape);
    element.style.textAlign = "end";
    element.style.paddingInlineEnd = marker.suffix === "nothing" ? "0" : ".5em";
  }
  if (interactive) {
    element.setAttribute("type", "button");
    element.style.cursor = readonly ? "default" : "pointer";
    element.onpointerdown = event => { event.preventDefault(); event.stopPropagation(); };
  }
  if (!readonly) {
    /** Updates only the retained marker's accessible name. */
    function label(): void { element.setAttribute("aria-label", translateBlockText(readBlockEditorLocale(editor), marker.kind === "ordered" ? "编号 {marker}，列表操作" : "项目符号，列表操作", { marker: marker.text })); }
    label(); releases.set(element, onBlockEditorLocaleChange(editor, label));
    element.setAttribute("aria-haspopup", "menu");
    element.onclick = event => {
      event.preventDefault(); event.stopPropagation();
      const pos = getPos();
      if (editor.isEditable && pos !== undefined) openBlockListMarkerMenu(element, pos - 1);
    };
  } else element.setAttribute("aria-hidden", "true");
  return element;
}
