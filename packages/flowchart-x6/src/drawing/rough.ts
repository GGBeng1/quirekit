import type { RoughGenerator } from "roughjs/bin/generator";
import type { FlowchartDrawingStyle } from "@quirekit/flowchart";

let generator: RoughGenerator | undefined;
/** @returns Completion of the optional browser drawing dependency initialization. */
export async function initializeDrawing(): Promise<void> {
  if (!generator) generator = (await import("roughjs")).default.generator();
}
/** @param identity - Stable source identity. @returns Reproducible positive 31-bit seed. */
export function drawingSeed(identity: string): number {
  let hash = 2166136261;
  for (let i = 0; i < identity.length; i++) hash = Math.imul(hash ^ identity.charCodeAt(i), 16777619);
  return (hash & 0x7fffffff) || 1;
}
/** @param path - Exact local SVG path. @param id - Persistent identity. @param style - Admitted visual preset. @param width - Pen width. @param extent - Geometry extent for bounded hatching. @param fill - Whether to generate a fill. @returns Separate outline and fill paths. */
export function sketchPaths(path: string, id: string, style: FlowchartDrawingStyle, width: number, extent: number, fill = false): { outline: string; fill: string } {
  if (!path || style === "standard") return { outline: path, fill: "" };
  if (!generator) throw new Error("手绘引擎尚未初始化");
  // Generate in local coordinates with a fixed seed. Large shapes have bounded
  // hatch density, so a resize cannot produce work proportional to pixel area.
  const drawing = generator.path(path, { seed: drawingSeed(id), roughness: style === "pencil" ? 1.25 : 0.65,
    bowing: 0.7, strokeWidth: width, preserveVertices: true, fixedDecimalPlaceDigits: 2,
    ...(fill ? { fill: "#000000", fillStyle: style === "pencil" ? "hachure" : "solid", hachureGap: Math.max(6, extent / 80), fillWeight: 0.7 } : {}),
  });
  const paths = generator.toPaths(drawing);
  return { outline: paths.filter(p => p.stroke !== "none" && p.fill === "none" && p.strokeWidth === width).map(p => p.d).join(" "),
    fill: paths.filter(p => p.fill !== "none" || p.strokeWidth !== width).map(p => p.d).join(" ") };
}
