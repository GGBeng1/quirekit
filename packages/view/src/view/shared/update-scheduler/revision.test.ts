import { describe, expect, it } from "vitest";
import { createMountedViewUpdateRevisionClock } from "./revision";

describe("mounted view update revision clock", () => {
  it("advances state for every request and layout only for invalidating requests", () => {
    const clock = createMountedViewUpdateRevisionClock();

    expect(clock.current()).toEqual({ stateVersion: 0, layoutEpoch: 0 });
    expect(clock.advance(false)).toEqual({ stateVersion: 1, layoutEpoch: 0 });
    expect(clock.advance(true)).toEqual({ stateVersion: 2, layoutEpoch: 1 });
    expect(clock.current()).toEqual({ stateVersion: 2, layoutEpoch: 1 });
  });

  it("returns immutable revision snapshots", () => {
    const clock = createMountedViewUpdateRevisionClock();
    const first = clock.advance(true);
    const second = clock.advance(true);

    expect(first).toEqual({ stateVersion: 1, layoutEpoch: 1 });
    expect(second).toEqual({ stateVersion: 2, layoutEpoch: 2 });
    expect(first).not.toBe(second);
  });
});
