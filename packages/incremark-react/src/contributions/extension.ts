import type { ReactNode } from "react";
import type { AnyExtension } from "@quirekit/msfe-core";
import { createMarkdownReading } from "@quirekit/incremark-core";
import type { MarkdownReadingDefinition } from "./types";

/** Unique React output-family port; Vue presentations cannot enter this lookup. */
export const reactReading = createMarkdownReading<ReactNode>();

/** @param extension - Configured source extension; configure/extend before wrapping. @param definition - Trusted React presentation and optional abortable resource.
 * @returns The original MSFE definition with its canonical semantic codec and React reading entry. */
export function withMarkdownReading<Attrs extends object = Readonly<Record<string, unknown>>, Resource = unknown>(
  extension: AnyExtension, definition: MarkdownReadingDefinition<Attrs, Resource>,
): AnyExtension { return reactReading.withReading(extension, definition); }
