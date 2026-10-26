import type { MathEditorSnapshot, MathSurfaceRect } from '@quirekit/math';
import type { MathBrowserSnapshot } from '@quirekit/math/browser';

/**
 * Paints consumer-owned HTML decorations using only numeric public contracts.
 * @param host - Consumer's overlay element.
 * @param browser - Retained projection from the native binding.
 * @param state - Canonical input ownership and candidate text.
 */
export function paintStandaloneOverlay(host: HTMLElement, browser: MathBrowserSnapshot, state: MathEditorSnapshot): void {
  host.replaceChildren();
  if (!state.canEdit || !(state.focused || state.commandOpen)) return;
  /**
   * Adds one decoration without touching formula graphic markup.
   * @param rect - Numeric CSS content box.
   * @param className - Consumer-owned appearance.
   * @returns Mounted decoration.
   */
  function box(rect: MathSurfaceRect, className: string): HTMLSpanElement {
    const element = host.ownerDocument.createElement('span'); element.className = className;
    Object.assign(element.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` });
    host.append(element); return element;
  }
  const { active, caret, selected } = browser.overlay;
  if (active) box(active, 'slot');
  for (const rect of selected) box(rect, 'selection');
  if (caret && !selected.length && state.focused) box(caret, 'caret');
  if (caret && state.preedit) box(caret, 'preedit').textContent = state.preedit;
}
