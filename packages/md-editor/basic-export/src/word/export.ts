import type { MdDocxDiagnostic, MdDocxExportResult, MdDocxRequest } from '@quirekit/md-editor';
import type { ConversionWarning, ImageAsset } from '@mohtasham/md-to-docx';
import { loss, note } from '../diagnostics';
import { prepareBasicMarkdown } from '../source/prepare';
import type { MdBasicExportOptions } from '../types';

/** Converter warning kinds mapped to md-editor report codes. */
const warningCodes: Readonly<Record<ConversionWarning['code'], string>> = {
  IMAGE_FALLBACK: 'image-unavailable', UNSUPPORTED_MATH: 'math-unavailable', UNRESOLVED_LINK: 'link-unavailable',
  DIAGRAM_FALLBACK: 'diagram-source', PLUGIN_FALLBACK: 'block-source', UNSUPPORTED_CONTENT: 'block-source',
};

/** @param dataUrl - Resolved PNG/JPEG data URI. @returns Decoded bytes for the converter, or null when the URI is not raster base64. */
function decodeImage(dataUrl: string): ImageAsset | null {
  const match = /^data:(image\/(?:png|jpeg));base64,(.+)$/u.exec(dataUrl);
  if (!match) return null;
  const binary = atob(match[2]!), data = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) data[index] = binary.charCodeAt(index);
  return { data, contentType: match[1]! };
}

/** @param diagnostics - Collected report. @param request - Loss policy of this operation. */
function enforce(diagnostics: readonly MdDocxDiagnostic[], request: MdDocxRequest): void {
  const losses = diagnostics.filter(item => item.severity === 'warning');
  if (request.policy.lossPolicy === 'strict' && losses.length) throw new Error(`Strict export rejected ${losses.length} approximation(s): ${losses[0]!.message}`);
}

/**
 * Exports a captured Markdown snapshot with the open-source converter.
 * MSFE syntax is first rewritten into plain Markdown; every rewrite and
 * converter fallback is reported instead of being dropped silently.
 * @param markdown - Captured editor source.
 * @param request - Policy, installed features and lifetime of this export.
 * @param options - Converter limits.
 * @returns DOCX bytes and the conversion report.
 */
export async function exportBasicDocx(markdown: string, request: MdDocxRequest, options: MdBasicExportOptions): Promise<MdDocxExportResult> {
  const prepared = prepareBasicMarkdown(markdown, { alerts: true, containers: request.features.containers !== false });
  const diagnostics: MdDocxDiagnostic[] = [...prepared.diagnostics];
  if (request.policy.template) diagnostics.push(note('export', 'template-ignored', 'The basic converter does not apply export styles; its default layout is used.'));
  const { convertMarkdownToArrayBuffer } = await import('@mohtasham/md-to-docx');
  const resolveImage = request.policy.resolveImage;
  const data = await convertMarkdownToArrayBuffer(prepared.markdown, {
    signal: request.signal,
    onWarning: warning => diagnostics.push(loss('export', warningCodes[warning.code] ?? 'block-source', warning.source ?? '/', warning.message)),
    ...(request.policy.documentTitle ? { metadata: { title: request.policy.documentTitle } } : {}),
    imageHandling: {
      ...(options.maxImages === undefined ? {} : { maxImages: options.maxImages }),
      ...(resolveImage ? { resolve: async (source: string) => { const url = await resolveImage(source); return url ? decodeImage(url) : null; } } : {}),
    },
  });
  request.signal.throwIfAborted();
  enforce(diagnostics, request);
  return { data: new Uint8Array(data), diagnostics };
}
