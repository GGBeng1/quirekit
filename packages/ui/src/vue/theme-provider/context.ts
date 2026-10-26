import { inject, provide, type ComputedRef, type InjectionKey } from "vue";
import type { QuireKitTheme } from "../../theme/types";

/** Internal logical-tree authority, preserved when descendants teleport. */
export const quireKitThemeKey: InjectionKey<ComputedRef<QuireKitTheme>> = Symbol("quirekit-theme");

const quireKitInheritedThemePortalsKey: InjectionKey<boolean> = Symbol(
  "quirekit-inherited-theme-portals"
);

/**
 * Declares that descendant portal targets remain inside the current physical theme scope.
 *
 * Descendant floating components then inherit variables from their target instead of
 * creating duplicate complete-variable bridges.
 */
export function provideQuireInheritedThemePortals(): void {
  provide(quireKitInheritedThemePortalsKey, true);
}

/** @returns Whether the current floating subtree inherits its physical target theme. */
export function useQuireInheritedThemePortals(): boolean {
  return inject(quireKitInheritedThemePortalsKey, false);
}

/**
 * Reads the theme of the nearest `QuireThemeProvider`, so surfaces mounted as a separate app
 * (such as editor dialogs) can follow the host theme instead of creating a default one.
 * @returns The provided theme, or undefined outside any provider.
 */
export function useQuireKitTheme(): ComputedRef<QuireKitTheme> | undefined {
  return inject(quireKitThemeKey, undefined);
}
