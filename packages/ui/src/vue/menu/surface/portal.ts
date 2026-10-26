import { useQuireOverlayHost } from "../../overlay-provider";
import { computed, inject, provide, type InjectionKey, type ComputedRef } from "vue";

/** A Menu tree shares one physical host, including declarative nested menus. */
const portalKey: InjectionKey<ComputedRef<string | HTMLElement>> = Symbol("quire-menu-portal");

/** @param target - Optional explicit host. @returns Reactive host inherited by all descendant submenus. */
export function provideMenuPortal(target: () => string | HTMLElement | undefined): ComputedRef<string | HTMLElement> {
  const host = useQuireOverlayHost();
  const inherited = inject(portalKey, undefined);
  const resolved = computed(() => target() ?? inherited?.value ?? host.target.value);
  provide(portalKey, resolved);
  return resolved;
}
