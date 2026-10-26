import type { MathFormulaLayout } from '@quirekit/math';
import type { MathSvgExportOptions } from './types';

/**
 * Converts a presentation layout into a self-contained SVG image for export or Canvas.
 * @param layout - Presentation-only output from the matching renderer.
 * @param options - Explicit pixel dimensions and resolved color.
 * @returns SVG with no webfont, page stylesheet or external glyph-cache dependency.
 */
export function serializeMathSvg(layout: MathFormulaLayout, options: MathSvgExportOptions): string {
  if (layout.slots.length) throw new Error('Export requires presentation-only formula layout');
  if (!Number.isFinite(options.fontSize) || options.fontSize <= 0) throw new Error('Invalid formula export size');
  const color = (options.color ?? '#000000').replace(/[&<>"']/gu, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character]!);
  // A standalone image is parsed as strict XML, where `<` inside an attribute value is fatal.
  const strict = layout.svg.replace(/="([^"]*)"/gu, (_match, value: string) => `="${value.replace(/</gu, '&lt;').replace(/>/gu, '&gt;')}"`);
  return strict.replace(/\swidth="[^"]*"/u, ` width="${layout.width * options.fontSize}px"`).replace(/\sheight="[^"]*"/u, ` height="${layout.height * options.fontSize}px"`).replace('<svg ', `<svg color="${color}" `);
}
