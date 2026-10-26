import { describe, expect, it } from "vitest";
import {
  calculateResponsiveRailWidth,
  calculateResponsiveStageWidth,
  projectResponsiveScrollLeft
} from "./stage";

describe("Classic Editor responsive page stage", () => {
  it("keeps compact preferred gutters in a wide workspace", () => {
    expect(calculateResponsiveStageWidth(794, 1204)).toBe(890);
  });

  it("shrinks product gutters before introducing horizontal overflow", () => {
    expect(calculateResponsiveStageWidth(794, 820)).toBe(820);
    expect(calculateResponsiveStageWidth(794, 764)).toBe(794);
  });

  it("centers new unavoidable overflow and clears fit-case scrolling", () => {
    expect(projectResponsiveScrollLeft(0, 0, 270)).toBe(135);
    expect(projectResponsiveScrollLeft(135, 270, 0)).toBe(0);
  });

  it("narrows the document rail before the paper and rail overflow the workspace", () => {
    expect(calculateResponsiveRailWidth(794, 1400)).toBe(340);
    expect(calculateResponsiveRailWidth(794, 1044)).toBe(250);
    expect(calculateResponsiveRailWidth(794, 900)).toBe(240);
  });

  it("preserves the normalized reading position across resize", () => {
    expect(projectResponsiveScrollLeft(54, 270, 100)).toBe(20);
  });

  it("centers paper instead of the asymmetric overflow added by review", () => {
    expect(projectResponsiveScrollLeft(0, 0, 240, 0, 0)).toBe(0);
    expect(projectResponsiveScrollLeft(0, 240, 440, 0, 100)).toBe(100);
    expect(projectResponsiveScrollLeft(100, 440, 240, 100, 0)).toBe(0);
  });

  it("preserves deliberate travel on either side of the paper center", () => {
    expect(projectResponsiveScrollLeft(50, 440, 640, 100, 200)).toBe(100);
    expect(projectResponsiveScrollLeft(270, 440, 640, 100, 200)).toBe(420);
    expect(projectResponsiveScrollLeft(440, 440, 640, 100, 200)).toBe(640);
    expect(projectResponsiveScrollLeft(240, 240, 0, 0, 0)).toBe(0);
  });

  it("does not amplify native scroll rounding when the review range changes", () => {
    const center = (793.7333333333333 - 702) / 2;
    expect(projectResponsiveScrollLeft(Math.round(center), center * 2, center * 2 + 240, center, center)).toBe(center);
    expect(projectResponsiveScrollLeft(Math.round(center), center * 2 + 240, center * 2, center, center)).toBe(center);
  });
});
