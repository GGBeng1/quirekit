import { describe, expect, it } from "vitest";
import { inlineDiff } from "./diff";

describe("inline activity diff", () => {
  it("marks only the inserted text of a single edit", () => {
    expect(inlineDiff("- [ ] 邀请同伴一起审阅", "- [ ] 邀请同伴一起审阅你好")).toEqual([{ type: "same", text: "- [ ] 邀请同伴一起审阅" }, { type: "insert", text: "你好" }]);
    expect(inlineDiff("abc", "abc")).toEqual([{ type: "same", text: "abc" }]);
  });
  it("shows replacements and several separate edits in reading order", () => {
    expect(inlineDiff("{color=orange}", "{color=blue}").map(part => part.type)).toEqual(["same", "delete", "insert", "same"]);
    const parts = inlineDiff("first line\nsecond line", "First line\nsecond lines");
    expect(parts.filter(part => part.type !== "same").map(part => `${part.type}:${part.text}`)).toEqual(["delete:f", "insert:F", "insert:s"]);
    expect(parts.map(part => part.type === "delete" ? "" : part.text).join("")).toBe("First line\nsecond lines");
    expect(parts.map(part => part.type === "insert" ? "" : part.text).join("")).toBe("first line\nsecond line");
  });
  it("keeps surrogate pairs whole and falls back for very large middles", () => {
    expect(inlineDiff("📌", "💡")).toEqual([{ type: "delete", text: "📌" }, { type: "insert", text: "💡" }]);
    const large = inlineDiff("a" + "x".repeat(600) + "b", "a" + "y".repeat(600) + "b");
    expect(large.map(part => part.type)).toEqual(["same", "delete", "insert", "same"]);
  });
});
