// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";
import { watchHeaderFooterFocusRetention } from "./focus-retention";

describe("header/footer focus retention", () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it("keeps the session while focus moves inside the toolbar and ends it elsewhere", () => {
    const fixture = createFixture();

    fixture.second.focus();
    expect(fixture.onLeave).not.toHaveBeenCalled();
    fixture.outside.focus();
    expect(fixture.onLeave).toHaveBeenCalledOnce();
    fixture.first.focus();
    expect(fixture.onLeave).toHaveBeenCalledOnce();
  });

  it("stops observing when focus returns to the editor input", () => {
    const fixture = createFixture();

    fixture.input.focus();
    fixture.outside.focus();
    expect(fixture.onLeave).not.toHaveBeenCalled();
  });

  it("judges a target-less blur after pointer handlers had a frame to refocus", async () => {
    const fixture = createFixture();

    fixture.first.blur();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(fixture.onLeave).toHaveBeenCalledOnce();
  });
});

/** @returns Focused toolbar control, sibling control, editor input, and outside target. */
function createFixture() {
  const toolbar = document.createElement("div");
  const first = document.createElement("button");
  const second = document.createElement("button");
  const input = document.createElement("textarea");
  const outside = document.createElement("button");
  const onLeave = vi.fn();
  toolbar.append(first, second);
  document.body.append(toolbar, input, outside);
  first.focus();
  watchHeaderFooterFocusRetention({
    ownerDocument: document,
    inputProxy: input,
    owns: (node) => toolbar.contains(node),
    onLeave
  });
  return { first, second, input, outside, onLeave };
}
