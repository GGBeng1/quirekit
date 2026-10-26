/**
 * Styles an existing native scroller with the same small thumb as ScrollArea.
 *
 * @param selector - Scroll owner selector, including any opt-in subtree scope.
 * @returns Static CSS that leaves scrolling and overflow ownership unchanged.
 */
export function createNativeScrollbarCss(selector: string): string {
  return [
    `${selector}{scrollbar-width:thin;scrollbar-color:var(--qk-color-border-subtle) transparent}`,
    // Non-auto standard values override WebKit painting; keep the standard fallback elsewhere.
    "@supports selector(::-webkit-scrollbar){@media (forced-colors:none){",
    `${selector}{scrollbar-width:auto;scrollbar-color:auto}`,
    `${selector}::-webkit-scrollbar{width:8px;height:8px}`,
    `${selector}::-webkit-scrollbar-track,${selector}::-webkit-scrollbar-corner{background:transparent}`,
    `${selector}::-webkit-scrollbar-thumb{min-height:20px;min-width:20px;border:2px solid transparent;border-radius:var(--qk-radius-pill);background-color:var(--qk-color-border-subtle);background-clip:padding-box}`,
    `${selector}::-webkit-scrollbar-thumb:hover,${selector}::-webkit-scrollbar-thumb:active{background-color:var(--qk-color-border-default)}`,
    `${selector}::-webkit-scrollbar-button{display:none;width:0;height:0}`,
    "}}"
  ].join("");
}

/** Opt-in native styling; low specificity preserves controls that hide their own scrollbars. */
export const nativeScrollbarStaticCss = createNativeScrollbarCss(":where(.qk-scrollbars, .qk-scrollbars *)");
