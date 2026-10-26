import { describe, expect, it } from "vitest";
import type { QuireDisplayCommand, QuireTextCommand } from "@quirekit/renderer";
import type { QuireTextFragment } from "@quirekit/layout/text";
import { appendLegacyGlyphEffectCommands } from "./glyph-effect";

describe("appendLegacyGlyphEffectCommands", () => {
  it("compiles combined imported effects into deterministic metric-neutral passes", () => {
    const commands: QuireDisplayCommand[] = [];
    const command = createTextCommand();
    const fragment = createFragment(["outline", "shadow", "emboss", "imprint"]);

    appendLegacyGlyphEffectCommands(commands, command, fragment);

    expect(commands.map((entry) => entry.id)).toEqual([
      "run:effect:shadow",
      "run:effect:emboss-dark",
      "run:effect:emboss-light",
      "run:effect:imprint-light",
      "run:effect:imprint-dark",
      "run:effect:outline"
    ]);
    expect(commands.map((entry) => entry.range)).toEqual(
      Array.from({ length: 6 }, () => ({ from: 4, to: 6 }))
    );
    expect(commands.slice(0, 5)).toEqual(
      Array.from({ length: 5 }, () => expect.objectContaining({ geometryRole: "decoration" }))
    );
    expect(commands.at(-1)).not.toHaveProperty("geometryRole", "decoration");
    expect(commands.slice(0, 5).map((entry) =>
      entry.kind === "text" ? [entry.origin.x, entry.origin.y, entry.opacity] : null
    )).toEqual([
      [5.5, 21.5, 0.35],
      [5.5, 21.5, 0.45],
      [2.5, 18.5, 0.65],
      [5.5, 21.5, 0.65],
      [2.5, 18.5, 0.45]
    ]);
    expect(commands.at(-1)).toMatchObject({
      kind: "text",
      origin: { x: 4, y: 20 },
      paintMode: "stroke",
      strokeStyle: "#123456",
      lineWidth: 1
    });
    expect(fragment.rect).toEqual({ x: 4, y: 4, width: 40, height: 20 });
    expect(fragment.caretStops).toEqual([
      { position: { pos: 4, bias: 1 }, localX: 0 },
      { position: { pos: 6, bias: 1 }, localX: 40 }
    ]);
  });

  it("keeps an empty explicit effect set on the ordinary one-pass paint path", () => {
    const commands: QuireDisplayCommand[] = [];
    const command = createTextCommand();

    appendLegacyGlyphEffectCommands(commands, command, createFragment([]));

    expect(commands).toEqual([command]);
  });
});

/**
 * Creates the canonical command used by effect-pass tests.
 *
 * @returns Text display command with stable geometry.
 */
function createTextCommand(): QuireTextCommand {
  return {
    id: "run",
    kind: "text",
    range: { from: 4, to: 6 },
    rect: { x: 4, y: 4, width: 40, height: 20 },
    text: "AB",
    origin: { x: 4, y: 20 },
    font: "24px sans-serif",
    fillStyle: "#123456"
  };
}

/**
 * Creates a measured fragment with one exact effect set.
 *
 * @param glyphEffects - Effects to project.
 * @returns Stable text fragment fixture.
 */
function createFragment(
  glyphEffects: NonNullable<QuireTextFragment["glyphEffects"]>
): QuireTextFragment {
  return {
    id: "fragment",
    text: "AB",
    range: { from: 4, to: 6 },
    rect: { x: 4, y: 4, width: 40, height: 20 },
    font: "24px sans-serif",
    glyphEffects,
    lineHeight: 20,
    baseline: 20,
    caretStops: [
      { position: { pos: 4, bias: 1 }, localX: 0 },
      { position: { pos: 6, bias: 1 }, localX: 40 }
    ]
  };
}
