import type { ComponentViewRenderer, MsfeEditor } from "@quirekit/msfe-core";
import { dataViewPreview, type DataViewEmbed } from "@quirekit/data-view";
import type { MsfeDataViewOptions, MsfeDataViewPreview } from "./types";
import { openMsfeDataView } from "./open";

/** Creates a bounded reading projection with no nested editor.
 * @param getEditor - Source owner, available after initial view construction.
 * @param open - Host workspace factory.
 * @returns Disposable projection renderer.
 */
export function dataViewProjection(getEditor: () => MsfeEditor, open: MsfeDataViewOptions["open"]): ComponentViewRenderer<MsfeDataViewPreview> {
  return context => {
    const document = context.dom.ownerDocument, element = document.createElement("figure");
    let current = context.props;
    let rendered: DataViewEmbed | undefined;
    element.tabIndex = 0; element.dataset.qkDataView = "true";
    element.style.overflowX = "auto";
    context.dom.append(element);
    /** @param next - Accepted source-derived props. */
    function update(next: MsfeDataViewPreview): void {
      current = next;
      if (rendered === next.dataView) return;
      rendered = next.dataView;
      const preview = dataViewPreview(next.dataView);
      const title = document.createElement("figcaption"), table = document.createElement("table"), note = document.createElement("small");
      title.textContent = preview.title; note.textContent = preview.notice;
      element.setAttribute("aria-label", preview.title);
      const head = document.createElement("thead"), body = document.createElement("tbody");
      preview.rows.forEach((row, index) => {
        const tr = document.createElement("tr");
        for (const text of row) {
          const cell = document.createElement(index === 0 ? "th" : "td"); cell.textContent = text;
          if (index === 0) cell.setAttribute("scope", "col");
          tr.append(cell);
        }
        (index === 0 ? head : body).append(tr);
      });
      table.append(head, body);
      element.replaceChildren(title, table, note); context.requestMeasure();
    }
    /** @param event - Explicit reading activation. */
    function activate(event: Event): void {
      if (event.defaultPrevented) return;
      if (event.type === "keydown") {
        const key = event as KeyboardEvent;
        if (key.key !== "Enter" || key.isComposing || key.keyCode === 229 || key.ctrlKey || key.metaKey || key.altKey || key.shiftKey) return;
      }
      // Projection props already map source displacement; capture source proof only for an explicit edit.
      if (!current.readOnly && openMsfeDataView(getEditor(), open, current.range, current.dataView)) { event.preventDefault(); event.stopPropagation(); }
    }
    element.addEventListener("dblclick", activate); element.addEventListener("keydown", activate); update(current);
    return {update,
      /** @returns Projection events are owned by its native element. */ ignoreEvent() { return true; },
      /** Releases native listeners. */ destroy() { element.removeEventListener("dblclick", activate); element.removeEventListener("keydown", activate); element.remove(); }
    };
  };
}
