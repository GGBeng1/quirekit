import { readdirSync, readFileSync } from "node:fs";
import { XMLParser } from "fast-xml-parser";
import { createMathJaxRenderer } from "@quirekit/math-mathjax";
import { describe, expect, it } from "vitest";
import { ommlToMathML } from "./convert";
import type { OmmlElement, OmmlNode } from "../types";

const samples = new URL("../../../math/test-support/word/automation/", import.meta.url);
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", preserveOrder: true, trimValues: false, parseTagValue: false });

/**
 * Lists the formulas of all Word sample files.
 * @returns Formula elements with their file.
 */
function wordFormulas(): { file: string; formula: OmmlElement }[] {
  const found: { file: string; formula: OmmlElement }[] = [];
  for (const file of readdirSync(samples).filter(name => /^w[12]-.*\.xml$/u.test(name) && !name.includes("mathPr"))) {
    const walk = (nodes: readonly OmmlNode[]): void => {
      for (const node of nodes) {
        const tag = Object.keys(node).find(key => key !== ":@");
        if (tag === undefined || tag === "#text") continue;
        if (tag === "m:oMathPara" || tag === "m:oMath") found.push({ file, formula: node as OmmlElement });
        else walk((node as Record<string, readonly OmmlNode[]>)[tag]!);
      }
    };
    walk(parser.parse(readFileSync(new URL(file, samples), "utf8")) as OmmlNode[]);
  }
  return found;
}

describe("OMML display conversion", () => {
  it("draws every Word sample formula, including those that cannot be edited", async () => {
    const renderer = createMathJaxRenderer({ maxEntries: 256 });
    const formulas = wordFormulas();
    expect(formulas).toHaveLength(102);
    for (const { file, formula } of formulas) {
      const converted = ommlToMathML(formula);
      expect(converted.approximations, file).toEqual([]);
      const layout = await renderer.renderMarkup(converted.mathml, "公式");
      expect(layout.width, `${file}: ${converted.mathml}`).toBeGreaterThan(0);
    }
    renderer.dispose();
  }, 120000);

  it("shows a formula with tracked changes inside as its final text", () => {
    const xml = readFileSync(new URL("w3-revisions.xml", samples), "utf8");
    const partial = parser.parse(xml.match(/<case kind="partial-edit">.*?(<m:oMath>.*?<\/m:oMath>)/su)![1]!)[0] as OmmlElement;
    expect(ommlToMathML(partial).mathml).toBe('<math xmlns="http://www.w3.org/1998/Math/MathML" display="inline"><mrow><mi>a</mi><mi>z</mi><mi>b</mi></mrow></math>');
  });

  it("draws unknown structures as a placeholder and reports them", () => {
    const converted = ommlToMathML({ "m:oMath": [{ "m:unknown": [] }, { "m:r": [{ "m:t": [{ "#text": "x<1" }] }] }] });
    expect(converted.approximations).toEqual(["m:unknown"]);
    expect(converted.mathml).toBe('<math xmlns="http://www.w3.org/1998/Math/MathML" display="inline"><mrow><mtext>□</mtext><mi>x</mi><mo>&lt;</mo><mn>1</mn></mrow></math>');
  });
});
