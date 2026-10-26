import { expect, it } from "vitest";
import { resolveQuireKitToolbarVisibleUnits } from "./collapse";

const unit = (advance: number, separator = false) => ({ advance, separator });

it("keeps every unit when the row fits and reserves the more control otherwise", () => {
  const units = [unit(60), unit(9, true), unit(108), unit(9, true), unit(88)];
  expect(resolveQuireKitToolbarVisibleUnits(units, 274, 36)).toBe(5);
  // Budget 273 - 36 = 237 keeps 60 + 9 + 108 + 9, then drops the trailing separator.
  expect(resolveQuireKitToolbarVisibleUnits(units, 273, 36)).toBe(3);
});

it("never ends the visible row on a separator and may collapse everything", () => {
  const units = [unit(60), unit(9, true), unit(108)];
  expect(resolveQuireKitToolbarVisibleUnits(units, 120, 36)).toBe(1);
  expect(resolveQuireKitToolbarVisibleUnits(units, 40, 36)).toBe(0);
});
