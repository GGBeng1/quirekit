import { describe, expect, it } from "vitest";
import { createDataView } from "../model/create";
import { applyDataViewOperations } from "../operations/apply";
import { createJsonDataSourceProvider, createSnapshotDataSource } from "./snapshot";

/** @returns A populated immutable session fixture. */
function fixture() {
  const embed = applyDataViewOperations(createDataView("source"), [
    {type: "insert-record", record: {id: "a", values: {title: "A", status: "todo"}}},
    {type: "insert-record", record: {id: "b", values: {title: "B", status: "done"}}}
  ], {baseRevision: "source:initial", revision: "r1"});
  if (embed.source.kind !== "inline") throw new Error("Expected inline");
  return embed.source.dataset;
}

describe("host snapshot provider", () => {
  it("binds cursors to query, projection and revision and marks projections explicitly", async () => {
    const session = createSnapshotDataSource(fixture());
    const first = await session.query({query: {sort: []}, fields: ["title"], pageSize: 1});
    expect(first.records[0]!.values).toEqual({title: "A"}); expect(first.fields).toEqual(["title"]);
    expect(first.total).toBe(2);
    const second = await session.query({query: {sort: []}, fields: ["title"], cursor: first.nextCursor!, pageSize: 1});
    expect(second.records[0]!.id).toBe("b"); expect(second.nextCursor).toBeNull();
    await expect(session.query({query: {sort: []}, cursor: first.nextCursor!})).rejects.toThrow(/different query/);
    await expect(session.snapshot!("wrong")).rejects.toThrow(/revision/);
  });
  it("refuses mismatched sources and aborted late responses", async () => {
    const dataset = fixture(), provider = createJsonDataSourceProvider(async () => JSON.stringify(dataset));
    await expect(provider.open({kind: "remote", provider: "host", datasetId: "wrong"})).rejects.toThrow(/does not match/);
    const controller = new AbortController();
    const aborting = createJsonDataSourceProvider(async () => {controller.abort(); return JSON.stringify(dataset);});
    await expect(aborting.open({kind: "resource", datasetId: dataset.id, ref: "data.json"}, controller.signal)).rejects.toThrow();
  });
  it("does not claim write support or retain data after disposal", async () => {
    const session = createSnapshotDataSource(fixture());
    expect((await session.describe()).capabilities.write).toBe(false); expect(session.mutate).toBeUndefined();
    session.dispose(); session.dispose(); await expect(session.query({query: {sort: []}})).rejects.toThrow(/disposed/);
  });
});
