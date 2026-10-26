import type { MsfeEditor } from "@quirekit/msfe-core";
import { createTheme, type QuireKitTheme } from "@quirekit/ui";

/** Host theme readers keyed by the mounted editor element; released with the element. */
const hostThemes = new WeakMap<HTMLElement, () => QuireKitTheme | undefined>();

/**
 * Records where an editor reads its host theme, so dialogs mounted as their own app follow it.
 * @param element - Mounted editor element.
 * @param read - Reads the current host theme; undefined outside any theme provider.
 */
export function bindMdDialogTheme(element: HTMLElement, read: () => QuireKitTheme | undefined): void {
  hostThemes.set(element, read);
}

/**
 * @param editor - Editor opening the dialog.
 * @returns The host theme; without one, a default theme in the editor's light or dark scheme.
 */
export function mdDialogTheme(editor: MsfeEditor): QuireKitTheme {
  const host = hostThemes.get(editor.element)?.();
  if (host) return host;
  return createTheme({ scheme: editor.element.closest<HTMLElement>("[data-qk-scheme]")?.dataset.qkScheme === "dark" ? "dark" : "light" });
}
