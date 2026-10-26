import { describe, expect, it } from "vitest";
import {
  captureClassicPrimitiveFocusTarget,
  restoreClassicPrimitiveFocus,
  type ClassicPrimitiveFocusTarget
} from "./focus-return";

describe("primitive focus return", () => {
  it("returns focus to the recorded trigger without accessing an editor", () => {
    let options: FocusOptions | undefined;
    const target: ClassicPrimitiveFocusTarget = {
      focus(nextOptions) {
        options = nextOptions;
      }
    };

    expect(captureClassicPrimitiveFocusTarget(target)).toBe(target);
    expect(restoreClassicPrimitiveFocus(target)).toBe(true);
    expect(options).toEqual({ preventScroll: true });
  });

  it("does not focus disconnected or throwing targets", () => {
    const disconnected: ClassicPrimitiveFocusTarget = {
      isConnected: false,
      focus() {
        throw new Error("must not run");
      }
    };
    const throwing: ClassicPrimitiveFocusTarget = {
      focus() {
        throw new Error("disposed");
      }
    };

    expect(restoreClassicPrimitiveFocus(disconnected)).toBe(false);
    expect(restoreClassicPrimitiveFocus(throwing)).toBe(false);
  });
});
