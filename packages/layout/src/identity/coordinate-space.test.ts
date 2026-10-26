import { describe, expect, it } from "vitest";

import {
  createQuireLayoutCoordinatePoint,
  translateQuireLayoutCoordinatePoint
} from "./coordinate-space";

describe("layout coordinate-space identity", () => {
  it("records an explicit translation path between layout spaces", () => {
    const source = createQuireLayoutCoordinatePoint(
      "table-cell-local",
      12,
      18
    );
    const path = translateQuireLayoutCoordinatePoint(source, "document", {
      x: 120,
      y: 240
    });

    expect(path).toEqual({
      spaces: ["table-cell-local", "document"],
      steps: [
        {
          from: "table-cell-local",
          to: "document",
          input: source,
          output: {
            space: "document",
            x: 132,
            y: 258
          },
          scaleX: 1,
          scaleY: 1
        }
      ]
    });
  });
});
