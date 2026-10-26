import { expect, it } from "vitest";
import { badgeCount } from "./count";
it("caps only the visual count and preserves meaningful zero and full text", () => {
  expect(badgeCount(120, 99)).toEqual({ visual: "99+", accessible: "120" });
  expect(badgeCount(0, 99)).toEqual({ visual: "0", accessible: "0" });
  expect(badgeCount(9.8, 9)).toEqual({ visual: "9", accessible: "9" });
  expect(badgeCount(-2, 99).visual).toBe("0");
  expect(badgeCount(Infinity, 99).visual).toBe("0");
  expect(badgeCount(2, 0).visual).toBe("1+");
});
