import { quireKitDefaultLocale } from '../../../locale/resolve';
import type { QuireKitSelectionHandle, QuireKitSelectionHandlesProps } from '../types';
import type { SelectionHandleElements, SelectionHandlePresentation } from './types';

/** Stable DOM order; changing range direction never replaces the captured button. */
export const selectionHandleIds = ['caret', 'anchor', 'focus'] as const;

/** @param doc - Owning document. @param id - Stable endpoint. @returns Permanent handle anatomy. */
export function createHandle(doc: Document, id: QuireKitSelectionHandle): SelectionHandleElements {
  const root = doc.createElement('div');
  root.className = 'qk-selection-handles__endpoint';
  root.dataset.handle = id;
  const stem = doc.createElement('span');
  stem.className = 'qk-selection-handles__stem';
  stem.setAttribute('aria-hidden', 'true');
  const button = doc.createElement('button');
  button.type = 'button';
  button.className = 'qk-selection-handles__grip';
  button.setAttribute('aria-keyshortcuts', 'ArrowLeft ArrowRight ArrowUp ArrowDown');
  const knob = doc.createElement('span');
  knob.className = 'qk-selection-handles__knob';
  knob.setAttribute('aria-hidden', 'true');
  button.append(knob);
  const marker = doc.createElement('span');
  marker.className = 'qk-selection-handles__marker';
  marker.setAttribute('aria-hidden', 'true');
  root.append(stem, marker, button);
  return { root, stem, button };
}

/**
 * Resolves visibility and visual side without interpreting document positions.
 * @param state - Current host projection.
 * @param id - Stable endpoint identity.
 * @returns A valid visible endpoint, or null.
 */
export function getHandlePresentation(state: QuireKitSelectionHandlesProps, id: QuireKitSelectionHandle): SelectionHandlePresentation | null {
  const value = state.selection;
  if (!value || (value.type === 'caret') !== (id === 'caret')) return null;
  const geometry = value.type === 'caret' ? value.caret : value[id as 'anchor' | 'focus'];
  if (!geometry || ![geometry.x, geometry.y, geometry.height].every(Number.isFinite) || geometry.height <= 0) return null;
  const side = value.type === 'range' && ((id === 'anchor') !== !!value.backward) ? 'start' : 'end';
  const labels = state.messages ?? quireKitDefaultLocale.messages.selectionHandles;
  return { geometry, side: state.selecting && id === 'focus' ? 'end' : side, boundary: id === 'caret' ? 'caret' : side, label: labels[id === 'caret' ? 'caret' : side] };
}

/**
 * Allows only a held caret to become a range without losing its captured input.
 * @param previous - Previously accepted host projection.
 * @param next - Next host projection.
 * @param handle - Stable captured endpoint.
 * @param selecting - Whether this caret owns a recognized long press.
 * @returns Whether the new geometry can continue the same gesture.
 */
export function canContinueHandleDrag(previous: QuireKitSelectionHandlesProps, next: QuireKitSelectionHandlesProps, handle: QuireKitSelectionHandle, selecting: boolean): boolean {
  if (next.disabled) return false;
  const promotesCaret = selecting && handle === 'caret' && next.selection?.type === 'range';
  if (previous.selection?.type !== next.selection?.type && !promotesCaret) return false;
  return getHandlePresentation(next, promotesCaret ? 'focus' : handle) !== null;
}

/** @param nodes - Permanent anatomy. @param value - Valid geometry, or hidden. @param disabled - Interaction gate. */
export function renderHandle(nodes: SelectionHandleElements, value: SelectionHandlePresentation | null, disabled: boolean): void {
  nodes.root.hidden = !value;
  nodes.button.disabled = disabled || !value;
  if (!value) return;
  nodes.root.dataset.side = value.side;
  nodes.root.dataset.boundary = value.boundary;
  nodes.root.style.left = `${value.geometry.x}px`;
  nodes.root.style.top = `${value.geometry.y}px`;
  nodes.root.style.height = `${value.geometry.height}px`;
  nodes.button.setAttribute('aria-label', value.label);
}
