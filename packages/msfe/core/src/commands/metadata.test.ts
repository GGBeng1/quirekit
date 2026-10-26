import { expect, it } from "vitest";
import { Annotation, EditorState } from "@quirekit/cm-state";
import { commandDraft } from "./draft";

it("preserves transaction metadata across command draft convergence", () => {
  const origin = Annotation.define<string>();
  const state = EditorState.create({ doc: "x" });
  const draft = commandDraft(state, {}, () => { throw new Error("unused"); }, false);
  draft.run(({ tr }) => tr.apply({ changes: { from: 1, insert: "y" }, annotations: origin.of("first") })
    && tr.apply({ annotations: origin.of("second") }));
  expect(state.update(draft.finish()).annotation(origin)).toBe("first");
});
