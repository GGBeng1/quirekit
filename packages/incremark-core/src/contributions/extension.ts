import type { AnyExtension } from "@quirekit/msfe-core";
import type { MarkdownReadingDefinition, MarkdownReadingPort, ReadingContribution } from "./types";
import { readingContributions } from "./registry";

/** @returns A unique output-family port using the canonical source extension lifecycle. */
export function createMarkdownReading<Output>(): MarkdownReadingPort<Output> {
  const key = Symbol("markdown-reading");
  return { key,
    /** @param extension - Configured source extension. @param definition - Trusted output-family presentation. @returns The original definition with one reading facet. */
    withReading<Attrs extends object, Resource>(extension: AnyExtension, definition: MarkdownReadingDefinition<Output, Attrs, Resource>): AnyExtension {
      const author = "resolve" in extension;
      return {
        name: author ? extension.name : extension.id,
        type: author ? extension.type : extension.source?.kind ?? "extension",
        /** @param editor - Deferred access, forwarded unchanged. @returns Original contributions plus the reading registry entry. */
        resolve(editor) {
          const feature = author ? extension.resolve(editor) : extension;
          if (!feature.source) throw new Error(`reading-without-source: ${feature.id}`);
          // Generic erasure happens only here; the unique port is checked before
          // restoring Output, so a framework can never receive another family's nodes.
          const contribution = { key, owner: feature.id, codec: feature.source.codec, definition } as unknown as ReadingContribution<unknown>;
          return { ...feature, extensions: [feature.extensions ?? [], readingContributions.of(contribution)] };
        },
      } satisfies Extract<AnyExtension, { resolve: unknown }>;
    },
  };
}
