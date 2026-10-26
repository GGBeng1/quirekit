import type { ObjectDirective } from 'vue';
const animations = new WeakMap<HTMLElement, Animation>();

/**
 * Fades replacement content without remounting focused controls or moving layout.
 * @param element - Stable content region, never the floating positioner.
 */
function fadeContent(element: HTMLElement): void {
  animations.get(element)?.cancel();
  const view = element.ownerDocument.defaultView;
  if (!view || view.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const style = view.getComputedStyle(element);
  const duration = Number.parseFloat(style.getPropertyValue('--qk-motion-control-duration'));
  if (!duration) return;
  animations.set(element, element.animate([{ opacity: 0.5 }, { opacity: 1 }], {
    duration, easing: style.getPropertyValue('--qk-motion-standard-easing').trim() || 'ease-out'
  }));
}

/** Content identity changes animate once; ordinary selection/focus updates do not restart it. */
export const vContentMotion: ObjectDirective<HTMLElement, string> = {
  /** @param element - Stable region. @param binding - Current and prior content identity. */
  updated(element, binding) { if (binding.value !== binding.oldValue) fadeContent(element); },
  /** @param element - Region leaving the document; release any remaining animation. */
  unmounted(element) { animations.get(element)?.cancel(); animations.delete(element); }
};
