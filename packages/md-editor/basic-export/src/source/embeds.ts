import type { MdDocxDiagnostic } from '@quirekit/md-editor';
import { loss } from '../diagnostics';

/** Text-diagram languages whose source stays readable as a code block. */
const textDiagrams = new Set(['mermaid', 'plantuml', 'puml', 'dot', 'graphviz']);
const rasterPreview = /^data:image\/(?:png|jpeg);base64,[A-Za-z0-9+/=]+$/u;

/** @param body - Fenced JSON of an embedded object. @returns Its title and raster preview, when present. */
function readEmbed(body: string): { title?: string; preview?: string } {
  try {
    const value = JSON.parse(body) as { title?: unknown; preview?: { dataUrl?: unknown } };
    const preview = typeof value?.preview?.dataUrl === 'string' && rasterPreview.test(value.preview.dataUrl) ? value.preview.dataUrl : undefined;
    return { ...(typeof value?.title === 'string' && value.title.trim() ? { title: value.title.trim() } : {}), ...(preview ? { preview } : {}) };
  } catch {
    return {};
  }
}

/**
 * Rewrites one fenced block the open-source converters cannot draw.
 * Embedded objects become their saved preview image or a visible
 * placeholder; text diagrams keep their source as ordinary code.
 * @param language - Fence info word.
 * @param fence - Complete original fence lines.
 * @param indent - Leading indentation of the fence.
 * @param line - One-based source line for the report.
 * @param diagnostics - Report receiving one entry per rewritten block.
 * @returns Replacement lines, or the original fence when nothing changes.
 */
export function rewriteFence(language: string, fence: readonly string[], indent: string, line: number, diagnostics: MdDocxDiagnostic[]): readonly string[] {
  const path = `line ${line}`;
  if (textDiagrams.has(language)) {
    diagnostics.push(loss('export', 'diagram-source', path, `A ${language} diagram was kept as code; no graphic was drawn.`));
    return fence;
  }
  if (!language.startsWith('quirekit-')) return fence;
  const { title, preview } = readEmbed(fence.slice(1, -1).join('\n'));
  const label = title ? title.replace(/[[\]]/gu, '') : language;
  if (preview) {
    diagnostics.push(loss('export', 'diagram-preview', path, `${language} was exported as its preview image; the editable source is not kept.`));
    return [`${indent}![${label}](${preview})`];
  }
  diagnostics.push(loss('export', 'embed-placeholder', path, `${language} could not be converted and was replaced by a placeholder.`, 'unsupported'));
  return [`${indent}*[${language}${title ? `: ${label}` : ''}]*`];
}
