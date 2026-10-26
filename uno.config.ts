import { defineConfig, presetWind3 } from "unocss";
import { quireKitUnoUtilityCatalog } from "./packages/unocss-preset/src/theme/catalog";
import { createUnoTheme } from "./packages/unocss-preset/src/theme/create";
import { themeVariableReferences } from "./packages/ui/src/theme/variables/references";

const theme = createUnoTheme(themeVariableReferences);

/**
 * Repository-level UnoCSS discovery configuration.
 *
 * This file imports source modules deliberately: editor integrations must be
 * able to enumerate QuireKit utilities in a fresh checkout before workspace
 * packages have produced `dist` artifacts. The explicit theme bridge lets the
 * editor enumerate `qk-*` theme tokens through standard UnoCSS utilities.
 */
export default defineConfig({
  content: {
    filesystem: [
      "apps/**/*.{html,js,jsx,mjs,cjs,ts,tsx,vue,svelte,astro}",
      "packages/**/*.{html,js,jsx,mjs,cjs,ts,tsx,vue,svelte,astro}",
      "tests/**/*.{html,js,jsx,mjs,cjs,ts,tsx,vue,svelte,astro}"
    ],
    pipeline: {
      include: [
        /\.(?:html|js|jsx|mjs|cjs|ts|tsx|vue|svelte|astro)(?:$|\?)/
      ]
    }
  },
  presets: [presetWind3()],
  theme,
  safelist: [...quireKitUnoUtilityCatalog],
  layers: {
    "qk-tokens": -20,
    shortcuts: -5,
    default: 0,
    utilities: 10
  },
  outputToCssLayers: true
});
