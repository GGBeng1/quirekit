import type { BlockContent, DefinitionContent, ListItem, RootContent, Table } from 'mdast';
import { loss } from '../diagnostics';
import { fitImage } from './image';
import { lineOf, mapInline } from './inline';
import type { PdfContent, PdfMappingContext } from './types';

/** Usable width of an A4 page with the exporter's margins, in points. */
export const contentWidth = 595.28 - 2 * 56;
const headingSizes = [20, 17, 15, 13, 12, 11];
const quoteLayout = { hLineWidth: () => 0, vLineWidth: (index: number) => index === 0 ? 2 : 0, vLineColor: () => '#cbd5e1',
  paddingLeft: () => 10, paddingRight: () => 0, paddingTop: () => 2, paddingBottom: () => 2 };
const codeLayout = { hLineWidth: () => 0, vLineWidth: () => 0, fillColor: () => '#f6f8fa',
  paddingLeft: () => 8, paddingRight: () => 8, paddingTop: () => 6, paddingBottom: () => 6 };

/** @param text - Code or formula source. @returns A shaded box that keeps indentation. */
function sourceBox(text: string): PdfContent {
  return { table: { widths: ['*'], body: [[{ text, preserveLeadingSpaces: true, fontSize: 9 }]] }, layout: codeLayout, margin: [0, 2, 0, 10] };
}

/** @param item - List item. @param context - Mapping state. @returns Stacked item content, with a visible task marker. */
function listItem(item: ListItem, context: PdfMappingContext): PdfContent {
  const marker = item.checked === true ? '[x] ' : item.checked === false ? '[ ] ' : '';
  const blocks = mapBlocks(item.children, context);
  const [first, ...rest] = blocks;
  if (marker && first && typeof first === 'object' && !Array.isArray(first) && 'text' in first) {
    return { stack: [{ ...first, text: [marker, ...[first.text as PdfContent].flat()] }, ...rest] };
  }
  return { stack: blocks };
}

/** @param table - GFM table. @param context - Mapping state. @returns A pdfmake table with the first row repeated on each page. */
function table(table: Table, context: PdfMappingContext): PdfContent {
  const columns = Math.max(...table.children.map(row => row.children.length));
  const body = table.children.map((row, index) => Array.from({ length: columns }, (_, column) => {
    const cell = row.children[column];
    return { text: cell ? mapInline(cell.children, context) : '', bold: index === 0, alignment: table.align?.[column] ?? 'left' };
  }));
  return { table: { headerRows: 1, widths: Array(columns).fill('*'), body }, layout: 'lightHorizontalLines', margin: [0, 2, 0, 10] };
}

/**
 * Maps block content in reading order. Images that stand alone in a
 * paragraph become figures; formulas stay as LaTeX source; footnote
 * definitions are collected for the end of the document.
 * @param nodes - Block children of the root, a quote, a list item or a note.
 * @param context - Mapping state of this document.
 * @returns pdfmake content.
 */
export function mapBlocks(nodes: readonly (RootContent | BlockContent | DefinitionContent)[], context: PdfMappingContext): PdfContent[] {
  return nodes.flatMap((node): PdfContent[] => {
    switch (node.type) {
      case 'heading':
        return [{ text: mapInline(node.children, context), fontSize: headingSizes[node.depth - 1], bold: true, margin: [0, 10, 0, 6] }];
      case 'paragraph': {
        const only = node.children.length === 1 ? node.children[0] : undefined;
        if (only?.type === 'image') {
          const image = context.images.get(only.url);
          if (image) return [{ image, ...fitImage(image, contentWidth, 640), margin: [0, 2, 0, 10] }];
          context.diagnostics.push(loss('export', 'image-unavailable', lineOf(only), 'An image could not be resolved and was kept as its alternative text.'));
          return [{ text: `[${only.alt ?? ''}]`, color: '#6b7280', margin: [0, 0, 0, 8] }];
        }
        return [{ text: mapInline(node.children, context), margin: [0, 0, 0, 8] }];
      }
      case 'blockquote':
        return [{ table: { widths: ['*'], body: [[{ stack: mapBlocks(node.children, context) }]] }, layout: quoteLayout, margin: [0, 2, 0, 8] }];
      case 'list': {
        const items = node.children.map(item => listItem(item, context));
        return [node.ordered ? { ol: items, start: node.start ?? 1, margin: [0, 0, 0, 8] } : { ul: items, margin: [0, 0, 0, 8] }];
      }
      case 'code': return [sourceBox(node.value)];
      case 'math':
        context.diagnostics.push(loss('export', 'math-unavailable', lineOf(node), 'A block formula was kept as LaTeX source.'));
        return [sourceBox(node.value)];
      case 'table': return [table(node, context)];
      case 'thematicBreak':
        return [{ canvas: [{ type: 'line', x1: 0, y1: 4, x2: contentWidth, y2: 4, lineWidth: 0.5, lineColor: '#cbd5e1' }], margin: [0, 4, 0, 10] }];
      case 'html':
        context.diagnostics.push(loss('export', 'block-source', lineOf(node), 'An HTML block was kept as source.'));
        return [sourceBox(node.value)];
      default: return [];
    }
  });
}
