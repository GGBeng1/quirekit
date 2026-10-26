import { describe, expect, it } from "vitest";
import { createChartSpec } from "../model/preset";
import { copyChartDataDraft, createChartDataDraft, readChartDataDraft } from "./value";
import { appendChartDataColumn, appendChartDataRow, removeChartDataColumn, removeChartDataRow } from "./structure";
import { appendChartDataSeries, removeChartDataSeries, bindChartDataCategory } from "./series";
import { pasteChartDataMatrix } from "./cells";
import { importChartDelimitedData, parseChartDelimitedText } from "./delimited";
import { transposeChartData } from "./transpose";

/** @returns Deterministic fresh identities, independent of DOM or crypto. */
function allocator() { let index = 0; return (kind: string) => `${kind}-allocated-${++index}`; }

describe("detached chart data editing", () => {
  it("detaches raw input and retains null, zero and stable bindings", () => {
    const spec = createChartSpec("column", "data");
    const data = createChartDataDraft(spec);
    data.rows[0]!.values["value-1"] = "";
    data.rows[1]!.values["value-1"] = "0";
    const proxy = new Proxy(data, {});
    const copied = copyChartDataDraft(proxy);
    copied.rows[1]!.values["value-1"] = "99";
    expect(data.rows[1]!.values["value-1"]).toBe("0");
    const parsed = readChartDataDraft(data);
    expect(parsed.data.rows[0]!.values["value-1"]).toBeNull();
    expect(parsed.data.rows[1]!.values["value-1"]).toBe(0);
    expect(spec.data.rows[0]!.values["value-1"]).toBe(12);
    expect(parsed.series).toEqual(spec.series);
    data.rows[0]!.values["value-1"] = "-";
    expect(() => readChartDataDraft(data)).toThrow();
  });
  it("updates column/series references atomically and never removes the last plotted series", () => {
    const before = createChartDataDraft(createChartSpec("column", "data"));
    const extra = appendChartDataColumn(before, "extra", "其它");
    const bound = appendChartDataSeries(extra, { id: "series-extra", name: "附加", categoryColumn: "category", valueColumn: "extra" });
    expect(before.columns).toHaveLength(3);
    expect(bound.rows.every(row => row.values.extra === "")).toBe(true);
    const removed = removeChartDataColumn(bound, "value-1");
    expect(removed.series.map(series => series.valueColumn)).toEqual(["value-2", "extra"]);
    expect(removed.rows.every(row => !("value-1" in row.values))).toBe(true);
    expect(() => removeChartDataColumn(removed, "category")).toThrow();
    const one = removeChartDataSeries(removed, "series-extra");
    expect(one.columns.map(column => column.id)).toContain("extra");
    expect(() => removeChartDataColumn(one, "value-2")).toThrow();
    expect(() => appendChartDataColumn(before, "value-1", "重复")).toThrow();
    expect(() => bindChartDataCategory(before, "value-1")).toThrow();
  });
  it("retains raw edits during row operations and rejects missing or final row deletion", () => {
    const before = createChartDataDraft(createChartSpec("column", "data"));
    before.rows[0]!.values["value-1"] = "-";
    const next = appendChartDataRow(before, "added");
    expect(next.rows.at(-1)!.values.category).toBe("");
    expect(next.rows[0]!.values["value-1"]).toBe("-");
    expect(removeChartDataRow(next, "added").rows).toEqual(before.rows);
    expect(() => removeChartDataRow(before, "missing")).toThrow();
    let one = before;
    for (const row of before.rows.slice(1)) one = removeChartDataRow(one, row.id);
    expect(() => removeChartDataRow(one, one.rows[0]!.id)).toThrow();
  });
  it("validates an entire paste before growing rows or replacing any cell", () => {
    const before = createChartDataDraft(createChartSpec("column", "data"));
    const original = JSON.stringify(before);
    expect(() => pasteChartDataMatrix(before, 3, 1, [["20", "bad"], ["30", "40"]], allocator())).toThrow();
    expect(JSON.stringify(before)).toBe(original);
    const next = pasteChartDataMatrix(before, 3, 1, [["20", ""], ["30", "40"]], allocator());
    expect(next.rows).toHaveLength(5);
    expect(next.rows[3]!.values["value-1"]).toBe("20");
    expect(readChartDataDraft(next).data.rows[3]!.values["value-2"]).toBeNull();
    expect(() => pasteChartDataMatrix(before, 0, 2, [["1", "2"]], allocator())).toThrow();
    expect(() => pasteChartDataMatrix(before, 999, 0, [["甲"], ["乙"]], allocator())).toThrow();
    expect(() => pasteChartDataMatrix(before, 0, 0, [["甲", "1"], ["乙"]], allocator())).toThrow();
  });
  it("parses quoted CSV, TSV, BOM, escaped quotes and embedded newlines without guessing numbers", () => {
    expect(parseChartDelimitedText('\ufeff类别,收入\r\n"甲,乙",12\r\n"丙""丁\n戊",0\r\n'))
      .toEqual([["类别", "收入"], ["甲,乙", "12"], ['丙"丁\n戊', "0"]]);
    expect(parseChartDelimitedText("类别\t收入\n甲\t\n乙\t3"))
      .toEqual([["类别", "收入"], ["甲", ""], ["乙", "3"]]);
    expect(parseChartDelimitedText('"类\t别",收入\n甲,1')).toEqual([["类\t别", "收入"], ["甲", "1"]]);
    for (const invalid of ['a,b\n"unclosed,2', 'a,b\n"quoted"tail,2', "a,b\nc"])
      expect(() => parseChartDelimitedText(invalid)).toThrow();
    expect(() => parseChartDelimitedText("x".repeat(2 * 1024 * 1024 + 1))).toThrow();
  });
  it("imports a complete table with title bindings and rejects invalid numeric columns", () => {
    const data = importChartDelimitedData("分类,收入,成本\n甲,12,\n乙,0,8", "column", allocator());
    const parsed = readChartDataDraft(data);
    expect(parsed.series.map(series => series.name)).toEqual(["收入", "成本"]);
    expect(Object.values(parsed.data.rows[0]!.values)).toEqual(["甲", 12, null]);
    expect(() => importChartDelimitedData("分类,收入\n甲,=1+1", "column", allocator())).toThrow();
    expect(() => importChartDelimitedData("分类,\n甲,12", "column", allocator())).toThrow();
    const pie = importChartDelimitedData("分类,收入,成本\n甲,12,8", "pie", allocator());
    expect(pie.columns).toHaveLength(3);
    expect(pie.series).toHaveLength(1);
  });
  it("transposes exactly the plotted matrix with fresh identities and preserves every data value", () => {
    const before = createChartDataDraft(createChartSpec("column", "data"));
    before.rows[0]!.values["value-1"] = "";
    const next = transposeChartData(before, allocator());
    expect(next.rows).toHaveLength(2);
    expect(next.series.map(series => series.name)).toEqual(["第一季度", "第二季度", "第三季度", "第四季度"]);
    expect(Object.values(next.rows[0]!.values)).toEqual(["系列 1", "", "18", "15", "24"]);
    const restored = transposeChartData(next, allocator());
    expect(restored.columns.map(column => column.name)).toEqual(before.columns.map(column => column.name));
    expect(restored.rows.map(row => Object.values(row.values))).toEqual(before.rows.map(row => Object.values(row.values)));
    expect(() => transposeChartData(appendChartDataColumn(before, "unbound", "未绘制"), allocator())).toThrow();
    before.rows[0]!.values.category = "";
    expect(() => transposeChartData(before, allocator())).toThrow();
  });
});
