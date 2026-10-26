import type { OmmlNode } from "../types";

/** Decoding switches threaded through nested slots. */
export interface DecodeScope {
  /** Whether `&` in text is an equation-array alignment point. */
  readonly alignment: boolean;
}

/** Slot decoders supplied by the entry module so structure modules stay acyclic. */
export interface DecodeContext {
  /** Decodes the content of one slot. */
  readonly slot: (node: OmmlNode | undefined, scope?: DecodeScope) => string;
  /** Decodes one slot as a braced group. */
  readonly group: (node: OmmlNode | undefined, scope?: DecodeScope) => string;
}
