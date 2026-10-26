import { h, render } from "vue";
import { QuireHtmlSandbox } from "@quirekit/ui/vue/html-sandbox";
import { defineHtmlSandboxConfig, type HtmlSandboxDocument } from "@quirekit/html-sandbox";
import { HtmlSandbox } from "../extension";
import type { HtmlSandboxVueOptions } from "./types";
/** Create a retained Block Editor extension backed by the public component.
 * @param options - Trusted host policy and optional Vue ancestry. @returns Configured generic extension.
 */
export function createHtmlSandboxExtension(options: HtmlSandboxVueOptions = {}) {
  const config = defineHtmlSandboxConfig(options.config);
  if (config.execution === "on-complete") throw new TypeError("Editor adapters require manual execution; use QuireHtmlSandbox with explicit completion for streaming.");
  return HtmlSandbox.configure({
    /** @param container - Editor-owned mount. @param document - Validated persisted data. @returns Shell update and disposal. */
    mount(container, document) {
      /** @param next - Current source object. */
      function update(next: HtmlSandboxDocument): void {
        const node = h(QuireHtmlSandbox, { html: next.html, config, interactionGated: true, ...(next.title ? { title: next.title } : {}), ...(next.height ? { height: next.height } : {}) });
        if (options.appContext) node.appContext = options.appContext;
        render(node, container);
      }
      update(document);
      return { update, destroy() { render(null, container); } };
    },
  });
}
