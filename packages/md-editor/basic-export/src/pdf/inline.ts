import type { PhrasingContent } from 'mdast';
import { loss } from '../diagnostics';
import type { PdfContent, PdfMappingContext } from './types';

/** Inline styles inherited from enclosing emphasis, strong, delete and link nodes. */
interface InlineStyle {
  /** Bold weight. */ readonly bold?: boolean;
  /** Italic flag; the bundled CJK face has no italic, so it renders upright. */ readonly italics?: boolean;
  /** Strikethrough. */ readonly decoration?: string;
  /** Link target. */ readonly link?: string;
}

/** @param label - Reference label. @returns Label normalized like CommonMark reference matching. */
export function referenceKey(label: string): string {
  return label.trim().replace(/\s+/gu, ' ').toLowerCase();
}

/**
 * Maps phrasing content to pdfmake text runs. Constructs PDF text cannot
 * express (inline math, images inside a sentence) stay readable as text and
 * are reported.
 * @param nodes - Phrasing children of one block.
 * @param context - Mapping state of this document.
 * @param style - Inherited inline style.
 * @returns Text runs.
 */
export function mapInline(nodes: readonly PhrasingContent[], context: PdfMappingContext, style: InlineStyle = {}): PdfContent[] {
  return nodes.flatMap((node): PdfContent[] => {
    const linked = style.link ? { link: style.link, color: '#1d4ed8', decoration: 'underline' } : {};
    switch (node.type) {
      case 'text': return [{ text: node.value, ...style, ...linked }];
      case 'strong': return mapInline(node.children, context, { ...style, bold: true });
      case 'emphasis':
        context.diagnostics.push(loss('export', 'pdf-italic', lineOf(node), 'Italic text is upright because the embedded CJK font has no italic face.'));
        return mapInline(node.children, context, { ...style, italics: true });
      case 'delete': return mapInline(node.children, context, { ...style, decoration: 'lineThrough' });
      case 'link': return mapInline(node.children, context, { ...style, link: node.url });
      case 'linkReference': {
        const url = context.definitions.get(referenceKey(node.label ?? node.identifier));
        return mapInline(node.children, context, url ? { ...style, link: url } : style);
      }
      case 'inlineCode': return [{ text: node.value, background: '#f1f3f5', ...style, ...linked }];
      case 'break': return ['\n'];
      case 'inlineMath':
        context.diagnostics.push(loss('export', 'math-unavailable', lineOf(node), 'An inline formula was kept as LaTeX source.'));
        return [{ text: `$${node.value}$`, ...style }];
      case 'footnoteReference': {
        if (!context.footnotes.has(node.identifier)) context.footnotes.set(node.identifier, context.footnotes.size + 1);
        return [{ text: `[${context.footnotes.get(node.identifier)}]`, sup: true }];
      }
      case 'image': case 'imageReference':
        context.diagnostics.push(loss('export', 'image-unavailable', lineOf(node), 'An image inside a sentence was kept as its alternative text.'));
        return [{ text: `[${node.alt ?? ''}]`, color: '#6b7280' }];
      case 'html':
        context.diagnostics.push(loss('export', 'inline-source', lineOf(node), 'Inline HTML was kept as source text.'));
        return [{ text: node.value, ...style }];
      default: return [];
    }
  });
}

/** @param node - Positioned mdast node. @returns Report path naming its source line. */
export function lineOf(node: { position?: { start: { line: number } } | undefined }): string {
  return node.position ? `line ${node.position.start.line}` : '/';
}
