/**
 * Keeps the browser's internal caret inside the View-owned IME anchor while exposing surrounding text.
 * @param input - Existing positioned textarea; its left/top remain exclusively View-owned.
 * @returns Restoration of the two native viewport properties on release.
 */
export function constrainNativeTextViewport(input: HTMLTextAreaElement): () => void {
  const width = input.style.maxWidth;
  const wrap = input.getAttribute("wrap");
  // Without this constraint, native context before the caret can move the OS candidate
  // anchor up to the original 150px textarea width away from the painted caret.
  input.style.maxWidth = "1px";
  input.setAttribute("wrap", "off");
  return () => {
    input.style.maxWidth = width;
    if (wrap === null) input.removeAttribute("wrap");
    else input.setAttribute("wrap", wrap);
  };
}
