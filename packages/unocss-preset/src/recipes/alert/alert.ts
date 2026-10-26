import type { StaticShortcut, UserShortcuts } from "@unocss/core";
import { themeVariableReferences as tokens } from "@quirekit/ui";

const color = tokens.color;
const families = {
  neutral: { text: color.text.secondary, surface: color.surface.subtle, edge: color.border.subtle, border: color.border.default, solid: color.surface.inverse, onSolid: color.surface.page },
  primary: { text: color.action.text, surface: color.action.soft, edge: color.action.softPressed, border: color.action.primary, solid: color.action.primary, onSolid: color.action.foreground },
  ...Object.fromEntries((["info", "success", "warning", "danger"] as const).map((name) => [name, {
    text: color[name].text, surface: color[name].surface, edge: color[name].pressedSurface,
    border: color[name].border, solid: color[name].solid, onSolid: color[name].onSolid
  }]))
};

/** Alert 的公开结构、色族与外观类。 */
export const alertRecipeCatalog = Object.freeze([
  "qk-alert", "qk-alert__icon", "qk-alert__body", "qk-alert__title", "qk-alert__description",
  "qk-alert__content", "qk-alert__actions", "qk-alert__close",
  ...Object.keys(families).map((name) => `qk-alert--${name}`),
  ...["soft", "subtle", "outline", "solid"].map((name) => `qk-alert--${name}`)
]);

/** 直接组合现有语义颜色；提示面板不参与按钮的悬停色变。 */
export const alertShortcuts = [
  ["qk-alert", ["box-border flex w-full max-w-full min-w-0 items-start gap-qk-surface-compact rounded-qk-group border border-solid p-qk-surface font-qk-product text-qk-control leading-qk-control", {
    color: "var(--qk-alert-text)", "border-color": "transparent"
  }], { layer: "qk-recipes" }],
  ...Object.entries(families).map(([name, family]) => [
    `qk-alert--${name}`, [Object.fromEntries(Object.entries(family).map(([key, value]) => [`--qk-alert-${key}`, value]))], { layer: "qk-recipes" }
  ] satisfies StaticShortcut),
  ["qk-alert--soft", [{ "background-color": "var(--qk-alert-surface)" }], { layer: "qk-recipes" }],
  ["qk-alert--subtle", [{ "background-color": "var(--qk-alert-surface)", "border-color": "var(--qk-alert-edge)" }], { layer: "qk-recipes" }],
  ["qk-alert--outline", [{ "background-color": "transparent", "border-color": "var(--qk-alert-border)" }], { layer: "qk-recipes" }],
  ["qk-alert--solid", [{ "background-color": "var(--qk-alert-solid)", color: "var(--qk-alert-onSolid)" }], { layer: "qk-recipes" }],
  ["qk-alert__icon", "mt-0.5 flex size-5 shrink-0 items-center justify-center", { layer: "qk-recipes" }],
  ["qk-alert__body", "flex min-w-0 flex-1 flex-col gap-qk-inline-tight [overflow-wrap:anywhere]", { layer: "qk-recipes" }],
  ["qk-alert__title", "font-medium", { layer: "qk-recipes" }],
  ["qk-alert__description", "text-inherit", { layer: "qk-recipes" }],
  ["qk-alert__content", "text-inherit", { layer: "qk-recipes" }],
  ["qk-alert__actions", "mt-qk-inline flex min-w-0 flex-wrap items-center gap-qk-inline", { layer: "qk-recipes" }],
  ["qk-alert__close", "-mt-1 -me-1 shrink-0 !text-inherit !bg-transparent !border-transparent enabled:hover:!opacity-70 [outline:none] focus-visible:!opacity-70", { layer: "qk-recipes" }]
] satisfies UserShortcuts;
