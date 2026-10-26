/** Mermaid measurement typography, shared by editor, reading and export. */
export interface TextDiagramTypography {
  /** Actual host font stack. */ readonly fontFamily: string;
  /** CSS pixel font size. */ readonly fontSize: number;
}
/** Explicit render lifetime; no host editor state is captured. */
export interface TextDiagramRenderOptions {
  /** Cancellation of this exact source request. */ readonly signal: AbortSignal;
  /** DOM owner used for measurement and isolated engines. */ readonly ownerDocument?: Document;
  /** Mermaid text role; PlantUML and DOT retain their source-defined engine typography. */ readonly typography?: TextDiagramTypography;
}
