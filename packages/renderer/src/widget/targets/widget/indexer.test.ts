import { describe, expect, it } from "vitest";
import { createQuireViewWidgetIndex } from "./index";
import type { QuireViewHost, QuireViewTarget } from "../../events";

describe("qkView widget index", () => {
  it("wraps targets in DOM-like widget objects", () => {
    let host: QuireViewHost | undefined = {
      kind: "canvas",
      surface: { tagName: "canvas" }
    };
    const index = createQuireViewWidgetIndex([
      createTarget({ id: "root", nodePath: "0", role: "callout" }),
      createTarget({
        id: "button",
        nodePath: "0.1",
        role: "button",
        part: "action",
        owner: {
          kind: "extension",
          id: "showcase",
          name: "showcase"
        },
        range: { from: 4, to: 8 },
        rect: { x: 12, y: 10, width: 24, height: 16 }
      })
    ], {
      getHost: () => host
    });
    const root = index.getById("root");
    const button = index.getById("button");

    expect(root?.children.map((widget) => widget.id)).toEqual(["button"]);
    expect(root?.children[0]).toBe(button);
    expect(button?.parent?.id).toBe("root");
    expect(button?.parent).toBe(root);
    expect(button?.ancestors.map((widget) => widget.id)).toEqual(["root"]);
    expect(button?.ancestors[0]).toBe(root);
    expect(button?.targetPath.map((target) => target.id)).toEqual(["button", "root"]);
    expect(button?.host?.kind).toBe("canvas");
    expect(button?.owner).toEqual({
      kind: "extension",
      id: "showcase",
      name: "showcase"
    });
    expect(button?.containsPoint({ x: 14, y: 12 })).toBe(true);
    expect(button?.containsPosition(6)).toBe(true);
    expect(button?.overlapsRange({ from: 7, to: 12 })).toBe(true);
    expect(index.getByRole("button").map((widget) => widget.id)).toEqual(["button"]);
    expect(index.getByPart("action").map((widget) => widget.id)).toEqual(["button"]);
    expect(index.getByPosition(6).map((widget) => widget.id)).toEqual(["button"]);
    expect(index.hitTest({ x: 14, y: 12 })?.widget.id).toBe("button");

    host = undefined;

    expect(button?.host).toBeUndefined();
  });

  it("rejects points that only hit the coarse bounds of an exact polygon", () => {
    const index = createQuireViewWidgetIndex([
      createTarget({
        id: "rotated-picture",
        nodePath: "0",
        rect: { x: 0, y: 0, width: 100, height: 100 },
        hitArea: {
          kind: "polygon",
          points: [
            { x: 50, y: 0 },
            { x: 100, y: 50 },
            { x: 50, y: 100 },
            { x: 0, y: 50 }
          ]
        }
      })
    ]);
    const picture = index.getById("rotated-picture");

    expect(picture?.containsPoint({ x: 10, y: 10 })).toBe(false);
    expect(index.hitTest({ x: 10, y: 10 })).toBeNull();
    expect(picture?.containsPoint({ x: 50, y: 50 })).toBe(true);
    expect(index.hitTest({ x: 50, y: 50 })?.widget.id)
      .toBe("rotated-picture");
  });
});

/**
 * Creates a test target with small defaults.
 *
 * @param target - Target fields to override.
 * @returns Complete target fixture.
 */
function createTarget(
  target: Partial<QuireViewTarget> & Pick<QuireViewTarget, "id" | "nodePath">
): QuireViewTarget {
  return {
    rect: { x: 0, y: 0, width: 100, height: 60 },
    pointerEvents: "auto",
    events: {},
    ...target
  };
}
