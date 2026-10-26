import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { importXmindFile } from "./file";

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<xmap-content xmlns="urn:xmind:xmap:xmlns:content:2.0" version="2.0">
  <sheet id="s"><title>旧版画布</title><topic id="r" structure-class="org.xmind.ui.logic.right">
    <title>001 &amp; 中文</title><children>
      <topics type="attached"><topic id="a" branch="folded"><title>分支</title>
        <children><topics type="attached"><topic id="b"><title>内部主题</title></topic></topics></children>
        <notes><plain>旧备注</plain></notes>
      </topic></topics>
      <topics type="detached"><topic id="f"><title>独立</title><position x="350" y="-20"/></topic></topics>
    </children>
  </topic></sheet>
</xmap-content>`;

describe("XMind file conversion", () => {
  it("reads a modern archive without inflating resources or exposing file paths", async () => {
    const file = zipSync({ "content.json": strToU8(JSON.stringify([{ title: "新画布", rootTopic: { title: "正文" } }])),
      "resources/image.png": new Uint8Array(100000), "content.xml": strToU8("invalid legacy fallback") });
    const result = await importXmindFile(file);
    expect(result.sheets[0]?.document.root.text).toBe("正文");
  });

  it("converts XMind 8 XML including literal text, folds and free topics", async () => {
    const result = await importXmindFile(zipSync({ "content.xml": strToU8(xml) }));
    expect(result.sheets[0]?.title).toBe("旧版画布");
    const document = result.sheets[0]!.document;
    expect(document.root.text).toBe("001 & 中文");
    expect(document.root.children[0]).toMatchObject({ text: "分支", collapsed: true, children: [{ text: "内部主题" }] });
    expect(document.floatingTopics).toMatchObject([{ root: { text: "独立" }, position: { x: 350, y: -20 } }]);
    expect(document.root.children[0]?.details?.note).toBe("旧备注");
    expect(result.diagnostics).toEqual([]);
  });

  it("reads attributed legacy titles without trimming, flattening metadata or changing hierarchy", async () => {
    const source = `<xmap-content xmlns="urn:xmind:xmap:xmlns:content:2.0" xmlns:svg="http://www.w3.org/2000/svg">
      <sheet><title svg:width="100">  001  </title><topic><title svg:width="240" xml:space="preserve">  002 &amp; 中文\n下一行  </title>
        <children><topics type="attached"><topic><title svg:width="60"><![CDATA[003 <纯文本>]]></title>
          <children><topics type="attached"><topic><title svg:width="0"/></topic></topics></children>
        </topic></topics><topics type="detached"><topic><title svg:width="80">自由主题</title><position x="300" y="-20"/></topic></topics></children>
      </topic></sheet><sheet><title>第二张</title><topic><title>普通标题</title></topic></sheet>
    </xmap-content>`;
    const result = await importXmindFile(zipSync({ "content.xml": strToU8(source) }));
    expect(result.sheets).toHaveLength(2);
    expect(result.sheets[0]!.title).toBe("  001  ");
    expect(result.sheets[0]!.document.root).toMatchObject({ text: "  002 & 中文\n下一行  ", children: [
      { text: "003 <纯文本>", children: [{ text: "", children: [] }] },
    ] });
    expect(result.sheets[0]!.document.floatingTopics).toMatchObject([{ root: { text: "自由主题" }, position: { x: 300, y: -20 } }]);
    expect(result.sheets[1]!.document.root.text).toBe("普通标题");
    expect(result.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "unsupported-field", path: "sheets[0].title.@width" }),
      expect.objectContaining({ code: "unsupported-field", path: "sheets[0].rootTopic.title.@width" }),
      expect.objectContaining({ code: "unsupported-field", path: "sheets[0].rootTopic.children.attached[0].title.@width" }),
    ]));
  });

  it.each(["", "<title>x</title><title>y</title>", "<title svg:width='80'><b>嵌套内容</b></title>"])(
    "still rejects missing, duplicate or nested titles: %s", async title => {
      const source = `<xmap-content xmlns:svg="http://www.w3.org/2000/svg"><sheet><topic>${title}</topic></sheet></xmap-content>`;
      await expect(importXmindFile(zipSync({ "content.xml": strToU8(source) }))).rejects.toThrow();
    });

  it("decodes numeric XML character references once and preserves literal CDATA", async () => {
    const source = `<xmap-content><sheet><topic><title>001&#13;\n&#x4E2D;文&#x1F600; &amp;#13;</title>
      <children><topics type="attached"><topic><title><![CDATA[原文 &#13; &amp;]]></title></topic></topics></children>
    </topic></sheet></xmap-content>`;
    const result = await importXmindFile(zipSync({ "content.xml": strToU8(source) }));
    expect(result.sheets[0]!.document.root.text).toBe("001\r\n中文😀 &#13;");
    expect(result.sheets[0]!.document.root.children[0]!.text).toBe("原文 &#13; &amp;");
  });

  it.each(["<xmap-content>", "<!DOCTYPE xmap-content [<!ENTITY x 'injected'>]><xmap-content/>",
    "<not-xmind/>", "<xmap-content><sheet><topic><title>x</title><children><topics type='attached'><topic/></topics></children></topic></sheet></xmap-content>"])("rejects invalid XML and unsupported entities", async source => {
    await expect(importXmindFile(zipSync({ "content.xml": strToU8(source) }))).rejects.toThrow();
  });

  it("rejects missing content, corrupt containers and oversized entries", async () => {
    await expect(importXmindFile(zipSync({ "readme.txt": strToU8("nothing") }))).rejects.toThrow(/content/);
    await expect(importXmindFile(new Uint8Array([1, 2, 3]))).rejects.toThrow();
    await expect(importXmindFile(zipSync({ "content.json": strToU8(" ".repeat(4000001)) }))).rejects.toThrow(/budget/);
  });

  it("rejects ambiguous content names and never hides invalid JSON behind a legacy fallback", async () => {
    await expect(importXmindFile(zipSync({ "content.xml": strToU8(xml), "/content.xml": strToU8(xml) }))).rejects.toThrow(/duplicate/);
    await expect(importXmindFile(zipSync({ "content.json": strToU8("{broken"), "content.xml": strToU8(xml) }))).rejects.toThrow();
  });

  it("bounds actual inflated bytes even when ZIP size metadata is false", async () => {
    const archive = zipSync({ "content.json": strToU8(" ".repeat(4000001)) });
    const view = new DataView(archive.buffer);
    for (let i = 0; i + 28 <= archive.length; i++) {
      const signature = view.getUint32(i, true);
      if (signature === 0x04034b50) view.setUint32(i + 22, 1, true);
      if (signature === 0x02014b50) view.setUint32(i + 24, 1, true);
    }
    await expect(importXmindFile(archive)).rejects.toThrow(/budget|incomplete/);
  });
});
