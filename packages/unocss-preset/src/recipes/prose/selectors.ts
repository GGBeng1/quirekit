/**
 * Native content and editor-owned blocks consume one semantic stylesheet.
 * @param elements - Trusted native selector list authored by the Prose recipe.
 * @returns The same relationships, including explicit non-native Prose roles.
 */
export function proseElements(elements: string): string {
  return elements.replace(/(^|[ ,>+~])([a-z][a-z0-9]*)/gu, '$1:is($2, [data-qk-prose="$2"])');
}
