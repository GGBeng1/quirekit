// @vitest-environment happy-dom
import { expect, it } from "vitest";
import { svgImageMarkup } from "./image";

it("wraps diagram SVG as a sized image so its stylesheet never enters the page", () => {
  const html = svgImageMarkup('<svg width="320" height="120" style="max-width: 320px"><g></g></svg>', document);
  const host = document.createElement("div");
  host.innerHTML = html;
  const image = host.querySelector("img")!;
  expect(host.querySelector("svg")).toBeNull();
  expect([image.width, image.height]).toEqual([320, 120]);
  expect(decodeURIComponent(image.src)).toMatch(/^data:image\/svg\+xml;charset=utf-8,<svg[^>]*xmlns="http:\/\/www.w3.org\/2000\/svg"/u);
  expect(svgImageMarkup("<p>no geometry</p>", document)).toBe("<p>no geometry</p>");
});
