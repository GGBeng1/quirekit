import { popoverCssVariableNames } from "@quirekit/ui";

/** Positioning-only Popover for elevated Toolbars, following the public selection-toolbar example. */
export const mobileFloatingPopoverStyle = {
  [popoverCssVariableNames.background]: "transparent",
  [popoverCssVariableNames.shadow]: "none",
  overflow: "visible",
};
