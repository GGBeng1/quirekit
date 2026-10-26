import type { DecorationAttrs } from "@quirekit/pm";
import { HtmlContainerDescriptorRuntime } from "./lifecycle";
import type { CreateHtmlTextDescriptorOptions, HtmlInlineDecorationDesc } from "./types";

/** Presentation-only ownership; canonical text and marks remain child descriptors. */
export class HtmlInlineDecorationRuntime extends HtmlContainerDescriptorRuntime implements HtmlInlineDecorationDesc {
  /** @inheritdoc */
  readonly kind = "inline-decoration" as const;
  /** @inheritdoc */
  readonly attrs: Readonly<DecorationAttrs>;
  /** @inheritdoc */
  node: CreateHtmlTextDescriptorOptions["node"];

  /** @param options - Exact text slice, presentation attributes and retained owner. */
  constructor(options: CreateHtmlTextDescriptorOptions) {
    const attrs = options.inlineAttrs ?? {};
    const dom = options.ownerDocument.createElement(attrs.nodeName || "span");
    for (const [name, value] of Object.entries(attrs)) {
      if (name !== "nodeName" && typeof value === "string") dom.setAttribute(name, value);
    }
    super({ ...options, mount: { dom, contentDOM: dom } });
    this.node = options.node; this.attrs = attrs;
  }
}
