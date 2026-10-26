import type {
  ClassicEditorCommandBarOptions,
  ClassicEditorRibbonGroupContribution,
  ClassicEditorRibbonGroupPresentation,
  ClassicEditorRibbonItemContribution,
  ClassicEditorText
} from "../../types";

/** Resolved immutable group used only by the default compatibility ribbon. */
export type ResolvedClassicEditorCommandBarGroup = Readonly<{
  /** Stable render key from contribution grouping or consumer configuration. */
  id: string;
  /** Ribbon tab that presents this group. */
  tabId: string;
  /** Visible accessible label for the group or compound trigger. */
  label: ClassicEditorText;
  /** Group layout treatment resolved from contribution and consumer composition. */
  presentation: ClassicEditorRibbonGroupPresentation;
  /** Optional icon shown by a compound menu trigger. */
  icon?: string | undefined;
  /** Legacy controls, direct actions, and widgets retained until cutover. */
  items: readonly ClassicEditorRibbonItemContribution[];
}>;

/**
 * Resolves the default compatibility ribbon without changing its capability set.
 *
 * Unknown and unavailable control ids are omitted. A configured group with no
 * surviving controls is omitted as well. The typed preview has an independent
 * resolver under `command-strip/` and never calls this compatibility path.
 *
 * @param groups - Visible ribbon-group contributions.
 * @param items - Visible compatibility and direct ribbon items.
 * @param options - Optional consumer command-bar composition.
 * @returns New immutable compatibility group records in display order.
 */
export function resolveClassicEditorCommandBarGroups(
  groups: readonly ClassicEditorRibbonGroupContribution[],
  items: readonly ClassicEditorRibbonItemContribution[],
  options: ClassicEditorCommandBarOptions | undefined
): readonly ResolvedClassicEditorCommandBarGroup[] {
  if (options?.groups === undefined) {
    return groups.flatMap((group) => {
      const children = items.filter((item) => item.groupId === group.id);
      return children.length === 0
        ? []
        : [{
            id: group.id,
            tabId: group.tabId,
            label: group.label,
            presentation: group.presentation ?? "inline",
            icon: group.icon,
            items: children
          }];
    });
  }

  const itemsById = new Map(items.map((item) => [item.id, item]));
  return options.groups.flatMap((group) => {
    const declaration = groups.find((item) => item.id === group.id);
    const children = group.controls.flatMap((id) => {
      const item = itemsById.get(id);
      return item === undefined ? [] : [item];
    });
    return children.length === 0
      ? []
      : [{
          id: group.id,
          tabId: group.tabId ?? declaration?.tabId ?? "home",
          label: group.label ?? declaration?.label ?? group.id,
          presentation: group.presentation
            ?? declaration?.presentation
            ?? "inline",
          icon: group.icon ?? declaration?.icon,
          items: children
        }];
  });
}
