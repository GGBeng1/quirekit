import { Language, LanguageSupport } from "@quirekit/cm-language";
import type { LanguageDescription } from "@quirekit/cm-language";
import { commonmarkLanguage, markdown } from "@quirekit/cm-lang-markdown";
import { GFM, type MarkdownExtension, type MarkdownParser } from "@quirekit/lezer-markdown";
import { ReferenceMarkdownParser } from "./references";

/** @param support - Fully configured native Markdown support. @returns The same language data/support with canonical reference-aware grouping. */
export function referenceLanguage(support: LanguageSupport): LanguageSupport {
  return new LanguageSupport(new Language(support.language.data, new ReferenceMarkdownParser(support.language.parser as MarkdownParser), [], support.language.name), support.support);
}

/** @param syntax - Installed dialect contributions. @param codeLanguages - Optional editor code-language lookup. @returns One shared grammar configuration for editable and headless source. */
export function createMarkdownLanguage(syntax: readonly MarkdownExtension[], codeLanguages?: (name: string) => LanguageDescription | null): LanguageSupport {
  return referenceLanguage(markdown({ base: commonmarkLanguage, extensions: [GFM, ...syntax],
    completeHTMLTags: false, pasteURLAsLink: false, ...(codeLanguages ? { codeLanguages } : {}) }));
}
