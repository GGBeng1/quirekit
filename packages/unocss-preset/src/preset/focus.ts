/** Interactive targets that receive the shared keyboard focus ring. */
const focusTargets = [
  "button",
  "a[href]",
  "summary",
  '[role="button"]',
  '[role="link"]',
  '[role="tab"]',
  '[tabindex="0"]'
].join(", ");

/**
 * Targets whose focus is already expressed by composite-widget highlight or a field boundary.
 * Text entry keeps the 1px field contour; menu, option, tree and grid rows keep their highlight.
 */
const excludedTargets = [
  "input",
  "textarea",
  "select",
  "[contenteditable]",
  '[role="menuitem"]',
  '[role="menuitemcheckbox"]',
  '[role="menuitemradio"]',
  '[role="option"]',
  '[role="treeitem"]',
  '[role="gridcell"]',
  '[role="tabpanel"]',
  '[role="dialog"]',
  '[role="alertdialog"]',
  '[role="menu"]',
  '[role="listbox"]'
].join(", ");

/** Headless controls that focus a hidden input and mirror keyboard focus through `data-focus-visible`. */
const mirroredTargets = [
  ".qk-checkbox__control",
  ".qk-radio-group__control",
  ".qk-switch__control",
  ".qk-segmented__item"
].join(", ");

/** Filled or very small targets draw the ring outside, where it cannot blend into the fill. */
const outsetTargets = [
  '.qk-button[class*="-solid"]',
  ".qk-checkbox__control",
  ".qk-radio-group__control",
  ".qk-switch__control",
  ".qk-slider__thumb"
].join(", ");

/** Suppresses the ring after pointer input, including focus returned programmatically by closing popups. */
const scope = 'html:not([data-qk-modality="pointer"])';

/**
 * Emits the keyboard-only focus ring shared by every action component.
 *
 * `:focus-visible` and Ark's mirrored `data-focus-visible` never match a direct pointer click;
 * `data-qk-modality` (see `trackQuireKitInputModality`) additionally covers focus returned by popups.
 * The ring is an outline, so it follows the border radius and never changes layout. The rules are
 * emitted after the recipe layer so recipe-level `outline: 0` resets cannot hide them.
 *
 * @returns Focus-ring CSS rules.
 */
export function createKeyboardFocusCss(): string {
  const ring = "outline: var(--qk-border-width-focus) solid var(--qk-color-border-focus);";
  return [
    `${scope} :where(${focusTargets}):not(${excludedTargets}):focus-visible, ${scope} :where(${mirroredTargets})[data-focus-visible] { ${ring} outline-offset: calc(-1 * var(--qk-border-width-focus)); }`,
    // Same specificity as the rule above; source order lets the outset offset win.
    `${scope} :where(${outsetTargets}):not(${excludedTargets}):focus-visible, ${scope} :where(${outsetTargets})[data-focus-visible] { ${ring} outline-offset: var(--qk-border-width-focus); }`,
    // Media seeks use a filled dot; merge the keyboard contour with its fill rather than adding a hollow ring.
    `${scope} .qk-media-player__thumb:focus-visible { ${ring} outline-color: var(--qk-color-action-primary); outline-offset: 0; }`,
    `@media (forced-colors: active) { ${scope} .qk-media-player__thumb:focus-visible { outline-color: Highlight; } }`
  ].join("\n");
}
