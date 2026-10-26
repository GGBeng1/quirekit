import { inject, onBeforeUnmount, provide, type InjectionKey } from "vue";

/** Close callbacks of the submenus sharing one parent menu level. */
type SubmenuSiblings = Set<() => void>;

const siblingsKey: InjectionKey<SubmenuSiblings> = Symbol("QuireMenuSubmenuSiblings");

/** Starts a menu level whose direct submenus are mutually exclusive. */
export function provideSubmenuSiblings(): void {
  provide(siblingsKey, new Set());
}

/**
 * Joins the current menu level so opening this submenu closes its open siblings.
 *
 * The underlying machine only closes siblings on a pointer move over the next
 * trigger while the pointer modality is active, so fast or mixed keyboard and
 * pointer navigation could leave two sibling submenus open.
 *
 * @param close - Closes this submenu when a sibling opens.
 * @returns Callback to run whenever this submenu opens.
 */
export function useSubmenuSiblings(close: () => void): () => void {
  const siblings = inject(siblingsKey, null);
  siblings?.add(close);
  onBeforeUnmount(() => siblings?.delete(close));
  provideSubmenuSiblings();
  return () => siblings?.forEach(other => { if (other !== close) other(); });
}
