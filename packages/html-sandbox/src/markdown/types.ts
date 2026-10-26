/** Lossless explicit executable fence, independent of a Markdown engine. */
export interface HtmlSandboxFence {
  /** Exact body, including a final newline when present. */ readonly html: string;
  /** True only when an explicit matching closing fence exists. */ readonly closed: boolean;
}
