import type { QuireDisplayListStyles, QuireSurfaceConfig } from "./types";
import { QUIREKIT_DEFAULT_CANVAS_FONT } from "@quirekit/layout/text";

const defaultDisplayListStyles: QuireDisplayListStyles = {
  caretFillStyle: "#111827",
  imePreeditBackgroundFillStyle: "rgba(191, 219, 254, 0.55)",
  imePreeditBackground: true,
  imePreeditUnderline: true,
  decorationFillStyle: "rgba(14, 165, 233, 0.16)",
  decorationLineWidth: 1,
  decorationStrokeStyle: "rgba(14, 116, 144, 0.45)",
  documentFillStyle: "#ffffff",
  font: QUIREKIT_DEFAULT_CANVAS_FONT,
  pageBodyStrokeStyle: "rgba(15, 23, 42, 0.18)",
  pageBodyStrokeWidth: 0,
  pageBodyCornerStrokeStyle: "rgba(100, 116, 139, 0.36)",
  pageBodyCornerStrokeWidth: 1.1,
  pageBodyCornerLength: 22,
  inactiveAuxiliaryStoryOpacity: 0.55,
  checkedTaskContentOpacity: 0.45,
  pageFillStyle: "#ffffff",
  selectionFillStyle: "rgba(96, 165, 250, 0.32)",
  textBaselineOffset: 18,
  textFillStyle: "#111827"
};

/**
 * Resolves caller style overrides against display-list defaults.
 *
 * @param styles - Optional caller-provided style overrides.
 * @param surfaceConfig - Optional semantic surface styling overrides.
 * @returns Complete style set used for display command generation.
 */
export function resolveDisplayListStyles(
  styles: Partial<QuireDisplayListStyles> | undefined,
  surfaceConfig?: QuireSurfaceConfig | undefined
): QuireDisplayListStyles {
  const resolvedStyles = {
    ...defaultDisplayListStyles,
    ...styles
  };
  const ime = surfaceConfig?.ime;
  const preeditBackgroundFillStyle = ime?.preeditBackgroundFillStyle;

  return {
    ...resolvedStyles,
    selectionFillStyle:
      surfaceConfig?.selection?.fillStyle ?? resolvedStyles.selectionFillStyle,
    imePreeditBackgroundFillStyle:
      preeditBackgroundFillStyle ?? resolvedStyles.imePreeditBackgroundFillStyle,
    imePreeditBackground:
      ime?.preeditBackground ??
      (preeditBackgroundFillStyle === undefined
        ? resolvedStyles.imePreeditBackground
        : true),
    imePreeditUnderline:
      ime?.preeditUnderline ?? resolvedStyles.imePreeditUnderline
  };
}
