/** Portable source object; execution policy never belongs in saved content. */
export interface HtmlSandboxDocument {
  /** Envelope version. */ readonly version: 1;
  /** Original source, including trailing whitespace. */ readonly html: string;
  /** Optional plain-text label. */ readonly title?: string;
  /** Explicit user-saved height in CSS pixels. */ readonly height?: number;
}
