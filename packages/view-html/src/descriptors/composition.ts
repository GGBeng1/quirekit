import { HtmlDescriptorRuntime } from "./lifecycle";
import type {
  CreateHtmlCompositionDescriptorOptions,
  HtmlCompositionDesc,
  HtmlCompositionPresentation
} from "./types";

/** Runtime-owned transient descriptor for one in-flow IME session. */
class HtmlCompositionDescriptorRuntime
  extends HtmlDescriptorRuntime
  implements HtmlCompositionDesc {
  /** @inheritdoc */
  readonly kind = "composition" as const;
  /** @inheritdoc */
  text: string;
  /** @inheritdoc */
  readonly textDOM: Text;

  /**
   * Creates one detached composition descriptor and its stable DOM product.
   *
   * @param options - Session identity, inherited ownership, and presentation.
   */
  constructor(options: CreateHtmlCompositionDescriptorOptions) {
    const span = options.ownerDocument.createElement("span");
    const textDOM = options.ownerDocument.createTextNode(options.text);

    span.className = "qk-html-editor__composition";
    span.dataset.qkComposition = options.id;
    span.appendChild(textDOM);
    super({
      id: options.id,
      parent: options.parent,
      source: options.source,
      range: options.range,
      mount: { dom: span, contentDOM: null }
    });
    this.text = options.text;
    this.textDOM = textDOM;
    applyHtmlCompositionPresentation(span, options.presentation);
  }

  /** @inheritdoc */
  update(
    range: HtmlCompositionDesc["range"],
    text: string,
    presentation: HtmlCompositionPresentation
  ): void {
    this.range = range;
    if (text !== this.text) {
      this.text = text;
      this.textDOM.nodeValue = text;
    }
    const span = this.mount?.dom;
    if (span?.nodeType === 1) {
      applyHtmlCompositionPresentation(
        span as HTMLElement,
        presentation
      );
    }
  }
}

/**
 * Creates a detached in-flow composition descriptor for one IME session.
 *
 * @param options - Session identity, inherited ownership, text, and presentation.
 * @returns Stable transient descriptor whose mount may be inserted into retained flow.
 */
export function createHtmlCompositionDescriptor(
  options: CreateHtmlCompositionDescriptorOptions
): HtmlCompositionDesc {
  return new HtmlCompositionDescriptorRuntime(options);
}

/**
 * Applies semantic preedit affordances without replacing inherited text styles.
 *
 * @param span - Transient in-flow composition element.
 * @param presentation - Resolved semantic IME presentation.
 */
function applyHtmlCompositionPresentation(
  span: HTMLElement,
  presentation: HtmlCompositionPresentation
): void {
  span.style.backgroundColor = presentation.background
    ? presentation.backgroundFillStyle
    : "transparent";
  span.style.textDecorationLine = presentation.underline ? "underline" : "none";
}
