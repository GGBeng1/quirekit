export { DecorationSet, Decoration as PMDecoration } from "@quirekit/pm";
export type { DecorationAttrs, DecorationSource } from "@quirekit/pm";
export {
  Decoration,
  InlineDecoration,
  NodeDecoration,
  WidgetDecoration
} from "./decoration";
export type { DecorationKind } from "./decoration";
export { readQuireDecorationInteractions } from "./interaction";
export { isQuireDomOnlyDecorations, markQuireDomOnlyDecorations } from "./dom-only";
export {
  DecorationManager,
  liveWidgetKeys
} from "./manager";
export {
  DECORATION_MANAGER_PLUGIN_KEY,
  DECORATION_MANAGER_PLUGIN_KEY_NAME
} from "./plugin-key";
export { createWidgetDecoration } from "./widget";
export type {
  BaseDecorationSpec,
  ChangedRangesDecorationSpec,
  CreateWidgetDecorationOptions,
  DecorationCreateProps,
  DecorationManagerEntry,
  DecorationManagerState,
  DecorationRangeProps,
  DecorationShouldUpdateProps,
  DecorationSpec,
  DecorationType,
  DecorationUpdateStrategy,
  DecorationWithType,
  DocumentDecorationSpec,
  ManualDecorationSpec,
  QuireDecorationInlineStartInteractionPlacement,
  QuireDecorationInteractionHandler,
  QuireDecorationInteractionDescriptor,
  QuireDecorationInteractionOwner,
  QuireDecorationInteractionPlacement,
  QuireDecorationPointInteractionPlacement,
  QuireDecorationRangeInteractionPlacement,
  QuireDecorationSpec,
  ResolvedDecorationEntry,
  WidgetDecorationOptions,
  WidgetRenderer
} from "./types";
