import { describe, expect, it } from "vitest";
import { containsQuireLayerContributionRect } from "./geometry";

describe("layer contribution geometry", () => {
  it("accepts repeated affine bounds that differ only by floating-point noise", () => {
    expect(containsQuireLayerContributionRect(
      {
        x: 237.86796564403573,
        y: -16.132034355964237,
        width: 424.26406871192853,
        height: 424.26406871192853
      },
      {
        x: 237.8679656440358,
        y: -16.13203435596421,
        width: 424.2640687119286,
        height: 424.2640687119285
      }
    )).toBe(true);
  });

  it("continues to reject a material escape from the authoritative bounds", () => {
    expect(containsQuireLayerContributionRect(
      { x: 10, y: 20, width: 40, height: 30 },
      { x: 10, y: 20, width: 40.001, height: 30 }
    )).toBe(false);
  });
});
