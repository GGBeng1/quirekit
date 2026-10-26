import type { QuireImageCommand } from "@quirekit/renderer";
import { describe, expect, it } from "vitest";
import {
  readQuireAffineScale,
  readQuireImageCommandDemand,
  resolveQuireImageDecodeSize
} from "./decode-size";

describe("image decode size", () => {
  it("halves the pixel area while both axes still cover the demand", () => {
    const intrinsic = { width: 2400, height: 1700 };

    expect(resolveQuireImageDecodeSize(intrinsic, { width: 1200, height: 850 })).toEqual({ width: 1200, height: 850 });
    expect(resolveQuireImageDecodeSize(intrinsic, { width: 1201, height: 100 })).toEqual({ width: 1698, height: 1203 });
    expect(resolveQuireImageDecodeSize(intrinsic, { width: 1697, height: 100 })).toEqual({ width: 1698, height: 1203 });
    expect(resolveQuireImageDecodeSize(intrinsic, { width: 1698, height: 100 })).toEqual(intrinsic);
    expect(resolveQuireImageDecodeSize(intrinsic, { width: 290, height: 200 })).toEqual({ width: 300, height: 213 });
    expect(resolveQuireImageDecodeSize(intrinsic, { width: 5000, height: 5000 })).toEqual(intrinsic);
    expect(resolveQuireImageDecodeSize(intrinsic, { width: 0, height: 0 })).toEqual(intrinsic);
  });

  it("measures whole-image demand through crops and enclosing clip scale", () => {
    const command: QuireImageCommand = {
      id: "image",
      kind: "image",
      rect: { x: 0, y: 0, width: 100, height: 50 }
    };

    expect(readQuireImageCommandDemand(command, 1)).toEqual({ width: 100, height: 50 });
    expect(readQuireImageCommandDemand({
      ...command,
      sourceCrop: { left: 0.25, right: 0.25, top: 0, bottom: 0.5 }
    }, 2)).toEqual({ width: 400, height: 200 });
    expect(readQuireImageCommandDemand({ ...command, rect: { x: 0, y: 0, width: 0, height: 5 } }, 1)).toBeUndefined();
    expect(readQuireAffineScale({ a: 0, b: 3, c: -3, d: 0, e: 9, f: 9 })).toBe(3);
    expect(readQuireAffineScale(undefined)).toBe(1);
  });
});
