import { computed, onBeforeUnmount, watch, type ComputedRef } from "vue";
import { createTheme, createUiThemeCssVariables, defaultTheme, type QuireKitTheme } from "@quirekit/ui";
import { useQuireKitTheme } from "@quirekit/ui/vue";
import type { BlockCodeDisplay, BlockCodeSurface } from "../../code/types";

const themes = new WeakMap<QuireKitTheme, Partial<Record<"light" | "dark", QuireKitTheme>>>();

/**
 * Changes the color scheme through the public theme compiler, retaining host density and typography.
 * @param host - Immutable theme of the owning editor.
 * @param scheme - Persistent code preference or inherited document scheme.
 * @returns Shared complete theme, including the component token authority.
 */
function codeTheme(host: QuireKitTheme, scheme: BlockCodeDisplay["theme"]): QuireKitTheme {
  if (scheme === "auto" || scheme === host.scheme) return host;
  let variants = themes.get(host);
  if (!variants) { variants = {}; themes.set(host, variants); }
  if (!variants[scheme]) {
    const compiled = createTheme({ scheme, profile: host.profile, sources: host.sources });
    variants[scheme] = { ...host, scheme, color: compiled.color, scales: compiled.scales,
      alphaScales: compiled.alphaScales, elevation: compiled.elevation };
  }
  return variants[scheme];
}

/**
 * Projects a local theme onto the retained document root without recreating its editable source.
 * @param surface - Document-owned code DOM and controls.
 * @param scheme - Reads only the persistent theme setting, never the source or selection.
 * @returns Logical theme for header controls and their portalled menus/tooltips.
 */
export function useBlockCodeTheme(surface: BlockCodeSurface, scheme: () => BlockCodeDisplay["theme"]): ComputedRef<QuireKitTheme> {
  const inherited = useQuireKitTheme();
  const theme = computed(() => codeTheme(inherited?.value ?? defaultTheme, scheme()));
  const variables = computed(() => scheme() === "auto" ? undefined : createUiThemeCssVariables(theme.value));
  let applied: readonly string[] = [];
  /** Removes only this projection, restoring normal physical inheritance. */
  function clear(): void {
    for (const name of applied) surface.dom.style.removeProperty(name);
    applied = [];
    delete surface.dom.dataset.qkScheme;
  }
  // Theme identity is the sole invalidation boundary. Typing and selection do
  // not regenerate palettes or write the full component-variable projection.
  watch(variables, value => {
    clear();
    if (!value) return;
    for (const [name, color] of Object.entries(value)) surface.dom.style.setProperty(name, color);
    applied = Object.keys(value);
    surface.dom.dataset.qkScheme = theme.value.scheme;
  }, { immediate: true, flush: "sync" });
  onBeforeUnmount(clear);
  return theme;
}
