import type { QuireKitImagePreviewToolbar, QuireKitImagePreviewToolbarLayoutItem, QuireKitImagePreviewToolbarPart, QuireKitImagePreviewToolbarPreset } from './types';

/** 可复用和展开的只读工具栏预设。 */
export const quireImagePreviewToolbarPresets: Readonly<Record<QuireKitImagePreviewToolbarPreset, readonly QuireKitImagePreviewToolbarPart[]>> = Object.freeze({
  standard: Object.freeze(['counter', 'separator', 'zoomOut', 'scale', 'zoomIn', 'separator', 'fit', 'rotateRight', 'actions'] as const),
  compact: Object.freeze(['zoomOut', 'scale', 'zoomIn', 'actions'] as const),
  gallery: Object.freeze(['previous', 'counter', 'next', 'separator', 'zoomOut', 'scale', 'zoomIn', 'separator', 'fit', 'rotateLeft', 'rotateRight', 'actions'] as const)
});
const parts = new Set<QuireKitImagePreviewToolbarPart>(['zoomOut', 'scale', 'zoomIn', 'fit', 'rotateLeft', 'rotateRight', 'previous', 'counter', 'next', 'separator', 'actions']);
/** @param toolbar - Public toolbar configuration. @param hasActions - Whether the legacy actions slot exists. @param hasCustom - Whether custom positions can render. @returns Ordered, deduplicated layout with no empty edge dividers. */
export function resolveToolbarLayout(toolbar: QuireKitImagePreviewToolbar = true, hasActions = false, hasCustom = false): QuireKitImagePreviewToolbarLayoutItem[] {
  if (toolbar === false) return [];
  const layout = typeof toolbar === 'object' ? toolbar.layout ?? quireImagePreviewToolbarPresets[toolbar.preset ?? 'standard'] : quireImagePreviewToolbarPresets[typeof toolbar === 'string' ? toolbar : 'standard'];
  const result: QuireKitImagePreviewToolbarLayoutItem[] = [];
  const seen = new Set<string>();
  for (const part of layout ?? []) {
    if (typeof part === 'string' && (!parts.has(part) || (part === 'actions' && !hasActions))) continue;
    if (typeof part === 'object' && (!hasCustom || !part.slot?.trim())) continue;
    if (part === 'separator') {
      if (result.length && result.at(-1) !== 'separator') result.push(part);
      continue;
    }
    const key = typeof part === 'string' ? part : `slot:${part.slot}`;
    if (!seen.has(key)) { result.push(part); seen.add(key); }
  }
  if (result.at(-1) === 'separator') result.pop();
  return result;
}
