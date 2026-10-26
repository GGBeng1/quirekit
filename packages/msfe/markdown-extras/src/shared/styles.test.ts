// @vitest-environment happy-dom
import { afterEach, expect, it } from "vitest";
import { hoistPreviewStyles, PREVIEW_STYLE_ATTRIBUTE } from "./styles";

afterEach(() => { document.head.querySelectorAll("[data-msfe-preview-style]").forEach(style => style.remove()); document.body.replaceChildren(); });

/** @returns Output holding a diagram SVG with its own stylesheet, built through DOM APIs. */
function output(): HTMLElement {
  const host = document.createElement("span"), svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
  svg.id = "m1"; style.textContent = "#m1 .node{fill:red}";
  svg.append(style); host.append(svg);
  return host;
}

it("shares one head stylesheet per CSS text and removes it with the last user", () => {
  const first = output(), second = output();
  document.body.append(first, second);
  const releaseFirst = hoistPreviewStyles(first), releaseSecond = hoistPreviewStyles(second);
  expect(first.querySelector("style")).toBeNull();
  expect(first.querySelector("svg")?.getAttribute(PREVIEW_STYLE_ATTRIBUTE)).toBe("#m1 .node{fill:red}");
  expect(document.head.querySelectorAll("[data-msfe-preview-style]")).toHaveLength(1);
  // Moving output in and out of the document no longer adds or removes stylesheets.
  first.remove(); document.body.append(first);
  expect(document.head.querySelectorAll("[data-msfe-preview-style]")).toHaveLength(1);
  releaseFirst();
  expect(document.head.querySelectorAll("[data-msfe-preview-style]")).toHaveLength(1);
  releaseSecond(); releaseSecond();
  expect(document.head.querySelectorAll("[data-msfe-preview-style]")).toHaveLength(0);
});
