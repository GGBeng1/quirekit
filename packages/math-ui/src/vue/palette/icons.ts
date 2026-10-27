import { defineQuireKitIcon, quireKitEditorIconData } from '@quirekit/ui';
import type { QuireKitIconData } from '@quirekit/ui';
import type { FormulaFamily } from './types';

/**
 * Admits original category artwork on the shared interface icon grid.
 * @param paths - Reviewed static SVG paths, without text or external content.
 * @returns Themed icon data independent of formula fonts and layout.
 */
function categoryIcon(paths: string): QuireKitIconData {
  return defineQuireKitIcon({
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`,
    source: 'custom', license: 'MIT',
  });
}

/** Sparse mathematical silhouettes with a common stroke and optical box. */
export const formulaCategoryIcons: Readonly<Record<FormulaFamily, QuireKitIconData>> = {
  basic: categoryIcon('<path d="m3 13 3-2 4 9 4-16h7"/>'),
  calculus: categoryIcon('<path d="M16 4c-3-2-5 0-5 4v8c0 4-2 6-5 4"/>'),
  operators: quireKitEditorIconData.sigma,
  functions: categoryIcon('<path d="M17 4c-3-1-5 1-5 4v8c0 4-2 5-5 4M8 10h8"/>'),
  accents: categoryIcon('<path d="m6 5 6-3 6 3M7 10l10 10M17 10 7 20"/>'),
  delimiters: categoryIcon('<path d="M7 4c-4 4-4 12 0 16M17 4c4 4 4 12 0 16"/>'),
  matrix: categoryIcon('<path d="M6 4H3v16h3M18 4h3v16h-3M9 8h.01M15 8h.01M9 16h.01M15 16h.01"/>'),
  sequences: categoryIcon('<path d="M11 8v9M11 11c0-4-7-4-7 0s7 4 7 0M15 15v6M15 17c0-3 5-3 5 0v4"/>'),
  greek: categoryIcon('<path d="M17 6c-2 4-4 12-8 12-5 0-6-12 0-12 4 0 5 7 6 10 1 2 3 2 5 0"/>'),
  symbols: categoryIcon('<path d="M5 9h14M12 3v12M5 20h14"/>'),
  common: quireKitEditorIconData.moreHorizontal,
};
