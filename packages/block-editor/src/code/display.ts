import type { Attributes } from "@quirekit/core";
import type { BlockCodeDisplay } from "./types";

/** @param attrs - Imported or canonical attributes. @returns Safe display settings. */
export function codeDisplay(attrs: Readonly<Record<string, unknown>>): BlockCodeDisplay {
  return { lineNumbers: attrs.lineNumbers === true, wrap: attrs.wrap === true,
    height: typeof attrs.height === "number" && Number.isInteger(attrs.height) && attrs.height >= 120 && attrs.height <= 800 ? attrs.height : null,
    theme: attrs.theme === "dark" || attrs.theme === "light" ? attrs.theme : "auto" };
}
/** @param a - Prior settings. @param b - Candidate settings. @returns Whether the complete display contract is equal. */
export function sameCodeDisplay(a: BlockCodeDisplay, b: BlockCodeDisplay): boolean {
  return a.lineNumbers === b.lineNumbers && a.wrap === b.wrap && a.height === b.height && a.theme === b.theme;
}
/** @returns HTML/JSON attributes owned by the Block product, without altering generic code semantics. */
export function codeDisplayAttributes(): Attributes {
  return {
    lineNumbers: { default: false, parseHTML: element => element.dataset.lineNumbers === "true", renderHTML: attrs => ({ "data-line-numbers": String(attrs.lineNumbers === true) }) },
    wrap: { default: false, parseHTML: element => element.dataset.wrap === "true", renderHTML: attrs => ({ "data-wrap": String(attrs.wrap === true) }) },
    height: { default: null, parseHTML: element => codeDisplay({ height: Number(element.dataset.height) }).height, renderHTML: attrs => ({ "data-height": codeDisplay(attrs).height }) },
    theme: { default: "auto", parseHTML: element => codeDisplay({ theme: element.dataset.theme }).theme, renderHTML: attrs => ({ "data-theme": codeDisplay(attrs).theme }) }
  };
}
