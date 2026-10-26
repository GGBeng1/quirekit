import { expect, it } from "vitest";
import type { MdDocxDiagnostic } from "../../docx/types";
import { wordReport } from "./report";

/** @param code - Export classification. @returns Representative codec diagnostic. */
function diagnostic(code: string): MdDocxDiagnostic {
  return { code, path: "document", direction: "export", severity: "warning", disposition: "projected", message: "Word source metadata" };
}
it("describes Word exports without promising unavailable source recovery", () => {
  expect(wordReport([diagnostic("round-trip-optional-metadata-omitted")], "zh-CN")[0]).toContain("可编辑源未保留");
});

it("lets an installed exporter describe its own diagnostics before the generic text", () => {
  const exporter = { describeDiagnostic: (code: string, locale: "zh-CN" | "en") => code === "pdf:font" ? (locale === "zh-CN" ? "字体已替换" : "Font replaced") : undefined };
  expect(wordReport([diagnostic("pdf:font"), diagnostic("pdf:font")], "zh-CN", exporter)).toEqual(["字体已替换 (2)"]);
  expect(wordReport([diagnostic("image-unavailable")], "zh-CN", exporter)[0]).toContain("图片无法转换");
});
