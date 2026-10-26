import { createTheme } from "@quirekit/ui";
import { onScopeDispose, ref, watch, type Ref } from "vue";
import type { ClassicEditorShellModel } from "../../types";

const STORAGE_KEY = "quirekit.classic.theme-preference";

/**
 * Owns the user's chrome appearance preference, independent of document formatting.
 * @param model - Mounted shell and its public update lifecycle.
 * @returns Selected appearance and a validated selection command.
 */
export function useClassicThemePreference(model: Ref<ClassicEditorShellModel>) {
  const preference = ref<string>(model.value.theme.scheme);
  let media: MediaQueryList | undefined;
  let storage: Storage | undefined;

  /** Projects a preference through the existing theme compiler and public update. */
  function apply(): void {
    const instance = model.value.context?.instance;
    if (!instance) return;
    const current = model.value.theme;
    const scheme = preference.value === "system" ? (media?.matches ? "dark" : "light") : preference.value;
    if ((scheme !== "light" && scheme !== "dark") || current.scheme === scheme) return;
    const palette = createTheme({ profile: current.profile, sources: current.sources, scheme });
    // Preserve host typography, geometry and motion; only re-project color roles.
    instance.update({ theme: {
      ...current, scheme, scales: palette.scales, alphaScales: palette.alphaScales, color: palette.color
    } });
  }

  /** Reacts to OS changes only while the user has selected system appearance. */
  function onSystemChange(): void {
    if (preference.value === "system") apply();
  }

  watch(() => model.value.context?.instance, instance => {
    media?.removeEventListener("change", onSystemChange);
    const owner = instance?.root?.ownerDocument.defaultView;
    if (!owner) return;
    media = owner.matchMedia("(prefers-color-scheme: dark)");
    try {
      storage = owner.localStorage;
      const saved = storage.getItem(STORAGE_KEY);
      if (saved === "light" || saved === "dark" || saved === "system") preference.value = saved;
    } catch { /* Storage may be unavailable in embedded or private contexts. */ }
    media.addEventListener("change", onSystemChange);
    apply();
  }, { immediate: true, flush: "post" });

  onScopeDispose(() => media?.removeEventListener("change", onSystemChange));

  /**
   * Saves before updating so the preference survives shell remounts.
   * @param value - Public Select value.
   */
  function select(value: string | undefined): void {
    if (value !== "light" && value !== "dark" && value !== "system") return;
    preference.value = value;
    try { storage?.setItem(STORAGE_KEY, value); } catch { /* In-memory choice remains usable. */ }
    apply();
  }

  return { preference, select };
}
