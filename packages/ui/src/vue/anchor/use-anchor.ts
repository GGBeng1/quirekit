import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { QuireKitAnchorItem, AnchorOptions } from './types';
import { activeAnchor, decodeAnchorHash, normalizeAnchorOffset } from './position';
import { anchorIds, anchorTargets, anchorViewportTop, focusAnchor, resolveAnchorContainer } from './dom';

/**
 * Owns scrolling and fragment navigation without coupling to a router or page layout.
 * @param props - Reactive public options.
 * @param change - Notification when geometry changes the current heading.
 * @returns Current ID and the ordinary-link navigation handler.
 */
export function useAnchor(props: AnchorOptions, change: (id: string) => void) {
  const activeId = ref('');
  let owner: HTMLElement | null = null;
  let targets: HTMLElement[] = [];
  let frame = 0;
  let resize: ResizeObserver | undefined;
  let observed = new Set<Element>();
  let releaseFocus: (() => void) | undefined;
  let dispose: (() => void) | undefined;
  let pendingHash = '';

  /** @param id - Geometry-derived current heading. */
  function setCurrent(id: string): void {
    if (activeId.value === id) return;
    activeId.value = id;
    change(id);
  }
  /** Measures all targets in one scroll coordinate system after layout has settled. */
  function measure(): void {
    frame = 0;
    if (!owner) { setCurrent(''); return; }
    targets = anchorTargets(anchorIds(props.items), owner);
    const top = anchorViewportTop(owner);
    const height = owner === document.scrollingElement ? window.innerHeight : owner.clientHeight;
    setCurrent(activeAnchor(targets.filter(target => target.getClientRects().length > 0)
      .map(target => ({ id: target.id, top: target.getBoundingClientRect().top - top })),
    normalizeAnchorOffset(props.offset ?? 16), owner.scrollHeight > height + 1 && owner.scrollTop + height >= owner.scrollHeight - 1));
  }
  /** Coalesces scroll, resize and content updates into one geometry read per frame. */
  function schedule(): void {
    if (!frame) frame = window.requestAnimationFrame(measure);
  }
  /** @param target - Existing heading. @param behavior - Motion respecting user preferences. */
  function scroll(target: HTMLElement, behavior: 'smooth' | 'instant'): void {
    if (!owner) return;
    owner.scrollTo({
      top: owner.scrollTop + target.getBoundingClientRect().top - anchorViewportTop(owner) - normalizeAnchorOffset(props.offset ?? 16),
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : behavior
    });
    schedule();
  }
  /** @param event - Browser history event; omitted during initial binding. */
  function restore(event?: Event): void {
    if (props.history === false) { pendingHash = ''; return; }
    pendingHash = decodeAnchorHash(window.location.hash);
    if (event && !pendingHash) owner?.scrollTo({ top: 0, behavior: 'instant' });
    const target = targets.find(target => target.id === pendingHash);
    if (target) { scroll(target, 'instant'); pendingHash = ''; }
  }
  /** Rebinds changed targets and containers without repeatedly reobserving stable elements. */
  function refresh(): void {
    const next = resolveAnchorContainer(props.scrollContainer);
    if (next !== owner) {
      owner?.removeEventListener('scroll', schedule);
      owner = next;
      owner?.addEventListener('scroll', schedule, { passive: true });
    }
    targets = owner ? anchorTargets(anchorIds(props.items), owner) : [];
    const nextObserved = new Set<Element>(owner ? [owner, ...owner.children, ...targets] : []);
    for (const element of observed) if (!nextObserved.has(element)) resize?.unobserve(element);
    for (const element of nextObserved) if (!observed.has(element)) resize?.observe(element);
    observed = nextObserved;
    if (pendingHash) {
      const target = targets.find(target => target.id === pendingHash);
      if (target) { scroll(target, 'instant'); pendingHash = ''; }
    }
    schedule();
  }
  /**
   * Leaves modified, cancelled and unresolved links to their native browser behavior.
   * @param item - Activated original item.
   * @param event - Native link event, already offered to the consumer.
   */
  function navigate(item: QuireKitAnchorItem, event: MouseEvent): void {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const target = targets.find(target => target.id === item.id);
    if (!target || !owner) return;
    event.preventDefault();
    pendingHash = '';
    const hash = `#${encodeURIComponent(item.id)}`;
    if (props.history !== false && decodeAnchorHash(window.location.hash) !== item.id) {
      const method = props.history === 'replace' ? 'replaceState' : 'pushState';
      window.history[method](window.history.state, '', hash);
    }
    releaseFocus?.();
    releaseFocus = focusAnchor(target);
    scroll(target, props.behavior ?? 'smooth');
  }

  onMounted(() => {
    // Resolve DOM only after hydration; late content and ref-backed owners remain reactive.
    resize = new ResizeObserver(schedule);
    const mutation = new MutationObserver(refresh);
    mutation.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['id', 'hidden', 'class', 'style'] });
    const stop = watch(() => [props.items, props.scrollContainer, resolveAnchorContainer(props.scrollContainer), props.offset, props.history],
      () => { refresh(); restore(); }, { immediate: true, deep: true, flush: 'post' });
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    window.addEventListener('hashchange', restore);
    window.addEventListener('popstate', restore);
    dispose = () => {
      stop(); mutation.disconnect(); resize?.disconnect();
      owner?.removeEventListener('scroll', schedule);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('hashchange', restore);
      window.removeEventListener('popstate', restore);
      if (frame) window.cancelAnimationFrame(frame);
      observed.clear(); releaseFocus?.();
    };
  });
  onBeforeUnmount(() => dispose?.());
  return { activeId, navigate };
}
