import { bindBlockNodeLocale, blockEditorText } from "../localization/node-view";
import type { QuireNodeViewRenderer } from "@quirekit/core";
import type { Node } from "@quirekit/pm";
import { parseMathLatex } from "@quirekit/math";
import { acquireBlockMathRenderer } from "./renderer";
import { openBlockMath } from "./tasks";

/** Retained formula projection; only a changed source requests new mathematical layout. */
export const renderBlockMath: QuireNodeViewRenderer = props => {
  const document = props.view.dom.ownerDocument, display = props.node.type.name === "displayMath";
  const dom: HTMLElement = document.createElement(display ? "div" : "span"), graphic = document.createElement("span");
  const lease = acquireBlockMathRenderer(props.editor);
  let failure = "";
  let source: string | undefined, generation = 0, destroyed = false;
  dom.dataset.qkMath = display ? "block" : "inline"; dom.className = "qk-block-math";
  dom.contentEditable = "false"; dom.setAttribute("role", "math");
  graphic.className = "qk-block-math__graphic"; graphic.setAttribute("aria-hidden", "true"); dom.append(graphic);
  /** @param latex - Canonical exact source. */
  function project(latex: string): void {
    if (source === latex) return;
    source = latex; const version = ++generation;
    dom.dataset.latex = latex; dom.setAttribute("aria-label", latex || blockEditorText(props.editor, "空公式"));
    failure = ""; dom.dataset.ready = "false"; delete dom.dataset.error;
    // Keep a readable source while pending. Never display a stale formula as the new content.
    graphic.textContent = latex || blockEditorText(props.editor, "公式"); graphic.style.cssText = ""; dom.style.verticalAlign = "";
    const parsed = parseMathLatex(latex);
    /** @param message - Rendering or grammar failure; source remains intact. */
    function failed(message: string): void {
      if (destroyed || version !== generation) return;
      failure = message; dom.dataset.error = "true"; chrome();
    }
    if (!parsed.ok) { failed("公式暂时无法显示"); return; }
    void lease.render(parsed.document, display).then(layout => {
      if (destroyed || version !== generation) return;
      graphic.innerHTML = layout.svg;
      graphic.style.width = `${layout.width}em`; graphic.style.height = `${layout.height}em`;
      if (!display) dom.style.verticalAlign = `${layout.baseline - layout.height}em`;
      dom.dataset.ready = "true"; chrome();
    }, () => failed("公式渲染失败"));
  }
  /** Updates chrome without reparsing or rendering the formula. */
  function chrome(): void {
    dom.setAttribute("aria-label", source || blockEditorText(props.editor, "空公式"));
    dom.title = failure ? blockEditorText(props.editor, "{message}；双击编辑源码", { message: blockEditorText(props.editor, failure) }) : blockEditorText(props.editor, "双击或选中后按 Enter 编辑公式");
  }
  const releaseLocale = bindBlockNodeLocale(props.editor, chrome);
  /** @param event - Explicit atom selection without stealing cross-document drag ownership. */
  function select(event: PointerEvent): void {
    if (event.button || event.shiftKey) return;
    const position = props.getPos(); if (position === undefined) return;
    props.editor.commands.setNodeSelection(position); props.view.focus(); event.preventDefault();
  }
  /** @param event - Explicit formula editing gesture. */
  function edit(event: MouseEvent): void {
    const position = props.getPos();
    if (position !== undefined && openBlockMath(props.editor, display, { position })) { event.preventDefault(); event.stopPropagation(); }
  }
  dom.addEventListener("pointerdown", select); dom.addEventListener("dblclick", edit); project(props.node.attrs.latex);
  return { dom,
    /** @param node - Next canonical source. @returns Whether this view retains its ownership. */
    update(node: Node) { if (node.type !== props.node.type) return false; project(node.attrs.latex); return true; },
    /** @param event - Local input. @returns Whether this formula consumed the gesture. */
    stopEvent(event: Event) { return event.defaultPrevented && (event.type === "pointerdown" || event.type === "dblclick"); },
    /** @returns Source is canonical; generated SVG never becomes editable DOM. */
    ignoreMutation() { return true; },
    /** Invalidates asynchronous work and releases the document renderer lease. */
    destroy() { destroyed = true; releaseLocale(); generation++; lease.release(); dom.removeEventListener("pointerdown", select); dom.removeEventListener("dblclick", edit); }
  };
};
