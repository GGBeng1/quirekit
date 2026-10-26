import { describe, expect, it } from "vitest";
import { filterActionDirectory } from "./search";
import type { QuireKitActionMenuEntry } from "../../components/action-menu";
const actions: readonly QuireKitActionMenuEntry[] = [
  { kind: "command", value: "link", label: "链接", description: "HTTPS address", group: "常用" },
  { kind: "command", value: "image", label: "图片", disabled: true, group: "插入" },
  { kind: "branch", value: "files", label: "文件", children: [{ kind: "command", value: "local", label: "本地" }] },
];
describe("action directory search", () => {
  it("retains identity, order, disabled items and only the current branch", () => {
    expect(filterActionDirectory(actions, "  ")).toBe(actions);
    expect(filterActionDirectory(actions, "https")).toEqual([actions[0]]);
    expect(filterActionDirectory(actions, "插入")).toEqual([actions[1]]);
    expect(filterActionDirectory(actions, "本地")).toEqual([]);
  });
  it("passes a complete Unicode query to one consumer predicate per entry", () => {
    const queries: string[] = [];
    const matched = filterActionDirectory(actions, "图", (action, query) => { queries.push(query); return action.value === "image"; });
    expect(queries).toEqual(["图", "图", "图"]); expect(matched).toEqual([actions[1]]);
  });
});
