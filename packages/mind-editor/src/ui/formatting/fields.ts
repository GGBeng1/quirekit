import { mindEditorTranslator } from "../../locale/resolve";
import type { MindEditorTranslate } from "../../locale/types";
import type { MindStyleSelectField } from "./types";

/** @param values - Portable values and visible labels. @param t - Scoped translator. @returns Default choice followed by explicit options. */
function options(values: readonly (readonly [string | number | boolean, string])[], t: MindEditorTranslate) {
  return [{ value: "default", label: t("themeDefault") }, ...values.map(([value, label]) => ({ value: String(value), label }))];
}
/** @param t - Scoped translator. @returns Localized format selectors. */
export function mindStyleSelectors(t: MindEditorTranslate = mindEditorTranslator()): readonly MindStyleSelectField[] {
  return [
  { key: "fontSize", label: t("fontSize"), items: options([8, 10, 12, 14, 15, 16, 18, 20, 24, 28, 32, 36, 48, 60, 72].map(n => [n, `${n} px`]), t) },
  { key: "bold", label: t("fontWeight"), items: options([[false, t("regular")], [true, t("bold")]], t) },
  { key: "shape", label: t("shape"), items: options([["rectangle", t("rectangle")], ["rounded", t("rounded")], ["ellipse", t("ellipse")], ["diamond", t("diamond")]], t) },
  { key: "borderWidth", label: t("borderWidth"), items: options([0, 1, 2, 3, 4, 6, 8].map(n => [n, `${n} px`]), t) },
  { key: "lineWidth", label: t("lineWidth"), items: options([0.5, 1, 1.5, 2, 3, 4, 6, 8].map(n => [n, `${n} px`]), t) },
  { key: "linePattern", label: t("linePattern"), items: options([["solid", t("solid")], ["dashed", t("dashed")]], t) },
  { key: "lineStyle", label: t("branchPath"), items: options([["curve", t("curve")], ["elbow", t("elbow")], ["direct", t("direct")]], t) },
  ];
}
/** @param t - Scoped translator. @returns Localized color fields. */
export function mindStyleColors(t: MindEditorTranslate = mindEditorTranslator()) {
  return [
  { key: "color", label: t("textColor"), fallback: "#172131" },
  { key: "fill", label: t("fill"), fallback: "#ffffff" },
  { key: "borderColor", label: t("borderColor"), fallback: "#4855ec" },
  { key: "lineColor", label: t("lineColor"), fallback: "#4855ec" },
  ] as const;
}
