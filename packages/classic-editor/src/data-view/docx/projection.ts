import {
  formatDataValue, groupDataSet, queryDataSet, readDataView, serializeDataView,
  type DataField, type DataRecord, type DataSet, type DataView, type DataViewEmbed
} from "@quirekit/data-view";
import type { DocxAuthoringApi, DocxCodecDiagnosticInput, LitAstNode } from "@quirekit/lit-docx-contract";

/** Versioned rich-text control tag identifying a projected data view. */
export const dataViewDocxTag = "quirekit:data-view:1";

/** Rows written into the Word table; larger results say how many were left out. */
const rowLimit = 200;
/** Central per-item metadata budget for the restorable source. */
const metadataBudget = 65_536;
const lineColor = "BFC7D1";
const headerFill = "F4F6F8";

/** Rows of one projected view: column names and their display texts. */
interface ProjectedRows {
  /** Header texts. */
  readonly header: readonly string[];
  /** Body rows, at most the row limit. */
  readonly rows: readonly (readonly string[])[];
  /** Matching records before the limit. */
  readonly total: number;
}

/**
 * Projects a data view as a native Word table inside a tagged block that can restore it.
 * @param input - Persisted embed of the dataView node.
 * @param api - Central Word builders.
 * @param report - Operation diagnostic sink.
 * @returns Tagged block holding the title, the table of the default view and a note.
 */
export function projectDataView(input: unknown, api: DocxAuthoringApi, report: (diagnostic: DocxCodecDiagnosticInput) => void): LitAstNode {
  const embed = readDataView(input);
  const view = embed.views.find(item => item.id === embed.defaultViewId) ?? embed.views[0]!;
  const title = api.blocks.paragraph({ children: [api.inline.text(view.name, { marks: [api.marks.bold()] })] });
  let children: LitAstNode[];
  if (embed.source.kind === "inline") {
    const projected = projectRows(embed.source.dataset, view);
    const shown = projected.rows.length;
    const kind = view.type === "board" ? "看板视图" : "表格视图";
    const note = shown < projected.total
      ? `多维表格静态快照（${kind}）：共 ${projected.total} 条匹配记录，仅导出前 ${shown} 条。`
      : `多维表格静态快照（${kind}）：共 ${projected.total} 条匹配记录。`;
    children = [title, createTable(projected, api), api.blocks.paragraph({ children: [api.inline.text(note)] })];
    if (shown < projected.total) {
      report({ code: "data-view-rows-truncated", severity: "warning", disposition: "approximated",
        message: `多维表格共 ${projected.total} 条记录，Word 表格只导出前 ${shown} 条；完整数据保留在恢复信息中。` });
    }
  } else {
    children = [title, api.blocks.paragraph({ children: [api.inline.text("多维表格引用外部数据，导出未包含记录。")] })];
    report({ code: "data-view-external-source", severity: "warning", disposition: "approximated",
      message: "多维表格引用外部数据源，导出时不请求数据，Word 中只保留引用说明。" });
  }
  const metadata = { version: 1, data: { source: serializeDataView(embed) } };
  const preserve = new TextEncoder().encode(JSON.stringify(metadata)).length <= metadataBudget;
  report(preserve
    ? { code: "data-view-table-projected", severity: "info", disposition: "projected",
      message: "多维表格以 Word 表格导出；可见内容未修改且恢复信息完整时，导回可恢复为多维表格。" }
    : { code: "data-view-source-not-retained", severity: "warning", disposition: "approximated",
      message: "多维表格已以 Word 表格导出，数据超过 Word 元数据预算，导回后不能恢复为多维表格；请保留原生 JSON 以继续编辑。" });
  return api.roundTrip.taggedBlock({ tag: dataViewDocxTag, alias: view.name, children, ...(preserve ? { metadata, metadataOptional: true } : {}) });
}

/**
 * @param node - Tagged Word control whose visible content the central codec has already checked.
 * @param api - Metadata reader.
 * @returns The restorable embed, or null to keep the current Word content.
 */
export function recoverDataView(node: LitAstNode, api: DocxAuthoringApi): DataViewEmbed | null {
  const metadata = api.roundTrip.readMetadata(node), data = metadata?.data;
  if (metadata?.version !== 1 || data === null || typeof data !== "object" || Array.isArray(data)) return null;
  const value = data as Record<string, unknown>;
  if (typeof value.source !== "string" || Object.keys(value).some(key => key !== "source")) return null;
  try { return readDataView(JSON.parse(value.source)); } catch { return null; }
}

/**
 * Lays out the default view as rows: a table view lists its query result; a board view lists each group's records
 * in group order behind a leading group column.
 * @param data - Inline dataset.
 * @param view - Default view.
 * @returns Header, limited body rows and the full match count.
 */
function projectRows(data: DataSet, view: DataView): ProjectedRows {
  const fields = view.visibleFieldIds.map(id => data.fields.find(field => field.id === id)).filter((field): field is DataField => field !== undefined);
  const cells = (record: DataRecord) => fields.map(field => formatDataValue(field, record.values[field.id] ?? null));
  if (view.type === "board") {
    const groupField = data.fields.find(field => field.id === view.groupBy);
    const columns = fields.filter(field => field.id !== view.groupBy);
    const groups = groupDataSet(data, view);
    const rows = groups.flatMap(group => group.records.map(record =>
      [group.label, ...columns.map(field => formatDataValue(field, record.values[field.id] ?? null))]));
    return { header: [groupField?.name ?? "分组", ...columns.map(field => field.name)], rows: rows.slice(0, rowLimit), total: rows.length };
  }
  const page = queryDataSet(data, view.query, { limit: rowLimit });
  return { header: fields.map(field => field.name), rows: page.records.map(cells), total: page.total };
}

/**
 * @param projected - Header and body texts.
 * @param api - Central Word builders.
 * @returns Full-width fixed table with a repeated, shaded header row and thin grid lines.
 */
function createTable(projected: ProjectedRows, api: DocxAuthoringApi): LitAstNode {
  const line = { val: "single", sz: 4, space: 0, color: lineColor };
  const borders = { top: line, left: line, bottom: line, right: line };
  const text = (value: string, bold = false) => [api.blocks.paragraph({ children: [bold
    ? api.inline.text(value, { marks: [api.marks.bold()] }) : api.inline.text(value)] })];
  const header = api.tables.row({ isHeader: true, cells: projected.header.map(name =>
    api.tables.shadedCell({ fill: headerFill, borders, children: text(name, true) })) });
  const body = projected.rows.map(row => api.tables.row({ cells: row.map(value => api.tables.cell({ borders, children: text(value) })) }));
  return api.tables.table({ rows: [header, ...body], width: { value: 5000, type: "pct" }, layout: "fixed" });
}
