import { describe, expect, it } from "vitest";
import { normalizeMindMapInsertion } from "./insertion";

describe("mind map insertion as models write it", () => {
  it("turns a central topic listed as a topic into the central one", () => {
    const written = normalizeMindMapInsertion("ai", { topics: [{ id: "ai", text: "请 AI 助手帮忙" }, { id: "start", text: "开始使用", parent: "ai" }, { id: "s1", text: "配置模型", parent: "start" }] });
    expect(written.root).toBe("请 AI 助手帮忙");
    expect(written.patch.topics).toEqual([{ id: "start", text: "开始使用", parent: "root" }, { id: "s1", text: "配置模型", parent: "start" }]);
  });

  it("puts topics without a parent under the central topic", () => {
    expect(normalizeMindMapInsertion("项目计划", { topics: [{ id: "a", text: "需求" }, { id: "b", text: "测试" }] }).patch.topics?.map(topic => topic.parent)).toEqual(["root", "root"]);
  });
});
