import type { QuireKitMenuEntry, QuireKitToolbarEntry } from "@quirekit/ui";
import { resolveClassicEditorIconData } from "../../../icons";
import { resolveClassicEditorText } from "../../../localization";
import type { ClassicEditorRenderContext } from "../../../types";
import { resolveClassicEditorControlInteraction, showsClassicEditorControlIcon, showsClassicEditorControlLabel } from "../control-presentation";
import { resolveClassicEditorContributionActionState } from "../utils";
import type { ClassicToolbarControl, ClassicToolbarEntryMeta } from "./types";

/**
 * Reads one control against the current canonical selection without mutating it.
 * @param control - Typed action or compatibility behavior contribution.
 * @param context - Latest mounted context, absent before editor mount.
 * @returns Current availability, active state and optional localized explanation.
 */
function readState(control: ClassicToolbarControl, context: ClassicEditorRenderContext | undefined) {
  if (!context) return { enabled: false, active: false, reason: undefined };
  if (control.kind === "ribbon-action-control") {
    const state = resolveClassicEditorContributionActionState(control, context, undefined, "ribbon");
    return { enabled: state.canExecute, active: state.active,
      reason: state.reason ? resolveClassicEditorText(state.reason.message, context.locale) : undefined };
  }
  return {
    enabled: context.instance.canExecuteContribution(control.behavior),
    active: Boolean(control.behavior.isActive?.({ ...context, payload: undefined, trigger: { source: "ribbon" } })),
    reason: undefined
  };
}

/**
 * Projects one behavior or direct action into a native public Toolbar entry.
 * @param control - Individual Classic contribution.
 * @param context - Current mounted context.
 * @param locale - Current pre-mount or mounted locale.
 * @returns Public action, toggle or external-disclosure configuration.
 */
export function projectClassicToolbarControl(
  control: ClassicToolbarControl,
  context: ClassicEditorRenderContext | undefined,
  locale: "zh-CN" | "en"
): QuireKitToolbarEntry {
  const state = readState(control, context);
  const interaction = resolveClassicEditorControlInteraction(control);
  const label = resolveClassicEditorText(control.label, locale);
  const icon = showsClassicEditorControlIcon(control) ? control.icon : undefined;
  const iconData = icon === undefined ? undefined : resolveClassicEditorIconData(icon);
  const meta: ClassicToolbarEntryMeta = { kind: "control", control };
  return {
    value: control.id, label, kind: interaction, meta,
    disabled: !state.enabled,
    tooltip: resolveClassicEditorText(control.title ?? control.label, locale),
    attributes: { "data-action": control.id },
    ...(state.reason === undefined ? {} : { disabledReason: state.reason }),
    ...(icon === undefined ? {} : { icon }),
    ...(iconData === undefined ? {} : { iconData }),
    ...(showsClassicEditorControlLabel(control) ? { text: label } : {}),
    ...(interaction === "toggle" ? { pressed: state.active } : {}),
    ...(interaction === "disclosure" ? { expanded: state.active, popup: false } : {})
  };
}

/**
 * Projects a command into a public action or checkbox menu row.
 * @param control - Action-only group's individual control.
 * @param context - Current mounted context.
 * @param locale - Visible locale.
 * @returns Menu item whose command completion owns closing the group.
 */
export function projectClassicToolbarMenuItem(
  control: ClassicToolbarControl,
  context: ClassicEditorRenderContext | undefined,
  locale: "zh-CN" | "en"
): QuireKitMenuEntry {
  const state = readState(control, context);
  return {
    value: control.id, label: resolveClassicEditorText(control.label, locale),
    disabled: !state.enabled, closeOnSelect: false,
    ...(control.icon === undefined ? {} : { icon: control.icon }),
    ...(state.reason === undefined ? {} : { reason: state.reason }),
    ...(resolveClassicEditorControlInteraction(control) === "toggle" ? { checked: state.active } : {})
  };
}
