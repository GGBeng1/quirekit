import type { QuireDisplayList, QuireRect } from "@quirekit/renderer";
import { describe, expect, it } from "vitest";
import { createMountedPageOverlayDisplayList } from "./overlay";

const bounds: QuireRect = { x: 10, y: 20, width: 300, height: 400 };

describe("createMountedPageOverlayDisplayList", () => {
  it("preserves all commands when the caret is visible", () => {
    const displayList = createOverlayFixture();
    const result = createMountedPageOverlayDisplayList(
      displayList,
      bounds,
      true
    );

    expect(result.bounds).toEqual(bounds);
    expect(result.commands).toBe(displayList.commands);
  });

  it("removes top-level and clipped caret commands without mutating input", () => {
    const displayList = createOverlayFixture();
    const result = createMountedPageOverlayDisplayList(
      displayList,
      bounds,
      false
    );

    expect(result.commands).toEqual([
      {
        id: "clip",
        kind: "clip",
        rect: { x: 0, y: 0, width: 100, height: 100 },
        commands: [
          {
            id: "selection",
            kind: "fill-rect",
            rect: { x: 1, y: 1, width: 20, height: 10 },
            fillStyle: "selection"
          }
        ]
      }
    ]);
    expect(displayList.commands).toHaveLength(2);
    expect(
      displayList.commands[1]?.kind === "clip"
        ? displayList.commands[1].commands
        : []
    ).toHaveLength(2);
  });
});

/**
 * Creates an overlay list with caret commands at two nesting levels.
 *
 * @returns Overlay display-list fixture.
 */
function createOverlayFixture(): QuireDisplayList {
  return {
    bounds: { x: 0, y: 0, width: 100, height: 100 },
    commands: [
      {
        id: "caret:root",
        kind: "caret",
        rect: { x: 2, y: 2, width: 1, height: 12 },
        fillStyle: "caret"
      },
      {
        id: "clip",
        kind: "clip",
        rect: { x: 0, y: 0, width: 100, height: 100 },
        commands: [
          {
            id: "selection",
            kind: "fill-rect",
            rect: { x: 1, y: 1, width: 20, height: 10 },
            fillStyle: "selection"
          },
          {
            id: "caret:clipped",
            kind: "caret",
            rect: { x: 3, y: 3, width: 1, height: 12 },
            fillStyle: "caret"
          }
        ]
      }
    ]
  };
}
