import { useDialogContext } from "@ark-ui/vue/dialog";
import { useDrawerContext } from "@ark-ui/vue/drawer";
import { computed, onMounted, ref, watch } from "vue";

/**
 * Reads the optional Ark owner across Vue's tree, including body-portalled children.
 * @returns Owner presence, current open state and readiness after opening effects.
 */
export function useModalSurfaceOwner() {
  const dialog = useDialogContext();
  const drawer = useDrawerContext();
  const present = Boolean(dialog || drawer);
  const open = computed(() => (dialog?.value.open ?? true) && (drawer?.value.open ?? true));
  const settled = ref(!present);
  const mounted = ref(false);
  onMounted(() => { mounted.value = true; });
  watch(() => mounted.value && open.value, (ownerOpen, _previous, onCleanup) => {
    if (!present) return;
    settled.value = false;
    if (!ownerOpen) return;
    // Ark schedules hideContentBelow and initial focus through deferred RAFs.
    // The first frame lets the owner's isolation/focus effects run; the next
    // exposes children independently of parent/child component mount order.
    // Re-arm for retained owners too, including an initially closed parent.
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => { settled.value = true; });
    });
    onCleanup(() => cancelAnimationFrame(frame));
  }, { flush: "post" });
  return {
    present,
    open,
    ready: computed(() => open.value && settled.value)
  };
}
