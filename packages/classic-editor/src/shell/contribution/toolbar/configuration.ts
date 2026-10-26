import type { QuireKitToolbarEntry } from "@quirekit/ui";
import { resolveClassicEditorIconData } from "../../../icons";
import { resolveClassicEditorText } from "../../../localization";
import type { ResolvedClassicEditorCommandBarGroup } from "../command-bar";
import { projectClassicToolbarControl, projectClassicToolbarMenuItem } from "./control";
import { projectClassicToolbarFeature } from "./features";
import type { ClassicToolbarContext, ClassicToolbarControl, ClassicToolbarEntryMeta } from "./types";

/**
 * Reports whether a group can be expressed as a public action menu.
 * @param group - Resolved product group and individual contributions.
 * @returns Whether every item is an executable action rather than a compound feature.
 */
export function isClassicToolbarMenu(group: ResolvedClassicEditorCommandBarGroup): boolean {
  return group.presentation === "menu" && group.items.every(item => item.kind !== "ribbon-widget");
}

/**
 * Converts the real Classic contribution registry into individual public entries.
 * @param groups - Ordered groups belonging to a single task tab.
 * @param adapter - Current context, retained factories and menu ownership.
 * @param previous - Last presented entries retained through hidden tabs and menu exits.
 * @param active - Whether inline commands are currently visible.
 * @returns Native public groups, controls, menus and explicitly registered business bodies.
 */
export function createClassicToolbarConfiguration(
  groups: readonly ResolvedClassicEditorCommandBarGroup[],
  adapter: ClassicToolbarContext,
  previous: readonly QuireKitToolbarEntry[] = [],
  active = true
): readonly QuireKitToolbarEntry[] {
  const context = adapter.model.context;
  const locale = context?.locale ?? adapter.model.locale;
  const previousByValue = new Map(previous.map(entry => [entry.value, entry]));
  return groups.flatMap((group, index) => {
    const label = resolveClassicEditorText(group.label, locale);
    const separator: QuireKitToolbarEntry[] = index ? [{ value: `separator:${group.id}`, label: "", kind: "separator" }] : [];
    if (isClassicToolbarMenu(group)) {
      const owner = adapter.menus.get(group.id);
      const expanded = owner?.isVisible() ?? false;
      const previousMenu = previousByValue.get(`menu:${group.id}`);
      if (!active && !expanded) return previousMenu ? [...separator, previousMenu] : [];
      const controls = group.items as readonly ClassicToolbarControl[];
      const meta: ClassicToolbarEntryMeta = { kind: "menu", groupId: group.id, controls };
      const iconData = group.icon === undefined ? undefined : resolveClassicEditorIconData(group.icon);
      return [...separator, {
        value: `menu:${group.id}`, label, text: label, kind: "menu", trigger: "disclosure", meta,
        tooltip: label, expanded,
        attributes: { "data-ribbon-menu": group.id, ...owner?.ownerAttributes },
        ...(group.icon === undefined ? {} : { icon: group.icon }),
        ...(iconData === undefined ? {} : { iconData }),
        overlayProps: {
          portalTarget: context?.root.ownerDocument.body ?? "body",
          closeOnSelect: false,
          contentAttributes: { lang: locale, ...owner?.ownerAttributes }
        },
        // Keep prior rows for the public exit lifecycle; opening always queries current state.
        items: expanded ? controls.map(item => projectClassicToolbarMenuItem(item, context, locale)) : previousMenu?.items ?? []
      } satisfies QuireKitToolbarEntry];
    }
    const previousChildren = new Map(previousByValue.get(`group:${group.id}`)?.children?.map(entry => [entry.value, entry]));
    const children = group.items.flatMap(item => {
      if (item.kind !== "ribbon-widget") {
        const retained = previousChildren.get(item.id);
        return active ? [projectClassicToolbarControl(item, context, locale)] : retained ? [retained] : [];
      }
      if (item.toolbar) {
        const featureKey = `${group.id}/${item.id}`;
        const feature = adapter.features.get(featureKey);
        return feature ? projectClassicToolbarFeature(featureKey, feature.items) : [];
      }
      const meta: ClassicToolbarEntryMeta = { kind: "widget", contribution: item };
      if (!active) {
        const retained = previousChildren.get(`widget:${item.id}`);
        return retained ? [retained] : [];
      }
      return [{ value: `widget:${item.id}`, label: item.id, kind: "custom", renderer: "classic-widget", meta } satisfies QuireKitToolbarEntry];
    });
    return [...separator, { value: `group:${group.id}`, label, kind: "group", children } satisfies QuireKitToolbarEntry];
  });
}
