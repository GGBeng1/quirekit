import { computed, onBeforeUnmount, ref, watch } from "vue";
import { createTheme } from "@quirekit/ui";
import type { MindPreviewAppearance, MindPreviewLocale } from "./types";

/** @returns Host-owned preferences, independent from source storage and renderer history. */
export function useMindPreviewPreferences() {
  const locale = ref<MindPreviewLocale>("zh-CN"), appearance = ref<MindPreviewAppearance>("light");
  try {
    const storedLocale = localStorage.getItem("quirekit-mind-locale");
    const storedTheme = localStorage.getItem("quirekit-mind-appearance");
    if (storedLocale === "en" || storedLocale === "zh-CN") locale.value = storedLocale;
    if (storedTheme === "light" || storedTheme === "dark" || storedTheme === "system") appearance.value = storedTheme;
  } catch { /* Storage restrictions do not prevent in-session preferences. */ }
  const query = matchMedia("(prefers-color-scheme: dark)"), systemDark = ref(query.matches);
  /** @param event - Current OS color preference. */
  function systemChanged(event: MediaQueryListEvent): void { systemDark.value = event.matches; }
  query.addEventListener("change", systemChanged);
  onBeforeUnmount(() => query.removeEventListener("change", systemChanged));
  const theme = computed(() => createTheme({ scheme: appearance.value === "system" ? systemDark.value ? "dark" : "light" : appearance.value }));
  watch([locale, appearance], () => {
    try {
      localStorage.setItem("quirekit-mind-locale", locale.value);
      localStorage.setItem("quirekit-mind-appearance", appearance.value);
    } catch { /* Preference persistence is optional; current UI remains usable. */ }
  });
  return { locale, appearance, theme };
}
