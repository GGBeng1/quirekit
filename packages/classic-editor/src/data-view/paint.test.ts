import { expect, it } from "vitest";
import { compileQuireViewNode } from "@quirekit/renderer";
import { dataViewPaint } from "./paint";

it("paints real text without a media resolver and retains document-space bounds", () => {
  const result = compileQuireViewNode({id: "data-summary", node: dataViewPaint({title: "项目", rows: [["名称", "状态"], ["中文任务", "进行中"]], notice: "1 条记录 · 摘要"}, 400),
    origin: {x: 120, y: 240}, constraints: {minWidth: 0, maxWidth: 400, minHeight: 0, maxHeight: 300},
    measureText: text => ({width: Array.from(text).length * 13, height: 20})});
  expect(result.rect).toEqual({x: 120, y: 240, width: 400, height: 144});
  const text = result.displayList.commands.flatMap(command => command.kind === "text" ? [command.text] : []);
  expect(text).toEqual(["项目", "名称", "状态", "中文任务", "进行中", "1 条记录 · 摘要"]);
  expect(result.displayList.commands.some(command => command.kind === "image")).toBe(false);
});
