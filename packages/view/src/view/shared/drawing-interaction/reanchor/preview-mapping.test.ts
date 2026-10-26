import { describe, expect, it } from "vitest";
import {
  mapSpeculativeRelocationPositionToAccepted,
  resolveSpeculativeRelocationInsertionPosition
} from "./preview-mapping";

describe("drawing relocation preview position mapping", () => {
  it("maps a downstream refined caret through delete and insert", () => {
    expect(resolveSpeculativeRelocationInsertionPosition(5, 1, 20)).toBe(19);
    expect(mapSpeculativeRelocationPositionToAccepted(30, 5, 1, 20)).toBe(30);
    expect(mapSpeculativeRelocationPositionToAccepted(12, 5, 1, 20)).toBe(13);
    expect(mapSpeculativeRelocationPositionToAccepted(19, 5, 1, 20)).toBe(20);
  });

  it("maps an upstream relocation without crossing the deleted source", () => {
    expect(resolveSpeculativeRelocationInsertionPosition(20, 1, 5)).toBe(5);
    expect(mapSpeculativeRelocationPositionToAccepted(10, 20, 1, 5)).toBe(9);
    expect(mapSpeculativeRelocationPositionToAccepted(5, 20, 1, 5)).toBe(5);
  });
});
