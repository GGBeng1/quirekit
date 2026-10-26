import { describe, expect, it } from "vitest";
import type { QuireLayoutSnapshot } from "@quirekit/view-engine";
import type { QuireViewRenderResult } from "../../types";
import {
  requireQuireViewInteractionGeometrySnapshot,
  resolveQuireViewInteractionGeometrySnapshot
} from "./snapshot";

describe("mounted interaction geometry snapshot", () => {
  it("prefers the interaction snapshot over the base layout snapshot", () => {
    const layoutSnapshot = { id: "layout" } as unknown as QuireLayoutSnapshot;
    const interactionSnapshot = { id: "interaction" } as unknown as QuireLayoutSnapshot;

    expect(resolveQuireViewInteractionGeometrySnapshot({
      layoutSnapshot,
      interactionSnapshot
    } as QuireViewRenderResult)).toBe(interactionSnapshot);
  });

  it("throws a mode-specific error before first render", () => {
    expect(() =>
      requireQuireViewInteractionGeometrySnapshot(undefined, "coordsAtPos", "Canvas")
    ).toThrow("Cannot call coordsAtPos before the Canvas view renders");
  });
});
