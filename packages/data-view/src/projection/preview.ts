import type { DataViewEmbed } from "../model/types";
import { formatDataValue } from "../model/format";
import { readDataView } from "../codec/json";
import { queryDataSet, groupDataSet } from "../query/execute";
import type { DataViewPreview } from "./types";

/** Creates a bounded static projection without fetching or retaining a live editor.
 * @param source - Portable source.
 * @returns Deterministic projection at this exact inline revision.
 */
export function dataViewPreview(source: DataViewEmbed): DataViewPreview {
  const embed = readDataView(source), view = embed.views.find(item => item.id === embed.defaultViewId)!;
  if (embed.source.kind !== "inline") return {title: view.name, rows: [], notice: "外部数据引用 · 打开工作区加载"};
  const data = embed.source.dataset;
  if (view.type === "board") {
    const groups = groupDataSet(data, view, {limit: 3}).slice(0, 4);
    return {title: view.name, rows: [groups.map(group => `${group.label} (${group.total})`), ...[0, 1, 2].map(index => groups.map(group => {
      const record = group.records[index]; return record ? String(record.values[data.primaryFieldId]) : "";
    }))], notice: `${data.records.length} 条记录 · 看板摘要，最多 4 列 × 3 张卡片`};
  }
  const fields = view.visibleFieldIds.slice(0, 4).map(id => data.fields.find(field => field.id === id)!);
  const page = queryDataSet(data, view.query, {limit: 5});
  return {title: view.name, rows: [fields.map(field => field.name), ...page.records.map(record => fields.map(field => formatDataValue(field, record.values[field.id]!)))], notice: `${page.total} 条匹配记录 · 摘要，最多 5 行 × 4 列`};
}
