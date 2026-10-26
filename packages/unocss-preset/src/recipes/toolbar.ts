import { toolbarCssVariableNames, toolbarVariableReferences } from "@quirekit/ui";
import type { UserShortcuts } from "@unocss/core";

/** Public Toolbar action and group recipe classes emitted by the preset. */
export const toolbarRecipeCatalog = Object.freeze([
  "qk-toolbar",
  "qk-toolbar--plain",
  "qk-toolbar--outlined",
  "qk-toolbar--elevated",
  "qk-toolbar--mobile",
  "qk-toolbar--overflow-sheet",
  "qk-toolbar--horizontal",
  "qk-toolbar--vertical",
  "qk-toolbar--align-start",
  "qk-toolbar--align-center",
  "qk-toolbar__viewport",
  "qk-toolbar__viewport--hidden",
  "qk-toolbar__viewport--auto",
  "qk-toolbar__viewport--visible",
  "qk-toolbar__content",
  "qk-toolbar__content--visible",
  "qk-toolbar__content--rows",
  "qk-toolbar__row",
  "qk-toolbar__slot",
  "qk-toolbar--wrap",
  "qk-toolbar--collapse",
  "qk-toolbar--overflow-panel",
  "qk-toolbar__unit",
  "qk-toolbar__scroll-button",
  "qk-toolbar__group",
  "qk-toolbar__group--horizontal",
  "qk-toolbar__group--vertical",
  "qk-toolbar__item",
  "qk-toolbar__icon-button",
  "qk-toolbar__disclosure",
  "qk-toolbar__icon",
  "qk-toolbar__label",
  "qk-toolbar__indicator",
  "qk-toolbar__split",
  "qk-toolbar__split-target",
  "qk-toolbar__split-target--icon",
  "qk-toolbar__field",
  "qk-toolbar__split-disclosure",
  "qk-toolbar__separator",
  "qk-toolbar__separator--horizontal",
  "qk-toolbar__separator--vertical"
]);

const variable = toolbarVariableReferences;

