import { describe, expect, it } from "vitest";
import { unzipSync, zipSync, strToU8 } from "fflate";
import { parseXmindContent } from "./content";
import { importXmindFile } from "./file";
import { exportXmindContent } from "./export/content";
import { exportXmindFile } from "./export/file";
import { readMindMapDocument } from "../model/document";

const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 4, 0, 0, 0, 181, 28, 12, 2, 0, 0, 0, 11, 73, 68, 65, 84, 120, 218, 99, 252, 255, 31, 0, 3, 3, 2, 0, 239, 191, 151, 219, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130]);
const workbook = [{ title: "验证脑图", theme: { centralTopic: { properties: { "svg:fill": "#4455EE", "fo:color": "#FFFFFF", "fo:font-size": "18pt" } },
  mainTopic: { properties: { "fo:font-size": "12pt" } } }, rootTopic: { id: "r", title: "验证脑图", structureClass: "org.xmind.ui.logic.right", position: { x: 100, y: 50 },
  notes: { plain: { content: "备注\n第二行" } }, href: "https://example.com/plan", markers: [{ markerId: "priority-2" }],
  image: { src: "xap:resources/picture.png", width: 80, height: 50 },
  children: { attached: [{ id: "a", title: "调研", branch: "folded", style: { properties: { "shape-class": "org.xmind.topicShape.ellipse", "line-width": "1.5pt", "fo:font-weight": "600" } }, children: { attached: [{ id: "d", title: "折叠内容" }] } }, { id: "b", title: "开发" }, { id: "c", title: "验收" }],
    detached: [{ id: "f", title: "自由树", structureClass: "org.xmind.ui.logic.left", position: { x: -200, y: 230 }, children: { attached: [{ title: "自由子主题" }] } }],
    summary: [{ id: "sum", title: "关键步骤" }] }, boundaries: [{ range: "(0,1)", title: "阶段", style: { properties: { "line-color": "#336699" } } }], summaries: [{ range: "(1,2)", topicId: "sum" }] },
  relationships: [{ end1Id: "a", end2Id: "c", title: "验收依赖", style: { properties: { "line-color": "#884422" } } }] }];

