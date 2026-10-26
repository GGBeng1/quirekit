import { number } from "../model/validation";
import { readFlowchartPageSettings, flowchartPaperSize } from "./settings";
import type { FlowchartPageBounds, FlowchartPagePlan, FlowchartPageSettings, FlowchartPage } from "./types";

/** @param bounds - Measured source SVG bounds, independent of pan/zoom/DPR. @param settings - Physical paper configuration. @returns Contiguous row-major crops, or an explicit page-budget error. */
export function planFlowchartPages(bounds: FlowchartPageBounds, settings: FlowchartPageSettings): FlowchartPagePlan {
  const checked = readFlowchartPageSettings(settings), [paperWidth, paperHeight] = flowchartPaperSize(checked);
  const x = number(bounds.x, -4e6, 4e6, "page.bounds.x"), y = number(bounds.y, -4e6, 4e6, "page.bounds.y");
  const width = number(bounds.width, 0.001, 8e6, "page.bounds.width"), height = number(bounds.height, 0.001, 8e6, "page.bounds.height");
  // Convert physical space once; every page consumes the same graph coordinate
  // window. Viewport transforms and browser pixel density never enter this phase.
  const innerWidth = (paperWidth - checked.margins.left - checked.margins.right) * 96 / 25.4;
  const innerHeight = (paperHeight - checked.margins.top - checked.margins.bottom) * 96 / 25.4;
  const scale = checked.scale === "fit" ? Math.min(innerWidth / width, innerHeight / height) : checked.scale;
  const cropWidth = innerWidth / scale, cropHeight = innerHeight / scale;
  const columns = checked.scale === "fit" ? 1 : Math.max(1, Math.ceil(width / cropWidth - 1e-9));
  const rows = checked.scale === "fit" ? 1 : Math.max(1, Math.ceil(height / cropHeight - 1e-9));
  if (rows * columns > 100) throw new RangeError("分页超过 100 页，请减小比例或适合单页");
  const left = checked.scale === "fit" ? x - (cropWidth - width) / 2 : x;
  const top = checked.scale === "fit" ? y - (cropHeight - height) / 2 : y;
  const pages: FlowchartPage[] = [];
  for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
    pages.push(Object.freeze({ index: pages.length, row, column, x: left + column * cropWidth, y: top + row * cropHeight, width: cropWidth, height: cropHeight }));
  }
  return Object.freeze({ settings: checked, paperWidth, paperHeight, scale, rows, columns, pages: Object.freeze(pages) });
}
