import { computed, onMounted, onScopeDispose, shallowRef, watch, type ComputedRef, type ShallowRef } from "vue";
import type { QuireKitToolbarMode } from "../../../components/toolbar/types";
import { subscribeTaskPresentationMedia } from "../../shared/task/presentation/media";

/**
 * Shares one layout-media lease per document; explicit modes perform no browser subscription.
 * @param root - Stable Toolbar element owning the browsing realm.
 * @param requested - Explicit mode; auto resolves after hydration using the owner viewport.
 * @returns Current touch presentation, independent of command and editor state.
 */
export function useToolbarMobile(root: Readonly<ShallowRef<HTMLElement | null>>, requested: () => QuireKitToolbarMode): ComputedRef<boolean> {
  const mounted = shallowRef(false), media = shallowRef<ReturnType<typeof subscribeTaskPresentationMedia>>();
  let owner: Document | undefined;
  /** Releases the owner lease when the toolbar leaves auto mode or unmounts. */
  function release(): void { media.value?.release(); media.value = undefined; owner = undefined; }
  /** Acquires only the actual mounted owner's layout media. */
  function sync(): void {
    const next = root.value?.ownerDocument;
    if (!mounted.value || requested() !== "auto" || !next) { release(); return; }
    if (next === owner && media.value) return;
    release(); owner = next; media.value = subscribeTaskPresentationMedia(next);
  }
  onMounted(() => { mounted.value = true; sync(); });
  watch([requested, () => root.value?.ownerDocument], sync, { flush: "sync" });
  onScopeDispose(release);
  return computed(() => requested() === "mobile" || requested() === "auto" && media.value?.value.value === "bottom");
}
