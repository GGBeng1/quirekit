import { describe, expect, it } from "vitest";
import type { QuireKitActionMenuEntry } from "../../components/action-menu";
import { indexActionMenu, resolveActionMenuLevel, groupActionMenu } from "./path";

const actions: readonly QuireKitActionMenuEntry[] = [
  { kind: "command", value: "rename", label: "Rename", group: "Edit" },
  { kind: "branch", value: "move", label: "Move", children: [
    { kind: "command", value: "archive", label: "Archive" },
    { kind: "branch", value: "empty", label: "Empty", children: [] }
  ] },
  { kind: "branch", value: "locked", label: "Locked", disabled: true, children: [
    { kind: "command", value: "secret", label: "Secret" }
  ] }
];

describe("ActionMenu directory", () => {
  it("indexes stable identities and checks ancestor availability", () => {
    const index = indexActionMenu(actions);
    expect(index.get("archive")).toMatchObject({ path: ["move"], disabled: false });
    expect(index.get("secret")).toMatchObject({ path: ["locked"], disabled: true });
    expect(() => indexActionMenu([...actions, actions[0]!])).toThrow(/unique/u);
    expect(() => indexActionMenu([{ kind: "command", value: "", label: "Empty id" }])).toThrow(/non-empty/u);
  });
  it("retains empty branches and falls back to the closest available ancestor", () => {
    expect(resolveActionMenuLevel(actions, ["move", "empty"]).actions).toEqual([]);
    expect(resolveActionMenuLevel(actions, ["move", "missing"]).path).toEqual(["move"]);
    expect(resolveActionMenuLevel(actions, ["locked", "secret"]).path).toEqual([]);
  });
  it("keeps adjacent group runs instead of regrouping later actions", () => {
    const list = [actions[0]!, actions[1]!, { ...actions[0]!, value: "copy" }];
    expect(groupActionMenu(list).map(group => [group.label, group.actions.map(item => item.value)])).toEqual([
      ["Edit", ["rename"]], [undefined, ["move"]], ["Edit", ["copy"]]
    ]);
  });
});
