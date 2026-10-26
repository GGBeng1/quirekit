/** Fixed document-compiler phases in execution order. */
export const docxCompilerPhases = [
  "discover",
  "inventory",
  "analyze",
  "project",
  "resolve",
  "compile",
  "finalize",
  "validate"
] as const;

/** One fixed document-compiler phase. */
export type DocxCompilerPhase = (typeof docxCompilerPhases)[number];

/**
 * Returns the stable position of one compiler phase.
 *
 * @param phase - Compiler phase to locate.
 * @returns Zero-based phase position.
 */
export function getDocxCompilerPhaseIndex(phase: DocxCompilerPhase): number {
  return docxCompilerPhases.indexOf(phase);
}
