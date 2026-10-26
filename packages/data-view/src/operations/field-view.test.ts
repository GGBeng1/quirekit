import { expect, it } from "vitest";
import { createDataView } from "../model/create";
import { createDataViewDraft } from "../session/draft";
import { applyDataViewOperations } from "./apply";
import type { DataOperation } from "./types";

const additions: readonly DataOperation[] = [{type: "add-field", field: {id: "notes", name: "备注", type: "text"}, defaultValue: null}];

it("reveals newly created fields only in the requested view, without changing legacy defaults", () => {
  const initial = createDataView("fields");
  const version = {baseRevision: "fields:initial", revision: "created"};
  const legacy = applyDataViewOperations(initial, additions, version);
  expect(legacy.views).toEqual(initial.views);
  const next = applyDataViewOperations(initial, additions, version, {showAddedFieldsIn: "table"});
  expect(next.views[0]!.visibleFieldIds).toEqual(["title", "status", "notes"]);
  expect(next.views[1]).toEqual(initial.views[1]);
  expect(initial).toEqual(createDataView("fields"));
});

it("undoes field creation and its visibility together and rejects a missing target without history", () => {
  const initial = createDataView("fields"), draft = createDataViewDraft(initial);
  expect(() => draft.apply(additions, {baseRevision: "fields:initial", revision: "bad"}, {showAddedFieldsIn: "missing"})).toThrow();
  expect(draft.canUndo).toBe(false); expect(draft.read()).toEqual(initial);
  draft.apply(additions, {baseRevision: "fields:initial", revision: "created"}, {showAddedFieldsIn: "board"});
  expect(draft.read().views[1]!.visibleFieldIds).toEqual(["title", "notes"]);
  expect(draft.undo()).toBe(true); expect(draft.read()).toEqual(initial); expect(draft.canUndo).toBe(false);
  expect(draft.redo()).toBe(true); expect(draft.read().views[1]!.visibleFieldIds).toEqual(["title", "notes"]);
});

it("does not reveal a field that is removed again within the same atomic batch", () => {
  const initial = createDataView("fields");
  const next = applyDataViewOperations(initial, [...additions, {type: "delete-field", fieldId: "notes"}], {baseRevision: "fields:initial", revision: "batch"}, {showAddedFieldsIn: "table"});
  expect(next.views[0]!.visibleFieldIds).toEqual(initial.views[0]!.visibleFieldIds);
  expect(next.source.kind === "inline" && next.source.dataset.fields.some(field => field.id === "notes")).toBe(false);
});
