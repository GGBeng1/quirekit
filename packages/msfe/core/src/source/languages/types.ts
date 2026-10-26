import type { LanguageSupport } from "@quirekit/cm-language";

/** Host-owned lazy language; parsed by the canonical Markdown mixed parser. */
export interface CodeLanguage {
  /** Exact case-insensitive fence language name. */
  readonly name: string;
  /** Additional exact info-string names, such as ts or js. */
  readonly aliases?: readonly string[];
  /** @param signal - Editor lifetime; dynamic imports may finish after cancellation. @returns Language parser support. */
  readonly load: (signal: AbortSignal) => Promise<LanguageSupport>;
}
