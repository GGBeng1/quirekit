import { defaultTheme } from "@quirekit/ui";
import { canvasViewExtension, svgViewExtension } from "@quirekit/view";
import { ClassicEditorKit } from "../extensions";
import type {
  ClassicEditorFeatureOptions,
  ClassicEditorPreset,
  ClassicEditorPresetContext,
  ClassicEditorShellOptions
} from "../types";
import { classicEditorBuiltinPlugin } from "./builtin/plugin";
import { updateClassicEditorPresetPresentation } from "../runtime/updates/presentation";

/** Product-neutral feature defaults for the Classic Editor shell. */
export const defaultClassicEditorFeatures: Readonly<ClassicEditorFeatureOptions> =
  Object.freeze({});

/** Default shell visibility for the product preset. */
export const defaultClassicEditorShell: Readonly<ClassicEditorShellOptions> =
  Object.freeze({
    menuBar: true,
    ribbon: true,
    toolbar: true,
    ruler: false,
    leftSidebar: true,
    rightSidebar: false,
    statusBar: true,
    activeRibbonTab: "home",
    commandBar: Object.freeze({})
  });

/** Product-neutral preset for a paginated Classic editor shell. */
export const classicEditorPreset: ClassicEditorPreset = Object.freeze({
  id: "classic",
  features: defaultClassicEditorFeatures,
  plugins: [classicEditorBuiltinPlugin],
  theme: defaultTheme,
  shell: defaultClassicEditorShell,
  updatePresentation: updateClassicEditorPresetPresentation,

  /**
   * Resolves the generic Core and mounted View extension assembly.
   *
   * @param context - Product feature and viewport context.
   * @returns Ordered ordinary QuireKit extensions.
   */
  resolveExtensions(context: ClassicEditorPresetContext) {
    return [
      ClassicEditorKit,
      canvasViewExtension({
        runtime: {
          ...context.canvasRuntime,
          pageStack: true,
          surfaceConfig: {
            ...context.canvasRuntime.surfaceConfig,
            selection: {
              fillStyle: context.theme.color.selection.document,
              ...context.canvasRuntime.surfaceConfig?.selection
            },
            objectSelection: {
              outlineStrokeStyle: context.theme.color.action.primary,
              handleFillStyle: context.theme.color.surface.page,
              handleStrokeStyle: context.theme.color.action.primary,
              ...context.canvasRuntime.surfaceConfig?.objectSelection
            }
          },
          scrollSource: "viewport",
          scrollViewport: context.workspaceViewport,
          viewportPadding: context.canvasRuntime.viewportPadding ?? {
            left: 0,
            top: 16,
            right: 0,
            bottom: 16
          }
        }
      }),
      svgViewExtension({
        runtime: {
          ...context.svgRuntime,
          textMeasurementBackend:
            context.svgRuntime.textMeasurementBackend ?? "browser",
          surfaceConfig: {
            ...context.svgRuntime.surfaceConfig,
            selection: {
              fillStyle: context.theme.color.selection.document,
              ...context.svgRuntime.surfaceConfig?.selection
            },
            objectSelection: {
              outlineStrokeStyle: context.theme.color.action.primary,
              handleFillStyle: context.theme.color.surface.page,
              handleStrokeStyle: context.theme.color.action.primary,
              ...context.svgRuntime.surfaceConfig?.objectSelection
            }
          },
          viewportPadding: context.svgRuntime.viewportPadding ?? {
            left: 0,
            top: 16,
            right: 0,
            bottom: 16
          }
        }
      })
    ];
  }
});
