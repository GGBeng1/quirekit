/** Physical font source explicitly supplied by the application. */
export interface FlowchartPdfFontSource {
  /** Stable provider-local face ID. */ readonly id: string;
  /** Physical family name. */ readonly family: string;
  /** Application-approved logical aliases. */ readonly acceptedSubstitutions?: readonly string[] | undefined;
  /** Numeric CSS weight. */ readonly weight: number;
  /** Physical posture. */ readonly style: "normal" | "italic";
  /** Whether the face is a general fallback. */ readonly fallback?: boolean | undefined;
  /** @returns Complete, licensed TTF/OTF bytes; no font data enters the graph. */ readonly data: () => Uint8Array | ArrayBuffer | Promise<Uint8Array | ArrayBuffer>;
}
/** @param signal - One immutable export lifetime. @returns Application-selected physical faces, loaded only when needed. */
export type FlowchartPdfFontProvider = (signal: AbortSignal) => readonly FlowchartPdfFontSource[] | Promise<readonly FlowchartPdfFontSource[]>;
/** One frozen vector PDF operation. */
export interface FlowchartPdfOptions {
  /** Explicit cancellation, checked before and after every asynchronous phase. */ readonly signal?: AbortSignal;
  /** Overrides the owning document's application font provider. */ readonly fonts?: FlowchartPdfFontProvider;
  /** Literal file metadata title. */ readonly title?: string;
}
