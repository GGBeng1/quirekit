import { readdirSync, readFileSync } from "node:fs";
import { XMLParser } from "fast-xml-parser";
import { mathTemplates } from "@quirekit/math";
import { describe, expect, it } from "vitest";
import { latexToOmml } from "../latex";
import { ommlFingerprint } from "../compare";
import { ommlToLatex } from "../omml-to-latex";
import type { OmmlElement, OmmlNode } from "../types";

const samples = new URL("../../../math/test-support/word/automation/", import.meta.url);
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", preserveOrder: true, trimValues: false, parseTagValue: false });

/**
 * Lists the formulas of one Word sample file in document order.
 * @param file - Sample file name.
 * @returns Formula elements.
 */
function formulas(file: string): OmmlElement[] {
  const found: OmmlElement[] = [];
  const walk = (nodes: readonly OmmlNode[]): void => {
    for (const node of nodes) {
      const tag = Object.keys(node).find(key => key !== ":@");
      if (tag === undefined || tag === "#text") continue;
      if (tag === "m:oMathPara" || tag === "m:oMath") found.push(node as OmmlElement);
      else walk((node as Record<string, readonly OmmlNode[]>)[tag]!);
    }
  };
  walk(parser.parse(readFileSync(new URL(file, samples), "utf8")) as OmmlNode[]);
  return found;
}

/** Word's own structures that the strict grammar keeps read-only, with the reason shown to users. */
const readOnly: Readonly<Record<string, readonly string[]>> = {
  "w1-accent.xml": ["不支持该分组符号"],
  "w1-box.xml": ["不支持公式组合框", "不支持公式组合框", "不支持的公式字符“^”", "不支持方框的“hideTop”设置", "不支持可见的占位", "不支持占位的“transp”设置"],
  "w1-delimiter.xml": ["不支持固定大小的括号"],
  "w1-fraction.xml": ["不支持斜分数与线性分数", "不支持斜分数与线性分数"],
  "w1-function.xml": ["不支持该函数名写法"],
  "w1-matrix.xml": ["不支持矩阵的“plcHide”设置"],
  "w1-nary.xml": ["不支持随内容伸缩的大型运算符"],
  "w1-scripts.xml": ["不支持上下标的“alnScr”设置", "不支持左侧上下标"]
};

describe("strict OMML to LaTeX", () => {
  it("converts every formula Word built from LaTeX input", () => {
    const results = formulas("w2-latex-input.xml").map(ommlToLatex);
    expect(results).toHaveLength(50);
    expect(results.filter(result => !result.ok)).toEqual([]);
  });

  it.each(readdirSync(samples).filter(name => /^w1-.*\.xml$/u.test(name) && !name.includes("mathPr")))("classifies the Word structures of %s", (file) => {
    const failures = formulas(file).map(ommlToLatex).filter(result => !result.ok).map(result => (result as { reason: string }).reason);
    expect(failures).toEqual(readOnly[file] ?? []);
  });

  it("converts back every formula QuireKit writes", () => {
    for (const template of mathTemplates) {
      for (const display of [false, true]) {
        const encoded = latexToOmml(template.preview ?? template.pattern.replace("◊", ""), { display });
        if (!encoded.ok || encoded.losses.length > 0) continue;
        expect(ommlToLatex(encoded.element), `${template.id} ${display}`).toMatchObject({ ok: true });
      }
    }
  });

  it("accepts Word's implicit defaults and rejects a changed rebuild", () => {
    // Word's own ∑ omits the limit location that QuireKit writes explicitly.
    const sum = { "m:oMath": [{ "m:nary": [{ "m:naryPr": [{ "m:chr": [], ":@": { "@_m:val": "∑" } }] }, { "m:sub": [] }, { "m:sup": [] }, { "m:e": [{ "m:r": [{ "m:t": [{ "#text": "a" }] }] }] }] }] };
    expect(ommlToLatex(sum)).toEqual({ ok: true, latex: "\\sum_{}^{}{a}" });
    expect(ommlToLatex({ "m:oMath": [{ "m:sPre": [] }] })).toEqual({ ok: false, reason: "不支持左侧上下标" });
    expect(ommlToLatex({ "m:oMath": [{ "m:r": [{ "w:rPr": [{ "w:color": [], ":@": { "@_w:val": "FF0000" } }] }, { "m:t": [{ "#text": "x" }] }] }] }))
      .toEqual({ ok: false, reason: "公式文字带有 Word 字符格式（如颜色、字号或加粗）" });
  });

  it("treats WPS's minus sign and upright normal text as Word's equivalent forms", () => {
    const run = (text: string, properties: object[] = []) => ({ "m:r": [...(properties.length === 0 ? [] : [{ "m:rPr": properties }]), { "m:t": [{ "#text": text }] }] });
    const nor = { "m:nor": [] }, upright = { "m:sty": [], ":@": { "@_m:val": "p" } };
    const word = { "m:oMath": [run("-x"), run("if", [nor])] };
    const wps = { "m:oMath": [run("\u2212x"), run("if", [nor, upright])] };
    expect(ommlFingerprint(wps)).toBe(ommlFingerprint(word));
    expect(ommlToLatex(wps)).toEqual({ ok: true, latex: "-x\\text{if}" });
    // Inside normal text the two characters stay distinct.
    expect(ommlFingerprint({ "m:oMath": [run("\u2212", [nor])] })).not.toBe(ommlFingerprint({ "m:oMath": [run("-", [nor])] }));
  });

  it("keeps a formula with tracked changes inside read-only", () => {
    const xml = readFileSync(new URL("w3-revisions.xml", samples), "utf8");
    const partial = parser.parse(xml.match(/<case kind="partial-edit">.*?(<m:oMath>.*?<\/m:oMath>)/su)![1]!)[0] as OmmlElement;
    expect(ommlToLatex(partial)).toEqual({ ok: false, reason: "公式内含有修订" });
  });
});
