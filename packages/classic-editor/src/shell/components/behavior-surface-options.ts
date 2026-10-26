import type {
  ClassicEditorActionContextMenuItemContribution,
  ClassicEditorContextMenuItemContribution,
  ClassicEditorContextMenuTrigger,
  ClassicEditorRenderContext,
  ClassicEditorText
} from "@classic/types";
import type { QuireKitMenuEntry } from "@quirekit/ui";
import {
  resolveClassicEditorContributionActionState,
  resolveClassicEditorContributionBehavior
} from "../contribution/utils";

/** Context-menu contribution accepted during the direct-action migration. */
export type ClassicEditorContextSurfaceItemContribution =
  | ClassicEditorContextMenuItemContribution
  | ClassicEditorActionContextMenuItemContribution;

/** Resolves one product-owned text value for the active locale. */
type ClassicEditorBehaviorSurfaceTextResolver = (
  value: ClassicEditorText
) => string;

/**
 * Compiles behavior-surface records into private component-library options.
 *
 * @param items - Applicable behavior-surface contributions in registry order.
 * @param trigger - Current normalized behavior-surface trigger.
 * @param context - Latest mounted Classic render context.
 * @param text - Active-locale contribution text resolver.
 * @returns Dropdown options with trusted icons and behavior-owned toggle state.
 */
export function createClassicEditorBehaviorSurfaceOptions(
  items: readonly ClassicEditorContextSurfaceItemContribution[],
  trigger: ClassicEditorContextMenuTrigger | null,
  context: ClassicEditorRenderContext | undefined,
  text: ClassicEditorBehaviorSurfaceTextResolver
): QuireKitMenuEntry[] {
  if (context === undefined || trigger === null) return [];
  const options: QuireKitMenuEntry[] = [];
  const submenus = new Map<string, QuireKitMenuEntry[]>();
  let section: string | undefined;
  for (const item of items) {
    const option = createSurfaceOption(item, trigger, context, text);
    if (options.length > 0 && item.section !== section) {
      options.push({ kind: "separator", value: `separator:${item.id}`, label: "" });
    }
    section = item.section;
    const submenuLabel = "submenu" in item && item.submenu !== undefined
      ? text(item.submenu)
      : null;
    if (submenuLabel === null) {
      options.push(option);
      continue;
    }
    const existing = submenus.get(submenuLabel);
    if (existing === undefined) {
      const children: QuireKitMenuEntry[] = [option];
      submenus.set(submenuLabel, children);
      options.push({
        kind: "submenu",
        value: `submenu:${item.id}`,
        label: submenuLabel,
        ...(option.tone === undefined ? {} : { tone: option.tone }),
        children
      });
    } else {
      existing.push(option);
    }
  }
  return options;
}

/**
 * Compiles one action/behavior contribution into a public menu entry.
 *
 * @param item - One applicable context-menu contribution.
 * @param trigger - Current normalized surface trigger.
 * @param context - Latest mounted Classic render context.
 * @param text - Active-locale text resolver.
 * @returns One leaf dropdown option.
 */
function createSurfaceOption(
  item: ClassicEditorContextSurfaceItemContribution,
  trigger: ClassicEditorContextMenuTrigger,
  context: ClassicEditorRenderContext,
  text: ClassicEditorBehaviorSurfaceTextResolver
): QuireKitMenuEntry {
  const payload = item.payload?.(trigger, context);
  let disabled: boolean;
  let isToggle: boolean;
  let isActive: boolean;
  if ("action" in item) {
    const actionState = resolveClassicEditorContributionActionState(
      item,
      context,
      payload,
      "context-menu",
      trigger
    );
    disabled = !actionState.canExecute;
    isToggle = item.action.isActive !== undefined;
    isActive = actionState.active;
  } else {
    const behavior = resolveClassicEditorContributionBehavior(item);
    disabled = !context.instance.canExecuteContribution(behavior, payload);
    isToggle = behavior.isActive !== undefined;
    isActive = behavior.isActive?.({
      ...context,
      payload,
      trigger: { source: trigger.kind, detail: trigger }
    }) === true;
  }
  const label = text(item.resolveLabel?.(trigger, context) ?? item.label);
  return {
    value: item.id,
    label,
    disabled,
    ...(item.icon === undefined ? {} : { icon: item.icon }),
    ...(item.tone === undefined ? {} : { tone: item.tone }),
    ...(item.shortcut === undefined ? {} : { shortcut: text(item.shortcut) }),
    ...(isToggle ? { checked: isActive } : {}),
    reason: text(item.title ?? item.label)
  };
}

/**
 * Applies context-menu item roles to the items applicable to one trigger.
 *
 * An object-specific `target` item hides the generic `fallback` text menu
 * except the sections it keeps; `addition` items are unaffected either way.
 *
 * @param items - Applicable items in registry order.
 * @returns Items that should be presented for the trigger.
 */
export function filterClassicEditorContextMenuRoles<
  Item extends ClassicEditorContextSurfaceItemContribution
>(items: readonly Item[]): readonly Item[] {
  const targets = items.filter(item => item.role === "target");
  if (targets.length === 0) return items;
  const kept = new Set(targets.flatMap(item => item.keepFallbackSections ?? []));
  return items.filter(item => item.role !== "fallback" || (item.section !== undefined && kept.has(item.section)));
}
