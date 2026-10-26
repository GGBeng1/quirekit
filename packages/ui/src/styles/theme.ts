import { createToggleGroupTokens, createToggleGroupCssVariables } from "../components/toggle-group";
import { createCheckboxGroupTokens, createCheckboxGroupCssVariables } from "../components/checkbox-group";
import { createKbdTokens, createKbdCssVariables } from "../components/kbd";
import { createSkeletonTokens, createSkeletonCssVariables } from "../components/skeleton";
import { createTagTokens, createTagCssVariables } from "../components/tag";
import { createBadgeTokens, createBadgeCssVariables } from "../components/badge";
import { createTableTokens, createTableCssVariables } from "../components/table";
import { createThemeCssVariables } from "../theme/variables";
import type { QuireKitTheme } from "../theme/types";
import { createButtonCssVariables, createButtonTokens } from "../components/button";
import { createMenuCssVariables, createMenuTokens } from "../components/menu";
import { createPopoverCssVariables, createPopoverTokens } from "../components/popover";
import { createSegmentedCssVariables, createSegmentedTokens } from "../components/segmented";
import { createToolbarCssVariables, createToolbarTokens } from "../components/toolbar";
import { createTooltipCssVariables, createTooltipTokens } from "../components/tooltip";

const themeVariables = new WeakMap<QuireKitTheme, Readonly<Record<string, string>>>();

/**
 * Projects one theme together with its approved component tokens.
 * @param theme - Complete immutable semantic theme owned by the consumer.
 * @returns Stable immutable variables shared by ordinary and teleported roots and static CSS generation.
 */
export function createUiThemeCssVariables(theme: QuireKitTheme): Readonly<Record<string, string>> {
  const retained = themeVariables.get(theme);
  if (retained !== undefined) return retained;

  // Theme replacement is the invalidation boundary. Stable projection identity
  // keeps unrelated UI updates from comparing and rewriting every CSS variable.
  const variables = Object.freeze({
    ...createThemeCssVariables(theme),
    ...createToggleGroupCssVariables(createToggleGroupTokens(theme)),
    ...createCheckboxGroupCssVariables(createCheckboxGroupTokens(theme)),
    ...createKbdCssVariables(createKbdTokens(theme)),
    ...createSkeletonCssVariables(createSkeletonTokens(theme)),
    ...createBadgeCssVariables(createBadgeTokens(theme)),
    ...createTagCssVariables(createTagTokens(theme)),
    ...createTableCssVariables(createTableTokens(theme)),
    ...createButtonCssVariables(createButtonTokens(theme)),
    ...createMenuCssVariables(createMenuTokens(theme)),
    ...createPopoverCssVariables(createPopoverTokens(theme)),
    ...createSegmentedCssVariables(createSegmentedTokens(theme)),
    ...createToolbarCssVariables(createToolbarTokens(theme)),
    ...createTooltipCssVariables(createTooltipTokens(theme)),
  });
  themeVariables.set(theme, variables);
  return variables;
}
