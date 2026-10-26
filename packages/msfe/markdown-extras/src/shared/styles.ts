/** Attribute keeping a rendered SVG's own CSS for standalone export after it moved to the shared head styles. */
export const PREVIEW_STYLE_ATTRIBUTE = "data-msfe-style";

/** Shared head stylesheets per document, reference-counted by identical CSS text. */
const registries = new WeakMap<Document, Map<string, { readonly element: HTMLStyleElement; users: number }>>();

/**
 * Moves `<style>` elements out of rendered diagram output into shared head stylesheets. Inserting or removing
 * a stylesheet recalculates styles for the whole document, so stylesheets must not travel with output that
 * enters and leaves the viewport while scrolling. Rules stay scoped by the diagram's own SVG id.
 * @param output - Freshly rendered preview output.
 * @returns Release for this output's references; the last user removes the shared stylesheet.
 */
export function hoistPreviewStyles(output: HTMLElement): () => void {
  const styles = Array.from(output.querySelectorAll("style"));
  if (!styles.length) return () => undefined;
  const owner = output.ownerDocument, registry = registries.get(owner) ?? new Map();
  registries.set(owner, registry);
  const used: string[] = [];
  for (const style of styles) {
    const css = style.textContent ?? "", svg = style.closest("svg");
    style.remove();
    if (svg) svg.setAttribute(PREVIEW_STYLE_ATTRIBUTE, (svg.getAttribute(PREVIEW_STYLE_ATTRIBUTE) ?? "") + css);
    let entry = registry.get(css);
    if (!entry) {
      const element = owner.createElement("style");
      element.dataset.msfePreviewStyle = "";
      element.textContent = css;
      owner.head.append(element);
      entry = { element, users: 0 };
      registry.set(css, entry);
    }
    entry.users += 1;
    used.push(css);
  }
  return () => {
    for (const css of used.splice(0)) {
      const entry = registry.get(css);
      if (!entry || --entry.users > 0) continue;
      entry.element.remove();
      registry.delete(css);
    }
  };
}
