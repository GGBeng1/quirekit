import { describe, expect, it } from "vitest";
import { currentEmojiSection } from "./navigation";

describe("emoji section scroll tracking", () => {
  const positions = [{ key: "common", top: 0 }, { key: "faces", top: 70 }, { key: "nature", top: 320 }, { key: "symbols", top: 440 }];
  it("tracks forward and backward wheel movement without changing the content collection", () => {
    expect([0, 80, 350, 90, 0].map(y => currentEmojiSection(positions, y, 400))).toEqual(["common", "faces", "nature", "faces", "common"]);
  });
  it("activates the last short section at the bottom, and handles content without overflow", () => {
    expect(currentEmojiSection(positions, 400, 400)).toBe("symbols");
    expect(currentEmojiSection(positions, 0, 0)).toBe("common");
    expect(currentEmojiSection([], 0, 0)).toBeUndefined();
  });
});
