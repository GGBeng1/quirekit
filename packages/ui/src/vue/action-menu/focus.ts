import { nextTick, onScopeDispose, watch } from "vue";
import type { Ref } from "vue";
import { collectContextMenuSurfaces } from "../menu/context/focus";

/**
 * Restores a claimed opener after Menu's queued focus work without stealing another task's focus.
 * @param open - Effective desktop menu visibility.
 * @param ownerReady - Parent still allowed to receive focus.
 * @param opener - Actual stable entry used this session.
 * @param contentId - Current Menu Content id.
 * @param triggerId - More-button id shared with the Menu machine.
 * @param finalFocus - Optional explicit focus destination.
 */
export function useActionMenuFocus(open: Readonly<Ref<boolean>>, ownerReady: Readonly<Ref<boolean>>, opener: Ref<HTMLElement | undefined>, contentId: string, triggerId: string, finalFocus: () => HTMLElement | null | undefined): void {
  let revision = 0;
  let disposed = false;
  onScopeDispose(() => { disposed = true; revision += 1; });
  watch(open, (visible, previous) => {
    const currentRevision = ++revision;
    if (visible || !previous || !ownerReady.value) return;
    const target = opener.value;
    const document = target?.ownerDocument;
    const window = document?.defaultView;
    if (!document || !window) return;
    const owned = collectContextMenuSurfaces(document.getElementById(contentId));
    const active = document.activeElement;
    const claimed = active && active !== document.body && active.id !== triggerId && !owned.some(surface => surface.contains(active))
      ? active as HTMLElement : undefined;
    void nextTick(() => window.requestAnimationFrame(() => {
      if (disposed || currentRevision !== revision || open.value || !ownerReady.value) return;
      const current = document.activeElement;
      if (current && current !== document.body && current.id !== triggerId && !owned.some(surface => surface.contains(current))) return;
      const destination = claimed ?? finalFocus() ?? target;
      if (destination?.isConnected) destination.focus({ preventScroll: true });
    }));
  }, { flush: "sync" });
}
