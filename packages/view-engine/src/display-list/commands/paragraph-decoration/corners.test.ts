import { expect, it } from "vitest";
import type { QuireDisplayCommand, QuireLineCommand } from "@quirekit/renderer";
import type { QuireParagraphDecoration } from "../../../layout/engine/block-types";
import { resolveDisplayListStyles } from "../../styles";
import { appendParagraphBorderCommands } from "./index";

/** @param decoration - Physical fragment borders. @returns Line commands in document CSS pixels. */
function paint(decoration: QuireParagraphDecoration): Record<string, QuireLineCommand> {
  const commands: QuireDisplayCommand[] = [];
  appendParagraphBorderCommands(commands, { id: "p", kind: "inline", range: { from: 1, to: 4 },
    rect: { x: 20, y: 30, width: 140, height: 40 }, paragraphDecoration: decoration }, resolveDisplayListStyles({}));
  return Object.fromEntries(commands.map(command => [command.id.replace("p:paragraph-border:", ""), command as QuireLineCommand]));
}

it.each([0, 4])("connects all four outer corners with %s px distance from text", space => {
  const edge = { style: "single", lineWidth: 2, space };
  const lines = paint({ top: edge, bottom: edge, left: edge, right: edge, firstFragment: true, lastFragment: true });
  expect(lines.top!.from).toEqual({ x: 18 - space, y: 29 - space });
  expect(lines.top!.to).toEqual({ x: 162 + space, y: 29 - space });
  expect(lines.bottom!.from).toEqual({ x: 18 - space, y: 71 + space });
  expect(lines.bottom!.to).toEqual({ x: 162 + space, y: 71 + space });
  expect(lines.left!.from).toEqual({ x: 19 - space, y: 28 - space });
  expect(lines.left!.to).toEqual({ x: 19 - space, y: 72 + space });
  expect(lines.right!.from).toEqual({ x: 161 + space, y: 28 - space });
  expect(lines.right!.to).toEqual({ x: 161 + space, y: 72 + space });
});

it("joins independent widths and distances without changing the normal offsets", () => {
  const lines = paint({ top: { style: "single", lineWidth: 2, space: 3 },
    left: { style: "single", lineWidth: 4, space: 6 }, right: { style: "single", lineWidth: 6, space: 1 },
    bottom: { style: "single", lineWidth: 8, space: 2 }, firstFragment: true, lastFragment: true });
  expect(lines.top).toMatchObject({ from: { x: 10, y: 26 }, to: { x: 167, y: 26 } });
  expect(lines.left).toMatchObject({ from: { x: 12, y: 25 }, to: { x: 12, y: 80 } });
  expect(lines.bottom).toMatchObject({ from: { x: 10, y: 76 }, to: { x: 167, y: 76 } });
});

it("keeps isolated sides and continuation endpoints at the content bounds", () => {
  const edge = { style: "single", lineWidth: 2, space: 4 };
  expect(paint({ bottom: edge, firstFragment: true, lastFragment: true }).bottom)
    .toMatchObject({ from: { x: 20, y: 75 }, to: { x: 160, y: 75 } });
  const continued = paint({ top: edge, bottom: edge, left: edge, right: edge, firstFragment: false, lastFragment: false });
  expect(Object.keys(continued)).toEqual(["left", "right"]);
  expect(continued.left).toMatchObject({ from: { x: 15, y: 30 }, to: { x: 15, y: 70 } });
});

it.each([1, 6])("connects separate inner and outer double rings inside the %s px total width", lineWidth => {
  const edge = { style: "double", lineWidth, space: 3 };
  const lines = paint({ top: edge, bottom: edge, left: edge, right: edge, firstFragment: true, lastFragment: true });
  for (const ring of ["outer", "inner"]) {
    const top = lines[`top:${ring}`]!;
    const left = lines[`left:${ring}`]!;
    const right = lines[`right:${ring}`]!;
    const bottom = lines[`bottom:${ring}`]!;
    expect(top.lineWidth).toBeCloseTo(lineWidth / 3);
    expect(top.from.x).toBeCloseTo(left.from.x - top.lineWidth! / 2);
    expect(top.to.x).toBeCloseTo(right.from.x + top.lineWidth! / 2);
    expect(left.from.y).toBeCloseTo(top.from.y - top.lineWidth! / 2);
    expect(left.to.y).toBeCloseTo(bottom.from.y + top.lineWidth! / 2);
  }
  expect(lines["top:outer"]!.from.y - lineWidth / 6).toBeCloseTo(27 - lineWidth);
  expect(lines["top:inner"]!.from.y + lineWidth / 6).toBeCloseTo(27);
});
