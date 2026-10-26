import { describe, expect, it } from "vitest";
import { parseXmindContent } from "./content";
import { serializeMindMap, parseMindMap } from "../model/document";

const workbook = [{ id: "sheet-a", title: "计划", rootTopic: {
  id: "source-root", title: "项目 🧠", structureClass: "org.xmind.ui.logic.left",
  position: { x: 50, y: 100 }, children: {
    attached: [{ id: "source-branch", title: "设计", branch: "folded", children: { attached: [{ title: "调研" }] } }],
    detached: [{ title: "自由主题", position: { x: -250, y: 350 }, children: { attached: [{ title: "保留子树" }] } }],
  },
} }, { id: "sheet-b", title: "第二张", rootTopic: { title: "另一个根" } }];

describe("XMind content projection", () => {
  it("returns every sheet and retains folded descendants and detached trees", () => {
    const result = parseXmindContent(JSON.stringify(workbook));
    expect(result.sheets.map(sheet => sheet.title)).toEqual(["计划", "第二张"]);
    const document = result.sheets[0]!.document;
    expect(document.layout).toBe("logical-left");
    expect(document.root.children[0]).toMatchObject({ text: "设计", collapsed: true, children: [{ text: "调研" }] });
    expect(document.floatingTopics).toMatchObject([{ position: { x: -300, y: 250 }, root: { text: "自由主题", children: [{ text: "保留子树" }] } }]);
    expect(parseMindMap(serializeMindMap(document))).toEqual(document);
    expect(result.diagnostics).toEqual([]);
    expect(Object.isFrozen(result.sheets)).toBe(true);
  });

  it("reports unsupported fields, root folds, unknown layouts and missing free positions", () => {
    const result = parseXmindContent([{ title: "说明", relationships: [{ title: "关联" }], rootTopic: {
      title: "根", branch: "folded", structureClass: "org.xmind.ui.fishbone",
      notes: { plain: { content: "备注" } }, image: { src: "xap:resources/image.png" },
      futureFeature: true, children: { detached: [{ title: "独立主题" }], summary: [{ title: "概要" }] },
    } }]);
    expect(result.sheets[0]!.document.root.collapsed).toBe(false);
    expect(result.sheets[0]!.document.layout).toBe("mind-map");
    expect(result.sheets[0]!.document.floatingTopics).toHaveLength(1);
    const paths = result.diagnostics.map(item => item.path);
    expect(result.sheets[0]!.document.root.details?.note).toBe("备注");
    for (const field of ["relationships[0]", "rootTopic.image", "rootTopic.futureFeature", "rootTopic.children.summary", "rootTopic.structureClass", "rootTopic.branch", "rootTopic.children.detached[0].position"]) {
      expect(paths).toContain(`sheets[0].${field}`);
    }
  });

  it.each([[], {}, [{ title: "无根" }], [{ rootTopic: { title: 12 } }],
    [{ rootTopic: { title: "根", children: { attached: {} } } }],
    [{ rootTopic: { title: "根", children: { detached: [{ title: "自由", position: { x: NaN, y: 0 } }] } } }]])("rejects malformed input without an apparently valid empty map", input => {
    expect(() => parseXmindContent(input)).toThrow();
  });

  it("rejects hostile records, cycles, oversized source and deep trees", () => {
    const list = [{ rootTopic: { title: "安全" } }]; Object.defineProperty(list, "0", { get() { throw new Error("getter executed"); } });
    expect(() => parseXmindContent(list)).toThrow(/data array/);
    expect(() => parseXmindContent(" ".repeat(4000001))).toThrow(/budget/);
    expect(() => parseXmindContent([{ rootTopic: { get title() { throw new Error("getter executed"); } } }])).toThrow(/data property/);
    const root: Record<string, unknown> = { title: "根" };
    root.children = { attached: [root] };
    expect(() => parseXmindContent([{ rootTopic: root }])).toThrow(/cycle|reference/);
    let deep: unknown = { title: "根" };
    for (let i = 0; i < 66; i++) deep = { title: "层", children: { attached: [deep] } };
    expect(() => parseXmindContent([{ rootTopic: deep }])).toThrow(/budget/);
  });
});
