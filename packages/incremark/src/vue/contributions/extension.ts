import type { AnyExtension } from "@quirekit/msfe-core";
import type { MarkdownReadingDefinition } from "./types";
import { vueReading } from "./registry";

/**
 * Adds snapshot reading to a fully configured source extension without altering its editing behavior.
 * @param extension - Existing Node, Mark or source-bearing descriptor; configure/extend it first.
 * @param definition - Trusted Vue presentation and optional abortable resource acquisition.
 * @returns An ordinary installable MSFE definition using the original semantic codec and lifecycle.
 */
export function withMarkdownReading<Attrs extends object = Readonly<Record<string, unknown>>, Resource = unknown>(
  extension: AnyExtension, definition: MarkdownReadingDefinition<Attrs, Resource>,
): AnyExtension {
  return vueReading.withReading(extension, definition);
}
