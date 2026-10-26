import { autoUpdate, computePosition, flip, offset, shift, size } from '@floating-ui/dom';
import { watchEffect, type Ref } from 'vue';

/** Position an input-owned candidate surface without moving editor focus or theme scope.
 * @param anchor - Native multiline input.
 * @param popup - Candidate surface rendered alongside the input.
 * @param open - Whether candidates are visible.
 */
export function useChatCandidatePosition(anchor: Ref<HTMLTextAreaElement | null>, popup: Ref<HTMLElement | null>, open: Ref<boolean>): void {
  watchEffect(onCleanup => {
    const input = anchor.value;
    const element = popup.value;
    if (!open.value || !input || !element) return;
    // Anchor to Composer's full surface so a bottom-docked input opens over the conversation.
    const reference = input.closest<HTMLElement>('.qk-chat-composer__surface') ?? input;
    let active = true;
    const stop = autoUpdate(reference, element, () => {
      const viewport = reference.ownerDocument.documentElement.clientWidth;
      element.style.width = `${Math.max(0, Math.min(reference.getBoundingClientRect().width, viewport - 16))}px`;
      void computePosition(reference, element, {
        placement: 'top-start', strategy: 'fixed',
        middleware: [offset(6), flip({ fallbackPlacements: ['bottom-start'], padding: 8 }), shift({ padding: 8, crossAxis: true }), size({
          padding: 8,
          apply({ availableHeight, elements }) {
            elements.floating.style.maxHeight = `${Math.max(0, Math.min(availableHeight, 256))}px`;
          }
        })]
      }).then(({ x, y, placement }) => {
        if (!active) return;
        Object.assign(element.style, { left: `${x}px`, top: `${y}px`, visibility: 'visible' });
        element.dataset.placement = placement;
      });
    });
    onCleanup(() => { active = false; stop(); element.style.visibility = 'hidden'; });
  }, { flush: 'post' });
}
