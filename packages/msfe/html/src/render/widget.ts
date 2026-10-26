import { WidgetType, type EditorView } from "@quirekit/cm-view";

/** Small void/entity projection only; ordinary HTML text remains native CM text. */
export class HtmlTokenWidget extends WidgetType {
  private readonly resources = new WeakMap<HTMLElement, AbortController>();
  /** @param tag - Fixed void tag or text span. @param attributes - Sanitized allowlisted attributes. @param text - Decoded inert entity text. */
  constructor(private readonly tag: "span" | "br" | "hr" | "img", private readonly attributes: Readonly<Record<string, string>> = {}, private readonly text = "") { super(); }
  /** @param other - Previous token. @returns Whether its inert presentation is identical. */
  eq(other: HtmlTokenWidget): boolean { return this.tag === other.tag && this.text === other.text && JSON.stringify(this.attributes) === JSON.stringify(other.attributes); }
  /** @returns Explicit visual breaks so CM can measure a projected br on its source line. */
  get lineBreaks(): number { return this.tag === "br" ? 1 : 0; }
  /** @param view - DOM owner. @returns Vetted token with no user event handlers or HTML assignment. */
  toDOM(view: EditorView): HTMLElement {
    const dom = view.dom.ownerDocument.createElement(this.tag);
    dom.className = `msfe-html-token msfe-html-${this.tag} qk-prose-node`;
    for (const [name, value] of Object.entries(this.attributes)) dom.setAttribute(name, value);
    if (this.tag === "span") dom.textContent = this.text;
    if (this.tag === "img") {
      const resource = new AbortController();
      this.resources.set(dom, resource);
      dom.addEventListener("load", () => view.requestMeasure(), { once: true, signal: resource.signal });
      dom.addEventListener("error", () => { dom.setAttribute("data-msfe-image-error", "true"); view.requestMeasure(); }, { once: true, signal: resource.signal });
    }
    return dom;
  }
  /** @returns False so native CM owns source-range selection and clipboard. */
  ignoreEvent(): boolean { return false; }
  /** @param dom - Removed resource. */
  destroy(dom: HTMLElement): void {
    this.resources.get(dom)?.abort(); this.resources.delete(dom);
    if (this.tag === "img") dom.removeAttribute("src");
  }
}
