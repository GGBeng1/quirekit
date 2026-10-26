import { describe, expect, it } from "vitest";
import { attachQuireTextFragmentSource, type QuireTextFragment } from "@quirekit/layout/text";
import { createTextFragmentCommand } from "./fragment/command";
import { createQuireDisplayCommandCache } from "./command-cache";

describe("text command placement precision", () => {
  it.each([false, true])("rebuilds horizontal placement without accumulating projected rounding (source=%s)", retainedSource => {
    const fragment: QuireTextFragment = {
      id: "p:text", text: "脚注", range: { from: 1, to: 3 }, font: "16px serif",
      rect: { x: 120 + 12.48, y: 20, width: 32, height: 24 }, baseline: 38,
      lineHeight: 24, caretStops: []
    };
    const next: QuireTextFragment = { ...fragment, rect: { ...fragment.rect, x: 415.7666666666667 + 12.48 } };
    if (retainedSource) attachQuireTextFragmentSource(next, fragment);
    const cache = createQuireDisplayCommandCache();
    const key = { nodeId: "p", fragmentIndex: 0, defaultFillStyle: "#000" };
    /** @param value - Fragment in the current projection. @returns Fresh command without cached translation. */
    const create = (value: QuireTextFragment) => createTextFragmentCommand({ id: "p:text", fragment: value, fillStyle: "#000" });
    cache.setTextFragmentCommands(fragment, key, [create(fragment)]);
    const commands = cache.getTextFragmentCommandsByKey(next, "p", 0, "#000") ?? [create(next)];
    expect(commands).toEqual([create(next)]);
    expect(cache.snapshot().misses).toBe(1);
  });
});