/** UnoCSS shortcuts for the approved native Toolbar anatomy and states. */
export const toolbarShortcuts = [
  ["qk-toolbar--mobile", [{
    [toolbarCssVariableNames.geometry.itemHeight]: "44px",
    [toolbarCssVariableNames.geometry.iconSize]: "20px",
    [toolbarCssVariableNames.geometry.itemPaddingInline]: "8px"
  }, "[&_[data-qk-toolbar-item]]:min-w-44px"], { layer: "qk-recipes" }],
  ["qk-toolbar--overflow-sheet", "w-full [&_[data-qk-toolbar-item]]:justify-start [&_.qk-toolbar__group]:items-stretch", { layer: "qk-recipes" }],
  ["qk-toolbar--plain", "[&.qk-toolbar]:bg-transparent", { layer: "qk-recipes" }],
  ["qk-toolbar--outlined", "rounded-qk-overlay border border-solid border-qk-border-subtle bg-qk-surface-page p-qk-inline", { layer: "qk-recipes" }],
  ["qk-toolbar--elevated", "rounded-qk-overlay border-0 p-qk-inline [&.qk-toolbar]:bg-qk-surface-overlay [&.qk-toolbar]:[box-shadow:0_0_0_1px_var(--qk-color-border-subtle),var(--qk-elevation-raised)]", { layer: "qk-recipes" }],
  [
    "qk-toolbar",
    [
      "m-0 inline-flex min-w-0 max-w-full select-none",
      {
        gap: variable.geometry.toolbarGap,
        background: variable.color.surface,
        color: variable.color.foreground,
        "font-family": variable.typography.fontFamily,
        "font-size": variable.typography.fontSize,
        "line-height": variable.typography.lineHeight,
        "font-weight": variable.typography.fontWeight,
        "letter-spacing": variable.typography.letterSpacing,
        "box-shadow": "none",
        outline: "0"
      }
    ],
    { layer: "qk-recipes" }
  ],
  ["qk-toolbar--horizontal", "flex-row items-center", { layer: "qk-recipes" }],
  ["qk-toolbar--vertical", "flex-col items-stretch", { layer: "qk-recipes" }],
  ["qk-toolbar--align-start", "justify-start", { layer: "qk-recipes" }],
  ["qk-toolbar--align-center", "justify-center data-[overflowing=true]:justify-start", { layer: "qk-recipes" }],
  ["qk-toolbar__viewport", ["relative min-w-0 flex-1 overflow-x-auto overflow-y-hidden", { "justify-content": "inherit" }], { layer: "qk-recipes" }],
  ["qk-toolbar__viewport--hidden", "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden", { layer: "qk-recipes" }],
  ["qk-toolbar__viewport--auto", "[scrollbar-width:auto]", { layer: "qk-recipes" }],
  ["qk-toolbar__viewport--visible", "[&&]:contents", { layer: "qk-recipes" }],
  ["qk-toolbar__content", ["flex w-max min-w-full flex-nowrap items-center [&>*]:shrink-0", { gap: variable.geometry.toolbarGap, "justify-content": "inherit" }], { layer: "qk-recipes" }],
  ["qk-toolbar__content--visible", "[&&]:contents", { layer: "qk-recipes" }],
  ["qk-toolbar__content--rows", "[&&]:flex-col [&&]:items-stretch [&&]:gap-qk-inline-tight", { layer: "qk-recipes" }],
  ["qk-toolbar__row", ["flex min-w-max flex-nowrap items-center [&>*]:shrink-0", { gap: variable.geometry.toolbarGap, "justify-content": "inherit" }], { layer: "qk-recipes" }],
  // One unit is an icon action; n units also absorb the n - 1 gaps they replace.
  ["qk-toolbar__slot", ["inline-flex shrink-0 items-center [&>*]:flex-1 [&>*]:min-w-0", {
    "inline-size": `calc(var(--qk-toolbar-span) * ${variable.geometry.itemHeight} + (var(--qk-toolbar-span) - 1) * ${variable.geometry.toolbarGap})`
  }], { layer: "qk-recipes" }],
  ["qk-toolbar--wrap", ["[&_.qk-toolbar__content]:w-auto [&_.qk-toolbar__content]:flex-wrap [&_.qk-toolbar__row]:min-w-0 [&_.qk-toolbar__row]:flex-wrap [&_.qk-toolbar__content]:max-w-[var(--qk-toolbar-capacity)] [&_.qk-toolbar__row]:max-w-[var(--qk-toolbar-capacity)]", {
    "--qk-toolbar-capacity": `calc(var(--qk-toolbar-units-per-row) * ${variable.geometry.itemHeight} + (var(--qk-toolbar-units-per-row) - 1) * ${variable.geometry.toolbarGap})`
  }], { layer: "qk-recipes" }],
  // Collapse measures against the full container width, so the root fills it instead of hugging content.
  ["qk-toolbar--collapse", "w-full overflow-hidden", { layer: "qk-recipes" }],
  // A group wider than the panel wraps inside itself instead of overflowing the panel edge.
  ["qk-toolbar--overflow-panel", "flex-wrap max-w-[min(90vw,30rem)] [&.qk-toolbar]:bg-transparent [&_.qk-toolbar\\_\\_group]:flex-wrap [&_.qk-toolbar\\_\\_group]:max-w-full", { layer: "qk-recipes" }],
  ["qk-toolbar__unit", "inline-flex shrink-0 items-center self-stretch [&>.qk-toolbar\\_\\_separator]:self-stretch", { layer: "qk-recipes" }],
  ["qk-toolbar__scroll-button", ["shrink-0 [&&]:p-0", { width: variable.geometry.splitDisclosureWidth, "min-width": variable.geometry.splitDisclosureWidth }], { layer: "qk-recipes" }],
  [
    "qk-toolbar__group",
    ["inline-flex shrink-0", { gap: variable.geometry.groupGap }],
    { layer: "qk-recipes" }
  ],
  ["qk-toolbar__group--horizontal", "flex-row items-center", { layer: "qk-recipes" }],
  ["qk-toolbar__group--vertical", "flex-col items-stretch", { layer: "qk-recipes" }],
  ["qk-toolbar__field", ["inline-flex shrink-0 items-center [&>*]:w-full [&>*]:min-w-0", { height: variable.geometry.itemHeight }], { layer: "qk-recipes" }],
  [
    "qk-toolbar__item",
    [
      "inline-flex shrink-0 cursor-pointer items-center justify-center whitespace-nowrap border-solid border-transparent bg-transparent font-inherit text-inherit transition-colors hover:bg-[var(--qk-toolbar-hover-background)] active:bg-[var(--qk-toolbar-active-background)] focus-visible:bg-[var(--qk-toolbar-hover-background)] data-[state=on]:bg-[var(--qk-toolbar-selected-background)] data-[state=open]:bg-[var(--qk-toolbar-selected-background)] aria-disabled:cursor-not-allowed aria-disabled:bg-transparent aria-disabled:text-[var(--qk-toolbar-disabled-foreground)] aria-disabled:hover:bg-transparent aria-disabled:active:bg-transparent data-[kind=selector]:border-qk-border-default data-[kind=selector]:data-[state=open]:border-qk-border-strong data-[kind=selector]:aria-disabled:border-qk-border-disabled data-[kind=selector]:aria-disabled:bg-qk-surface-disabled data-[kind=selector]:justify-between data-[kind=selector]:bg-qk-surface-page data-[kind=selector]:hover:bg-qk-surface-hover data-[kind=selector]:data-[state=open]:bg-qk-surface-page [&[data-kind=selector]>.qk-toolbar\\_\\_label]:flex-1 [&[data-kind=selector]>.qk-toolbar\\_\\_label]:min-w-0 [&[data-kind=selector]>.qk-toolbar\\_\\_label]:text-start disabled:cursor-not-allowed disabled:bg-transparent disabled:text-[var(--qk-toolbar-disabled-foreground)] motion-reduce:transition-none",
      {
        "box-sizing": "border-box",
        height: variable.geometry.itemHeight,
        gap: variable.geometry.itemGap,
        "padding-inline": variable.geometry.itemPaddingInline,
        "border-width": variable.geometry.borderWidth,
        "border-radius": variable.geometry.itemRadius,
        "transition-duration": variable.feedbackDuration,
        "transition-timing-function": variable.feedbackEasing,
        "box-shadow": "none",
        outline: "0"
      }
    ],
    { layer: "qk-recipes" }
  ],
  [
    "qk-toolbar__icon-button",
    ["[&&]:p-0", { width: variable.geometry.itemHeight }],
    { layer: "qk-recipes" }
  ],
  ["qk-toolbar__disclosure", "min-w-0", { layer: "qk-recipes" }],
  [
    "qk-toolbar__icon",
    [
      "pointer-events-none inline-flex shrink-0 items-center justify-center [&>*]:size-full",
      { width: variable.geometry.iconSize, height: variable.geometry.iconSize }
    ],
    { layer: "qk-recipes" }
  ],
  ["qk-toolbar__label", "pointer-events-none min-w-0 truncate", { layer: "qk-recipes" }],
  [
    "qk-toolbar__indicator",
    [
      "pointer-events-none inline-flex shrink-0 items-center justify-center [&>*]:size-full",
      { width: variable.geometry.iconSize, height: variable.geometry.iconSize }
    ],
    { layer: "qk-recipes" }
  ],
  [
    "qk-toolbar__split",
    [
      "inline-flex shrink-0 items-center gap-0 overflow-hidden bg-transparent transition-colors hover:bg-[var(--qk-toolbar-hover-background)] data-[state=open]:bg-[var(--qk-toolbar-hover-background)] motion-reduce:transition-none",
      {
        "border-radius": variable.geometry.itemRadius,
        "transition-duration": variable.feedbackDuration,
        "transition-timing-function": variable.feedbackEasing,
        "box-shadow": "none"
      }
    ],
    { layer: "qk-recipes" }
  ],
  [
    "qk-toolbar__split-target",
    [
      "min-w-0 !rounded-e-none hover:bg-[var(--qk-toolbar-active-background)]",
      {
        width: "auto",
        "min-width": variable.geometry.itemHeight,
        "border-start-start-radius": variable.geometry.itemRadius,
        "border-end-start-radius": variable.geometry.itemRadius,
        "border-start-end-radius": "0",
        "border-end-end-radius": "0"
      }
    ],
    { layer: "qk-recipes" }
  ],
  ["qk-toolbar__split-target--icon", ["[&&]:p-0", { width: variable.geometry.itemHeight }], { layer: "qk-recipes" }],
  [
    "qk-toolbar__split-disclosure",
    [
      "!rounded-s-none [&&]:p-0 hover:bg-[var(--qk-toolbar-active-background)] data-[state=open]:bg-[var(--qk-toolbar-active-background)]",
      {
        width: variable.geometry.splitDisclosureWidth,
        "min-width": variable.geometry.splitDisclosureWidth,
        "max-width": variable.geometry.splitDisclosureWidth,
        "flex-basis": variable.geometry.splitDisclosureWidth,
        "border-start-start-radius": "0",
        "border-end-start-radius": "0",
        "border-start-end-radius": variable.geometry.itemRadius,
        "border-end-end-radius": variable.geometry.itemRadius
      }
    ],
    { layer: "qk-recipes" }
  ],
  [
    "qk-toolbar__separator",
    [
      "pointer-events-none shrink-0 self-stretch border-0 border-solid",
      { "border-color": variable.color.separator }
    ],
    { layer: "qk-recipes" }
  ],
  [
    "qk-toolbar__separator--vertical",
    [{ "margin-block": variable.geometry.separatorInset, "border-left-width": variable.geometry.separatorWidth }],
    { layer: "qk-recipes" }
  ],
  [
    "qk-toolbar__separator--horizontal",
    [{ "margin-inline": variable.geometry.separatorInset, "border-top-width": variable.geometry.separatorWidth }],
    { layer: "qk-recipes" }
  ]
] satisfies UserShortcuts;
