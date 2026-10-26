import { describe, expect, it } from "vitest";
import { validateSchemaTree } from "./validate-tree";

describe("schema ownership validation", () => {
  it("rejects duplicate field names across groups even when hidden", () => {
    expect(() => validateSchemaTree([
      { key: "one", name: "rows.0.title", label: "First", control: "input" },
      { key: "group", legend: "Group", children: [{ name: "rows[0].title", label: "Second", control: "input", visible: false }] }
    ])).toThrow('field name "rows[0].title"');
  });
  it("rejects duplicate sibling render keys before mounting", () => {
    expect(() => validateSchemaTree([
      { key: "same", name: "first", label: "First", control: "input" },
      { key: "same", name: "second", label: "Second", control: "input" }
    ])).toThrow('sibling key "same"');
  });
});
