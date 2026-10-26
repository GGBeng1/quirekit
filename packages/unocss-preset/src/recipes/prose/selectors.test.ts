import { expect, it } from "vitest";
import { proseElements } from "./selectors";
import { proseContainerCss } from "./container";

it("shares semantic rules without rewriting attribute names or pseudo states", () => {
  expect(proseElements("h1 > a:hover, abbr[data-qk-abbr]"))
    .toBe(':is(h1, [data-qk-prose="h1"]) > :is(a, [data-qk-prose="a"]):hover, :is(abbr, [data-qk-prose="abbr"])[data-qk-abbr]');
  expect(proseElements("ol ol" )).toContain('[data-qk-prose="ol"]');
  expect(proseContainerCss).toContain("border:var(--qk-border-width-default) solid var(--qk-prose-container-border)");
  expect(proseContainerCss).not.toContain("border-inline-start");
});
