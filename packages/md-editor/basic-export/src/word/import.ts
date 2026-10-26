/// <reference path="../vendor.d.ts" />
import type { MdDocxDiagnostic, MdDocxImportResult, MdDocxRequest } from '@quirekit/md-editor';
import { loss, note } from '../diagnostics';

/**
 * Imports a Word file with Mammoth (DOCX → semantic HTML) and Turndown
 * (HTML → GFM). Mammoth keeps headings, lists, tables, links and images;
 * everything it skips, native equations included, is reported.
 * @param data - Complete DOCX bytes.
 * @param request - Policy and lifetime of this import.
 * @returns Markdown and the conversion report.
 */
export async function importBasicDocx(data: Uint8Array, request: MdDocxRequest): Promise<MdDocxImportResult> {
  const [{ default: mammoth }, { default: TurndownService }, { gfm }] = await Promise.all([import('mammoth'), import('turndown'), import('turndown-plugin-gfm')]);
  request.signal.throwIfAborted();
  const diagnostics: MdDocxDiagnostic[] = [];
  const storeImage = request.policy.storeImage;
  const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
  // Mammoth reads `arrayBuffer` in browsers and `buffer` in Node; both name the same bytes.
  const input = { arrayBuffer, buffer: data } as unknown as Parameters<typeof mammoth.convertToHtml>[0];
  const result = await mammoth.convertToHtml(input, {
    convertImage: mammoth.images.imgElement(async image => {
      if (!/^image\/(?:png|jpeg)$/u.test(image.contentType)) {
        diagnostics.push(loss('import', 'image-unavailable', '/', `An ${image.contentType} image is not supported and was omitted.`, 'unsupported'));
        return { src: '' };
      }
      const dataUrl = `data:${image.contentType};base64,${await image.readAsBase64String()}`;
      try {
        return { src: (await storeImage?.({ dataUrl, alt: '' })) ?? dataUrl };
      } catch {
        diagnostics.push(loss('import', 'image-storage-failed', '/', 'Image storage failed; the embedded image data was kept.'));
        return { src: dataUrl };
      }
    }),
  });
  request.signal.throwIfAborted();
  for (const message of result.messages) {
    const code = /oMath/u.test(message.message) ? 'math-unavailable' : 'block-flattened';
    diagnostics.push(loss('import', code, '/', message.message, 'unsupported'));
  }
  const turndown = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced', bulletListMarker: '-', emDelimiter: '*' });
  turndown.use(gfm);
  // Mammoth wraps cell text in paragraphs; GFM table cells must stay on one line.
  turndown.addRule('cell-paragraph', {
    filter: node => node.nodeName === 'P' && ['TD', 'TH'].includes(node.parentNode?.nodeName ?? ''),
    replacement: content => `${content.replace(/\s*\n+\s*/gu, ' ').trim()} `,
  });
  diagnostics.push(note('import', 'document-projection', 'Only body semantics Mammoth recognizes are kept; Word layout, comments and revisions are not imported.'));
  const losses = diagnostics.filter(item => item.severity === 'warning');
  if (request.policy.lossPolicy === 'strict' && losses.length) throw new Error(`Strict import rejected ${losses.length} omission(s): ${losses[0]!.message}`);
  return { markdown: `${turndown.turndown(result.value).trim()}\n`, diagnostics };
}
