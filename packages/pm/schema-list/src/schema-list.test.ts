import OrderedMap from "orderedmap";
import { describe, expect, it } from "vitest";
import { Schema } from "@quirekit/pm-model";
import { EditorState, TextSelection } from "@quirekit/pm-state";
import { addListNodes, wrapInList } from "./schema-list";

describe("pm-schema-list vendored API", () => {
  it("adds ordered, bullet, and item node specs to a schema map", () => {
    const nodes = addListNodes(
      OrderedMap.from({
        doc: { content: "block+" },
        paragraph: { content: "text*", group: "block" },
        text: { group: "inline" }
      }),
      "paragraph block*",
      "block"
    );
    const schema = new Schema({ nodes });

    expect(schema.nodes.ordered_list.name).toBe("ordered_list");
    expect(schema.nodes.bullet_list.name).toBe("bullet_list");
    expect(schema.nodes.list_item.name).toBe("list_item");
  });

  it("wraps a selected block in a bullet list", () => {
    const schema = new Schema({
      nodes: addListNodes(
        OrderedMap.from({
          doc: { content: "block+" },
          paragraph: { content: "text*", group: "block" },
          text: { group: "inline" }
        }),
        "paragraph block*",
        "block"
      )
    });
    const doc = schema.node("doc", null, [
      schema.node("paragraph", null, [schema.text("hello")])
    ]);
    const state = EditorState.create({
      doc,
      selection: TextSelection.create(doc, 1, 6)
    });
    let nextState = state;

    const applied = wrapInList(schema.nodes.bullet_list)(state, tr => {
      nextState = state.apply(tr);
    });

    expect(applied).toBe(true);
    expect(nextState.doc.toJSON()).toEqual({
      type: "doc",
      content: [
        {
          type: "bullet_list",
          content: [
            {
              type: "list_item",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "hello" }]
                }
              ]
            }
          ]
        }
      ]
    });
  });
});