describe("XMind admitted content and file roundtrip", () => {
  it("preserves themes, content, IDs in relations, groups and embedded PNG without external access", async () => {
    const source = zipSync({ "content.json": strToU8(JSON.stringify(workbook)), "resources/picture.png": png });
    const imported = await importXmindFile(source), document = imported.sheets[0]!.document;
    expect(imported.diagnostics).toEqual([]);
    expect(document.version).toBe(5);
    expect(document.root).toMatchObject({ style: { fontSize: 24, fill: "#4455ee" }, details: { note: "备注\n第二行", link: "https://example.com/plan", marker: "priority-2", image: { width: 80, height: 50 } } });
    expect(document.root.children[0]).toMatchObject({ collapsed: true, style: { fontSize: 16, shape: "ellipse", bold: true, lineWidth: 2 }, children: [{ text: "折叠内容" }] });
    expect(document.floatingTopics?.[0]).toMatchObject({ position: { x: -300, y: 180 }, side: "left" });
    expect(document.annotations).toMatchObject([{ kind: "relation", from: document.root.children[0]!.id, to: document.root.children[2]!.id }, { kind: "boundary", topicIds: document.root.children.slice(0, 2).map(node => node.id) }, { kind: "summary", text: "关键步骤" }]);
    const output = await exportXmindFile(document); expect(output.diagnostics).toEqual([]);
    const entries = unzipSync(output.bytes); expect(Object.keys(entries)).toEqual(expect.arrayContaining(["content.json", "metadata.json", "manifest.json", "resources/image-1.png"]));
    const reopened = await importXmindFile(output.bytes);
    expect(reopened.diagnostics).toEqual([]);
    expect(reopened.sheets[0]!.document).toEqual(document);
    const multi = await importXmindFile((await exportXmindFile([document, document])).bytes);
    expect(multi.sheets).toHaveLength(2); expect(multi.sheets[1]!.document.root.text).toBe("验证脑图");
  });

  it("converts legacy style references, notes, links, priority and referenced groups", async () => {
    const xml = `<xmap-content><sheet><title>旧版</title><topic id="r" style-id="blue" href="https://example.com"><title>根</title><notes><plain>完整备注</plain></notes><marker-refs><marker-ref marker-id="priority-1"/></marker-refs><children><topics type="attached"><topic id="a"><title>甲</title></topic><topic id="b"><title>乙</title></topic></topics><topics type="summary"><topic id="s"><title>概括</title></topic></topics></children><boundaries><boundary range="(0,1)"><title>范围</title></boundary></boundaries><summaries><summary range="(0,1)" topic-id="s"/></summaries></topic><relationships><relationship end1="a" end2="b"><title>关联</title></relationship></relationships></sheet></xmap-content>`;
    const styles = `<xmap-styles xmlns:fo="urn:fo" xmlns:svg="urn:svg"><automatic-styles><style id="blue" type="topic"><topic-properties fo:font-size="12pt" svg:fill="#4455EE" line-color="#123456"/></style></automatic-styles></xmap-styles>`;
    const result = await importXmindFile(zipSync({ "content.xml": strToU8(xml), "styles.xml": strToU8(styles) }));
    expect(result.diagnostics).toEqual([]); expect(result.sheets[0]!.document.root).toMatchObject({ style: { fill: "#4455ee", fontSize: 16 }, details: { note: "完整备注", link: "https://example.com", marker: "priority-1" } });
    expect(result.sheets[0]!.document.annotations?.map(item => item.kind)).toEqual(["relation", "boundary", "summary"]);
  });

  it("resolves legacy sheet theme roles before overlaying topic styles", async () => {
    const xml = `<xmap-content><sheet theme="theme"><topic style-id="override"><title>主题样式</title><children><topics type="attached"><topic><title>继承</title></topic></topics></children></topic></sheet></xmap-content>`;
    const styles = `<xmap-styles xmlns:fo="urn:fo" xmlns:svg="urn:svg"><automatic-styles><style id="base" type="topic"><topic-properties fo:font-size="18pt" svg:fill="#123456"/></style></automatic-styles><master-styles><style id="theme" type="theme"><theme-properties><default-style style-family="centralTopic" style-id="base"/><default-style style-family="mainTopic" style-id="base"/></theme-properties></style></master-styles><styles><style id="override" type="topic"><topic-properties fo:font-size="12pt"/></style></styles></xmap-styles>`;
    const result = await importXmindFile(zipSync({ "content.xml": strToU8(xml), "styles.xml": strToU8(styles) }));
    expect(result.diagnostics).toEqual([]);
    expect(result.sheets[0]!.document.root.style).toEqual({ fontSize: 16, fill: "#123456" });
    expect(result.sheets[0]!.document.root.children[0]!.style).toEqual({ fontSize: 24, fill: "#123456" });
  });

  it("reports rich notes, unsupported style/markers, bad links, missing images and invalid references", () => {
    const result = parseXmindContent([{ rootTopic: { title: "不完整", href: "javascript:alert(1)", notes: { html: { content: { paragraphs: [{ spans: [{ text: "纯文字" }] }] } } },
      style: { properties: { "fo:font-family": "Unknown", "fo:font-size": "11pt" } }, image: { src: "https://example.com/remote.png" }, markers: [{ markerId: "priority-7" }],
      summaries: [{ range: "(0,9)", topicId: "missing" }] }, relationships: [{ end1Id: "a", end2Id: "b" }] }]);
    expect(result.sheets[0]!.document.root.details).toEqual({ note: "纯文字" });
    expect(result.sheets[0]!.document.root.style?.fontSize).toBe(15);
    expect(result.diagnostics.map(item => item.path)).toEqual(expect.arrayContaining(["sheets[0].rootTopic.href", "sheets[0].rootTopic.image", "sheets[0].relationships[0]", "sheets[0].rootTopic.summaries[0]"]));
    expect(() => parseXmindContent([{ rootTopic: { id: "a", title: "根", children: { attached: [{ id: "a", title: "重复" }] } } }])).toThrow(/duplicate/);
  });

  it("reports non-sibling groups, branch directions and alternative text on export", () => {
    const base = parseXmindContent(workbook, { readResource: () => png }).sheets[0]!.document;
    const document = readMindMapDocument({ ...base, root: { ...base.root, details: { ...base.root.details, image: { ...base.root.details!.image!, alt: "图示" } }, children: base.root.children.map((node, i) => i ? node : { ...node, side: "left" }) },
      annotations: [{ id: "group", kind: "boundary", topicIds: [base.root.id, base.root.children[0]!.id], text: "不可表示" }] });
    const result = exportXmindContent(document);
    expect(result.diagnostics.map(item => item.path)).toEqual(expect.arrayContaining(["sheets[0].rootTopic.details.image.alt", "sheets[0].rootTopic.children[0].side", "sheets[0].annotations[0]"]));
    expect(document.annotations).toHaveLength(1);
  });

  it("rejects duplicate and traversing ZIP resources, oversized referenced resources and resource totals", async () => {
    const content = strToU8(JSON.stringify(workbook));
    await expect(importXmindFile(zipSync({ "content.json": content, "../evil": png }))).rejects.toThrow(/path/);
    await expect(importXmindFile(zipSync({ "content.json": content, "resources/picture.png": new Uint8Array(750001) }))).rejects.toThrow(/budget/);
    const topics = Array.from({ length: 5 }, (_, i) => ({ title: "图片", image: { src: `xap:resources/${i}.png` } }));
    const files: Record<string, Uint8Array> = { "content.json": strToU8(JSON.stringify([{ rootTopic: { title: "预算", children: { attached: topics } } }])) };
    topics.forEach((_, i) => { files[`resources/${i}.png`] = new Uint8Array(700000); });
    await expect(importXmindFile(zipSync(files))).rejects.toThrow(/budget/);
  });
});
