import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { captureAnchors, restoreAnchor } from './anchors';
import type { MessageListScrollController, MessageListScrollOptions, ReadingAnchor } from './types';

/** Own conversation follow/reading policy without replacing Ark's scroll interaction.
 * @param options - Viewport, content and host identity sources.
 * @returns Reactive following state, DOM registry and explicit positioning commands.
 */
export function useMessageListScroll(options: MessageListScrollOptions): MessageListScrollController {
  const following = ref(true);
  const nodes = new Map<string, HTMLElement>();
  let anchors: ReadingAnchor[] = [];
  let observer: ResizeObserver | undefined;
  let frame: number | undefined;
  let view: Window | null = null;
  let writtenTop: number | undefined;

  /** Report only policy transitions.
   * @param value - Next follow policy.
   */
  function setFollowing(value: boolean): void {
    if (following.value === value) return;
    following.value = value; options.onFollowingChange(value);
  }

  /** Preserve identity and offsets after a deliberate viewport movement. */
  function capture(): void {
    const viewport = options.viewport();
    if (viewport) anchors = captureAnchors(options.keys(), nodes, viewport);
  }

  /** Process real user/native scrolling without interpreting our own correction as intent. */
  function onScroll(): void {
    const viewport = options.viewport();
    if (!viewport) return;
    const corrected = writtenTop !== undefined && Math.abs(viewport.scrollTop - writtenTop) <= 1;
    writtenTop = undefined;
    // Reconcile already captured this correction. A delayed scroll event may arrive after
    // another image resize; recapturing here would accept its displacement as user intent.
    if (corrected) return;
    setFollowing(viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop <= 24);
    capture();
  }

  /** Apply one geometry correction per frame, then refresh the surviving anchor. */
  function reconcile(): void {
    frame = undefined;
    const viewport = options.viewport();
    if (!viewport) return;
    const before = viewport.scrollTop;
    if (following.value) viewport.scrollTop = viewport.scrollHeight;
    else restoreAnchor(anchors, nodes, viewport);
    if (viewport.scrollTop !== before) writtenTop = viewport.scrollTop;
    capture();
  }

  /** Coalesce content, viewport and key updates into the same layout pass. */
  function schedule(): void {
    if (frame === undefined && view) frame = view.requestAnimationFrame(reconcile);
  }

  /** Jump explicitly, restoring follow without moving keyboard focus. */
  function scrollToLatest(): void {
    setFollowing(true); anchors = [];
    if (frame !== undefined) { view?.cancelAnimationFrame(frame); frame = undefined; }
    reconcile();
  }

  /** Locate a host-owned message and suspend automatic following.
   * @param itemKey - Stable identity in the current session.
   * @returns Whether that key is currently mounted.
   */
  function scrollToMessage(itemKey: string): boolean {
    const viewport = options.viewport(); const node = nodes.get(itemKey);
    if (!viewport || !node) return false;
    setFollowing(false);
    viewport.scrollTop += node.getBoundingClientRect().top - viewport.getBoundingClientRect().top;
    writtenTop = viewport.scrollTop;
    capture(); return true;
  }

  onMounted(() => {
    const viewport = options.viewport();
    view = viewport?.ownerDocument.defaultView ?? null;
    observer = new ResizeObserver(schedule);
    if (viewport) observer.observe(viewport);
    if (options.content.value) observer.observe(options.content.value);
    schedule();
  });
  watch(() => [...options.keys()], keys => {
    // Empty history has no reading position; the next first message should follow.
    if (keys.length === 0) { anchors = []; setFollowing(true); }
    schedule();
  }, { flush: 'post' });
  watch(options.session, () => { anchors = []; writtenTop = undefined; setFollowing(true); schedule(); }, { flush: 'post' });
  onBeforeUnmount(() => {
    observer?.disconnect();
    if (frame !== undefined) view?.cancelAnimationFrame(frame);
    nodes.clear();
  });
  return { following, nodes, onScroll, scrollToLatest, scrollToMessage };
}
