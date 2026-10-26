import { defineComponent, h } from "vue";
import { QuireHtmlSandbox } from "@quirekit/ui/vue/html-sandbox";
import { VueComponentViewRenderer } from "@quirekit/msfe-vue";
import { withMarkdownReading } from "@quirekit/incremark/vue";
import { defineHtmlSandboxConfig } from "@quirekit/html-sandbox";
import type { ComponentViewRenderer } from "@quirekit/msfe-core";
import { MsfeHtmlSandbox } from "../extension";
import type { MsfeHtmlSandboxAttributes, MsfeHtmlSandboxViewProps } from "../types";
import type { MsfeHtmlSandboxVueOptions } from "./types";

/** Install shared previews for MSFE and snapshot Markdown reading.
 * @param options - Trusted host configuration. @returns Configured source extension with Vue reading.
 */
export function createMsfeHtmlSandbox(options: MsfeHtmlSandboxVueOptions = {}) {
  const config = defineHtmlSandboxConfig(options.config);
  if (config.execution === "on-complete") throw new TypeError("Editor adapters require manual execution; use QuireHtmlSandbox with explicit completion for streaming.");
  const component = defineComponent({ props: ["view"],
    /** @param props - Retained host view input. @returns Preview render function. */
    setup(props) { return () => h(QuireHtmlSandbox, { html: (props.view as MsfeHtmlSandboxViewProps).html, config, interactionGated: true, onResize: props.view.requestMeasure }); },
  });
  const portal = VueComponentViewRenderer<MsfeHtmlSandboxViewProps>(component);
  const renderer: ComponentViewRenderer<MsfeHtmlSandboxViewProps> = mount => {
    const handle = portal({ ...mount, props: { ...mount.props, requestMeasure: mount.requestMeasure } });
    return { update: next => handle.update({ ...next, requestMeasure: mount.requestMeasure }), destroy: () => handle.destroy() };
  };
  return withMarkdownReading<MsfeHtmlSandboxAttributes>(MsfeHtmlSandbox.configure({ renderer }), {
    /** @param context - Source validated by the same closed-fence codec. @returns Editor-independent preview. */
    render(context) { return h(QuireHtmlSandbox, { html: context.attrs.html, config }); },
  });
}
