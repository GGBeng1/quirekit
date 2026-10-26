import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "./browser";
const require = createRequire(import.meta.url), svgRequire = createRequire(require.resolve("simple-mind-map"));
const svgUrl = `/@fs${join(dirname(svgRequire.resolve("@svgdotjs/svg.js")), "svg.esm.js")}`;
const projectionUrl = `/@fs${fileURLToPath(new URL("../src/vendor/translation.ts", import.meta.url))}`;

test("owned numeric-pivot translation matches svg.js matrices without measuring a bounding box", async ({ page }) => {
  await page.goto("/");
  const results = await page.evaluate(async ({ svgUrl, projectionUrl }) => {
    const { SVG } = await import(svgUrl), { installSimpleTranslation } = await import(projectionUrl);
    const draw = SVG().addTo(document.body).size(300, 200), results = [];
    for (const matrix of ["matrix(1 0 0 1 0 0)", "matrix(1.3 .2 -.4 .9 17 -8)", "matrix(.5 -.3 .2 2 -40 13)"]) {
      const reference = draw.group(), actual = draw.group();
      for (const group of [reference, actual]) { group.rect(35, 27).move(-15, 9); group.rect(17, 31).move(20, -12); group.attr("transform", matrix); }
      let boxes = 0; const bbox = actual.bbox; actual.bbox = function () { boxes++; return bbox.call(this); };
      installSimpleTranslation(actual); const method = actual.translate; installSimpleTranslation(actual);
      for (const [x, y] of [[9, -8], [-5.25, 13.5], [0, 0]]) { reference.translate(x, y); actual.translate(x, y); }
      results.push({ expected: reference.matrixify().toArray(), actual: actual.matrixify().toArray(), boxes, sameMethod: method === actual.translate });
    }
    draw.remove(); return results;
  }, { svgUrl, projectionUrl });
  for (const result of results) {
    expect(result.boxes).toBe(0); expect(result.sameMethod).toBe(true);
    result.actual.forEach((number: number, index: number) => expect(number).toBeCloseTo(result.expected[index], 10));
  }
});
