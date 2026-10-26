import { describe, expect, it } from "vitest";
import { resolveMountedPointerCursor } from "./cursor";

describe("resolveMountedPointerCursor", () => {
  it("shows movement over an object even when its hit carries an underlying text position", () => {
    expect(resolveMountedPointerCursor({ overObject: true, overContent: true, editable: true })).toBe("move");
  });

  it("keeps control cursors above object feedback and does not imply movement in read-only mode", () => {
    expect(resolveMountedPointerCursor({ targetCursor: "ew-resize", overObject: true,
      overContent: true, editable: true })).toBe("ew-resize");
    expect(resolveMountedPointerCursor({ overObject: true, overContent: true, editable: false })).toBe("default");
  });

  it("uses a view target cursor when the pointer is over a declaring target", () => {
    expect(
      resolveMountedPointerCursor({
        targetCursor: "default",
        overContent: true,
        editable: true
      })
    ).toBe("default");
  });

  it("uses the target cursor even over a non-editable view", () => {
    expect(
      resolveMountedPointerCursor({
        targetCursor: "pointer",
        overContent: false,
        editable: false
      })
    ).toBe("pointer");
  });

  it("shows the text I-beam over editable document content", () => {
    expect(
      resolveMountedPointerCursor({
        overContent: true,
        editable: true
      })
    ).toBe("text");
  });

  it("uses the default cursor over empty space in an editable view", () => {
    expect(
      resolveMountedPointerCursor({
        overContent: false,
        editable: true
      })
    ).toBe("");
  });

  it("never forces the text I-beam in a read-only view", () => {
    expect(
      resolveMountedPointerCursor({
        overContent: true,
        editable: false
      })
    ).toBe("");
  });
});
