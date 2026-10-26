/**
 * Loads only pinned local font ranges; every import is visible to downstream bundlers.
 * @param name - Engine font range filename.
 * @returns Completion of the range module registration.
 */
export function loadFontRange(name: string): Promise<unknown> {
  switch (name.replace(/\.js$/u, '')) {
    case "PUA": return import("@mathjax/mathjax-newcm-font/js/svg/dynamic/PUA.js");
    case "accents-b-i": return import("@mathjax/mathjax-newcm-font/js/svg/dynamic/accents-b-i.js");
    case "accents": return import("@mathjax/mathjax-newcm-font/js/svg/dynamic/accents.js");
    case "arabic": return import("@mathjax/mathjax-newcm-font/js/svg/dynamic/arabic.js");
    case "arrows": return import("@mathjax/mathjax-newcm-font/js/svg/dynamic/arrows.js");
    case "braille-d": return import("@mathjax/mathjax-newcm-font/js/svg/dynamic/braille-d.js");
    case "braille": return import("@mathjax/mathjax-newcm-font/js/svg/dynamic/braille.js");
    case "calligraphic": return import("@mathjax/mathjax-newcm-font/js/svg/dynamic/calligraphic.js");
    case "cherokee": return import("@mathjax/mathjax-newcm-font/js/svg/dynamic/cherokee.js");
    case "cyrillic-ss": return import("@mathjax/mathjax-newcm-font/js/svg/dynamic/cyrillic-ss.js");
    case "cyrillic": return import("@mathjax/mathjax-newcm-font/js/svg/dynamic/cyrillic.js");
    case "devanagari": return import("@mathjax/mathjax-newcm-font/js/svg/dynamic/devanagari.js");
    case "double-struck": return import("@mathjax/mathjax-newcm-font/js/svg/dynamic/double-struck.js");
    case "fraktur": return import("@mathjax/mathjax-newcm-font/js/svg/dynamic/fraktur.js");
    case "greek-ss": return import("@mathjax/mathjax-newcm-font/js/svg/dynamic/greek-ss.js");
    case "greek": return import("@mathjax/mathjax-newcm-font/js/svg/dynamic/greek.js");
    case "hebrew": return import("@mathjax/mathjax-newcm-font/js/svg/dynamic/hebrew.js");
    case "latin-b": return import("@mathjax/mathjax-newcm-font/js/svg/dynamic/latin-b.js");
    case "latin-bi": return import("@mathjax/mathjax-newcm-font/js/svg/dynamic/latin-bi.js");
    case "latin-i": return import("@mathjax/mathjax-newcm-font/js/svg/dynamic/latin-i.js");
    case "latin": return import("@mathjax/mathjax-newcm-font/js/svg/dynamic/latin.js");
    case "marrows": return import("@mathjax/mathjax-newcm-font/js/svg/dynamic/marrows.js");
    case "math": return import("@mathjax/mathjax-newcm-font/js/svg/dynamic/math.js");
    case "monospace-ex": return import("@mathjax/mathjax-newcm-font/js/svg/dynamic/monospace-ex.js");
    case "monospace-l": return import("@mathjax/mathjax-newcm-font/js/svg/dynamic/monospace-l.js");
    case "monospace": return import("@mathjax/mathjax-newcm-font/js/svg/dynamic/monospace.js");
    case "mshapes": return import("@mathjax/mathjax-newcm-font/js/svg/dynamic/mshapes.js");
    case "phonetics-ss": return import("@mathjax/mathjax-newcm-font/js/svg/dynamic/phonetics-ss.js");
    case "phonetics": return import("@mathjax/mathjax-newcm-font/js/svg/dynamic/phonetics.js");
    case "sans-serif-b": return import("@mathjax/mathjax-newcm-font/js/svg/dynamic/sans-serif-b.js");
    case "sans-serif-bi": return import("@mathjax/mathjax-newcm-font/js/svg/dynamic/sans-serif-bi.js");
    case "sans-serif-ex": return import("@mathjax/mathjax-newcm-font/js/svg/dynamic/sans-serif-ex.js");
    case "sans-serif-i": return import("@mathjax/mathjax-newcm-font/js/svg/dynamic/sans-serif-i.js");
    case "sans-serif-r": return import("@mathjax/mathjax-newcm-font/js/svg/dynamic/sans-serif-r.js");
    case "sans-serif": return import("@mathjax/mathjax-newcm-font/js/svg/dynamic/sans-serif.js");
    case "script": return import("@mathjax/mathjax-newcm-font/js/svg/dynamic/script.js");
    case "shapes": return import("@mathjax/mathjax-newcm-font/js/svg/dynamic/shapes.js");
    case "symbols-b-i": return import("@mathjax/mathjax-newcm-font/js/svg/dynamic/symbols-b-i.js");
    case "symbols": return import("@mathjax/mathjax-newcm-font/js/svg/dynamic/symbols.js");
    case "variants": return import("@mathjax/mathjax-newcm-font/js/svg/dynamic/variants.js");
    default: return Promise.reject(new Error(`Unknown local math font range: ${name}`));
  }
}
