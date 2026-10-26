import type { CreateDrawingCommandCardOptions } from "../types";
import {
  createDrawingFillColorPatch, createDrawingStrokeColorPatch,
  createDrawingStrokeWidthPatch, createDrawingStrokeDashPatch
} from "../../appearance/patches";
import type { QuireDrawingToolbarState } from "./types";
import { createDrawingLayoutPresetPatch, resolveDrawingLayoutPreset } from "../../layout-menu";

/**
 * Projects exact-anchor facts and canonical patch commands into the public UI contract.
 * @param options - Current accepted selection and command authority.
 * @returns Complete toolbar state; every callback uses the current anchor.
 */
export function createDrawingToolbarState(
  options: CreateDrawingCommandCardOptions
): QuireDrawingToolbarState {
  const { fill, stroke } = options.attrs.drawing.appearance;
  return {
    fill: fill.kind === "solid" ? fill.color : null,
    stroke: stroke.kind === "solid" ? stroke.color : null,
    strokeWidth: stroke.width, strokeDash: stroke.dash,
    disabled: options.disabled, locale: options.locale,
    layout: resolveDrawingLayoutPreset(options.attrs),
    anchorMovement: options.attrs.anchorMovement,
    hasTextStory: options.hasTextStory,
    onLayoutChange: layout => !options.disabled && options.onAttrsChange(createDrawingLayoutPresetPatch(layout)),
    onAnchorMovementChange: anchorMovement => !options.disabled && options.attrs.layoutMode !== "inline"
      && options.onAttrsChange({ anchorMovement }),
    onEnterText: () => !options.disabled && options.hasTextStory && options.onEnterText(),
    onDelete: () => !options.disabled && options.onDelete(),
    onFillChange: color => !options.disabled && options.onAttrsChange(createDrawingFillColorPatch(options.attrs, color)),
    onStrokeChange: color => !options.disabled && options.onAttrsChange(createDrawingStrokeColorPatch(options.attrs, color)),
    onStrokeWidthChange: width => !options.disabled && options.onAttrsChange(createDrawingStrokeWidthPatch(options.attrs, width)),
    onStrokeDashChange: dash => !options.disabled && options.onAttrsChange(createDrawingStrokeDashPatch(options.attrs, dash))
  };
}
