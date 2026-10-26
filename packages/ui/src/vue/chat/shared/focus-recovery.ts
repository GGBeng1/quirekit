import type { ObjectDirective } from 'vue';

const previousFocus = new WeakMap<HTMLElement, Element>();

/** Capture at the actual DOM owner, including updates rendered through provider slots.
 * @param element - Programmatically focusable message/part root.
 */
function capture(element: HTMLElement): void {
  const active = element.ownerDocument.activeElement;
  if (active && element.contains(active)) previousFocus.set(element, active);
  else previousFocus.delete(element);
}

/** Recover only removal-induced focus loss, never an intentional focus move.
 * @param element - Patched root whose previous descendant may have disappeared.
 */
function recover(element: HTMLElement): void {
  const previous = previousFocus.get(element);
  if (previous && !previous.isConnected && element.ownerDocument.activeElement === element.ownerDocument.body) element.focus({ preventScroll: true });
  previousFocus.delete(element);
}

/** Patch-bound focus recovery has no global listener, observer or per-token subtree scan. */
export const vChatFocusRecovery: ObjectDirective<HTMLElement> = { beforeUpdate: capture, updated: recover };
