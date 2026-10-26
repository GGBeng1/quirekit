import { mathTemplates, parseMathLatex } from "@quirekit/math";
import { describe, expect, it } from "vitest";
import { canonicalOmml } from "../compare";
import { encodeMathOmml } from "./encode";

/**
 * Encodes one source.
 * @param latex - Formula source.
 * @returns Encoding.
 */
function encode(latex: string): ReturnType<typeof encodeMathOmml> {
  const parsed = parseMathLatex(latex);
  if (!parsed.ok) throw new Error(`${latex}: ${parsed.diagnostic.message}`);
  return encodeMathOmml(parsed.document, false);
}

describe("Word OMML encoding coverage", () => {
  it("encodes every formula editor template", () => {
    for (const template of mathTemplates) {
      const encoded = encode(template.preview ?? template.pattern.replace("◊", ""));
      expect(canonicalOmml(encoded.element), template.id).toContain("m:oMath");
    }
  });

  it("reports constructs Word cannot represent", () => {
    expect(encode("a\\!b").losses).toEqual(["negative-space"]);
    expect(encode("\\big( x").losses).toEqual(["delimiter-size"]);
    expect(encode("\\displaystyle x").losses).toEqual(["style-switch"]);
    expect(encode("x \\tag{1}").losses).toEqual(["equation-marker"]);
    expect(encode("\\begin{array}{c|c} a & b \\end{array}").losses).toEqual(["array-rules"]);
    expect(encode("\\frac{a}{b}+\\sqrt{x}").losses).toEqual([]);
  });

  it("writes array column alignment as column groups", () => {
    const canonical = canonicalOmml(encode("\\begin{array}{llc} a & b & c \\end{array}").element);
    expect(canonical).toContain(JSON.stringify({ "m:mcPr": [{ "m:count": [], ":@": { "@_m:val": "2" } }, { "m:mcJc": [], ":@": { "@_m:val": "left" } }] }));
  });

  it("pads short matrix rows to the widest row", () => {
    const canonical = canonicalOmml(encode("\\begin{matrix} a & b \\\\ c \\end{matrix}").element);
    expect(canonical.match(/"m:e"/g)).toHaveLength(4);
  });
});

describe("OMML fingerprint", () => {
  it("is equal for Word's routine re-formatting and differs for a changed formula", async () => {
    const { ommlFingerprint } = await import("../compare");
    const plain = encode("a+b").element;
    const split = { "m:oMath": [{ "m:r": [{ "m:t": [{ "#text": "a" }] }] }, { "m:r": [{ "w:rPr": [{ "w:i": [] }] }, { "m:t": [{ "#text": "+b" }] }] }] };
    expect(ommlFingerprint(split)).toBe(ommlFingerprint(plain));
    expect(ommlFingerprint(encode("a-b").element)).not.toBe(ommlFingerprint(plain));
    expect(ommlFingerprint(plain)).toMatch(/^[0-9a-f]{16}$/u);
    // Word wraps a formula alone in its paragraph in a display container on save.
    expect(ommlFingerprint({ "m:oMathPara": [{ "m:oMathParaPr": [{ "m:jc": [], ":@": { "@_m:val": "left" } }] }, plain] })).toBe(ommlFingerprint(plain));
  });
});
