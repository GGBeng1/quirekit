import { describe, expect, it } from "vitest";
import { snapClassicMobileZoom } from "./pinch";

describe("body-fit pinch detent", () => {
  it("enters near body fit, resists jitter, and releases beyond the outer band", () => {
    expect(snapClassicMobileZoom(74, 75)).toEqual({ percent: 75, snapped: true });
    expect(snapClassicMobileZoom(78, 75)).toEqual({ percent: 78, snapped: false });
    expect(snapClassicMobileZoom(78, 75, true)).toEqual({ percent: 75, snapped: true });
    expect(snapClassicMobileZoom(80, 75, true)).toEqual({ percent: 80, snapped: false });
    expect(snapClassicMobileZoom(8, undefined)).toEqual({ percent: 25, snapped: false });
    expect(snapClassicMobileZoom(600, 75)).toEqual({ percent: 400, snapped: false });
  });
});
