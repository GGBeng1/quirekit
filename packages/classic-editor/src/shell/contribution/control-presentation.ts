import type { ClassicEditorControlContribution } from "@classic/types";

/**
 * Resolves control semantics independently of the current active value.
 *
 * @param control - Contribution carrying its typed action or legacy behavior.
 * @returns Action, formatting toggle, or explicit panel disclosure semantics.
 */
export function resolveClassicEditorControlInteraction(
  control: ClassicEditorControlContribution
): "action" | "toggle" | "disclosure" {
  if (control.interaction !== undefined) return control.interaction;
  const action = "action" in control ? control.action : control.behavior;
  return action.isActive === undefined ? "action" : "toggle";
}

/**
 * Reports whether one action control presents its configured icon.
 *
 * @param control - Ribbon or compact-toolbar control contribution.
 * @returns Whether an icon is present and allowed by the requested presentation.
 */
export function showsClassicEditorControlIcon(
  control: ClassicEditorControlContribution
): boolean {
  return control.icon !== undefined && control.presentation !== "label";
}

/**
 * Reports whether one action control presents visible label text.
 *
 * @param control - Ribbon or compact-toolbar control contribution.
 * @returns Whether visible label text is required by the contribution.
 */
export function showsClassicEditorControlLabel(
  control: ClassicEditorControlContribution
): boolean {
  return control.presentation === "icon-label"
    || control.presentation === "label"
    || control.icon === undefined;
}
