import { choice, number, record } from "../model/validation";
import type { FlowchartPageSettings } from "./types";

/** @param input - Untrusted physical configuration. @returns Detached immutable settings with at least 10 mm of printable space per axis. */
export function readFlowchartPageSettings(input: unknown): FlowchartPageSettings {
  const value = record(input, ["paper", "orientation", "margins", "scale"], "page");
  const paper = choice(value.paper, ["A4", "A3"], "page.paper"), orientation = choice(value.orientation, ["portrait", "landscape"], "page.orientation");
  const raw = record(value.margins, ["top", "right", "bottom", "left"], "page.margins");
  const margins = Object.freeze({ top: number(raw.top, 0, 80, "page.top"), right: number(raw.right, 0, 80, "page.right"),
    bottom: number(raw.bottom, 0, 80, "page.bottom"), left: number(raw.left, 0, 80, "page.left") });
  const [width, height] = flowchartPaperSize({ paper, orientation });
  if (width - margins.left - margins.right < 10 || height - margins.top - margins.bottom < 10) throw new RangeError("page: margins leave too little space");
  const scale = value.scale === "fit" ? "fit" : number(value.scale, 0.1, 4, "page.scale");
  return Object.freeze({ paper, orientation, margins, scale });
}
/** @param settings - Admitted size and orientation. @returns Width and height in millimetres. */
export function flowchartPaperSize(settings: Pick<FlowchartPageSettings, "paper" | "orientation">): readonly [number, number] {
  const size: [number, number] = settings.paper === "A3" ? [297, 420] : [210, 297];
  return settings.orientation === "landscape" ? [size[1], size[0]] : size;
}
/** Default used by page UI without adding implicit fields to older sources. */
export const defaultFlowchartPageSettings = readFlowchartPageSettings({ paper: "A4", orientation: "portrait", margins: { top: 10, right: 10, bottom: 10, left: 10 }, scale: "fit" });
