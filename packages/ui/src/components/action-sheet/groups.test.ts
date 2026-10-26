import { describe, expect, it } from "vitest";
import { groupActionSheetActions } from "./groups";

describe("ActionSheet action grouping", () => {
  it("keeps host order and action identity when a named group reappears later", () => {
    const actions = Object.freeze([
      { value: "copy", label: "复制", group: "编辑" },
      { value: "move", label: "移动", group: "编辑", disabled: true },
      { value: "details", label: "详情" },
      { value: "delete", label: "删除", group: "编辑", danger: true }
    ]);
    const groups = groupActionSheetActions(actions);
    expect(groups.map(group => group.label)).toEqual(["编辑", undefined, "编辑"]);
    const flattened = groups.flatMap(group => group.actions);
    expect(flattened.map(action => action.value)).toEqual(["copy", "move", "details", "delete"]);
    for (let index = 0; index < actions.length; index += 1) expect(flattened[index]).toBe(actions[index]);
  });

  it("rejects duplicate identities across separated groups before rendering ambiguous actions", () => {
    expect(() => groupActionSheetActions([
      { value: "copy", label: "复制", group: "文件" },
      { value: "move", label: "移动", group: "资源" },
      { value: "copy", label: "复制到工作区", group: "工作区" }
    ])).toThrow("requires unique action values: copy");
  });
});
