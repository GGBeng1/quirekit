import type { CollaborationManifest } from "@quirekit/msfe-collaboration";

/** Configuration for an explicitly chosen Hocuspocus-compatible host service. */
export interface HocuspocusProviderOptions {
  /** Configured WebSocket endpoint; never replaced by an untrusted response URL. */
  readonly url: string;
  /** HTTP admission endpoint implementing the MSFE session manifest contract. */
  readonly sessionEndpoint: string;
  /** Bearer credential or refresh function, used only for the configured service. */
  readonly token?: string | (() => string | Promise<string>);
  /** Optional host HTTP implementation. */
  readonly fetch?: typeof globalThis.fetch;
  /** Optional WebSocket constructor for Node or host-specific transports. */
  readonly WebSocketPolyfill?: typeof WebSocket;
}

/** Application manifest supplied in addition to the standard Hocuspocus protocol. */
export interface HocuspocusSessionManifest extends CollaborationManifest {
  /** Server-selected room, bound to documentId and epoch by service authentication. */
  readonly room: string;
  /** Optional short-lived, room-scoped connection token. */
  readonly connectionToken?: string;
  /** Optional durable checkpoint endpoint on the admission endpoint's origin. */
  readonly checkpointEndpoint?: string;
}
