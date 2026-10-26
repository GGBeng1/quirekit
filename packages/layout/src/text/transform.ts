/**
 * Applies a visual transform without changing UTF-16 document offsets.
 *
 * Unicode uppercase mappings that expand one code point (for example `ß` to
 * `SS`) remain unchanged until the layout model owns an explicit source-to-
 * display cluster map. This fail-closed rule preserves selection, hit testing,
 * revision ranges, and IME positions while rendering all length-stable scripts
 * exactly.
 *
 * @param text - Source text whose offsets are document-authoritative.
 * @param transform - Resolved visual transform.
 * @returns Display text with exactly the same UTF-16 length as the source.
 */
export function projectQuireMarkedText(
  text: string,
  transform: "none" | "uppercase"
): string {
  if (transform === "none") return text;
  return [...text].map((character) => {
    const transformed = character.toLocaleUpperCase("und");
    return transformed.length === character.length ? transformed : character;
  }).join("");
}
