import { onBeforeUnmount, onMounted, shallowRef, watch } from 'vue';
import type { Ref } from 'vue';
import { fitMathFontSize } from '@quirekit/math';

/**
 * Sizes the formula graphic so the whole formula fits its surface width.
 * The surface font size (`--qk-math-editor-size`) is the largest size; below
 * `--qk-math-editor-min-size` the formula stops shrinking and the surface scrolls.
 * @param surface - Scrollable formula surface whose content width bounds the formula.
 * @param width - Current formula width in em, absent before the first layout.
 * @returns Font size for the graphic in CSS pixels, absent until measured.
 */
export function useMathFit(surface: Ref<HTMLElement | undefined>, width: () => number | undefined) {
  const size = shallowRef<number>();
  let observer: ResizeObserver | undefined;
  /** Recomputes from the current surface box and formula width. */
  function update(): void {
    const element = surface.value;
    const current = width();
    if (!element || !current) return;
    const style = getComputedStyle(element);
    const available = element.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const minimum = parseFloat(style.getPropertyValue('--qk-math-editor-min-size'));
    size.value = fitMathFontSize(current, { available, base: parseFloat(style.fontSize), ...(minimum > 0 ? { minimum } : {}) });
  }
  watch(width, update);
  onMounted(() => {
    observer = new ResizeObserver(update);
    if (surface.value) observer.observe(surface.value);
    update();
  });
  onBeforeUnmount(() => observer?.disconnect());
  return size;
}
