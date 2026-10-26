import type { UserShortcuts } from "@unocss/core";

/** UnoCSS preset 发布的 Avatar anatomy 类。 */
export const avatarRecipeCatalog = Object.freeze([
  "qk-avatar",
  "qk-avatar--xs",
  "qk-avatar--sm",
  "qk-avatar--md",
  "qk-avatar--lg",
  "qk-avatar--xl",
  "qk-avatar--circle",
  "qk-avatar--square",
  "qk-avatar__surface",
  "qk-avatar__fallback",
  "qk-avatar__image",
  "qk-avatar__status",
  "qk-avatar__status--online",
  "qk-avatar__status--away",
  "qk-avatar__status--busy",
  "qk-avatar__status--offline",
  "qk-avatar-group",
  "qk-avatar-group__overflow"
]);

/** Avatar 单体、状态和 Group 的 UnoCSS shortcuts。 */
export const avatarShortcuts = [
  ["qk-avatar", "relative inline-grid shrink-0 place-items-center align-middle", { layer: "qk-recipes" }],
  ["qk-avatar--circle", "rounded-full", { layer: "qk-recipes" }],
  ["qk-avatar--square", "rounded-qk-control", { layer: "qk-recipes" }],
  ["qk-avatar__surface", "relative grid size-full place-items-center overflow-hidden rounded-[inherit] bg-qk-action-soft text-qk-action-text", { layer: "qk-recipes" }],
  ["qk-avatar__fallback", "grid size-full place-items-center select-none font-semibold", { layer: "qk-recipes" }],
  ["qk-avatar__image", "absolute inset-0 size-full object-cover", { layer: "qk-recipes" }],
  ["qk-avatar__status", "absolute bottom-0 right-0 box-border rounded-full border-2 border-qk-surface-page", { layer: "qk-recipes" }],
  ["qk-avatar__status--online", "bg-qk-success-solid", { layer: "qk-recipes" }],
  ["qk-avatar__status--away", "bg-qk-warning-solid", { layer: "qk-recipes" }],
  ["qk-avatar__status--busy", "bg-qk-danger-solid", { layer: "qk-recipes" }],
  ["qk-avatar-group", "flex items-center", { layer: "qk-recipes" }],
  ["qk-avatar-group__overflow", "relative inline-grid shrink-0 place-items-center rounded-full border-2 border-qk-surface-page bg-qk-surface-selected font-semibold tabular-nums text-qk-text-secondary", { layer: "qk-recipes" }]
] satisfies UserShortcuts;

/** Avatar 尺寸、文字比例、状态点和 Group 叠放使用的静态 CSS。 */
export const avatarStaticCss = [
  // Lazy images need a layout box before loading. Ark retains state ownership;
  // transparent pending images leave the fallback visible without display:none.
  ".qk-avatar__image[data-state=hidden]{opacity:0;pointer-events:none}",
  // Size steps are tuned for two initials; a lone glyph, typically one CJK
  // character, scales to about half the diameter so small avatars stay legible.
  ".qk-avatar__fallback[data-single-glyph]{font-size:1.4em}",
  ".qk-avatar--xs{width:24px;height:24px;font-size:9px}.qk-avatar--sm{width:32px;height:32px;font-size:11px}.qk-avatar--md{width:40px;height:40px;font-size:13px}.qk-avatar--lg{width:48px;height:48px;font-size:14px}.qk-avatar--xl{width:64px;height:64px;font-size:18px}",
  ".qk-avatar--xs .qk-avatar__status{width:8px;height:8px}.qk-avatar--sm .qk-avatar__status{width:10px;height:10px}.qk-avatar--md .qk-avatar__status{width:12px;height:12px}.qk-avatar--lg .qk-avatar__status{width:14px;height:14px}.qk-avatar--xl .qk-avatar__status{width:16px;height:16px}",
  ".qk-avatar__status--offline{background:var(--qk-color-icon-disabled)}",
  ".qk-avatar-group>*+*{margin-inline-start:-8px}.qk-avatar-group>.qk-avatar{box-sizing:content-box;border:2px solid var(--qk-color-surface-page)}",
  ".qk-avatar-group__overflow.qk-avatar--xs{font-size:9px}.qk-avatar-group__overflow.qk-avatar--sm{font-size:10px}.qk-avatar-group__overflow.qk-avatar--md{font-size:11px}.qk-avatar-group__overflow.qk-avatar--lg{font-size:12px}.qk-avatar-group__overflow.qk-avatar--xl{font-size:14px}"
].join("");
