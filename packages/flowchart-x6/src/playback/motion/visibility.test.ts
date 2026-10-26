// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { restoreMotionOpacity } from "./visibility";

describe("static source visibility", () => {
  it("restores absent and preexisting opacity exactly on a detached export", () => {
    const original = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    original.innerHTML = '<g opacity="0" data-flow-authored-opacity="absent"></g><g opacity="0.2" data-flow-authored-opacity="0.7"></g>';
    const copy = original.cloneNode(true) as SVGElement; restoreMotionOpacity(copy);
    expect(copy.children[0]!.hasAttribute("opacity")).toBe(false); expect(copy.children[1]!.getAttribute("opacity")).toBe("0.7");
    expect(copy.querySelectorAll("[data-flow-authored-opacity]")).toHaveLength(0);
    expect(original.children[0]!.getAttribute("opacity")).toBe("0"); expect(original.children[1]!.getAttribute("opacity")).toBe("0.2");
  });
});
