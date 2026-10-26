import type { MsfeNodeViewSpec, MsfeSourceRange } from "../../views/types";
import type { SourceNode } from "../authoring/types";

/** Backend codec shared by semantic queries and optional source-bound views. */
export type SourceCodec = Pick<MsfeNodeViewSpec, "nodes" | "read" | "patch" | "source">;

/** One installed semantic type, independent of mounted widgets. */
export interface SourceType {
  /** Public extension name. */
  readonly name: string;
  /** Author-declared family. */
  readonly kind: "extension" | "node" | "mark";
  /** Validated backend source adapter. */
  readonly codec: SourceCodec;
}

/** Immutable decoded syntax snapshot; use a fresh query before a write. */
export interface SourceMatch extends MsfeSourceRange {
  /** Lazy syntax access for structural projections; no persistent duplicate tree. */
  readonly node: SourceNode;
  /** Public semantic name. */
  readonly name: string;
  /** Author-declared family. */
  readonly kind: SourceType["kind"];
  /** Decoded and validated persisted fields. */
  readonly attrs: Readonly<Record<string, unknown>>;
}

/** Partial parsing is explicit; absence in an incomplete tree is not a negative answer. */
export interface SourceQuery {
  /** Unsupported means the semantic type is not installed; pending means incomplete parsing. */
  readonly status: "ready" | "pending" | "unsupported";
  /** Confirmed matches overlapping the requested source intervals. */
  readonly matches: readonly SourceMatch[];
}
