import type {
  QuireLayoutJobExecutor,
  QuireLayoutJobRequest,
  QuireLayoutJobResult,
  QuireMainThreadLayoutJobHandlers
} from "../types";

/** Request message sent from the main thread to a layout Worker. */
export type QuireLayoutWorkerRequestMessage =
  | { readonly type: "submit"; readonly request: QuireLayoutJobRequest }
  | { readonly type: "cancel"; readonly jobId: string };

/** Completion message sent from a layout Worker to the main thread. */
export interface QuireLayoutWorkerResultMessage {
  /** Completion message discriminator. */
  readonly type: "result";
  /** Clone-safe executor result. */
  readonly result: QuireLayoutJobResult;
}

/** Minimal message event consumed by Worker transport. */
export interface QuireLayoutWorkerMessageEvent<Message> {
  /** Message payload delivered by the endpoint. */
  readonly data: Message;
}

/** Minimal Worker transport failure event. */
export interface QuireLayoutWorkerErrorEvent {
  /** Browser-provided failure detail when available. */
  readonly message?: string;
}

/** Browser deployment capability supplied by an application bundler. */
export interface QuireLayoutWorkerHost {
  /**
   * Creates the module Worker emitted from `@quirekit/view/layout-worker`.
   *
   * @returns Fresh browser Worker owned by one mounted view runtime.
   */
  readonly createWorker: () => Worker;
}

/** Main-thread Worker endpoint required by the layout executor. */
export interface QuireLayoutWorkerClient {
  /** @param message - Clone-safe request or cancellation message. */
  readonly postMessage: (message: QuireLayoutWorkerRequestMessage) => void;
  /** @param type - Message event type. @param listener - Result listener. */
  addEventListener(
    type: "message",
    listener: (event: QuireLayoutWorkerMessageEvent<unknown>) => void
  ): void;
  /** @param type - Failure event type. @param listener - Failure listener. */
  addEventListener(
    type: "error" | "messageerror",
    listener: (event: QuireLayoutWorkerErrorEvent) => void
  ): void;
  /** @param type - Message event type. @param listener - Prior result listener. */
  removeEventListener(
    type: "message",
    listener: (event: QuireLayoutWorkerMessageEvent<unknown>) => void
  ): void;
  /** @param type - Failure event type. @param listener - Prior failure listener. */
  removeEventListener(
    type: "error" | "messageerror",
    listener: (event: QuireLayoutWorkerErrorEvent) => void
  ): void;
  /** Terminates the Worker endpoint. */
  readonly terminate: () => void;
}

/** Worker-global endpoint required by the layout runtime. */
export interface QuireLayoutWorkerScope {
  /** @param message - Clone-safe result message. */
  readonly postMessage: (message: QuireLayoutWorkerResultMessage) => void;
  /** @param type - Message event type. @param listener - Request listener. */
  readonly addEventListener: (
    type: "message",
    listener: (event: QuireLayoutWorkerMessageEvent<unknown>) => void
  ) => void;
  /** @param type - Message event type. @param listener - Prior request listener. */
  readonly removeEventListener: (
    type: "message",
    listener: (event: QuireLayoutWorkerMessageEvent<unknown>) => void
  ) => void;
}

/** Bound Worker-side runtime lifecycle. */
export interface QuireLayoutWorkerRuntime {
  /** Removes listeners and suppresses later completions. */
  readonly destroy: () => void;
}

/** Why layout execution selected the asynchronous main-thread fallback. */
export type QuireLayoutWorkerFallbackReason =
  | "worker-creation-failed"
  | "worker-transport-failed"
  | "worker-unsupported";

/** Current execution location and fallback diagnostic. */
export type QuireLayoutJobExecutorDeployment =
  | {
      /** Real module Worker is executing eligible jobs. */
      readonly mode: "worker";
      /** No fallback has occurred. */
      readonly fallbackReason: null;
    }
  | {
      /** Asynchronous main-thread handlers are executing jobs. */
      readonly mode: "main-thread";
      /** Explicit environmental reason for selecting the fallback. */
      readonly fallbackReason: QuireLayoutWorkerFallbackReason;
    };

/** Options for selecting a Worker executor with a canonical fallback. */
export interface CreateQuireLayoutJobExecutorWithWorkerFallbackOptions {
  /** @returns Emitted module Worker; absent when Worker is unsupported. */
  readonly createWorker?: () => QuireLayoutWorkerClient;
  /** Pure handlers shared by the Worker artifact and main-thread fallback. */
  readonly fallbackHandlers: QuireMainThreadLayoutJobHandlers;
}

/** Executor plus observable deployment diagnostics. */
export interface QuireLayoutJobExecutorDeploymentController {
  /** Executor preserving one coordinator contract across both locations. */
  readonly executor: QuireLayoutJobExecutor;
  /** @returns Current execution location and fallback reason. */
  readonly snapshot: () => QuireLayoutJobExecutorDeployment;
}
