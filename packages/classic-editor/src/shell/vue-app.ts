import { quireIconRegistry } from "@quirekit/ui";
import { QuireIconProvider, QuireLocaleProvider, QuireThemeProvider } from "@quirekit/ui/vue";
import {
  computed,
  createApp,
  defineComponent,
  h,
  type App,
  type Component
} from "vue";
import type { QuireKitTheme } from "../types";
import { defaultClassicEditorLocale } from "../localization";
import type { ClassicEditorUiAppearance, ClassicEditorUiAppOptions } from "./types";

/**
 * Creates one product-owned Vue application with the shared UI theme and language providers.
 *
 * Independently mounted product surfaces can own separate Vue roots, so DOM
 * nesting alone cannot propagate injection state. This wrapper provides the
 * instance theme and interface language for the shell and each such root.
 *
 * @param component - Private root component rendered by the application.
 * @param props - Reactive props forwarded to the private root component.
 * @param appearance - Instance theme and language, or a theme resolver alone for surfaces outside an instance.
 * @param options - Optional standalone-surface compatibility behavior.
 * @returns Unmounted Vue application owned by the caller.
 */
export function createClassicEditorUiApp(
  component: Component,
  props: Readonly<Record<string, unknown>>,
  appearance: ClassicEditorUiAppearance | (() => QuireKitTheme),
  options: ClassicEditorUiAppOptions = {}
): App<Element> {
  const root = defineComponent({
    name: "ClassicEditorUiRoot",
    setup() {
      // Selection updates replace widget context even when the theme is unchanged.
      // Retain the public provider input before projecting the token surface.
      const resolved = typeof appearance === "function" ? { theme: appearance, locale: () => defaultClassicEditorLocale } : appearance;
      const theme = computed(resolved.theme);
      const locale = computed(resolved.locale);
      return () => h(
        QuireThemeProvider,
        { theme: theme.value, surface: options.themeSurface ?? false },
        { default: () => h(QuireLocaleProvider, { locale: locale.value }, {
          default: () => h(QuireIconProvider, { registry: quireIconRegistry }, {
            default: () => h(component, props)
          })
        }) }
      );
    }
  });
  const app = createApp(root);
  // Independent roots (including separate standalone/host bundles) must not
  // generate the same Ark trigger/content IDs in one document.
  app.config.idPrefix = `qk-classic-${Array.from(
    globalThis.crypto.getRandomValues(new Uint32Array(2)), value => value.toString(36)
  ).join("-")}`;
  return app;
}
