import type { QuireDisplayList } from "@quirekit/render-contract";
import {
  compileQuireViewNode,
  qkView,
  renderCanvasDisplayList,
  serializeSvgDisplayListToSvg,
  type Canvas2DRenderTarget
} from "@quirekit/renderer";

// Compile local component geometry once; both backends consume the same CSS-pixel list.
export const displayList: QuireDisplayList = compileQuireViewNode({
  id: "preview",
  origin: { x: 0, y: 0 },
  constraints: { minWidth: 320, maxWidth: 320, minHeight: 100, maxHeight: 100 },
  node: qkView.surface({
    width: 320,
    height: 100,
    padding: qkView.insets(16),
    style: { fill: "#eef2ff" },
    child: qkView.column({
      gap: 8,
      children: [
        qkView.text({
          text: "Quire Render",
          style: { font: "600 20px sans-serif", color: "#172033", lineHeight: 28 }
        }),
        qkView.text({
          text: "One scene, Canvas & SVG",
          style: { font: "14px sans-serif", color: "#475569", lineHeight: 20 }
        })
      ]
    })
  })
}).displayList;

// SVG serialization needs no browser globals. A browser host can pass its 2D context to paint().
export const svg = serializeSvgDisplayListToSvg({ displayList });

/**
 * Paints the compiled scene on a host-owned Canvas 2D target.
 * @param target - Canvas context or compatible host implementation.
 */
export function paint(target: Canvas2DRenderTarget): void {
  renderCanvasDisplayList({ displayList, target });
}
