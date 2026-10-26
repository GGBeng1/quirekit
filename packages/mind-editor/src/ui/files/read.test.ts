import { expect, it } from "vitest";
import { createMindMapTemplate, createMindMapEmbed } from "@quirekit/mind-map";
import { readMindEditorFile } from "./read";

it("admits native source and envelopes without silently accepting unknown versions", async () => {
  const document = createMindMapTemplate("project");
  const file = new File([JSON.stringify(document)], "脑图.json");
  expect((await readMindEditorFile(file)).sheets[0]?.document).toEqual(document);
  const embed = createMindMapEmbed("saved", "已保存脑图");
  expect((await readMindEditorFile(new File([JSON.stringify(embed)], "已保存.json"))).sheets[0]?.title).toBe(embed.title);
  await expect(readMindEditorFile(new File([JSON.stringify({ ...document, version: 99 })], "未来.json"))).rejects.toThrow(/version/);
});

it("retains every XMind JSON canvas and its conversion differences", async () => {
  const value = [{ id: "a", title: "方案甲", rootTopic: { id: "a-root", title: "甲", notes: { plain: { content: "保留备注" } }, labels: ["未映射标签"] } },
    { id: "b", title: "方案乙", rootTopic: { id: "b-root", title: "乙" } }];
  const result = await readMindEditorFile(new File([JSON.stringify(value)], "content.json"));
  expect(result.sheets.map(sheet => sheet.title)).toEqual(["方案甲", "方案乙"]);
  expect(result.sheets[0]?.document.root.details?.note).toBe("保留备注");
  expect(result.diagnostics.some(item => item.path.includes("labels"))).toBe(true);
});

it("rejects file budgets before reading bytes", async () => {
  await expect(readMindEditorFile(new File([new Uint8Array(4000001)], "大文件.json"))).rejects.toThrow(/4 MB/);
  await expect(readMindEditorFile(new File(["not json"], "错误.json"))).rejects.toThrow();
});
