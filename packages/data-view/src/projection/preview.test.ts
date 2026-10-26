import { expect, it } from "vitest";
import { createDataView } from "../model/create";
import { applyDataViewOperations } from "../operations/apply";
import { copyDataView } from "../model/copy";
import { dataViewPreview } from "./preview";
import { dataViewPreviewSvg } from "./svg";

it("bounds projections and escapes active content in the static image", () => {
  const value = createDataView("preview");
  if (value.source.kind !== "inline") throw new Error("Expected inline");
  const data = applyDataViewOperations(value, Array.from({length: 100}, (_, i) => ({type: "insert-record" as const, record: {id: String(i), values: {title: '<script>alert("x")</script>', status: "todo"}}})), {baseRevision: value.source.dataset.revision, revision: "next"});
  const projection = dataViewPreview(data); expect(projection.rows).toHaveLength(6); expect(projection.notice).toContain("100");
  const image = dataViewPreviewSvg(projection); expect(image.svg).not.toContain("<script>"); expect(image.svg).toContain("&lt;script&gt;"); expect(image.height).toBe(288);
  const copy = copyDataView(data, "independent"); expect(copy.id).not.toBe(data.id);
  if (copy.source.kind !== "inline" || data.source.kind !== "inline") throw new Error("Expected inline");
  expect(copy.source.dataset.id).not.toBe(data.source.dataset.id); expect(copy.source.dataset.records[0]?.id).not.toBe(data.source.dataset.records[0]?.id);
});
