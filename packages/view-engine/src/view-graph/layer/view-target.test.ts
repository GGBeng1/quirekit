import type { QuireViewTarget } from "@quirekit/renderer";
import { describe, expect, it } from "vitest";
import {
  hasQuireViewTargetEventBindings,
  resolveQuireViewTargetLayer,
  resolveQuireViewTargetPointerPolicy
} from "./view-target";

describe("view graph qkView target layer classification", () => {
  it("classifies decoration targets as annotation pass-through targets", () => {
    const target = createTarget({
      owner: {
        kind: "decoration",
        id: "comment-1"
      },
      pointerEvents: "none"
    });
    const layer = resolveQuireViewTargetLayer(target);

    expect(layer).toEqual({ plane: "annotation" });
    expect(resolveQuireViewTargetPointerPolicy(target, layer)).toEqual({
      kind: "pass-through",
      shouldFocusEditor: false,
      shouldPreventDefault: false
    });
  });

  it("classifies drawing owners as drawing layer selection targets", () => {
    const target = createTarget({
      owner: {
        kind: "drawing",
        id: "shape-1"
      }
    });
    const layer = resolveQuireViewTargetLayer(target);

    expect(layer).toEqual({ plane: "drawing" });
    expect(resolveQuireViewTargetPointerPolicy(target, layer)).toEqual({
      kind: "select",
      shouldFocusEditor: true,
      shouldPreventDefault: true
    });
  });

  it("honors explicit floating-ui layer metadata", () => {
    const target = createTarget({
      owner: {
        kind: "extension",
        id: "comments",
        metadata: {
          layerPlane: "floating-ui"
        }
      }
    });
    const layer = resolveQuireViewTargetLayer(target);

    expect(layer).toEqual({ plane: "floating-ui" });
    expect(resolveQuireViewTargetPointerPolicy(target, layer).kind).toBe(
      "dispatch"
    );
  });

  it("promotes eventful targets to the controls layer", () => {
    const target = createTarget({
      role: "button",
      events: {
        click: { handler: "callout.open" }
      }
    });

    expect(hasQuireViewTargetEventBindings(target)).toBe(true);
    expect(resolveQuireViewTargetLayer(target)).toEqual({ plane: "controls" });
  });
});

/**
 * Creates a qkView target fixture with stable geometry.
 *
 * @param target - Target fields to override.
 * @returns qkView target descriptor.
 */
function createTarget(target: Partial<QuireViewTarget>): QuireViewTarget {
  return {
    id: "target",
    nodePath: "0",
    range: { from: 2, to: 6 },
    rect: { x: 10, y: 20, width: 80, height: 24 },
    pointerEvents: "auto",
    events: {},
    ...target
  };
}
