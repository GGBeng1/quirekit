import type { QuirePortableMonoFontAsset, QuirePortablePdfFontAsset } from "./types";

/** @returns Public asset URLs only; the application owns requests, caching and font installation. */
export function resolveQuirePortablePdfFontUrls(): Readonly<Record<QuirePortablePdfFontAsset["id"], string>> {
  // Both source and published entries sit two levels below the package root.
  // Literal URLs also let browser bundlers relocate the package-owned binaries.
  return Object.freeze({
    "carlito-400-normal": new URL("../../dist/pdf/fonts/Carlito-Regular.ttf", import.meta.url).href,
    "carlito-400-italic": new URL("../../dist/pdf/fonts/Carlito-Italic.ttf", import.meta.url).href,
    "carlito-700-normal": new URL("../../dist/pdf/fonts/Carlito-Bold.ttf", import.meta.url).href,
    "carlito-700-italic": new URL("../../dist/pdf/fonts/Carlito-BoldItalic.ttf", import.meta.url).href,
    "noto-serif-sc-400-normal": new URL("../../dist/pdf/fonts/NotoSerifSC-Regular.ttf", import.meta.url).href,
    "noto-serif-sc-700-normal": new URL("../../dist/pdf/fonts/NotoSerifSC-Bold.ttf", import.meta.url).href,
    "noto-sans-hans-400-normal": new URL("../../dist/pdf/fonts/NotoSansHans-Regular.otf", import.meta.url).href,
    "noto-sans-hans-700-normal": new URL("../../dist/pdf/fonts/NotoSansHans-Bold.otf", import.meta.url).href,
    "noto-sans-symbols-2-400-normal": new URL("../../dist/pdf/fonts/NotoSansSymbols2-Regular.ttf", import.meta.url).href,
  });
}

/** @returns Public monospace asset URLs, resolved like {@link resolveQuirePortablePdfFontUrls}. */
export function resolveQuirePortableMonoFontUrls(): Readonly<Record<QuirePortableMonoFontAsset["id"], string>> {
  return Object.freeze({
    "dejavu-sans-mono-400-normal": new URL("../../dist/pdf/fonts/DejaVuSansMono.ttf", import.meta.url).href,
    "dejavu-sans-mono-400-italic": new URL("../../dist/pdf/fonts/DejaVuSansMono-Oblique.ttf", import.meta.url).href,
    "dejavu-sans-mono-700-normal": new URL("../../dist/pdf/fonts/DejaVuSansMono-Bold.ttf", import.meta.url).href,
    "dejavu-sans-mono-700-italic": new URL("../../dist/pdf/fonts/DejaVuSansMono-BoldOblique.ttf", import.meta.url).href,
  });
}
