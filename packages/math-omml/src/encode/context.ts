import type { MathExpression, MathSequence } from "@quirekit/math";
import type { OmmlNode, OmmlRunStyle } from "../types";

/** State shared by the structure encoders of one formula. */
export interface EncodeContext {
  /** Run properties inherited from enclosing font commands. */
  readonly style: OmmlRunStyle;
  /** Codes of source constructs Word cannot represent. */
  readonly losses: Set<string>;
  /** Encodes a slot; supplied by the entry module to keep structure modules acyclic. */
  readonly encodeSequence: (sequence: MathSequence | undefined, context: EncodeContext) => OmmlNode[];
  /** Encodes sibling expressions. */
  readonly encodeChildren: (children: readonly MathExpression[], context: EncodeContext) => OmmlNode[];
}
