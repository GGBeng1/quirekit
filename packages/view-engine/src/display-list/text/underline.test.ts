import { describe, expect, it } from "vitest";
import type { QuireTextFragment } from "@quirekit/layout/text";
import type { QuireDisplayCommand } from "@quirekit/renderer";
import { appendNativeUnderline } from "./underline";
import { appendTextDecorationCommands } from "./text-decoration";
const fragment: QuireTextFragment = { id: "sample", text: "A B", range: { from: 1, to: 4 },
  rect: { x: 10, y: 10, width: 35, height: 24 }, font: "18px serif", lineHeight: 24, baseline: 30,
  caretStops: [0, 10, 20, 35].map((localX, index) => ({ localX, position: { pos: 1 + index, bias: 1 as const } })) };
/** @param style - Exact native style. @returns Compiled commands. */
function paint(style: string) { const commands: QuireDisplayCommand[] = []; appendNativeUnderline(commands, "test", { ...fragment, underline: { style, color: "#123456" } }, fragment.range, 0, 35, "#000000"); return commands; }

describe("native underline display list", () => {
  it.each(["single", "words", "double", "thick", "dotted", "dottedHeavy", "dash", "dashedHeavy", "dashLong", "dashLongHeavy", "dotDash", "dashDotHeavy", "dotDotDash", "dashDotDotHeavy", "wave", "wavyHeavy", "wavyDouble"])("paints %s with independent color and source ranges", style => {
    const commands = paint(style);
    expect(commands.length).toBeGreaterThan(0);
    expect(commands.every(command => (command.kind === "line" || command.kind === "path") && command.strokeStyle === "#123456")).toBe(true);
    expect(paint("none")).toEqual([]);
  });
  it("distinguishes thick, double, dash families and wave paths", () => {
    expect(paint("thick")[0]).toMatchObject({ kind: "line", lineWidth: 2 });
    expect(paint("double")).toHaveLength(2);
    expect(paint("dotDotDash")[0]).toMatchObject({ lineDash: [6, 2, 1, 2, 1, 2] });
    expect(paint("dotDash")[0]).toMatchObject({ lineDash: [6, 2, 1, 2] });
    expect(paint("wave")[0]?.kind).toBe("path");
    expect(paint("wavyDouble")).toHaveLength(2);
  });
  it("skips whitespace by caret geometry in both text directions", () => {
    expect(paint("words")).toMatchObject([{ from: { x: 10 }, to: { x: 20 } }, { from: { x: 30 }, to: { x: 45 } }]);
    const commands: QuireDisplayCommand[] = [];
    appendNativeUnderline(commands, "rtl", { ...fragment, underline: { style: "words" }, caretStops: fragment.caretStops.map(stop => ({ ...stop, localX: 35 - stop.localX })) }, fragment.range, 0, 35, "black");
    expect(commands).toMatchObject([{ from: { x: 35 }, to: { x: 45 } }, { from: { x: 10 }, to: { x: 25 } }]);
  });
  it("does not replace review underline with the document's decoration", () => {
    const commands: QuireDisplayCommand[] = [];
    appendTextDecorationCommands(commands, "review", { ...fragment, underline: { style: "wave", color: "red" } }, fragment.range, 0, 35,
      [{ kind: "underline", color: "green", width: 1, paintSurface: "overlay" }]);
    expect(commands).toMatchObject([{ kind: "line", layer: "overlay", strokeStyle: "green" }]);
  });
});
