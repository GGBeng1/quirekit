import { expect, it } from "vitest";
import { parseFlowchart, serializeFlowchart } from "@quirekit/flowchart";
import { createFlowchartTemplate, flowchartTemplates, localizedFlowchartTemplates } from "../templates/catalog";
import { flowEditorFailure, flowEditorText, resolveFlowLocale } from "./resolve";
import { localizeFlowEntries } from "./projection";

it("resolves region tags and interpolates literal values without translating user text", () => {
  expect(resolveFlowLocale("en-GB")).toBe("en"); expect(resolveFlowLocale("zh-TW")).toBe("zh-CN"); expect(resolveFlowLocale("fr")).toBe("zh-CN");
  expect(flowEditorText("en-US", "定位：{title}", { title: "我的中文流程图 {count}" })).toBe("Locate: 我的中文流程图 {count}");
  expect(flowEditorFailure("en", new Error("请先复制格式"))).toBe("Copy formatting first.");
  expect(flowEditorFailure("en", new Error("宿主提供的未收录错误"))).not.toMatch(/\p{Script=Han}/u);
  expect(flowEditorFailure("zh-CN", new Error("宿主提供的未收录错误"))).toBe("宿主提供的未收录错误");
});
it("translates nested presentation only, preserving IDs, payloads and the source configuration", () => {
  const entries = [{ value: "用户标识", label: "图表", kind: "menu" as const, items: [{ value: "保存动作", label: "我的图形库", payload: "流程图" }] }];
  const before = structuredClone(entries), projected = localizeFlowEntries(entries, "en");
  expect(projected[0]!.label).toBe("Diagram"); expect(projected[0]!.items[0]!.label).toBe("My library");
  expect(projected[0]!.value).toBe("用户标识"); expect(projected[0]!.items[0]!.payload).toBe("流程图"); expect(entries).toEqual(before);
});
it("provides editable English contents for every built-in recipe with identical geometry and identities", () => {
  expect(localizedFlowchartTemplates("en").map(item => item.id)).toEqual(flowchartTemplates.map(item => item.id));
  for (const item of localizedFlowchartTemplates("en")) {
    expect(item.label + item.description, item.id).not.toMatch(/\p{Script=Han}/u);
    const zh = createFlowchartTemplate(item.id, "same", "zh-CN"), en = createFlowchartTemplate(item.id, "same", "en-US");
    expect(en.nodes.map(n => n.text).join(" ") + en.edges.map(e => e.label).join(" "), item.id).not.toMatch(/\p{Script=Han}/u);
    expect(en.nodes.map(({ text, ...node }) => node)).toEqual(zh.nodes.map(({ text, ...node }) => node));
    expect(en.edges.map(({ label, ...edge }) => edge)).toEqual(zh.edges.map(({ label, ...edge }) => edge));
    expect(parseFlowchart(serializeFlowchart(en))).toEqual(en);
    expect(createFlowchartTemplate(item.id, "same")).toEqual(zh);
  }
});
