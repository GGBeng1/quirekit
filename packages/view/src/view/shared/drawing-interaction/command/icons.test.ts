// @vitest-environment happy-dom

import { describe, expect, it } from "vitest";
import {
  createDrawingContextualCommandIcon
} from "./icons";
import type { DrawingContextualCommandIcon } from "./types";

const expectedIconPaths = {
  wrap: [
    "m16 16-3 3 3 3",
    "M3 12h14.5a1 1 0 0 1 0 7H13",
    "M3 19h6",
    "M3 5h18"
  ],
  fill: [
    "M11 7 6 2",
    "M18.992 12H2.041",
    "m8.5 4.5 2.148-2.148a1.205 1.205 0 0 1 1.704 0l7.296 7.296a1.205 1.205 0 0 1 0 1.704l-7.592 7.592a3.615 3.615 0 0 1-5.112 0l-3.888-3.888a3.615 3.615 0 0 1 0-5.112L5.67 7.33"
  ],
  outline: [
    "M12 3H5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-4",
    "M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"
  ],
  "edit-text": [
    "M12 20h-1a2 2 0 0 1-2-2 2 2 0 0 1-2 2H6",
    "M13 8h7a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-7",
    "M5 16H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h1",
    "M6 4h1a2 2 0 0 1 2 2 2 2 0 0 1 2-2h1",
    "M9 6v12"
  ],
  delete: [
    "M10 11v6",
    "M14 11v6",
    "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6",
    "M3 6h18",
    "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
  ]
} as const satisfies Record<DrawingContextualCommandIcon, readonly string[]>;

describe("drawing contextual command icons", () => {
  it.each(Object.entries(expectedIconPaths))(
    "uses balanced Lucide geometry for %s",
    (icon, expectedPaths) => {
      const svg = createDrawingContextualCommandIcon(
        document,
        icon as DrawingContextualCommandIcon
      );

      expect(svg.getAttribute("viewBox")).toBe("0 0 24 24");
      expect(svg.getAttribute("width")).toBe("20");
      expect(svg.getAttribute("height")).toBe("20");
      expect(svg.getAttribute("stroke-width")).toBe("2");
      expect(svg.getAttribute("stroke-linecap")).toBe("round");
      expect(svg.getAttribute("stroke-linejoin")).toBe("round");
      expect(Array.from(svg.querySelectorAll("path"), (path) => path.getAttribute("d")))
        .toEqual(expectedPaths);
    }
  );

  it("projects live fill into the bucket without adding a bottom bar", () => {
    const svg = createDrawingContextualCommandIcon(
      document,
      "fill",
      { kind: "solid", color: "#ffeeaa" }
    );
    const indicator = svg.querySelector(
      '[data-qk-drawing-paint-indicator="solid"]'
    );

    expect(indicator?.tagName).toBe("path");
    expect(indicator?.getAttribute("data-qk-drawing-paint-indicator-role"))
      .toBe("fill-region");
    expect(indicator?.getAttribute("fill")).toBe("#ffeeaa");
    expect(indicator?.getAttribute("stroke")).toBe("none");
    expect(svg.querySelector("rect")).toBeNull();
    expect(svg.querySelector("[data-qk-drawing-paint-indicator-slash]"))
      .toBeNull();
  });

  it("projects live outline color directly into the represented frame", () => {
    const svg = createDrawingContextualCommandIcon(
      document,
      "outline",
      { kind: "solid", color: "#123456" }
    );
    const indicator = svg.querySelector(
      '[data-qk-drawing-paint-indicator="solid"]'
    );

    expect(indicator?.tagName).toBe("path");
    expect(indicator?.getAttribute("data-qk-drawing-paint-indicator-role"))
      .toBe("outline-frame");
    expect(indicator?.getAttribute("fill")).toBeNull();
    expect(indicator?.getAttribute("stroke")).toBe("#123456");
    expect(indicator?.getAttribute("d")).toBe(expectedIconPaths.outline[0]);
    expect(svg.querySelector("rect")).toBeNull();
  });

  it("projects disabled outline as an integrated crossed frame", () => {
    const svg = createDrawingContextualCommandIcon(
      document,
      "outline",
      { kind: "none" }
    );
    const indicator = svg.querySelector(
      '[data-qk-drawing-paint-indicator="none"]'
    );
    const slash = svg.querySelector(
      "[data-qk-drawing-paint-indicator-slash]"
    );

    expect(indicator?.getAttribute("data-qk-drawing-paint-indicator-role"))
      .toBe("outline-frame");
    expect(indicator?.getAttribute("stroke")).toBe("#94a3b8");
    expect(slash?.getAttribute("stroke")).toBe("#ef4444");
    expect(svg.querySelector("rect")).toBeNull();
  });

  it("projects disabled fill inside the bucket with an integrated slash", () => {
    const svg = createDrawingContextualCommandIcon(
      document,
      "fill",
      { kind: "none" }
    );
    const indicator = svg.querySelector(
      '[data-qk-drawing-paint-indicator="none"]'
    );
    const slash = svg.querySelector(
      "[data-qk-drawing-paint-indicator-slash]"
    );

    expect(indicator?.getAttribute("data-qk-drawing-paint-indicator-role"))
      .toBe("fill-region");
    expect(indicator?.getAttribute("fill")).toBe("#ffffff");
    expect(indicator?.getAttribute("stroke")).toBe("none");
    expect(slash?.getAttribute("stroke")).toBe("#ef4444");
    expect(svg.querySelector("rect")).toBeNull();
  });
});
