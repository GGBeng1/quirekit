import { readFileSync } from "node:fs";
import { XMLParser } from "fast-xml-parser";
import { parseMathLatex } from "@quirekit/math";
import { describe, expect, it } from "vitest";
import { canonicalOmml } from "../compare";
import { encodeMathOmml } from "./encode";
import type { OmmlElement } from "../types";

const fixture = readFileSync(new URL("../../../math/test-support/word/automation/w2-latex-input.xml", import.meta.url), "utf8");
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", preserveOrder: true, trimValues: false, parseTagValue: false });

/** Word's own conversion of each LaTeX input, keyed by its source. */
const cases = [...fixture.matchAll(/<case\b[^>]*latex="([^"]*)"[^>]*>([\s\S]*?)<\/case>/g)].map(([, latex, xml]) => {
  const paragraph = parser.parse(xml!) as OmmlElement[];
  const math = (paragraph[0]!["w:p"] as OmmlElement[]).find(node => "m:oMathPara" in node)!;
  return { latex: parser.parse(`<x a="${latex}"/>`)[0][":@"]["@_a"] as string, math };
});

// Word's LaTeX input turns plain parentheses into stretchy delimiters; the author's plain characters are kept.
const casesLatex = "f(x)=\\begin{cases} x & x\\ge 0 \\\\ -x & x<0 \\end{cases}";
const plainParentheses = new Set([casesLatex]);

/**
 * Finds Word's conversion of one LaTeX input.
 * @param latex - Source.
 * @returns Word's `m:oMathPara`.
 */
function sample(latex: string): OmmlElement {
  return cases.find(item => item.latex === latex)!.math;
}

describe("Word OMML encoding", () => {
  it("reads all Word LaTeX input samples", () => {
    expect(cases).toHaveLength(50);
    expect(cases.filter(item => plainParentheses.has(item.latex))).toHaveLength(1);
  });

  it("keeps plain parentheses as characters where Word's LaTeX input makes them stretchy", () => {
    const parsed = parseMathLatex("f(x)");
    if (!parsed.ok) throw new Error(parsed.diagnostic.message);
    expect(canonicalOmml(encodeMathOmml(parsed.document, false).element)).toBe(JSON.stringify({ "m:oMath": [{ "m:r": [{ "m:t": [{ "#text": "f(x)" }] }] }] }));
    const cases = parseMathLatex(casesLatex.slice("f(x)=".length));
    if (!cases.ok) throw new Error(cases.diagnostic.message);
    const word = sample(casesLatex);
    const wordCases = ((word["m:oMathPara"] as OmmlElement[])[0]!["m:oMath"] as OmmlElement[]).at(-1)!;
    const ours = encodeMathOmml(cases.document, false).element;
    expect(canonicalOmml(ours)).toBe(canonicalOmml({ "m:oMath": [wordCases] }));
  });

  it.each(cases.filter(item => !plainParentheses.has(item.latex)).map(item => [item.latex, item.math] as const))("writes %s the way Word's LaTeX input does", (latex, math) => {
    const parsed = parseMathLatex(latex);
    if (!parsed.ok) throw new Error(parsed.diagnostic.message);
    const encoded = encodeMathOmml(parsed.document, true);
    expect(canonicalOmml(encoded.element)).toBe(canonicalOmml(math));
  });
});
