import { expect, it } from "vitest";
import { mindEditorTranslator } from "./resolve";
import { en } from "./en";
import { zhCN } from "./zh-cn";
import { mindMapTemplates } from "@quirekit/mind-map";
import { mindEditorTemplateLabels } from "./templates";

it("covers every message with matching placeholders and treats substitutions literally", () => {
  expect(Object.keys(en).sort()).toEqual(Object.keys(zhCN).sort());
  for (const key of Object.keys(zhCN) as (keyof typeof zhCN)[]) {
    expect(en[key]).not.toMatch(/[\u4e00-\u9fff]/u);
    expect(en[key].match(/\{\w+\}/gu)?.sort() ?? [], key).toEqual(zhCN[key].match(/\{\w+\}/gu)?.sort() ?? []);
  }
  expect(mindEditorTranslator(" en-US ")("imported", { title: "用户 {count} <text>" })).toBe("Imported: 用户 {count} <text>");
  expect(mindEditorTranslator("fr")("undo")).toBe("撤销");
});
it("translates catalog metadata while retaining canonical content references", () => {
  for (const template of mindMapTemplates) {
    expect(mindEditorTemplateLabels(template, "en").title).not.toMatch(/[\u4e00-\u9fff]/u);
    expect(mindEditorTemplateLabels(template, "zh-CN")).toEqual({ title: template.title, description: template.description });
  }
});
