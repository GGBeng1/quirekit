import { describe, expect, it } from "vitest";
import { compileQuireViewNode } from "../compiler";
import { qkView } from "../qk-view";

// A diagonal local polygon must retain its exact shape after widget placement.
describe("declared exact hit geometry", () => {
  it("translates the hit polygon together with its coarse target rectangle", () => {
    const compiled = compileQuireViewNode({ id: "line", origin: { x: 40, y: 80 },
      constraints: { minWidth: 0, minHeight: 0, maxWidth: 120, maxHeight: 100 }, node: qkView.surface({ width: 100, height: 50, role: "control",
        interaction: { hitArea: { kind: "polygon", points: [{ x: 0, y: 0 }, { x: 100, y: 46 }, { x: 100, y: 50 }, { x: 0, y: 4 }] } }
      }) });
    expect(compiled.targets[0]!.hitArea).toEqual({ kind: "polygon", points: [
      { x: 40, y: 80 }, { x: 140, y: 126 }, { x: 140, y: 130 }, { x: 40, y: 84 }
    ] });
  });
});
