import { describe, expect, it } from "vitest";
import {
  createQuireImageTransformMatrix,
  filterQuireDisplayListToRect,
  resolveQuireImagePaintBounds,
  resolveQuireImageTransformCorners,
  type QuireDisplayList,
  type QuireImageCommand
} from "./index";

describe("image display-command transform", () => {
  it("fixes the destination center while applying local flips before rotation", () => {
    const command: QuireImageCommand = {
      id: "picture",
      kind: "image",
      rect: { x: 10, y: 20, width: 40, height: 20 },
      transform: {
        rotation: 90,
        flipHorizontal: true,
        flipVertical: false
      }
    };

    expect(createQuireImageTransformMatrix(command.rect, command.transform)).toEqual({
      a: 0,
      b: -1,
      c: -1,
      d: 0,
      e: 60,
      f: 60
    });
    expect(resolveQuireImageTransformCorners(command.rect, command.transform)).toEqual([
      { x: 40, y: 50 },
      { x: 40, y: 10 },
      { x: 20, y: 10 },
      { x: 20, y: 50 }
    ]);
    expect(resolveQuireImagePaintBounds(command)).toEqual({
      x: 20,
      y: 10,
      width: 20,
      height: 40
    });
  });

  it("keeps a default transform on the identity fast path", () => {
    const command: QuireImageCommand = {
      id: "picture",
      kind: "image",
      rect: { x: 10, y: 20, width: 40, height: 20 },
      transform: {
        rotation: 0,
        flipHorizontal: false,
        flipVertical: false
      }
    };

    expect(createQuireImageTransformMatrix(command.rect, command.transform)).toBeNull();
    expect(resolveQuireImagePaintBounds(command)).toBe(command.rect);
  });

  it("retains an image when only rotated paint intersects the viewport", () => {
    const displayList: QuireDisplayList = {
      bounds: { x: 0, y: 0, width: 240, height: 240 },
      commands: [{
        id: "page-edge-picture",
        kind: "image",
        rect: { x: 100, y: 100, width: 100, height: 20 },
        transform: {
          rotation: 90,
          flipHorizontal: false,
          flipVertical: false
        }
      }]
    };

    expect(filterQuireDisplayListToRect(
      displayList,
      { x: 140, y: 70, width: 10, height: 10 }
    ).commands).toHaveLength(1);
  });

  it("rejects non-finite transform degrees instead of painting an approximation", () => {
    expect(() => createQuireImageTransformMatrix(
      { x: 0, y: 0, width: 40, height: 20 },
      {
        rotation: Number.NaN,
        flipHorizontal: false,
        flipVertical: false
      }
    )).toThrowError(/finite/u);
  });
});
