import { describe, expect, it } from "vitest";
import { EditorState } from "@quirekit/cm-state";
import { revisionField } from "../state/fields";
import { createEventDispatcher } from "./events";
import type { MsfeEditor, MsfeChangeEvent } from "./types";

describe("accepted event snapshots", () => {
  it("queues hook-issued edits after the original event and retains document identity", () => {
    const events: string[] = [];
    let documentId = "original", nested = false;
    let state = EditorState.create({ doc: "", extensions: revisionField });
    const editor = { get documentId() { return documentId; } } as MsfeEditor;
    const listeners = new Set([(event: MsfeChangeEvent) => { events.push(`${event.documentId}:${event.revision}`); }]);
    const emit = createEventDispatcher({ listeners, destroyed: () => false, report: error => { throw error; }, transaction() {
      if (nested) return;
      nested = true; documentId = "replacement";
      const transaction = state.update({ changes: { from: 0, insert: "nested" } }); state = transaction.state;
      emit(editor, [transaction]);
    } });
    const transaction = state.update({ changes: { from: 0, insert: "first" } }); state = transaction.state;
    emit(editor, [transaction]);
    expect(events).toEqual(["original:1", "replacement:2"]);
  });
});
