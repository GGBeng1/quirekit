import { describe, expect, it } from "vitest";
import { createChartDraft, createChartSpec } from "../index";

describe("chart drafts", () => {
  it("keeps preview edits detached until one revision-checked apply", () => {
    const saved = createChartSpec("column", "one");
    const draft = createChartDraft(saved);
    draft.value.data.rows[0]!.values[draft.value.series[0]!.valueColumn] = 80;
    expect(saved.data.rows[0]!.values[saved.series[0]!.valueColumn]).not.toBe(80);
    const result = draft.prepare(saved);
    expect(result.revision).toBe(2);
    expect(result.data.rows[0]!.values[result.series[0]!.valueColumn]).toBe(80);
    expect(() => draft.prepare({ ...saved, revision: 2 })).toThrow("chart-revision-conflict");
    draft.reset(saved);
    expect(draft.value).toEqual(saved);
  });
});
