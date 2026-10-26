import { nextTick, onBeforeUnmount, onMounted, ref, watch, type Ref } from "vue";
import type { EmojiScrollHandle, EmojiSectionPosition } from "./types";

/** @param positions - Measured section headings in order. @param y - Scroll position. @param limit - Maximum scroll. @returns Current visible section, including the final short section. */
export function currentEmojiSection(positions: readonly EmojiSectionPosition[], y: number, limit: number): string | undefined {
  if (limit <= 0) return positions[0]?.key;
  if (y >= limit - 1) return positions.at(-1)?.key;
  for (let index = positions.length - 1; index >= 0; index--) {
    if (positions[index]!.top <= y + 1) return positions[index]!.key;
  }
  return positions[0]?.key;
}

/**
 * Keeps category navigation and one native scrolling viewport in sync.
 * @param area - Public ScrollArea handle.
 * @param content - Owned content element, observed for layout changes.
 * @param keys - Current section identities, empty during search.
 * @returns Active category, section registration, scrolling and layout refresh.
 */
export function useEmojiNavigation(area: Ref<EmojiScrollHandle | undefined>, content: Ref<HTMLElement | undefined>, keys: () => readonly string[]) {
  const active = ref<string>();
  const elements = new Map<string, HTMLElement>();
  let positions: EmojiSectionPosition[] = [], limit = 0, frame: number | undefined;
  let observer: ResizeObserver | undefined;

  /** @param position - Native scroll coordinates; geometry is already cached. */
  function sync(position: { y: number }): void {
    if (keys().length) active.value = currentEmojiSection(positions, position.y, limit);
  }
  /** Measures only section headings on layout change, never each emoji on a wheel event. */
  function measure(): void {
    const viewport = area.value?.getViewportElement();
    if (!viewport) return;
    const origin = viewport.getBoundingClientRect().top - viewport.scrollTop;
    positions = keys().flatMap(key => {
      const element = elements.get(key);
      return element ? [{ key, top: element.getBoundingClientRect().top - origin }] : [];
    });
    limit = Math.max(0, viewport.scrollHeight - viewport.clientHeight);
    sync({ y: viewport.scrollTop });
  }
  /** Coalesces content and viewport resize notifications into one read phase. */
  function refresh(): void {
    if (frame !== undefined) return;
    frame = requestAnimationFrame(() => { frame = undefined; measure(); });
  }
  /** @param key - Stable section identity. @param element - Owned native section or its unmount null. */
  function register(key: string, element: unknown): void {
    if (element instanceof HTMLElement) elements.set(key, element);
    else elements.delete(key);
  }
  /** @param key - Category requested by the user; this does not select an emoji. */
  function jump(key: string): void {
    measure();
    const target = positions.find(section => section.key === key);
    if (!target) return;
    const top = Math.min(limit, Math.max(0, target.top));
    area.value?.scrollTo({ top, behavior: "instant" });
    sync({ y: top });
  }
  onMounted(() => {
    const viewport = area.value?.getViewportElement();
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(refresh);
      if (viewport) observer.observe(viewport);
      if (content.value) observer.observe(content.value);
    }
    measure();
  });
  watch(keys, () => { void nextTick(refresh); }, { flush: "post" });
  onBeforeUnmount(() => { observer?.disconnect(); if (frame !== undefined) cancelAnimationFrame(frame); });
  return { active, register, sync, jump, refresh };
}
