import { h, type VNodeChild } from "vue";
import { parseDataView, dataViewPreview } from "@quirekit/data-view";

/** Renders portable inline data without network access or mounted authoring state.
 * @param source - Complete fenced JSON.
 * @returns Semantic reading projection; unsupported input remains literal code.
 */
export function renderDataViewPreview(source: string): VNodeChild | undefined {
  try {
    const preview = dataViewPreview(parseDataView(source));
    return h("figure", {"data-qk-data-view": "true"}, [h("figcaption", preview.title),
      h("table", [h("tbody", preview.rows.map((row, index) => h("tr", row.map(text => h(index === 0 ? "th" : "td", text)))))]), h("small", preview.notice)]);
  } catch { return undefined; }
}
