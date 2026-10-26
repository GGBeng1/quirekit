import type { MindMapDocument } from "@quirekit/mind-map";
import type { MindEditorRecoveryOptions, MindMapRecoveryRecord } from "../../src/index";

/** Props for the test-owned host, with normal public component typing. */
export interface SaveAcceptanceProps {
  /** Initial immutable document. */ readonly source: MindMapDocument;
  /** Atomic recovery storage with a controlled delay. */ readonly recovery: MindEditorRecoveryOptions;
}

/** Test-owned host observations, accessed only through public component methods. */
export interface SaveAcceptanceState {
  /** Whether the slow storage deletion has started. */ readonly removing: boolean;
  /** Whether the host acceptance has completed. */ readonly finished: boolean;
  /** Immutable source accepted before subsequent user input. */ readonly accepted: MindMapDocument | null;
  /** Current automatic checkpoint in the injected atomic store. */ readonly record: MindMapRecoveryRecord | null;
  /** Canonical fingerprint of the host-accepted source. */ readonly expectedBase: string | null;
  /** Public component failures. */ readonly errors: readonly string[];
}

/** Explicit save host, with a controllable storage delay for browser regression. */
export interface SaveAcceptanceBridge {
  /** @returns Detached public observations without reading renderer internals. */ state(): SaveAcceptanceState;
  /** @returns Capture of a host save before asynchronous host confirmation. */ capture(): Promise<void>;
  /** Accepts only the previously captured immutable source. */ accept(): void;
  /** Captures a host source, then accepts it while storage deletion is delayed. */ save(): void;
  /** Releases the delayed deletion without altering the editor. */ release(): void;
}
