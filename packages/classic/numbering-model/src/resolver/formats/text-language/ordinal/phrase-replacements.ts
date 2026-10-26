/**
 * Replaces complete cardinal phrases from longest to shortest.
 *
 * @param value - Space-separated cardinal text.
 * @param replacements - Cardinal-to-ordinal phrase map.
 * @returns Text with every recognized phrase replaced.
 */
export function replaceLexicalPhrases(
  value: string,
  replacements: Readonly<Record<string, string>>
): string {
  let result = value;
  const phrases = Object.keys(replacements)
    .sort((left, right) => right.length - left.length);
  for (const phrase of phrases) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    result = result.replace(
      new RegExp(`(^| )${escaped}(?= |$)`, "gu"),
      (_match, prefix: string) => `${prefix}${replacements[phrase] ?? phrase}`
    );
  }
  return result;
}
