import type { FlowchartPageBounds, FlowchartPagePlan } from "@quirekit/flowchart";
import type { PdfPagePlacement } from "./types";

/** @param bounds - Whole graph world bounds. @param plan - Existing physical plan. @param index - Row-major crop. @returns One reusable form's position under PDF's upward Y axis. */
export function pdfPagePlacement(bounds: FlowchartPageBounds, plan: FlowchartPagePlan, index: number): PdfPagePlacement {
  const crop = plan.pages[index]; if (!crop) throw new RangeError("PDF 页码无效");
  const mm = 72 / 25.4, ratio = plan.scale * 0.75;
  return { x: plan.settings.margins.left * mm + (bounds.x - crop.x) * ratio,
    y: (plan.paperHeight - plan.settings.margins.top) * mm - (bounds.y + bounds.height - crop.y) * ratio,
    width: bounds.width * ratio, height: bounds.height * ratio };
}
