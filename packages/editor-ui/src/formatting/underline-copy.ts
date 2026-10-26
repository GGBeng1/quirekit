import type { UnderlineStyle } from "@quirekit/extension-underline";

/** Shared names for the canonical underline styles in every product surface. */
export const editorUnderlineStyleLabels = {
  none: ["无", "None"],
  single: ["单线", "Single"], words: ["仅文字", "Words"], double: ["双线", "Double"], thick: ["粗线", "Thick"],
  dotted: ["点线", "Dotted"], dottedHeavy: ["粗点线", "Thick dotted"], dash: ["虚线", "Dashed"], dashedHeavy: ["粗虚线", "Thick dashed"],
  dashLong: ["长虚线", "Long dash"], dashLongHeavy: ["粗长虚线", "Thick long dash"], dotDash: ["点划线", "Dot dash"], dashDotHeavy: ["粗点划线", "Thick dot dash"],
  dotDotDash: ["双点划线", "Dot dot dash"], dashDotDotHeavy: ["粗双点划线", "Thick dot dot dash"], wave: ["波浪线", "Wave"], wavyHeavy: ["粗波浪线", "Thick wave"], wavyDouble: ["双波浪线", "Double wave"],
} as const satisfies Record<UnderlineStyle, readonly [string, string]>;

/** @param locale - Product locale. @param style - Native underline token. @returns Localized style name. */
export function editorUnderlineStyleLabel(locale: string, style: UnderlineStyle): string {
  return editorUnderlineStyleLabels[style][locale === "zh-CN" ? 0 : 1];
}
