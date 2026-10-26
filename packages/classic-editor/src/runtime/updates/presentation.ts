import type { canvasViewExtension, svgViewExtension } from "@quirekit/view";
import type { ClassicEditorPresetPresentationContext } from "../../types";

/**
 * Refreshes the built-in preset's existing Canvas/SVG paint configuration.
 * @param context - Retained session, theme, language and explicit host overrides.
 */
export function updateClassicEditorPresetPresentation(context: ClassicEditorPresetPresentationContext): void {
  for (const extension of context.editor.extensions) {
    if (extension.name !== "canvas-view" && extension.name !== "svg-view") continue;
    const options = extension.options as NonNullable<Parameters<typeof canvasViewExtension>[0] | Parameters<typeof svgViewExtension>[0]>;
    const surface = options.runtime?.surfaceConfig;
    if (!surface) continue;
    const overrides = extension.name === "canvas-view"
      ? context.canvasRuntime.surfaceConfig : context.svgRuntime.surfaceConfig;
    // Each preset owns this configuration object; mounted runtimes retain its
    // identity. Change paint facts in place, leaving document geometry untouched.
    Object.assign(surface, {
      selection: { ...surface.selection, fillStyle: context.theme.color.selection.document, ...overrides?.selection },
      objectSelection: {
        ...surface.objectSelection,
        outlineStrokeStyle: context.theme.color.action.primary,
        handleFillStyle: context.theme.color.surface.page,
        handleStrokeStyle: context.theme.color.action.primary,
        ...overrides?.objectSelection,
      },
      invisibleCharacters: {
        ...surface.invisibleCharacters,
        color: context.theme.color.text.muted,
        opacity: context.theme.opacity.muted,
        pageBreakLabel: context.locale.startsWith("zh") ? "分页符" : "Page break",
        columnBreakLabel: context.locale.startsWith("zh") ? "分栏符" : "Column break",
      },
    });
  }
}
