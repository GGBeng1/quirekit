import type { FootnoteDefinition, Root } from 'mdast';
import type { MdDocxDiagnostic } from '@quirekit/md-editor';
import { loss } from '../diagnostics';
import { mapBlocks } from './blocks';
import { referenceKey } from './inline';
import type { PdfContent, PdfMappingContext } from './types';

const rasterDataUrl = /^data:image\/(?:png|jpeg);base64,/u;

/** @param markdown - Converter-ready source. @returns Parsed GFM tree with math nodes. */
async function parse(markdown: string): Promise<Root> {
  const [{ unified }, { default: remarkParse }, { default: remarkGfm }, { default: remarkMath }] = await Promise.all([
    import('unified'), import('remark-parse'), import('remark-gfm'), import('remark-math')]);
  return unified().use(remarkParse).use(remarkGfm).use(remarkMath).parse(markdown) as Root;
}

/** @param root - Parsed tree. @param visit - Callback for every node. */
function walk(root: { children?: unknown[] }, visit: (node: { type: string; [key: string]: unknown }) => void): void {
  for (const child of (root.children ?? []) as { type: string; children?: unknown[] }[]) { visit(child); walk(child, visit); }
}

/**
 * Builds a pdfmake document definition. Images resolve before mapping so
 * the mapping itself stays synchronous; footnotes become a numbered list
 * after the body.
 * @param markdown - Converter-ready source.
 * @param font - Registered font family.
 * @param resolveImage - Host image resolver.
 * @param diagnostics - Report receiving every approximation.
 * @returns Document definition.
 */
export async function createPdfDefinition(markdown: string, font: string, resolveImage: ((source: string) => Promise<string | null>) | undefined,
  diagnostics: MdDocxDiagnostic[]): Promise<object> {
  const root = await parse(markdown);
  const definitions = new Map<string, string>(), notes = new Map<string, FootnoteDefinition>(), sources = new Set<string>();
  walk(root, node => {
    if (node.type === 'definition') definitions.set(referenceKey(String(node.label ?? node.identifier)), String(node.url));
    if (node.type === 'footnoteDefinition') notes.set(String(node.identifier), node as unknown as FootnoteDefinition);
    if (node.type === 'image') sources.add(String(node.url));
  });
  const images = new Map<string, string | null>();
  await Promise.all([...sources].map(async source => {
    const resolved = rasterDataUrl.test(source) ? source : await resolveImage?.(source).catch(() => null) ?? null;
    images.set(source, resolved && rasterDataUrl.test(resolved) ? resolved : null);
  }));
  const context: PdfMappingContext = { diagnostics, images, definitions, footnotes: new Map(), font };
  const content: PdfContent[] = mapBlocks(root.children, context);
  if (context.footnotes.size) {
    // Notes are numbered by first reference; definitions never referenced are dropped by Markdown itself.
    const ordered = [...context.footnotes].sort((a, b) => a[1] - b[1]);
    content.push({ canvas: [{ type: 'line', x1: 0, y1: 4, x2: 160, y2: 4, lineWidth: 0.5, lineColor: '#cbd5e1' }], margin: [0, 12, 0, 6] });
    for (const [identifier, number] of ordered) {
      const definition = notes.get(identifier);
      diagnostics.push(loss('export', 'footnote-flattened', '/', 'A footnote was placed in the notes list at the end of the document.'));
      content.push({ stack: [{ text: `[${number}]`, fontSize: 8, color: '#6b7280' }, ...(definition ? mapBlocks(definition.children, context) : [])], fontSize: 9 });
    }
  }
  return { content, pageSize: 'A4', pageMargins: [56, 56, 56, 56], defaultStyle: { font, fontSize: 10.5, lineHeight: 1.35 },
    footer: (page: number, pages: number) => ({ text: `${page} / ${pages}`, alignment: 'center', fontSize: 8, color: '#9ca3af', margin: [0, 16, 0, 0] }) };
}
