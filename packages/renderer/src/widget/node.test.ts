import { describe, expect, it } from "vitest";
import { qkView } from "./qk-view";

describe("Quire view widget primitives", () => {
  it("creates immutable primitive descriptions", () => {
    const node = qkView.flex({
      direction: "row",
      gap: 4,
      children: [
        qkView.box({ id: "icon", width: 12, height: 12, style: { fill: "#f59e0b" } }),
        qkView.text({ id: "label", text: "Callout" })
      ]
    });

    expect(node).toMatchObject({
      kind: "flex",
      direction: "row",
      gap: 4
    });
    expect(Object.isFrozen(node)).toBe(true);
    expect(Object.isFrozen(node.children)).toBe(true);
    expect(node.children).toHaveLength(2);
  });

  it("creates semantic surface, overlay, spacer, and divider descriptions", () => {
    const node = qkView.overlay({
      id: "root",
      width: 240,
      height: 64,
      children: [
        qkView.surface({
          id: "panel",
          style: {
            fill: "#ffffff",
            stroke: { color: "#cbd5e1", width: 1 }
          },
          child: qkView.flex({
            direction: "row",
            children: [
              qkView.text({ text: "Label" }),
              qkView.spacer({ flex: 1 }),
              qkView.divider({ axis: "vertical", height: 24 })
            ]
          })
        })
      ]
    });

    expect(node).toMatchObject({
      kind: "overlay",
      id: "root",
      children: [
        expect.objectContaining({
          kind: "surface",
          id: "panel",
          child: expect.objectContaining({
            kind: "flex",
            direction: "row",
            children: [
              expect.objectContaining({ kind: "text" }),
              expect.objectContaining({ kind: "spacer", flex: 1 }),
              expect.objectContaining({ kind: "divider", axis: "vertical" })
            ]
          })
        })
      ]
    });
    expect(Object.isFrozen(node)).toBe(true);
    expect(Object.isFrozen(node.children)).toBe(true);
  });

  it("normalizes inset shorthand", () => {
    expect(qkView.insets(6)).toEqual({
      top: 6,
      right: 6,
      bottom: 6,
      left: 6
    });
    expect(qkView.insets({ left: 2, top: 3 })).toEqual({
      top: 3,
      right: 0,
      bottom: 0,
      left: 2
    });
  });

  it("creates immutable positioned wrappers", () => {
    const node = qkView.positioned({
      left: 12,
      top: 8,
      child: qkView.text({ text: "Positioned" })
    });

    expect(node).toMatchObject({
      kind: "positioned",
      left: 12,
      top: 8,
      child: expect.objectContaining({ kind: "text" })
    });
    expect(Object.isFrozen(node)).toBe(true);
  });
});
