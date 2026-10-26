import { describe, expect, it } from "vitest";
import { resolveCanvasMountedTextLayoutConfig } from "./layout-config";

describe("resolveCanvasMountedTextLayoutConfig", () => {
  it("keeps accelerator metrics aligned with mounted display-list styles", () => {
    expect(resolveCanvasMountedTextLayoutConfig({
      displayListStyles: {
        font: "15px Example Sans",
        textBaselineOffset: 16
      }
    })).toMatchObject({
      font: "15px Example Sans",
      textBaselineOffset: 16
    });
  });
});
