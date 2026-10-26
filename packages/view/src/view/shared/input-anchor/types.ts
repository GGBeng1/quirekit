import type { QuireLayoutQueryProductOwner } from "@quirekit/layout/products";
import type { QuireRect } from "@quirekit/renderer";
import type {
  QuireInteractionDiagnostics
} from "@quirekit/view-engine";

import type {
  QuireLayoutRegionRef
} from "@quirekit/layout/identity";

/** Input proxy anchor plus its canonical retained ownership and diagnostics. */
export interface MountedInputProxyAnchorResult {
  /** Anchor rectangle in document coordinates. */
  readonly rect: QuireRect;
  /** Query-product owner that produced the anchor, when retained geometry answered. */
  readonly queryOwner?: QuireLayoutQueryProductOwner | undefined;
  /** Exact retained region occurrence that produced the anchor, when available. */
  readonly viewRegion?: QuireLayoutRegionRef | undefined;
  /** Diagnostics describing the anchor source and fallback usage. */
  readonly diagnostics: QuireInteractionDiagnostics;
}
