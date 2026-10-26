import type { QuireEditor } from "@quirekit/core";
import type { QuireKitTheme } from "@quirekit/ui";
import type {
  ClassicEditorLocale,
  ClassicEditorResolvedFeatures,
  ClassicEditorViewBackend
} from "./base";
import type { ClassicEditorInstance } from "./runtime";
import type { ClassicEditorBehaviorTrigger } from "./behaviors";
import type { ClassicEditorUiController } from "./ui";

import type { ClassicEditorBlockInsertionTarget } from "./contributions/insert";

/** Context supplied while a mounted product renders contributions. */
export interface ClassicEditorRenderContext {
  /** Ephemeral target supplied only to captured block insertion presenters. */
  readonly blockInsertion?: ClassicEditorBlockInsertionTarget;
  /** Product instance that owns the contribution. */
  readonly instance: ClassicEditorInstance;
  /** Mounted Core editor. */
  readonly editor: QuireEditor;
  /** Product root element. */
  readonly root: HTMLElement;
  /** Stable shell-owned host for companion controls beside the ruler; absent in headless/custom shells. */
  readonly workspaceToolbarHost?: HTMLElement | undefined;
  /** Document used to create contribution DOM. */
  readonly ownerDocument: Document;
  /** Immutable current instance theme; optional for older hand-authored contexts. */
  readonly theme?: QuireKitTheme | undefined;
  /** Resolved product feature switches. */
  readonly features: ClassicEditorResolvedFeatures;
  /** Resolved product-interface locale. */
  readonly locale: ClassicEditorLocale;
  /** Active rendering backend. */
  readonly backend: ClassicEditorViewBackend;
  /** Typed authority for non-document product UI state. */
  readonly ui: ClassicEditorUiController;
}

/** Context supplied to product behavior handlers. */
export interface ClassicEditorBehaviorContext extends ClassicEditorRenderContext {
  /** Optional caller payload. */
  readonly payload: unknown;
  /** Normalized behavior invocation source. */
  readonly trigger: ClassicEditorBehaviorTrigger;
}


/** Lifecycle context supplied to Classic Editor plugins. */
export interface ClassicEditorHookContext {
  /** Product instance that owns the lifecycle. */
  readonly instance: ClassicEditorInstance;
  /** Core editor while mounted, otherwise undefined. */
  readonly editor: QuireEditor | undefined;
  /** Product root while mounted, otherwise undefined. */
  readonly root: HTMLElement | undefined;
  /** Resolved feature switches. */
  readonly features: ClassicEditorResolvedFeatures;
  /** Resolved product-interface locale. */
  readonly locale: ClassicEditorLocale;
  /** Active rendering backend. */
  readonly backend: ClassicEditorViewBackend;
}
