import { useQuireOverlayHost } from "../../overlay-provider";
import type { PopoverRootProps } from '@ark-ui/vue/popover';

/**
 * Keeps the sizing budget independent of the previously resolved popup side.
 * Ark owns the scroll/resize observers and their teardown; this hook only supplies
 * a viewport-space height before its collision pass, without animating coordinates.
 * @param field - Resident field containing the actual control anchor.
 * @returns Stable positioning options for the desktop shell.
 */
export function pickerPositioning(field: () => HTMLElement | undefined): NonNullable<PopoverRootProps['positioning']> {
  const host = useQuireOverlayHost();
  return {
    placement: 'bottom-start', strategy: host.strategy.value ?? 'fixed', gutter: 4, hideWhenDetached: true,
    /** @param context - Ark positioning pass and the currently mounted floating element. */
    async updatePosition(context) {
      const { updatePosition, floatingElement } = context;
      const anchor = field()?.querySelector<HTMLElement>('.qk-picker__control-anchor');
      if (!anchor || !floatingElement?.isConnected) return;
      const rect = anchor.getBoundingClientRect();
      const viewport = anchor.ownerDocument.documentElement.clientHeight;
      // Choose the larger side before measuring content. Feeding --available-height
      // back into its own measurement makes scroll resize the panel instead of flip.
      const height = Math.max(rect.top - 12, viewport - rect.bottom - 12, 0);
      floatingElement.style.setProperty('--qk-picker-available-height', `${Math.floor(height)}px`);
      await updatePosition();
    }
  };
}
