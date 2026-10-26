/** A source projection, independent of retrieval, authorization and navigation. */
export interface QuireKitSource {
  /** Stable identity supplied by the host; it is not an array position. */
  readonly id: string;
  /** Human-readable document or page title. */
  readonly title: string;
  /** Optional origin, such as a host name or document collection. */
  readonly label?: string;
  /** Short context shown in the expanded list and citation preview. */
  readonly description?: string;
  /** Optional exact excerpt; never inferred from the answer text. */
  readonly quote?: string;
  /** A host-owned address included in the intent, never opened by the component. */
  readonly href?: string;
  /** Missing or inaccessible resources remain visible but cannot request navigation. */
  readonly unavailable?: boolean;
}

/** Navigation request; the consumer resolves permission, routing and external links. */
export interface QuireKitSourceNavigateDetails {
  /** Stable source identity. */
  readonly sourceId: string;
  /** Optional source address, passed through without automatic navigation. */
  readonly href?: string;
}

/** Compact source list that can be used alone or as a message part. */
export interface QuireKitSourcesProps {
  /** Stable, ordered source projections. */
  readonly sources: readonly QuireKitSource[];
  /** Trigger title; the item count is appended automatically. The language pack supplies the default. */
  readonly title?: string;
  /** Uncontrolled initial disclosure state. */
  readonly defaultOpen?: boolean;
  /** Controlled disclosure state. */
  readonly open?: boolean | undefined;
}

/** Inline marker with an actionable, keyboard- and touch-accessible preview. */
export interface QuireKitInlineCitationProps {
  /** Stable citation number or short marker text. */
  readonly label: string;
  /** Resolved source; absence renders an explicit unavailable preview. */
  readonly source?: QuireKitSource;
}
