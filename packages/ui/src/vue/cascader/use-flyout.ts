import { autoUpdate, computePosition, flip, hide, offset, shift, size } from '@floating-ui/dom';
import { ref, watchEffect, type Ref } from 'vue';

/** Positions a child surface without contributing width to the root field popup.
 * @param anchor - Parent option in the preceding level.
 * @param floating - Independently painted child surface.
 * @returns Whether a current, visible anchor has been positioned.
 */
export function useCascaderFlyout(anchor: () => HTMLElement | undefined, floating: Ref<HTMLElement | undefined>) {
  const ready = ref(false);
  watchEffect(onCleanup => {
    const reference = anchor();
    const element = floating.value;
    ready.value = false;
    if (!reference || !element) return;
    let active = true;
    let revision = 0;
    /** Measures in the shared Popover's coordinate space and discards obsolete measurements. */
    async function update(): Promise<void> {
      const request = ++revision;
      const rtl = getComputedStyle(reference!).direction === 'rtl';
      const result = await computePosition(reference!, element!, {
        placement: rtl ? 'left-start' : 'right-start', strategy: 'absolute',
        middleware: [offset(6), flip({ padding: 8 }), shift({ padding: 8, crossAxis: true }),
          size({ padding: 8, apply({ availableHeight, elements }) {
            elements.floating.style.maxHeight = `${Math.max(0, availableHeight)}px`;
          } }), hide()]
      });
      if (!active || request !== revision) return;
      Object.assign(element!.style, { left: `${result.x}px`, top: `${result.y}px` });
      element!.dataset.placement = result.placement;
      ready.value = !result.middlewareData.hide?.referenceHidden && getComputedStyle(reference!).visibility !== 'hidden';
    }
    // A deeper anchor moves when its parent flyout flips. RAF tracks that transform
    // as well as ordinary resize and scroll, only while this child is mounted.
    const cleanup = autoUpdate(reference, element, () => { void update(); }, { animationFrame: true });
    onCleanup(() => { active = false; cleanup(); });
  }, { flush: 'post' });
  return ready;
}
