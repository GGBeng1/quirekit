import { flowchartPreviewSource } from "@quirekit/flowchart";
import type { ComponentViewRenderer, MsfeEditor } from "@quirekit/msfe-core";
import type { MsfeFlowchartOptions, MsfeFlowchartPreviewProps } from "./types";
import { openMsfeFlowchart } from "./session";

/** @param editor - Mounted source owner. @param open - Product dialog composition. @returns Lightweight preview without an inner editor. */
export function flowchartPreview(editor: MsfeEditor, open: MsfeFlowchartOptions["open"]): ComponentViewRenderer<MsfeFlowchartPreviewProps> {
  return ({ dom, props, requestMeasure }) => {
    const figure = dom.ownerDocument.createElement("figure"), image = dom.ownerDocument.createElement("img");
    figure.dataset.qkFlowchart = "true"; figure.tabIndex = 0;
    figure.style.cssText = "margin:16px 0;border:1px solid var(--qk-color-border-subtle,#e2e8f0);border-radius:8px;overflow:hidden;background:white;cursor:pointer";
    image.style.cssText = "display:block;max-width:100%;max-height:460px;width:auto;height:auto;margin:auto;object-fit:contain";
    figure.append(image); dom.append(figure);
    let current = props, anchor = editor.captureAnchor(props.range);
    /** @param next - Accepted semantic source. */
    function update(next: MsfeFlowchartPreviewProps): void {
      if (current.flow !== next.flow) { anchor.release(); anchor = editor.captureAnchor(next.range); }
      current = next; image.hidden = !next.flow.preview;
      if (next.flow.preview) { image.src = flowchartPreviewSource(next.flow)!; image.width = next.flow.preview.width; image.height = next.flow.preview.height; }
      // The title and double-click hint stay accessible; host selection UI owns the visible actions.
      image.alt = next.flow.title; figure.setAttribute("aria-label", `${next.flow.title}${next.readOnly ? "" : " · 双击编辑"}`); requestMeasure();
    }
    /** @param event - Pointer or keyboard preview activation. */
    function activate(event: Event): void {
      if (event.type === "keydown" && (event as KeyboardEvent).key !== "Enter") return;
      const range = anchor.getRange();
      if (!range || !anchor.target() || current.readOnly) return;
      if (openMsfeFlowchart(editor, open, range, current.flow)) { event.preventDefault(); event.stopPropagation(); }
    }
    figure.addEventListener("dblclick", activate); figure.addEventListener("keydown", activate); image.addEventListener("load", requestMeasure); update(props);
    return { update, ignoreEvent: () => true,
      destroy() { anchor.release(); figure.removeEventListener("dblclick", activate); figure.removeEventListener("keydown", activate); image.removeEventListener("load", requestMeasure); figure.remove(); }
    };
  };
}
