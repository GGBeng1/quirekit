import { Extension } from "@quirekit/msfe-core";
import { typographerProjection } from "./runtime";
import type { TypographerOptions } from "./types";

/** Optional smart punctuation that changes only reading presentation, never source or history. */
export const Typographer = Extension.create<TypographerOptions>({ name: "typographer",
  /** @returns Common prose punctuation with a bounded per-block inspection budget. */
  addOptions: () => ({ replacements: true, smartQuotes: true, quotes: ["“", "”", "‘", "’"], maxBlockLength: 65536 }),
  /** @returns A composable decoration layer; heading, link and prose owners retain their existing projections. */
  addCodeMirrorExtensions() {
    const options = this.options;
    if (options.quotes.length !== 4 || options.quotes.some(quote => !quote || quote.length > 32 || /[\r\n]/u.test(quote))
      || !Number.isSafeInteger(options.maxBlockLength) || options.maxBlockLength < 1) throw new RangeError("invalid-typographer-options");
    return typographerProjection(options);
  },
});
