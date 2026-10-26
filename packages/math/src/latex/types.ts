import type { MathDiagnostic, MathExpression, MathSequence } from '../model/types';
import type { MathLatexReader } from './reader';
/** Shared parser contract for structural families without recursive imports. */
export interface MathStructureParser {
  /** Exact source cursor, limits and diagnostic owner. */
  readonly reader: MathLatexReader;
  /** Parses content up to an unconsumed structural separator. */
  readonly sequence: (stops?: readonly string[]) => MathSequence;
  /** Parses one argument; required groups disallow ambiguous implicit operands. */
  readonly argument: (braced?: boolean) => MathSequence;
  /** Parses an optional `[…]` argument when one follows. */
  readonly optional: () => MathSequence | undefined;
  /** Parses one atom without postfix scripts. */
  readonly atom: () => MathExpression;
}
/** Internal parser failure carrying a public diagnostic. */
export class MathParseFailure extends Error {
  /** Structured error without partial parse output. */
  readonly diagnostic: MathDiagnostic;
  /**
   * Creates a failure to unwind the complete parse operation.
   * @param diagnostic - Source diagnostic.
   */
  constructor(diagnostic: MathDiagnostic) {
    super(diagnostic.message);
    this.diagnostic = diagnostic;
  }
}
