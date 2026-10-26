/**
 * Parses a language class from a `<pre><code class="language-*">` structure.
 *
 * @param element - Matched `pre` element.
 * @param languageClassPrefix - Prefix used for language classes.
 * @returns Parsed language name, or null.
 */
export function parseLanguageFromCodeElement(
  element: HTMLElement,
  languageClassPrefix: string | null | undefined
): string | null {
  if (!languageClassPrefix) {
    return null;
  }

  const classNames = [...(element.firstElementChild?.classList || [])];
  const language = classNames
    .filter((className) => className.startsWith(languageClassPrefix))
    .map((className) => className.replace(languageClassPrefix, ""))[0];

  return language || null;
}
