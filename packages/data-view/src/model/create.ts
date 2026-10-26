import type { DataViewEmbed } from "./types";
import { requireData } from "../validation/error";

/** Creates a small portable dataset for consumers and acceptance scenarios.
 * @param id - New embed identity.
 * @returns Independent table and board over the same records.
 */
export function createDataView(id: string): DataViewEmbed {
  requireData(typeof id === "string" && id.length > 0 && id.length <= 240, "$.id", "Expected a fresh identity of 1–240 characters");
  return {
    format: "quirekit-data-view", version: 1, id,
    source: { kind: "inline", dataset: {
      format: "quirekit-dataset", version: 1, id: `${id}:data`, revision: `${id}:initial`, primaryFieldId: "title",
      fields: [
        { id: "title", name: "名称", type: "text" },
        { id: "status", name: "状态", type: "singleSelect", options: [
          { id: "todo", label: "待办", color: "neutral" }, { id: "doing", label: "进行中", color: "info" }, { id: "done", label: "完成", color: "success" }
        ] }
      ], records: []
    } },
    views: [
      { id: "table", name: "表格", type: "table", visibleFieldIds: ["title", "status"], query: { sort: [] } },
      { id: "board", name: "看板", type: "board", groupBy: "status", visibleFieldIds: ["title"], query: { sort: [] } }
    ], defaultViewId: "table"
  };
}
