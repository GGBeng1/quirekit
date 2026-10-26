import type * as PMGapcursor from "./index";
import { Schema } from "@quirekit/pm-model";
import { EditorState, Selection } from "@quirekit/pm-state";
import { describe, expect, it } from "vitest";

const distEntry = "../dist/index.mjs";
const { GapCursor, gapCursor } = (await import(distEntry)) as typeof PMGapcursor;

describe("pm-gapcursor vendored API", () => {
  it("registers gap cursor selections for JSON roundtrips", () => {
    const schema = new Schema({
      nodes: {
        doc: { content: "block+" },
        paragraph: { content: "inline*", group: "block" },
        text: { group: "inline" }
      }
    });
    const doc = schema.node("doc", null, [schema.node("paragraph")]);
    const selection = new GapCursor(doc.resolve(0));
    const roundtrip = Selection.fromJSON(doc, selection.toJSON());

    expect(roundtrip).toBeInstanceOf(GapCursor);
    expect(roundtrip.eq(selection)).toBe(true);
  });

  it("installs key, click, composition, and decoration props", () => {
    const schema = new Schema({
      nodes: {
        doc: { content: "block+" },
        paragraph: { content: "inline*", group: "block" },
        text: { group: "inline" }
      }
    });
    const state = EditorState.create({
      schema,
      doc: schema.node("doc", null, [schema.node("paragraph")])
    });
    const plugin = gapCursor();
    const decorations = plugin.props.decorations as
      | ((nextState: EditorState) => unknown)
      | undefined;

    expect(plugin.props.handleKeyDown).toBeTypeOf("function");
    expect(plugin.props.handleClick).toBeTypeOf("function");
    expect(plugin.props.handleDOMEvents?.beforeinput).toBeTypeOf("function");
    expect(plugin.props.createSelectionBetween).toBeTypeOf("function");
    expect(decorations?.(state)).toBeNull();
  });
});
