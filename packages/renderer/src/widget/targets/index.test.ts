import { describe, expect, it } from "vitest";
import { createQuireViewTargetIndex } from "./index";
import type { QuireViewTarget } from "../events";

describe("qkView target index", () => {
  it("hit-tests the deepest topmost pointer target", () => {
    const root = createTarget({
      id: "root",
      nodePath: "0",
      rect: { x: 0, y: 0, width: 120, height: 80 }
    });
    const child = createTarget({
      id: "child",
      nodePath: "0.1",
      rect: { x: 10, y: 10, width: 80, height: 40 }
    });
    const ignored = createTarget({
      id: "ignored",
      nodePath: "0.2",
      pointerEvents: "none",
      rect: { x: 20, y: 20, width: 80, height: 40 }
    });
    const index = createQuireViewTargetIndex([root, child, ignored]);

    expect(index.hitTest({ x: 24, y: 24 })?.target.id).toBe("child");
    expect(index.hitTest({ x: 4, y: 4 })?.target.id).toBe("root");
    expect(index.hitTest({ x: 140, y: 4 })).toBeNull();
  });

  it("returns target ancestry from deepest to outermost", () => {
    const index = createQuireViewTargetIndex([
      createTarget({ id: "root", nodePath: "0" }),
      createTarget({ id: "panel", nodePath: "0.2" }),
      createTarget({ id: "button", nodePath: "0.2.1" })
    ]);

    expect(index.getPath("button").map((target) => target.id)).toEqual([
      "button",
      "panel",
      "root"
    ]);
  });

  it("keeps the exact hit target when a malformed sibling reuses its node path", () => {
    const first = createTarget({
      id: "first-marker",
      nodePath: "marker",
      rect: { x: 0, y: 0, width: 20, height: 20 }
    });
    const last = createTarget({
      id: "last-marker",
      nodePath: "marker",
      rect: { x: 0, y: 40, width: 20, height: 20 }
    });
    const index = createQuireViewTargetIndex([first, last]);
    const hit = index.hitTest({ x: 10, y: 10 });

    expect(hit?.target).toBe(first);
    expect(hit?.path[0]).toBe(first);
  });

  it("queries targets by id, node path, role, part, and document range", () => {
    const index = createQuireViewTargetIndex([
      createTarget({
        id: "callout",
        nodePath: "0",
        role: "callout",
        range: { from: 10, to: 30 }
      }),
      createTarget({
        id: "action",
        nodePath: "0.1",
        role: "button",
        part: "action",
        range: { from: 12, to: 18 }
      }),
      createTarget({
        id: "badge",
        nodePath: "0.2",
        role: "button",
        part: "badge",
        range: { from: 40, to: 50 }
      })
    ]);

    expect(index.getById("action")?.part).toBe("action");
    expect(index.getByNodePath("0.2")?.id).toBe("badge");
    expect(index.getByRole("button").map((target) => target.id)).toEqual([
      "action",
      "badge"
    ]);
    expect(index.getByPart("action").map((target) => target.id)).toEqual(["action"]);
    expect(index.getByPosition(15).map((target) => target.id)).toEqual([
      "callout",
      "action"
    ]);
    expect(index.getByRange({ from: 16, to: 42 }).map((target) => target.id)).toEqual([
      "callout",
      "action",
      "badge"
    ]);
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
