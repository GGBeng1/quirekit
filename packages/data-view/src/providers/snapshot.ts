import type { DataSet } from "../model/types";
import { parseDataSet, readDataSet } from "../codec/json";
import { DataViewError, requireData } from "../validation/error";
import { copyJson } from "../validation/json";
import { identities } from "../validation/primitives";
import { groupDataSet, queryDataSet } from "../query/execute";
import type { DataSourceJsonLoader, DataSourceProvider, DataSourceQuery, DataSourceSession } from "./types";

/** Opens an immutable, read-only snapshot with complete query semantics.
 * @param input - Complete bounded source snapshot.
 * @returns Disposable read-only session.
 */
export function createSnapshotDataSource(input: DataSet): DataSourceSession {
  let data: DataSet | null = readDataSet(input);
  /** Checks lifecycle and cancellation before any operation.
   * @param signal - Optional cancellation.
   * @param revision - Optional required version.
   * @returns Current immutable snapshot.
   */
  function current(signal?: AbortSignal, revision?: string): DataSet {
    signal?.throwIfAborted(); requireData(data, "$", "Data source is disposed");
    if (revision !== undefined && revision !== data.revision) throw new DataViewError("conflict", "$.revision", "Snapshot revision differs");
    return data;
  }
  return {
    /** @param signal - Cancellation. @returns Detached source facts. */
    async describe(signal) {
      const source = current(signal);
      return {datasetId: source.id, revision: source.revision, fields: copyJson(source.fields), primaryFieldId: source.primaryFieldId,
        capabilities: {read: true, write: false, schema: false, groupedQuery: true, consistentSnapshot: true}};
    },
    /** @param request - Query/projection. @param signal - Cancellation. @returns Versioned result page. */
    async query(request, signal) {
      const source = current(signal, request.atRevision), fields = request.fields ? identities(request.fields, "$.fields") : source.fields.map(field => field.id);
      requireData(fields.every(id => source.fields.some(field => field.id === id)), "$.fields", "Unknown projected field");
      const key = JSON.stringify([source.id, source.revision, request.query, fields]);
      const offset = cursorOffset(request, key);
      const page = queryDataSet(source, request.query, {offset, limit: request.pageSize ?? 100});
      return {revision: page.revision, total: page.total, fields: [...fields],
        records: page.records.map(record => ({id: record.id, values: Object.fromEntries(fields.map(id => [id, record.values[id]!]))})),
        nextCursor: page.nextOffset === null ? null : JSON.stringify({key, offset: page.nextOffset})};
    },
    /** @param view - Complete board query. @param signal - Cancellation. @returns Exact groups. */
    async queryGroups(view, signal) { return groupDataSet(current(signal), view); },
    /** @param revision - Required immutable revision. @param signal - Cancellation. @returns Detached full snapshot. */
    async snapshot(revision, signal) { return readDataSet(current(signal, revision)); },
    /** Releases retained source bytes. */
    dispose() { data = null; }
  };
}

/** Checks that a cursor still belongs to this exact query and projection.
 * @param request - Query continuation.
 * @param key - Complete snapshot/query identity.
 * @returns Requested offset.
 */
function cursorOffset(request: DataSourceQuery, key: string): number {
  if (request.cursor === undefined) return 0;
  let value: unknown;
  try { value = JSON.parse(request.cursor); } catch { throw new DataViewError("invalid", "$.cursor", "Malformed cursor"); }
  requireData(value !== null && typeof value === "object", "$.cursor", "Malformed cursor");
  const cursor = value as Record<string, unknown>;
  requireData(cursor.key === key && typeof cursor.offset === "number" && Number.isSafeInteger(cursor.offset) && cursor.offset >= 0, "$.cursor", "Cursor belongs to a different query or revision");
  return cursor.offset;
}

/** Adapts an explicit host loader to bounded, complete JSON source sessions.
 * @param load - Host-owned authenticated transport; no implicit fetch is performed.
 * @returns Read-only provider supporting files or HTTP through the supplied loader.
 */
export function createJsonDataSourceProvider(load: DataSourceJsonLoader): DataSourceProvider {
  return {
    /** @param source - External reference. @param signal - Cancellation. @returns Source session. */
    async open(source, signal) {
      signal?.throwIfAborted(); const expectedId = source.datasetId;
      const json = await load(copyJson(source), signal); signal?.throwIfAborted();
      const dataset = parseDataSet(json);
      requireData(dataset.id === expectedId, "$.id", "Loaded dataset does not match the reference");
      return createSnapshotDataSource(dataset);
    }
  };
}
