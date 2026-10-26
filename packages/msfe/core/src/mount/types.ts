import type { Text } from "@quirekit/cm-state";

/** Source character anchor measured in client CSS pixels. */
export interface ScrollAnchor {
  /** Canonical text snapshot, used to reject an obsolete correction. */
  readonly doc: Text;
  /** Visible character's canonical source position. */
  readonly position: number;
  /** Character box offset relative to the actual clipped viewport's top edge. */
  readonly offset: number;
}

/** One bounded restoration shared by consecutive presentation changes. */
export interface ScrollRestoration {
  /** Geometry captured before the first change in this pending batch. */
  readonly anchor: ScrollAnchor;
  /** Cancels the callback and its input listeners. */
  readonly cancel: () => void;
  /** Whether the originating presentation request still applies. */
  readonly current: () => boolean;
}
