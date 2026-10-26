import { shallowRef, type ShallowRef } from "vue";
import { defaultClassicEditorLocale } from "../localization";
import { readClassicEditorTheme } from "./theme";
import type { ClassicEditorUiAppearance } from "./types";

const locales = new WeakMap<HTMLElement, ShallowRef<string>>();

/**
 * Returns the interface language of one instance.
 * @param root - Product root owning an independently mounted surface.
 * @returns Locale tag; unmounted standalone surfaces use the product default.
 */
export function readClassicEditorLocale(root: HTMLElement): string {
  let state = locales.get(root);
  if (state === undefined) {
    state = shallowRef(defaultClassicEditorLocale);
    locales.set(root, state);
  }
  return state.value;
}

/**
 * Records the interface language of one instance and exposes it on the root for assistive technology.
 * @param root - Product root.
 * @param locale - Product interface locale.
 */
export function applyClassicEditorLocale(root: HTMLElement, locale: string): void {
  readClassicEditorLocale(root);
  locales.get(root)!.value = locale;
  root.lang = locale;
}

/**
 * Reads theme and language of the instance that owns an independently mounted surface.
 * @param root - Product root.
 * @returns Reactive readers for the instance theme and locale.
 */
export function readClassicEditorAppearance(root: HTMLElement): ClassicEditorUiAppearance {
  return { theme: () => readClassicEditorTheme(root), locale: () => readClassicEditorLocale(root) };
}
