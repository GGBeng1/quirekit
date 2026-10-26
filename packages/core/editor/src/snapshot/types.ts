import type { Node as PMNode } from "@quirekit/pm";
import type { QuireViewAdapter } from "../types";

/** Explicit inputs for an isolated, renderer-only editor snapshot. */
export interface QuireEditorReadOnlySnapshotOptions {
  /** Immutable same-schema document; defaults to the source's current document. */
  readonly document?: PMNode | undefined;
  /** Fresh adapters owned by the snapshot; source adapters are never inherited. */
  readonly viewAdapters?: readonly QuireViewAdapter[] | undefined;
}
