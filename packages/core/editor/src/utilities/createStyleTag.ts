/**
 * Creates or reuses a style tag with Tiptap-compatible data attributes.
 *
 * @param style - CSS text to inject.
 * @param nonce - Optional CSP nonce.
 * @param suffix - Optional data attribute suffix.
 * @returns Existing or newly created style element.
 */
export function createStyleTag(
  style: string,
  nonce?: string,
  suffix?: string
): HTMLStyleElement {
  const attribute = `data-tiptap-style${suffix ? `-${suffix}` : ""}`;
  const existing = document.querySelector<HTMLStyleElement>(`style[${attribute}]`);

  if (existing) {
    return existing;
  }

  const styleElement = document.createElement("style");

  if (nonce) {
    styleElement.setAttribute("nonce", nonce);
  }

  styleElement.setAttribute(attribute, "");
  styleElement.innerHTML = style;
  document.head.appendChild(styleElement);

  return styleElement;
}
