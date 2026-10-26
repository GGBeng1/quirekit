import { describe, expect, it } from "vitest";
import {
  createBuiltInHorizontalRulePaintCommands,
  createBuiltInHorizontalRulePaintGeometry
} from "./paint";
import { resolveBuiltInHorizontalRuleStyle } from "./style";

const fixtureRange = { from: 0, to: 1 };

describe("built-in horizontal-rule paint", () => {
  it("creates a visible default stroke", () => {
    const style = resolveBuiltInHorizontalRuleStyle({});
    const geometry = createBuiltInHorizontalRulePaintGeometry(
      { x: 24, y: 48 },
      600,
      style
    );
    expect(createBuiltInHorizontalRulePaintCommands(
      geometry.flowRect,
      "horizontal-rule",
      fixtureRange,
      style
    )[0]).toMatchObject({
      kind: "line",
      strokeStyle: "#111827",
      lineWidth: 2
    });
  });

  it.each([
    ["single", 1],
    ["double", 2],
    ["dotted", 1],
    ["dashed", 1],
    ["shaded", 3]
  ] as const)("compiles the %s family", (variant, count) => {
    const style = resolveBuiltInHorizontalRuleStyle({ variant });
    const geometry = createBuiltInHorizontalRulePaintGeometry(
      { x: 24, y: 48 },
      600,
      style
    );
    const commands = createBuiltInHorizontalRulePaintCommands(
      geometry.flowRect,
      "horizontal-rule",
      fixtureRange,
      style
    );
    expect(commands).toHaveLength(count);
    if (variant === "shaded") {
      expect(commands).toEqual(expect.arrayContaining([
        expect.objectContaining({ kind: "fill-rect" })
      ]));
    }
  });

  it("resolves percentage width and right alignment once", () => {
    const geometry = createBuiltInHorizontalRulePaintGeometry(
      { x: 20, y: 40 },
      400,
      resolveBuiltInHorizontalRuleStyle({
        widthPercent: 75,
        alignment: "right"
      })
    );
    expect(geometry.ruleRect).toMatchObject({
      x: 120,
      width: 300
    });
  });
});
