import { EditorState, Schema, TextSelection } from "@quirekit/pm";
import { expect, it } from "vitest";
import { QUIRE_SELECTION_NAVIGATION_META_KEY, readQuireSelectionNavigation, setQuireSelectionNavigation } from "./selection-navigation";

const schema = new Schema({ nodes: { doc: { content: "text*" }, text: {} } });

it.each([-1, 1] as const)("carries immutable navigation %s without a step or another transaction", direction => {
  const state = EditorState.create({ schema, doc: schema.node("doc", null, schema.text("example")) });
  const tr = state.tr.setSelection(TextSelection.create(state.doc, 1, 4)).setMeta("addToHistory", false);
  const selection = tr.selection;
  expect(setQuireSelectionNavigation(tr, { direction })).toBe(tr);
  expect(readQuireSelectionNavigation(tr)).toEqual({ direction });
  expect(Object.isFrozen(readQuireSelectionNavigation(tr))).toBe(true);
  expect(tr.selection).toBe(selection);
  expect(tr.steps).toEqual([]);
  expect(tr.getMeta("addToHistory")).toBe(false);
  setQuireSelectionNavigation(tr, undefined);
  expect(readQuireSelectionNavigation(tr)).toBeUndefined();
});

it.each([null, undefined, -1, "forward", {}, { direction: 0 }, { direction: "1" }])("ignores invalid navigation %j", value => {
  const tr = EditorState.create({ schema }).tr.setMeta(QUIRE_SELECTION_NAVIGATION_META_KEY, value);
  expect(readQuireSelectionNavigation(tr)).toBeUndefined();
});
