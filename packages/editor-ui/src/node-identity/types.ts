/** Stable semantic identity for one structure node inside one document root. */
export interface EditorUINodeIdentity {
  /** Stable content-root or Story identity. */
  readonly rootId: string;
  /** Stable feature- or schema-owned node identity. */
  readonly nodeId: string;
}

/** Version-local structural occurrence fact for one stable node identity. */
export interface EditorUINodeOrderFact {
  /** Stable node identity represented by this occurrence. */
  readonly identity: EditorUINodeIdentity;
  /** Monotonic structural order inside the root. */
  readonly order: number;
  /** Half-open document range represented by this occurrence. */
  readonly range: { readonly from: number; readonly to: number };
}
