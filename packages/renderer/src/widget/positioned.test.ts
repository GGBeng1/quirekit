import { describe, expect, it } from "vitest";
import { compileQuireViewNode } from "./compiler";
import { qkView } from "./qk-view";

describe("positioned widget compiler", () => {
  it("positions overlay children with explicit offsets", () => {
    const result = compileQuireViewNode({
      id: "positioned-root",
      node: qkView.overlay({
        width: 200,
        height: 100,
        children: [
          qkView.positioned({
            left: 10,
            top: 20,
            child: qkView.text({
              id: "label",
              text: "Pinned",
              width: 48,
              height: 20
            })
          }),
          qkView.positioned({
            right: 8,
            bottom: 6,
            width: 32,
            height: 18,
            child: qkView.domOverlay({
              id: "button",
              width: 32,
              height: 18,
              html: "<button>OK</button>"
            })
          })
        ]
      }),
      origin: { x: 20, y: 30 },
      range: { from: 1, to: 2 },
      constraints: {
        minWidth: 0,
        maxWidth: 400,
        minHeight: 0,
        maxHeight: 200
      }
    });

    expect(result.displayList.commands).toEqual([
      expect.objectContaining({
        id: "label:text",
        kind: "text",
        rect: { x: 30, y: 50, width: 48, height: 20 },
        origin: { x: 30, y: 66 }
      })
    ]);
    expect(result.domOverlays).toEqual([
      {
        id: "button",
        range: { from: 1, to: 2 },
        rect: { x: 180, y: 106, width: 32, height: 18 },
        html: "<button>OK</button>",
        pointerEvents: "none"
      }
    ]);
  });
});
