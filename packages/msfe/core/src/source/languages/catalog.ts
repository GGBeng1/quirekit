import { LanguageDescription, LanguageSupport, StreamLanguage } from "@quirekit/cm-language";
import type { CodeLanguage } from "./types";

const plain = new LanguageSupport(StreamLanguage.define({
  /** @param stream - Current code line. @returns No syntax classification for a failed/aborted loader. */
  token(stream) { stream.skipToEnd(); return null; },
}));

/**
 * Creates an instance-local lazy catalog; selection changes never initiate loads.
 * @param entries - Host language definitions. @param signal - Editor lifetime.
 * @param report - Host error boundary. @returns Exact lookup for CM's existing mixed parser.
 */
export function codeLanguageCatalog(entries: readonly CodeLanguage[], signal: AbortSignal, report: (error: unknown) => void): (name: string) => LanguageDescription | null {
  const names = new Map<string, LanguageDescription>();
  for (const entry of entries) {
    const description = LanguageDescription.of({ name: entry.name, alias: [...entry.aliases ?? []],
      async load() {
        if (signal.aborted) return plain;
        try { const value = await entry.load(signal); return signal.aborted ? plain : value; }
        catch (error) { if (!signal.aborted) report(error); return plain; }
      },
    });
    for (const name of new Set([entry.name, ...entry.aliases ?? []].map(value => value.toLowerCase()))) {
      if (!name || /\s/u.test(name) || names.has(name)) throw new Error(`invalid-code-language: ${name}`);
      names.set(name, description);
    }
  }
  return name => names.get(name.toLowerCase()) ?? null;
}
