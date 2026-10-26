import { describe, expect, it } from "vitest";
import { resolveQuireKitCommandListFocus } from "./navigation";
import type { QuireKitCommandListItem } from "./types";

const items: readonly QuireKitCommandListItem[] = [
  { key: "one", label: "One" },
  { key: "two", label: "Two", disabled: true },
  { key: "three", label: "Three" }
];

describe("Classic Editor command-menu navigation", () => {
  it("wraps arrow movement and skips disabled commands", () => {
    expect(resolveQuireKitCommandListFocus(items, 0, "next")).toBe(2);
    expect(resolveQuireKitCommandListFocus(items, 2, "next")).toBe(0);
    expect(resolveQuireKitCommandListFocus(items, 0, "previous")).toBe(2);
  });

  it("resolves enabled Home and End boundaries", () => {
    expect(resolveQuireKitCommandListFocus(items, 2, "home")).toBe(0);
    expect(resolveQuireKitCommandListFocus(items, 0, "end")).toBe(2);
  });
});
