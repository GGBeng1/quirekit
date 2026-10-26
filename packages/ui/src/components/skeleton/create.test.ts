import { expect, it } from "vitest";
import { createTheme } from "../../theme";
import { createSkeletonTokens, createSkeletonCssVariables } from "./index";

it("projects a customized theme into the full decorative pulse", () => {
  const base = createTheme();
  const theme = { ...base, opacity: { ...base.opacity, muted: 0.73, opaque: 0.96 }, motion: { ...base.motion, overlayDuration: "300ms", standardEasing: "linear" } };
  const css = createSkeletonCssVariables(createSkeletonTokens(theme));
  expect(css["--qk-skeleton-duration"]).toBe("calc(300ms * 8)");
  expect(css["--qk-skeleton-easing"]).toBe("linear");
  expect(css["--qk-skeleton-minimum-opacity"]).toBe("0.73");
  expect(css["--qk-skeleton-maximum-opacity"]).toBe("0.96");
});
