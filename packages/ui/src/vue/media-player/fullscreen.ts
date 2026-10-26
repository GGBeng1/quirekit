import { onBeforeUnmount, onMounted, ref, type ShallowRef } from "vue";

/** @param root - Player container including custom controls. @returns Capability, state and explicit fullscreen action. */
export function useMediaFullscreen(root: ShallowRef<HTMLElement | undefined>) {
  const available = ref(false), active = ref(false), failed = ref(false);
  let owner: Document | undefined;
  /** Synchronizes native exits, including Escape, without installing global shortcuts. */
  function sync(): void { active.value = !!root.value && owner?.fullscreenElement === root.value; }
  onMounted(() => {
    owner = root.value?.ownerDocument;
    available.value = !!owner?.fullscreenEnabled && typeof root.value?.requestFullscreen === "function";
    owner?.addEventListener("fullscreenchange", sync);
  });
  onBeforeUnmount(() => {
    owner?.removeEventListener("fullscreenchange", sync);
    if (owner?.fullscreenElement === root.value) void owner?.exitFullscreen().catch(() => {});
  });
  /** Requests fullscreen on the complete player. @returns Completion with native failures reflected in state. */
  async function toggle(): Promise<void> {
    if (!available.value) return;
    failed.value = false;
    try { if (active.value) await owner?.exitFullscreen(); else await root.value?.requestFullscreen(); }
    catch { failed.value = true; }
    sync();
  }
  return { available, active, failed, toggle };
}
