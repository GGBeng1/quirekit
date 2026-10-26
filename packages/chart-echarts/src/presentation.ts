import type { ChartSpec } from "@quirekit/chart";
import type { EChartsCoreOption } from "echarts/core";

/** @param spec - Validated visual tuple. @param fontFamily - Host typography. @returns Static title and non-overlapping legend. */
export function compileChartPresentation(spec: ChartSpec, fontFamily: string): EChartsCoreOption {
  const { title, legend } = spec.presentation;
  const vertical = legend === "left" || legend === "right";
  const placement = legend === "top" ? { top: title ? 40 : 12, left: "center" }
    : legend === "left" ? { left: 12, top: "middle" }
      : legend === "right" ? { right: 12, top: "middle" } : { bottom: 12, left: "center" };
  return {
    animation: false, backgroundColor: "transparent", color: [...spec.style.palette],
    textStyle: { fontFamily, fontSize: 13, color: "#333333" },
    title: { show: title !== "", text: title, top: 10, left: "center", textStyle: { fontFamily, fontSize: 16,
      width: Math.max(40, spec.extent.width - 24), overflow: "truncate", color: "#333333" } },
    legend: { ...placement, show: legend !== "none", orient: vertical ? "vertical" : "horizontal",
      textStyle: { fontFamily, fontSize: 12, width: Math.max(32, Math.min(110, spec.extent.width / 4)), overflow: "truncate" }, selectedMode: false }
  };
}

/** @param spec - Validated local extent and visual tuple. @returns Plot insets in the object's CSS pixel space. */
export function chartPlotInsets(spec: ChartSpec) {
  const legend = spec.presentation.legend, side = Math.min(160, spec.extent.width * 0.3);
  const [left, right] = fitInsets(legend === "left" ? side + 12 : 52, legend === "right" ? side + 12 : 24, spec.extent.width);
  const [top, bottom] = fitInsets((spec.presentation.title ? 52 : 24) + (legend === "top" ? 32 : 0), legend === "bottom" ? 68 : 24, spec.extent.height);
  return { left, right, top, bottom };
}

/** @param first - Leading local inset. @param second - Trailing local inset. @param extent - Chart CSS extent. @returns Pair preserving a positive plot budget at the accepted minimum size. */
function fitInsets(first: number, second: number, extent: number): [number, number] {
  const scale = Math.min(1, (extent - 48) / (first + second));
  return [first * scale, second * scale];
}
