import { describe, expect, it } from "vitest";
import { XMLParser } from "fast-xml-parser";
import { canonicalOmml } from "./compare";
import { latexToOmml } from "./latex";
import type { OmmlElement } from "./types";

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", preserveOrder: true, trimValues: false, parseTagValue: false });

describe("latexToOmml", () => {
  it("writes standalone XML that parses back to the same formula", () => {
    const result = latexToOmml("\\frac{a<b}{\\text{x \\& y}}", { display: true });
    if (!result.ok) throw new Error(result.diagnostic.message);
    expect(result.xml.startsWith('<m:oMathPara xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"')).toBe(true);
    const parsed = (parser.parse(result.xml) as OmmlElement[])[0]!;
    expect(canonicalOmml(parsed)).toBe(canonicalOmml(result.element));
  });

  it("reports the parse position of unsupported source instead of writing partial output", () => {
    const result = latexToOmml("\\frac{a}");
    expect(result.ok).toBe(false);
  });
});
