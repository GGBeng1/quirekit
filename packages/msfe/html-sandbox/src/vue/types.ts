import type { HtmlSandboxConfig } from "@quirekit/html-sandbox";
/** Editor previews deliberately use manual execution across viewport remounts. */
export interface MsfeHtmlSandboxVueOptions {
  /** Host resource/transport policy; execution must be manual or disabled. */ readonly config?: HtmlSandboxConfig;
}
