import type {
  ClassicEditorWebFontFamily,
  ClassicEditorWebFontOptions
} from "../../types";
import { createClassicChineseWebFontsSource } from "./chinese-web-fonts";
import { createClassicGoogleFontsSource } from "./google-source";
import { createClassicFontsourceSource } from "./fontsource";
import { createClassicEditorLocalFontLibraryPersistence } from "./persistence";

const openFontLicense = Object.freeze({
  name: "SIL Open Font License 1.1",
  url: "https://openfontlicense.org/open-font-license-official-text/",
  spdxId: "OFL-1.1"
});

/** Default dormant family disclosure for the Classic product. */
export const defaultClassicEditorWebFontFamilies: readonly ClassicEditorWebFontFamily[] =
  Object.freeze([
    createFamily("noto-sans-sc", "Noto Sans SC", "sans-serif", true),
    createFamily("noto-serif-sc", "Noto Serif SC", "serif", true),
    {
      family: "LXGW WenKai", displayName: "霞鹜文楷", sourceId: "chinese-web-fonts",
      sourceLabel: "中文网字计划", category: "handwriting", subsets: ["cjk"], license: openFontLicense
    },
    {
      family: "Source Han Serif CN VF", displayName: "思源宋体", sourceId: "chinese-web-fonts",
      sourceLabel: "中文网字计划", category: "serif", subsets: ["cjk"], license: openFontLicense
    },
    createFamily("source-sans-3", "Source Sans 3", "sans-serif"),
    createFamily("source-serif-4", "Source Serif 4", "serif"),
    createFamily("jetbrains-mono", "JetBrains Mono", "monospace"),
    createFamily("carlito", "Carlito", "sans-serif"),
    createFamily("arimo", "Arimo", "sans-serif"),
    createFamily("tinos", "Tinos", "serif")
  ]);

/**
 * Creates Classic's dormant, keyless-first catalog and disclosure policy.
 *
 * @returns Fresh lazy catalog with no mount-time external request.
 */
export function createDefaultClassicEditorWebFontOptions(): ClassicEditorWebFontOptions {
  return Object.freeze({
    families: defaultClassicEditorWebFontFamilies,
    sources: Object.freeze([
      createClassicFontsourceSource(),
      createClassicChineseWebFontsSource(),
      createClassicGoogleFontsSource()
    ]),
    persistence: createClassicEditorLocalFontLibraryPersistence(),
    catalogs: Object.freeze([])
  });
}

/**
 * Creates one provider disclosure entry.
 *
 * @param familyId - Official Fontsource slug.
 * @param family - Exact provider family; never impersonates a system font.
 * @param category - Provider category.
 * @param chinese - Whether the family supports simplified Chinese.
 * @returns Frozen user-facing source and license facts.
 */
function createFamily(familyId: string, family: string, category: string, chinese = false): ClassicEditorWebFontFamily {
  return Object.freeze({
    family,
    ...(family === "Noto Sans SC" ? { displayName: "Noto 黑体（简体中文）" }
      : family === "Noto Serif SC" ? { displayName: "Noto 宋体（简体中文）" } : {}),
    familyId,
    sourceId: "fontsource",
    sourceLabel: "Fontsource",
    category,
    subsets: chinese ? ["chinese-simplified", "latin"] : ["latin"],
    license: openFontLicense
  });
}
