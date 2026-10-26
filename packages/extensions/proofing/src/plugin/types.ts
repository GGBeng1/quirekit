import type { DecorationSet } from "@quirekit/pm";
import type { ProofingIssue, ProofingRange } from "../types";

/** Findings of one checked block, in positions of the document it was extracted from. */
export interface ProofingBlockResult {
  /** Block start at extraction time. */
  readonly from: number;
  /** Block end at extraction time. */
  readonly to: number;
  /** Findings, in extraction-time positions. */
  readonly issues: readonly ProofingIssue[];
}

/** Block handed to a provider and not yet answered. */
export interface ProofingInflightBlock {
  /** Request carrying the block. */
  readonly requestId: string;
  /** Block start at extraction time; identifies the block inside its request. */
  readonly originFrom: number;
  /** Current block start. */
  readonly from: number;
  /** Current block end. */
  readonly to: number;
  /** Whether an edit touched the block, making the pending answer useless. */
  readonly stale: boolean;
}

/** Block about to be sent, as recorded by a `schedule` meta. */
export interface ProofingPendingBlock {
  /** Request carrying the block. */
  readonly requestId: string;
  /** Block start. */
  readonly from: number;
  /** Block end. */
  readonly to: number;
}

/** Status values the session reports; checking, `limited`, and switched-off checking are derived by the plugin. */
export type ProofingSessionStatus = "disabled" | "idle" | "degraded";

/** Transaction metadata understood by the proofing plugin. */
export type ProofingMeta =
  | { readonly type: "enable"; readonly enabled: boolean }
  | { readonly type: "recheck" }
  | {
    readonly type: "schedule";
    readonly cleared: readonly ProofingRange[];
    readonly pending: readonly ProofingPendingBlock[];
    readonly resolved: readonly ProofingBlockResult[];
  }
  | { readonly type: "results"; readonly requestId: string; readonly blocks: readonly ProofingBlockResult[] }
  | { readonly type: "release"; readonly requestId: string }
  | { readonly type: "status"; readonly status: ProofingSessionStatus }
  | { readonly type: "suppress-words"; readonly words: readonly string[] }
  | { readonly type: "ignore-word"; readonly word: string }
  | { readonly type: "add-word"; readonly word: string }
  | { readonly type: "ignore-issue"; readonly id: string };

/** Plugin state owning findings and the checking queue. */
export interface ProofingPluginState {
  /** Whether checking is switched on. */
  readonly enabled: boolean;
  /** Every kept finding; each decoration's spec carries its issue. */
  readonly issues: DecorationSet;
  /** Ranges the user ignored once, mapped with the document. */
  readonly ignored: DecorationSet;
  /** Normalized words whose findings are hidden. */
  readonly suppressed: ReadonlySet<string>;
  /** Sorted intervals whose textblocks need checking. */
  readonly dirty: readonly ProofingRange[];
  /** Blocks waiting for a provider answer. */
  readonly inflight: readonly ProofingInflightBlock[];
  /** Status last reported by the session. */
  readonly sessionStatus: ProofingSessionStatus;
  /** Number of kept findings. */
  readonly issueCount: number;
  /** Whether findings were dropped because of the issue limit. */
  readonly limited: boolean;
  /** Caret position after the latest edit, cleared when the caret moves without editing. */
  readonly typingAt: number | null;
  /** Finding being typed under a collapsed caret, which is not painted. */
  readonly hiddenId: string | null;
  /** Painted findings. */
  readonly presentation: DecorationSet;
  /** Increments on every change. */
  readonly version: number;
}
