import type { DataBoardView, DataQuery, DataRecord, DataSet } from "../model/types";
import { readDataSet } from "../codec/json";
import { checkQuery, checkView } from "../validation/query";
import { requireData } from "../validation/error";
import { compareDataText, compareDataValue } from "./compare";
import { matchesDataFilter } from "./evaluate";
import { recordSearch } from "./search";
import type { DataGroup, DataPage, DataPageOptions } from "./types";

/** Executes a full query once before any page or group window is applied.
 * @param dataset - Validated complete snapshot.
 * @param query - Query to validate and execute.
 * @param search - Optional transient text across complete displayed values.
 * @returns Ordered matching records.
 */
export function matchingRecords(dataset: DataSet, query: DataQuery, search?: string): DataRecord[] {
  const fields = new Map(dataset.fields.map(field => [field.id, field]));
  checkQuery(query, fields);
  const matchesSearch = recordSearch(dataset, search);
  const rows = dataset.records.filter(row => (!query.filter || matchesDataFilter(row, query.filter, fields)) && (!matchesSearch || matchesSearch(row)));
  rows.sort((a, b) => {
    for (const key of query.sort) {
      const left = a.values[key.fieldId]!, right = b.values[key.fieldId]!;
      if (left === null || right === null) {
        if (left === right) continue;
        return (left === null ? -1 : 1) * (key.nulls === "first" ? 1 : -1);
      }
      const order = compareDataValue(fields.get(key.fieldId)!, left, right);
      if (order) return order * (key.direction === "asc" ? 1 : -1);
    }
    return compareDataText(a.id, b.id);
  });
  return rows;
}

/** Slices a complete result while retaining its exact count.
 * @param records - Complete ordered result.
 * @param revision - Owning dataset revision.
 * @param options - Requested window.
 * @returns Counted page.
 */
export function page(records: readonly DataRecord[], revision: string, options: DataPageOptions): DataPage {
  const offset = options.offset ?? 0, limit = options.limit ?? Math.max(records.length, 1);
  requireData(Number.isSafeInteger(offset) && offset >= 0, "$.page.offset", "Expected non-negative offset");
  requireData(Number.isSafeInteger(limit) && limit > 0, "$.page.limit", "Expected positive limit");
  return {revision, records: records.slice(offset, offset + limit), total: records.length,
    nextOffset: offset + limit < records.length ? offset + limit : null};
}

/** Queries a complete local snapshot, producing detached records.
 * @param input - Complete source dataset.
 * @param query - Filter and stable sort.
 * @param options - Optional page window.
 * @returns Exact count and requested page.
 */
export function queryDataSet(input: DataSet, query: DataQuery, options: DataPageOptions = {}): DataPage {
  const dataset = readDataSet(input);
  return page(matchingRecords(dataset, query, options.search), dataset.revision, options);
}

/** Groups complete query results before applying each column's window.
 * @param input - Complete source snapshot.
 * @param view - Board binding and query.
 * @param options - Per-column page size/offset.
 * @returns Ordered option columns followed by the unassigned column.
 */
export function groupDataSet(input: DataSet, view: DataBoardView, options: DataPageOptions = {}): readonly DataGroup[] {
  const dataset = readDataSet(input), fields = new Map(dataset.fields.map(field => [field.id, field]));
  checkView(view, fields);
  const field = fields.get(view.groupBy)!;
  requireData(field.type === "singleSelect", "$.groupBy", "Expected single-choice grouping");
  const groups = [...field.options.map(option => ({key: option.id as string | null, label: option.label})), {key: null, label: "未分组"}];
  const rows = new Map<string | null, DataRecord[]>(groups.map(group => [group.key, []]));
  for (const record of matchingRecords(dataset, view.query, options.search)) rows.get(record.values[field.id] as string | null)!.push(record);
  return groups.map(group => ({...group, ...page(rows.get(group.key)!, dataset.revision, options)}));
}
