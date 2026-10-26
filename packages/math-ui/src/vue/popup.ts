import { inject, type InjectionKey } from 'vue';

/** Resolves the element that receives the panel's floating choosers. */
export const mathPopupTargetKey: InjectionKey<() => HTMLElement | undefined> = Symbol('math-popup-target');

/**
 * Reads the host-supplied popup container.
 * @returns Container element, or `body` when the host supplies none.
 */
export function useMathPopupTarget(): () => HTMLElement | 'body' {
  const target = inject(mathPopupTargetKey, () => undefined);
  return () => target() ?? 'body';
}
