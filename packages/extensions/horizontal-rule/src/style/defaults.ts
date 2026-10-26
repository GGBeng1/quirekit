import type { HorizontalRuleStyle } from "../types";

/** Default visible Word-compatible horizontal rule style. */
export const defaultHorizontalRuleStyle: HorizontalRuleStyle = Object.freeze({
  variant: "single",
  color: "#111827",
  thicknessPt: 1.5,
  widthPercent: 100,
  alignment: "center"
});
