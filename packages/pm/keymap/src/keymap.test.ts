import type * as PMKeymap from "./keymap";
import { describe, expect, it } from "vitest";

const distEntry = "../dist/keymap.mjs";
const { keydownHandler } = (await import(distEntry)) as typeof PMKeymap;

describe("pm-keymap vendored API", () => {
  it("runs a matching key binding", () => {
    let called = false;
    const handler = keydownHandler({
      "Ctrl-a": () => {
        called = true;
        return true;
      }
    });
    const event = {
      altKey: false,
      ctrlKey: true,
      key: "a",
      metaKey: false,
      shiftKey: false
    } as KeyboardEvent;

    expect(handler({} as never, event)).toBe(true);
    expect(called).toBe(true);
  });
});
