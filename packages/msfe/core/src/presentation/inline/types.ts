/** Hidden delimiter navigation, independently configurable for each syntax family. */
export type InlineBoundaryBehavior = "content" | "split" | "native";

/** Feature-owned grammar facts consumed by the shared selection runtime. */
export interface InlineBoundaryRule {
  /** Exact confirmed inline syntax names. */
  readonly nodes: readonly string[];
  /** Direct child tokens forming the opening and closing delimiters. */
  readonly marker: string;
  /** Content skips duplicate stops; split retains distinct inside/outside insertion; native leaves selection unchanged. */
  readonly behavior: InlineBoundaryBehavior;
}
