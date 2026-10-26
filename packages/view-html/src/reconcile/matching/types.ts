import type { Node as ProseMirrorNode } from "@quirekit/pm";
import type { HtmlDescriptorDiagnostic } from "../../descriptors";

/** Resolved canonical product represented by one dirty container. */
export interface HtmlContainerTarget {
  /** ProseMirror node whose children the container represents. */
  readonly node: ProseMirrorNode;
  /** Mark index represented by a mark container. */
  readonly markIndex?: number | undefined;
}

/** Audit of explicit target source identities within one retained parent. */
export interface HtmlTargetSourceAudit {
  /** Explicit source ids that occur more than once in the target children. */
  readonly blockedSourceIds: ReadonlySet<string>;
  /** Stable ownership diagnostics emitted for duplicate target sources. */
  readonly diagnostics: readonly HtmlDescriptorDiagnostic[];
}
