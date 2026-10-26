import type { QuireTextFragment } from "@quirekit/layout/text";
import type { QuireDisplayCommand } from "@quirekit/renderer";
import { describe, expect, it } from "vitest";
import { appendTextEmphasisMarkCommands } from "./commands";

describe("appendTextEmphasisMarkCommands", () => {
  it("paints one marker per non-whitespace grapheme from caret geometry", () => {
    const fragment = createFragment("中 文", [0, 10, 20, 30], "dot");
    const commands: QuireDisplayCommand[] = [];

    appendTextEmphasisMarkCommands(
      commands,
      "fragment",
      fragment,
      fragment.range,
      "#123456"
    );

    expect(commands).toHaveLength(2);
    expect(commands).toEqual([
      expect.objectContaining({
        id: "fragment:emphasis-mark-0",
        kind: "path",
        range: { from: 1, to: 2 },
        fillStyle: "#123456"
      }),
      expect.objectContaining({
        id: "fragment:emphasis-mark-1",
        kind: "path",
        range: { from: 3, to: 4 },
        fillStyle: "#123456"
      })
    ]);
    expect(commands.map(command => command.kind === "path" && command.rect.x))
      .toEqual([13.8, 33.8]);
  });

  it("keeps RTL logical graphemes on their visual cluster centers", () => {
    const fragment: QuireTextFragment = {
      ...createFragment("אב", [20, 10, 0], "circle"),
      direction: "rtl"
    };
    const commands: QuireDisplayCommand[] = [];

    appendTextEmphasisMarkCommands(
      commands,
      "rtl",
      fragment,
      fragment.range,
      "#654321"
    );

    expect(commands.map(command => command.kind === "path" && command.rect.x))
      .toEqual([23.8, 13.8]);
    expect(commands).toEqual([
      expect.objectContaining({ strokeStyle: "#654321" }),
      expect.objectContaining({ strokeStyle: "#654321" })
    ]);
    for (const command of commands) {
      expect(command).not.toHaveProperty("fillStyle");
    }
  });

  it.each([10, 16, 24, 48])("keeps the comma inside its allocated over-side space at %ipx", fontSize => {
    const markerExtent = Math.max(3, fontSize * 0.22);
    const fragment = { ...createFragment("字", [0, fontSize], "comma"),
      font: `${fontSize}px sans-serif`, baseline: 60,
      runAscent: fontSize * 0.8 + markerExtent };
    const commands: QuireDisplayCommand[] = [];
    appendTextEmphasisMarkCommands(commands, "comma", fragment, fragment.range, "#000000");
    const mark = commands[0]!;
    if (mark.kind !== "path") throw new Error("Expected emphasis path");
    // A tall, continuous silhouette remains distinct from a round dot; its
    // bottom cannot intrude into the glyph ascent reserved by Layout.
    expect(mark.rect.height).toBeGreaterThan(mark.rect.width * 1.25);
    expect(mark.rect.y + mark.rect.height).toBeLessThanOrEqual(60 - fontSize * 0.8);
    expect(mark.segments.filter(segment => segment.kind === "move-to")).toHaveLength(1);
  });

  it("positions underDot below the measured run descent", () => {
    const fragment = createFragment("字", [0, 10], "underDot");
    const commands: QuireDisplayCommand[] = [];

    appendTextEmphasisMarkCommands(
      commands,
      "under",
      fragment,
      fragment.range,
      "#000000"
    );

    expect(commands[0]?.kind).toBe("path");
    if (commands[0]?.kind === "path") {
      expect(commands[0].rect.y).toBeCloseTo(49.6);
    }
  });
});

/**
 * Creates a deterministic emphasis-mark fragment fixture.
 *
 * @param text - Fragment text.
 * @param localXs - Visual caret coordinates for every UTF-16 boundary.
 * @param emphasisMark - Visible emphasis-mark kind.
 * @returns Text fragment fixture.
 */
function createFragment(
  text: string,
  localXs: readonly number[],
  emphasisMark: NonNullable<QuireTextFragment["emphasisMark"]>
): QuireTextFragment {
  return {
    id: "fragment",
    text,
    range: { from: 1, to: 1 + text.length },
    rect: { x: 10, y: 20, width: 30, height: 34 },
    font: "16px sans-serif",
    emphasisMark,
    lineHeight: 34,
    baseline: 46,
    runAscent: 20,
    runDescent: 6,
    caretStops: localXs.map((localX, index) => ({
      position: { pos: 1 + index },
      localX
    }))
  };
}
