import {
  resolveBuiltinClassicEditorMessage,
  type BuiltinClassicEditorMessageKey,
  type BuiltinClassicEditorMessageParameters
} from "../../../localization";
import type { ClassicEditorRenderContext } from "../../../types";
import type { ClassicEditorStatusMode, ClassicEditorStatusTarget } from "./types";

/**
 * Formats a controller-owned semantic target and optional mode/protection facts.
 *
 * @param context - Mounted product context.
 * @param target - Valid structured status fact.
 * @returns Localized status sentence.
 */
export function formatClassicEditorSemanticStatus(
  context: ClassicEditorRenderContext,
  target: ClassicEditorStatusTarget
): string {
  const segments = [formatTarget(context, target)];
  if (target.mode !== undefined) {
    segments.push(resolveClassicEditorStatusMessage(context, modeMessage(target.mode)));
  }
  if (target.locked === true) {
    segments.push(resolveClassicEditorStatusMessage(context, "statusLocked"));
  }
  if (target.reason !== undefined && target.reason.trim().length > 0) {
    segments.push(target.reason);
  }
  return segments.join(" · ");
}

/**
 * Formats only the target identity and quantity facts.
 *
 * @param context - Mounted product context.
 * @param target - Valid structured status fact.
 * @returns Localized target segment.
 */
function formatTarget(
  context: ClassicEditorRenderContext,
  target: ClassicEditorStatusTarget
): string {
  /**
   * Resolves product copy against the current status context.
   *
   * @param key - Product-owned message key.
   * @param parameters - Optional named template parameters.
   * @returns Localized status text.
   */
  function message(
    key: BuiltinClassicEditorMessageKey,
    parameters?: BuiltinClassicEditorMessageParameters
  ): string {
    return resolveClassicEditorStatusMessage(context, key, parameters);
  }
  if (target.kind === "caret") return target.label === undefined
    ? message("caret")
    : message("caretInTarget", { label: target.label });
  if (target.kind === "text") {
    return message("selectedCharacters", { count: target.count });
  }
  if (target.kind === "node") return message("nodeTarget", {
    label: target.label ?? message("objectTarget")
  });
  if (target.kind === "image") return message("imageTarget", {
    label: target.label ?? message("imageObjectTarget")
  });
  if (target.kind === "control") return message("controlTarget", {
    label: target.label ?? message("contentControlTarget")
  });
  if (target.kind === "story") return message("storyTarget", {
    label: target.label ?? message("documentStoryTarget")
  });
  if (target.selectedCells !== undefined) {
    return message("tableSelectedCells", { count: target.selectedCells });
  }
  if (
    target.rows !== undefined
    && target.columns !== undefined
    && target.row !== undefined
    && target.column !== undefined
  ) return message("tableCellTarget", {
    rows: target.rows,
    columns: target.columns,
    row: target.row,
    column: target.column
  });
  if (target.rows !== undefined && target.columns !== undefined) {
    return message("tableTargetDimensions", {
      rows: target.rows,
      columns: target.columns
    });
  }
  return target.label ?? message("tableTarget");
}

/** @param mode - Structured status mode. @returns Localized message key. */
function modeMessage(mode: ClassicEditorStatusMode): BuiltinClassicEditorMessageKey {
  if (mode === "read-only") return "statusModeReadOnly";
  if (mode === "template") return "statusModeTemplate";
  if (mode === "fill") return "statusModeFill";
  return "statusModeEdit";
}

/**
 * Resolves one built-in localized status message.
 *
 * @param context - Mounted locale authority.
 * @param key - Product-owned message key.
 * @param parameters - Optional template parameters.
 * @returns Localized text.
 */
export function resolveClassicEditorStatusMessage(
  context: ClassicEditorRenderContext,
  key: BuiltinClassicEditorMessageKey,
  parameters?: BuiltinClassicEditorMessageParameters
): string {
  return resolveBuiltinClassicEditorMessage(context.locale, key, parameters);
}
