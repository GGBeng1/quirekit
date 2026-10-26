import type { QuireClipboardData } from "@quirekit/clipboard";
import type { QuireEditor } from "@quirekit/core";
import type { QuireCommandRoutingScope } from "@quirekit/view-engine";
import type { QuireRetainedLayoutSnapshot } from "@quirekit/view-engine";
import type { QuireClipboardOutputStrategy } from "../types";
import type {
  QuireLayoutExportFallback
} from "@quirekit/layout/identity";
import type {
  QuireViewConsumerCompilationGap,
  QuireViewSharedConsumerDescriptor
} from "@quirekit/view-engine";

/** Inputs for mounted exact-owner clipboard serialization. */
export interface WriteQuireOwnedClipboardSelectionOptions {
  /** Editor whose current selection should be serialized. */
  readonly editor: QuireEditor;
  /** Latest retained interaction snapshot, when mounted layout is available. */
  readonly snapshot?: QuireRetainedLayoutSnapshot | undefined;
  /** Active command route whose exact owner may declare transfer fallback. */
  readonly scope?: QuireCommandRoutingScope | undefined;
  /** Writable browser clipboard adapter. */
  readonly clipboardData: QuireClipboardData;
  /** Optional mounted-backend strategy for realizing standard MIME products. */
  readonly outputStrategy?: QuireClipboardOutputStrategy | undefined;
}

/** Internal provider-aware clipboard result. */
export interface WriteQuireOwnedClipboardSelectionResult {
  /** Whether standard selection payloads were written. */
  readonly handled: boolean;
  /** Descriptor found by exact command owner, when available. */
  readonly descriptor?: QuireViewSharedConsumerDescriptor | undefined;
  /** Generic export fallback declared by the exact owner, when present. */
  readonly fallback?: QuireLayoutExportFallback | undefined;
  /** Consumer compilation or exact-index gaps observed by this request. */
  readonly gaps: readonly QuireViewConsumerCompilationGap[];
}
