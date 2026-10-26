import { describe, expect, it } from "vitest";
import { createTextFragmentCommand } from "./fragment/command";
import type { QuireTextFragment } from "@quirekit/layout/text";

describe("tab leader painting", () => {
  it("paints the leader without substituting canonical tab text or ranges", () => {
    const fragment: QuireTextFragment = {
      id: "tab", text: "\t", range: { from: 6, to: 7 },
      rect: { x: 70, y: 0, width: 130, height: 24 }, font: "16px test", lineHeight: 24,
      baseline: 18, caretStops: [], tab: { text: "...........", offset: 10 }
    };
    const command = createTextFragmentCommand({ id: "paint-tab", fragment, fillStyle: "#222" });
    expect(command).toMatchObject({ kind: "text", text: "...........", origin: { x: 80, y: 18 }, range: { from: 6, to: 7 } });
    expect(fragment.text).toBe("\t");
  });
});
