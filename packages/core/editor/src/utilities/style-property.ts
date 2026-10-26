/**
 * Reads the last raw inline CSS declaration for a property.
 *
 * @param element - Element whose inline style attribute should be inspected.
 * @param propertyName - Case-insensitive CSS property name.
 * @returns Raw declaration value, or null when absent.
 */
export function getStyleProperty(
  element: HTMLElement,
  propertyName: string
): string | null {
  const source = element.getAttribute("style");
  if (!source) return null;
  const target = propertyName.toLowerCase();
  const declarations = source.split(";");
  for (let index = declarations.length - 1; index >= 0; index -= 1) {
    const declaration = declarations[index]?.trim();
    if (!declaration) continue;
    const separator = declaration.indexOf(":");
    if (separator < 0) continue;
    if (declaration.slice(0, separator).trim().toLowerCase() === target) {
      return declaration.slice(separator + 1).trim();
    }
  }
  return null;
}
