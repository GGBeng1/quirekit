import type { HtmlSandboxConfig, HtmlSandboxEvent, HtmlSandboxSource, HtmlSandboxState } from "../types";
/** Host-owned browser mounting options, with no global singleton. */
export interface CreateHtmlSandboxOptions {
  /** Dedicated container owned by this runtime; its siblings are never touched. */ readonly container: HTMLElement;
  /** Initial source snapshot. */ readonly source: HtmlSandboxSource;
  /** Trusted policy, defaulting to manual srcdoc. */ readonly config?: HtmlSandboxConfig;
  /** Accessible frame title. Defaults to HTML preview. */ readonly title?: string;
  /** Host callback for bounded events. */ readonly onEvent?: (event: HtmlSandboxEvent) => void;
}
/** One independently disposable execution controller. */
export interface HtmlSandboxHandle {
  /** Immutable current lifecycle projection. */ readonly state: HtmlSandboxState;
  /** Replace an atomic source snapshot. @param source - New host input. */ update(source: HtmlSandboxSource): void;
  /** Revalidate effective policy; changed policy retires the active guest. @param config - Host policy. */ configure(config: HtmlSandboxConfig): void;
  /** Start a fresh complete snapshot. @returns Whether execution was admitted. */ run(): boolean;
  /** Stop and latch automatic execution until an explicit run. */ stop(): void;
  /** Permanently release all browser resources; safe to call repeatedly. */ destroy(): void;
}
/** Internal disposable iframe transport. */
export interface SandboxTransportHandle {
  /** Release window listeners, ports, timers and the frame. */ destroy(): void;
}
