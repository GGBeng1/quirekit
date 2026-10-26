import type { AppContext } from "vue";
import type { HtmlSandboxConfig } from "@quirekit/html-sandbox";
/** Trusted Vue shell configuration, independent of saved node data. */
export interface HtmlSandboxVueOptions {
  /** Manual or disabled execution across retained-view remounts. */ readonly config?: HtmlSandboxConfig;
  /** Optional enclosing Vue providers for locale, icons and theme. */ readonly appContext?: AppContext;
}
