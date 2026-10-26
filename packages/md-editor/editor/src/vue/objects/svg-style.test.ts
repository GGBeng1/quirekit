// @vitest-environment happy-dom
import { expect, it } from "vitest";
import { PREVIEW_STYLE_ATTRIBUTE } from "@quirekit/msfe-markdown-extras";
import { svgImageUrl } from "./svg";

it("puts a hoisted diagram stylesheet back into the standalone image", () => {
  const host = document.createElement("div");
  host.innerHTML = `<svg viewBox="0 0 10 10" ${PREVIEW_STYLE_ATTRIBUTE}="#m1 .node{fill:red}"><g class="node"></g></svg>`;
  const url = decodeURIComponent(svgImageUrl(host.querySelector("svg")!)!);
  expect(url).toContain("<style>#m1 .node{fill:red}</style>");
  expect(url).not.toContain(PREVIEW_STYLE_ATTRIBUTE);
});
