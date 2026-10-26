import { describe, expect, it } from "vitest";
import { createDataView } from "../model/create";
import { serializeDataView } from "../codec/json";
import { createDataViewDraft } from "./draft";

describe("local authoring draft", () => {
  it("keeps cancellation and internal undo separate from document persistence", () => {
    const original = createDataView("draft"), draft = createDataViewDraft(original);
    draft.apply([{type: "insert-record", record: {id: "row", values: {title: "本地草稿", status: null}}}], {baseRevision: "draft:initial", revision: "edited"});
    expect(draft.dirty).toBe(true); expect(draft.prepare().base).toBe(serializeDataView(original));
    expect(draft.undo()).toBe(true); expect(draft.dirty).toBe(false);
    expect(draft.redo()).toBe(true); expect(draft.dirty).toBe(true);
    expect(original).toEqual(createDataView("draft"));
    draft.dispose(); expect(() => draft.read()).toThrow(/disposed/);
  });
  it("view changes do not change data revision and failed batches do not change history", () => {
    const draft = createDataViewDraft(createDataView("draft"));
    draft.replaceView({...draft.read().views[0]!, name: "我的视图"});
    const before = draft.read();
    expect(() => draft.apply([{type: "delete-record", recordId: "missing"}], {baseRevision: "draft:initial", revision: "new"})).toThrow();
    expect(draft.read()).toEqual(before);
    expect(draft.undo()).toBe(true); expect(draft.canUndo).toBe(false);
  });
});
