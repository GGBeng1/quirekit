/// <reference path="../vendor.d.ts" />
import type pdfMakeInstance from 'pdfmake';
import type { MdBasicPdfFonts } from '../types';

/** Family name registered on the shared pdfmake instance. */
export const pdfFontFamily = 'QuireBasicSans';
const files = { regular: 'quire-basic-sans-regular', bold: 'quire-basic-sans-bold' } as const;
let installed: Promise<void> | undefined;

/** @returns Default CJK-capable faces shipped by `@quirekit/font-pack`. */
async function defaultFonts(): Promise<MdBasicPdfFonts> {
  const { resolveQuirePortablePdfFontUrls } = await import('@quirekit/font-pack/pdf/browser');
  const urls = resolveQuirePortablePdfFontUrls();
  return { regular: urls['noto-sans-hans-400-normal'], bold: urls['noto-sans-hans-700-normal'] };
}

/** @param source - Font URL or bytes. @param signal - Export lifetime. @returns Font bytes. */
async function read(source: string | Uint8Array, signal: AbortSignal): Promise<Uint8Array> {
  if (typeof source !== 'string') return source;
  const response = await fetch(source, { signal });
  if (!response.ok) throw new Error(`Font request failed with ${response.status}: ${source}`);
  return new Uint8Array(await response.arrayBuffer());
}

/**
 * Installs one regular and one bold face covering CJK and Latin text.
 * pdfmake picks one font per run without glyph fallback, so a single
 * CJK face serves body, headings and code alike. Fonts load once per page.
 * @param pdfMake - Shared pdfmake instance.
 * @param fonts - Explicit faces, or undefined for the font-pack defaults.
 * @param signal - Lifetime of the first export that triggers loading.
 * @returns Completion once the family is registered.
 */
export function installPdfFonts(pdfMake: typeof pdfMakeInstance, fonts: MdBasicPdfFonts | undefined, signal: AbortSignal): Promise<void> {
  installed ??= (async () => {
    const selected = fonts ?? await defaultFonts();
    const [regular, bold] = await Promise.all([read(selected.regular, signal), read(selected.bold, signal)]);
    pdfMake.virtualfs.writeFileSync(files.regular, regular);
    pdfMake.virtualfs.writeFileSync(files.bold, bold);
    pdfMake.addFonts({ [pdfFontFamily]: { normal: files.regular, bold: files.bold, italics: files.regular, bolditalics: files.bold } });
  })();
  // A cancelled or failed load must not poison later exports.
  installed.catch(() => { installed = undefined; });
  return installed;
}
