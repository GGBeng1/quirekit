import type * as PMDecoration from "./index";
import { Schema } from "@quirekit/pm-model";
import { Transform } from "@quirekit/pm-transform";
import { describe, expect, it } from "vitest";

const distEntry = "../dist/index.mjs";
const { Decoration, DecorationGroup, DecorationSet, WidgetType } = (await import(
  distEntry
)) as typeof PMDecoration;

describe("pm-decoration vendored API", () => {
  it("stores inline, node, and widget decorations in document order", () => {
    const schema = new Schema({
      nodes: {
        doc: { content: "block+" },
        paragraph: { content: "text*", group: "block" },
        text: {}
      }
    });
    const paragraph = schema.node("paragraph", null, [schema.text("hello")]);
    const doc = schema.node("doc", null, [paragraph]);
    const decorations = [
      Decoration.widget(3, { nodeType: 1 }, { key: "cursor-widget" }),
      Decoration.node(0, paragraph.nodeSize, { class: "paragraph-shell" }),
      Decoration.inline(2, 5, { class: "marked" }, { purpose: "inline" })
    ];
    const set = DecorationSet.create(doc, decorations.slice());

    expect(set.find().map(decoration => decoration.spec.key ?? decoration.spec.purpose ?? decoration.type.constructor.name)).toEqual([
      "NodeType",
      "inline",
      "cursor-widget"
    ]);
  });

  it("maps decorations through document changes", () => {
    const schema = new Schema({
      nodes: {
        doc: { content: "text*" },
        text: {}
      }
    });
    const doc = schema.node("doc", null, [schema.text("hello")]);
    const set = DecorationSet.create(doc, [
      Decoration.inline(1, 4, { class: "marked" }, { id: "inline" }),
      Decoration.widget(2, { nodeType: 1 }, { key: "widget" })
    ]);
    const transform = new Transform(doc).insert(1, schema.text("!"));
    const mapped = set.map(transform.mapping, transform.doc);

    expect(mapped.find(undefined, undefined, spec => spec.id === "inline").map(decoration => [
      decoration.from,
      decoration.to
    ])).toEqual([[2, 5]]);
    expect(mapped.find(undefined, undefined, spec => spec.key === "widget").map(decoration => decoration.from)).toEqual([3]);
  });

  it("reports removed decorations during mapping", () => {
    const schema = new Schema({
      nodes: {
        doc: { content: "text*" },
        text: {}
      }
    });
    const doc = schema.node("doc", null, [schema.text("hello")]);
    const set = DecorationSet.create(doc, [
      Decoration.inline(1, 4, { class: "marked" }, { id: "inline" }),
      Decoration.widget(2, { nodeType: 1 }, { key: "widget" })
    ]);
    const transform = new Transform(doc).delete(1, 4);
    const removed: string[] = [];
    const mapped = set.map(transform.mapping, transform.doc, {
      onRemove(spec) {
        removed.push(spec.id ?? spec.key);
      }
    });

    expect(mapped.find()).toHaveLength(0);
    expect(removed.sort()).toEqual(["inline", "widget"]);
  });

  it("preserves widget identity by key and calls destroy hooks", () => {
    const destroyed: unknown[] = [];
    const first = Decoration.widget(1, { nodeType: 1 }, {
      key: "shared-widget",
      destroy(node: unknown) {
        destroyed.push(node);
      }
    });
    const second = Decoration.widget(1, { nodeType: 1 }, { key: "shared-widget" });
    const node = { nodeType: 1 };

    expect(first.type).toBeInstanceOf(WidgetType);
    expect(first.eq(second)).toBe(true);

    first.type.destroy(node);

    expect(destroyed).toEqual([node]);
  });

  it("combines decoration sets through DecorationGroup", () => {
    const schema = new Schema({
      nodes: {
        doc: { content: "text*" },
        text: {}
      }
    });
    const doc = schema.node("doc", null, [schema.text("hello")]);
    const first = DecorationSet.create(doc, [Decoration.inline(1, 2, { class: "a" })]);
    const second = DecorationSet.create(doc, [Decoration.inline(3, 4, { class: "b" })]);
    const group = DecorationGroup.from([first, second]);
    const decorations: PMDecoration.Decoration[] = [];

    group.forEachSet(set => decorations.push(...set.find()));

    expect(decorations.map(decoration => decoration.from)).toEqual([1, 3]);
  });
});
