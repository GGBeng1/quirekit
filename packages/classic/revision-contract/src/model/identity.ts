/** Durable origin of one tracked revision. */
export type WordRevisionOrigin = "human" | "ai" | "import";

/** Supported content segment kinds in the admitted text-revision slice. */
export type WordRevisionSegmentKind =
  | "content-insertion"
  | "content-deletion";

/** Whole-node operations owned by the shared declared-node carrier. */
export type WordNodeRevisionKind = "node-insertion" | "node-deletion";

/** Feature structural actions admitted by the shared review graph. */
export type WordStructuralRevisionKind =
  | "table-row-insertion"
  | "table-row-deletion"
  | "table-cell-insertion"
  | "table-cell-deletion"
  | "table-cell-merge";

/** Feature-owned node-property families admitted by the shared review graph. */
export type WordNodePropertyRevisionKind =
  | "table-properties"
  | "table-grid"
  | "row-properties"
  | "cell-properties";

/** Shared category for a feature-owned whole-document topology carrier. */
export type WordDocumentTopologyRevisionKind = "document-topology";

/** Revision carrier categories that participate in imported identity. */
export type WordRevisionIdentityKind =
  | WordRevisionSegmentKind
  | WordNodeRevisionKind
  | "block-deletion"
  | "paragraph-mark-insertion"
  | "paragraph-mark-deletion"
  | "paragraph-mark-formatting"
  | "paragraph-properties"
  | "run-formatting"
  | "style-definition"
  | WordDocumentTopologyRevisionKind
  | "document-resource"
  | WordStructuralRevisionKind
  | WordNodePropertyRevisionKind;

/** Preserved move side imported from an OOXML revision wrapper. */
export type WordRevisionMove = "from" | "to";

/** Durable ordered membership for one positional compound side. */
export interface WordRevisionCompoundMembership {
  /** Stable root operation that produced the independently reviewable side. */
  readonly operationId: string;
  /** Insertion or deletion side owned by this carrier. */
  readonly direction: "insertion" | "deletion";
  /** Exact carrier-free source endpoint fingerprint. */
  readonly sourceFingerprint: string;
  /** Exact native final endpoint fingerprint before carrier materialization. */
  readonly nativeFinalFingerprint: string;
  /** Zero-based direct-member position inside the complete side. */
  readonly memberIndex: number;
  /** Complete direct-member count for the side. */
  readonly memberCount: number;
}

/** Stable identity shared by every storage segment in one logical revision. */
export interface WordRevisionIdentity {
  /** QuireKit-owned logical identity that is never derived from document position. */
  readonly changeId: string;
  /** Producer `w:id`, retained only as source and export metadata. */
  readonly sourceId: string | null;
  /** Stable reviewer identity used independently from the display name. */
  readonly reviewerId: string;
  /** Reviewer display name and OOXML author projection. */
  readonly reviewerName: string;
  /** Source or authored timestamp, or null when the producer omitted it. */
  readonly createdAt: string | null;
  /** Human, AI, or imported origin of the durable revision. */
  readonly origin: WordRevisionOrigin;
  /** Stable owning story used to isolate identity and export allocation. */
  readonly storyKey: string;
  /** Optional AI execution that materialized the revision. */
  readonly aiExecutionId: string | null;
  /** Optional AI patch operation that materialized the revision. */
  readonly aiOperationId: string | null;
}

/** Canonical attributes stored on one inline Word revision mark. */
export interface WordRevisionAttrs extends WordRevisionIdentity {
  /** Content insertion or deletion represented by this segment. */
  readonly kind: WordRevisionSegmentKind;
  /** Imported move source/destination metadata; authoring remains deferred. */
  readonly move: WordRevisionMove | null;
  /** Optional durable membership when this mark belongs to a compound side. */
  readonly compound?: WordRevisionCompoundMembership | null | undefined;
}
