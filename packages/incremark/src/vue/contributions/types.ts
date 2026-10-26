import type { VNodeChild } from "vue";
import type { MarkdownReadingContext as CoreContext, MarkdownReadingDefinition as CoreDefinition, ReadingContribution as CoreContribution, ReadingInput as CoreInput } from "@quirekit/incremark-core";
export type { MarkdownReadingError } from "@quirekit/incremark-core";
/** Validated Vue reading inputs with bounded recursive helpers. */
export interface MarkdownReadingContext<Attrs extends object = Readonly<Record<string, unknown>>> extends CoreContext<VNodeChild, Attrs> {}
/** Vue presentation attached to a source extension. */
export interface MarkdownReadingDefinition<Attrs extends object = Readonly<Record<string, unknown>>, Resource = unknown> extends CoreDefinition<VNodeChild, Attrs, Resource> {}
/** Vue semantic installation. */
export type ReadingContribution = CoreContribution<VNodeChild>;
/** Immutable input owned by a Vue resource boundary. */
export type ReadingInput = CoreInput<VNodeChild>;
