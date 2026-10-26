import type { UserShortcuts } from "@unocss/core";

/** UnoCSS preset 发布的 Progress anatomy 类。 */
export const progressRecipeCatalog = Object.freeze([
  "qk-progress",
  "qk-progress--linear",
  "qk-progress--circle",
  "qk-progress--spinner",
  "qk-progress--sm",
  "qk-progress--md",
  "qk-progress--lg",
  "qk-progress--primary",
  "qk-progress--info",
  "qk-progress--success",
  "qk-progress--warning",
  "qk-progress--danger",
  "qk-progress__header",
  "qk-progress__label",
  "qk-progress__label--hidden",
  "qk-progress__value",
  "qk-progress__track",
  "qk-progress__range",
  "qk-progress__circle-wrap",
  "qk-progress__circle",
  "qk-progress__circle-track",
  "qk-progress__circle-range",
  "qk-progress__circle-value",
  "qk-progress__circle-label"
]);

/** Progress 线性、环形、轻量加载和排版 anatomy 的 UnoCSS shortcuts。 */
export const progressShortcuts = [
  ["qk-progress", "grid min-w-0 gap-2 text-qk-compact leading-qk-compact text-qk-text-primary", { layer: "qk-recipes" }],
  ["qk-progress--linear", "w-full", { layer: "qk-recipes" }],
  ["qk-progress--circle", "w-max justify-items-center", { layer: "qk-recipes" }],
  ["qk-progress--spinner", "inline-flex max-w-full items-center gap-2 align-middle", { layer: "qk-recipes" }],
  ["qk-progress__header", "flex min-w-0 items-center justify-between gap-3", { layer: "qk-recipes" }],
  ["qk-progress__label", "min-w-0 truncate font-medium", { layer: "qk-recipes" }],
  ["qk-progress__label--hidden", "sr-only", { layer: "qk-recipes" }],
  ["qk-progress__value", "shrink-0 tabular-nums text-qk-helper text-qk-text-secondary", { layer: "qk-recipes" }],
  ["qk-progress__track", "relative overflow-hidden rounded-full bg-qk-surface-selected", { layer: "qk-recipes" }],
  ["qk-progress__range", "h-full rounded-full bg-[var(--qk-progress-color)] transition-[width] duration-200 ease-out motion-reduce:transition-none", { layer: "qk-recipes" }],
  ["qk-progress__circle-wrap", "relative grid shrink-0 place-items-center", { layer: "qk-recipes" }],
  ["qk-progress__circle", "block", { layer: "qk-recipes" }],
  ["qk-progress__circle-range", "stroke-[var(--qk-progress-color)] [stroke-linecap:round]", { layer: "qk-recipes" }],
  ["qk-progress__circle-value", "absolute max-w-[75%] truncate tabular-nums font-medium text-qk-text-primary", { layer: "qk-recipes" }],
  ["qk-progress__circle-label", "max-w-32 text-center font-medium", { layer: "qk-recipes" }]
] satisfies UserShortcuts;

/** Progress 的填充与圆环使用 source 实心色；尺寸与不确定动画共享同一配方。 */
export const progressStaticCss = [
  ".qk-progress--primary{--qk-progress-color:var(--qk-color-action-primary)}",
  ".qk-progress--info{--qk-progress-color:var(--qk-color-info-solid)}",
  ".qk-progress--success{--qk-progress-color:var(--qk-color-success-solid)}",
  ".qk-progress--warning{--qk-progress-color:var(--qk-color-warning-solid)}",
  ".qk-progress--danger{--qk-progress-color:var(--qk-color-danger-solid)}",
  ".qk-progress__circle-track{stroke:var(--qk-color-surface-selected)}.qk-progress__circle-range{transition:stroke-dashoffset 200ms ease-out}",
  ".qk-progress--sm .qk-progress__track{height:4px}.qk-progress--md .qk-progress__track{height:6px}.qk-progress--lg .qk-progress__track{height:8px}",
  ".qk-progress--sm .qk-progress__circle{--size:48px;--thickness:4px}.qk-progress--md .qk-progress__circle{--size:72px;--thickness:6px}.qk-progress--lg .qk-progress__circle{--size:96px;--thickness:8px}",
  ".qk-progress--spinner.qk-progress--sm .qk-progress__circle{--size:16px;--thickness:2px}.qk-progress--spinner.qk-progress--md .qk-progress__circle{--size:20px;--thickness:2px}.qk-progress--spinner.qk-progress--lg .qk-progress__circle{--size:24px;--thickness:2.5px}",
  ".qk-progress--sm .qk-progress__circle-value{font-size:11px}.qk-progress--md .qk-progress__circle-value{font-size:12px}.qk-progress--lg .qk-progress__circle-value{font-size:14px}",
  ".qk-progress__range[data-state=indeterminate]{width:38%!important;animation:qk-progress-linear 1.1s ease-in-out infinite}",
  ".qk-progress__range[dir=rtl][data-state=indeterminate]{animation-name:qk-progress-linear-rtl}",
  ".qk-progress__circle-range[data-state=indeterminate]{stroke-dasharray:calc(var(--circumference)*.24) calc(var(--circumference)*.76);animation:qk-progress-circle .9s linear infinite}",
  "@keyframes qk-progress-linear{from{transform:translateX(-105%)}to{transform:translateX(265%)}}",
  "@keyframes qk-progress-linear-rtl{from{transform:translateX(105%)}to{transform:translateX(-265%)}}",
  "@keyframes qk-progress-circle{from{transform:rotate(-90deg)}to{transform:rotate(270deg)}}",
  "@media (prefers-reduced-motion:reduce){.qk-progress__circle-range{transition:none}.qk-progress__range[data-state=indeterminate],.qk-progress__circle-range[data-state=indeterminate]{animation:none}}"
].join("");
