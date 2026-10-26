import { computed, inject, provide, type InjectionKey } from "vue";
import { useDialogContext } from "@ark-ui/vue/dialog";
import { useDrawerContext } from "@ark-ui/vue/drawer";
import type { QuireOverlayHost } from "./types";

const overlayHostKey: InjectionKey<QuireOverlayHost> = Symbol("quire-overlay-host");

/** @param host - Physical owner for menus, pickers and tooltips in this Vue subtree. */
export function provideQuireOverlayHost(host: QuireOverlayHost): void { provide(overlayHostKey, host); }

/** @param explicit - Optional per-surface override. @returns Inherited portal and placement strategy; modal children retain their modal ownership. */
export function useQuireOverlayHost(explicit: () => string | HTMLElement | undefined = () => undefined) {
  const host = inject(overlayHostKey, undefined);
  const modal = !!(useDialogContext() || useDrawerContext());
  return {
    target: computed(() => explicit() ?? (modal ? undefined : host?.target()) ?? "body"),
    strategy: computed(() => modal ? undefined : host?.strategy)
  };
}
