import type { QuireEditor } from "@quirekit/core";
import { defaultTheme, type QuireKitTheme } from "@quirekit/ui";
import { registerClassicEditorPresentationScope } from "./ui/presentation/scope";
import type {
  ClassicEditorBehaviorContext,
  ClassicEditorBehaviorTrigger,
  ClassicEditorHookContext,
  ClassicEditorInstance,
  ClassicEditorLocale,
  ClassicEditorRenderContext,
  ClassicEditorResolvedFeatures,
  ClassicEditorViewBackend,
  ClassicEditorUiController
} from "../types";

/** Input shared by mounted render and action contexts. */
export interface ClassicEditorMountedContextOptions {
  /** Public product instance. */
  readonly instance: ClassicEditorInstance;
  /** Current mounted Core editor. */
  readonly editor: QuireEditor | undefined;
  /** Current mounted product root. */
  readonly root: HTMLElement | undefined;
  /** Optional stable companion toolbar owned by the mounted shell. */
  readonly workspaceToolbarHost?: HTMLElement | undefined;
  /** Immutable resolved theme, with a default for older context-factory callers. */
  readonly theme?: QuireKitTheme | undefined;
  /** Current resolved feature map. */
  readonly features: ClassicEditorResolvedFeatures;
  /** Current resolved product-interface locale. */
  readonly locale: ClassicEditorLocale;
  /** Current rendering backend. */
  readonly backend: ClassicEditorViewBackend;
  /** Typed authority for non-document product UI state. */
  readonly ui: ClassicEditorUiController;
}

/**
 * Creates a render context only when every mounted authority is available.
 *
 * @param options - Current runtime authorities.
 * @returns Mounted render context, or undefined while unmounted.
 */
export function createClassicEditorRenderContext(
  options: ClassicEditorMountedContextOptions
): ClassicEditorRenderContext | undefined {
  if (!options.editor || !options.root) return undefined;
  const context: ClassicEditorRenderContext = {
    instance: options.instance,
    editor: options.editor,
    root: options.root,
    workspaceToolbarHost: options.workspaceToolbarHost,
    ownerDocument: options.root.ownerDocument,
    theme: options.theme ?? defaultTheme,
    features: options.features,
    locale: options.locale,
    backend: options.backend,
    ui: options.ui
  };
  registerClassicEditorPresentationScope(context);
  return context;
}

/**
 * Extends a mounted render context with a caller payload and trigger.
 *
 * @param context - Current mounted render context.
 * @param payload - Optional caller payload.
 * @param trigger - Normalized invocation source.
 * @returns Product behavior context, or undefined while unmounted.
 */
export function createClassicEditorBehaviorContext(
  context: ClassicEditorRenderContext | undefined,
  payload: unknown,
  trigger: ClassicEditorBehaviorTrigger = { source: "api" }
): ClassicEditorBehaviorContext | undefined {
  return context ? { ...context, payload, trigger } : undefined;
}

/**
 * Creates lifecycle context for mounted or unmounted states.
 *
 * @param options - Current runtime authorities.
 * @returns Current lifecycle context.
 */
export function createClassicEditorHookContext(
  options: ClassicEditorMountedContextOptions
): ClassicEditorHookContext {
  return {
    instance: options.instance,
    editor: options.editor,
    root: options.root,
    features: options.features,
    locale: options.locale,
    backend: options.backend
  };
}
