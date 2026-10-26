import type { ReactNode } from "react";
import type { MarkdownReadingContext as CoreContext, MarkdownReadingDefinition as CoreDefinition } from "@quirekit/incremark-core";

/** React reading inputs over the validated source codec. */
export interface MarkdownReadingContext<Attrs extends object = Readonly<Record<string, unknown>>> extends CoreContext<ReactNode, Attrs> {}
/** React presentation with instance-owned asynchronous resources. */
export interface MarkdownReadingDefinition<Attrs extends object = Readonly<Record<string, unknown>>, Resource = unknown> extends CoreDefinition<ReactNode, Attrs, Resource> {}
