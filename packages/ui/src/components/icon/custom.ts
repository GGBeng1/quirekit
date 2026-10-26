import { formattingIconSvg } from "./custom/formatting";
import { tableIconSvg } from "./custom/table";
import { indicatorIconSvg } from "./custom/indicators";
import { insertIconSvg } from "./custom/insert";

/** Editor semantics without an exact standard glyph, plus compact stepper indicators. */
export const quireKitEditorCustomIconSvg = Object.freeze({
  ...formattingIconSvg,
  ...tableIconSvg,
  ...indicatorIconSvg,
  ...insertIconSvg
});
