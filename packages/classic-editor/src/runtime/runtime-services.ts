import type {
  QuireEditor,
  QuireEditorContent,
  QuireJSONContent
} from "@quirekit/core";
import { createClassicEditorRegistry } from "../plugin";
import type { ClassicEditorShellElements } from "../shell";
import type {
  ClassicEditorHookContext,
  ClassicEditorBehavior,
  ClassicEditorBehaviorTrigger,
  ClassicEditorDocumentFontStatus,
  ClassicEditorFontLibrary,
  ClassicEditorExportArtifact,
  ClassicEditorImportArtifact,
  ClassicEditorImportOptions,
  ClassicEditorInstance,
  ClassicEditorLocale,
  ClassicEditorMediaServices,
  ClassicEditorRegistrySnapshot,
  ClassicEditorRenderContext,
  ClassicEditorResolvedFeatures,
  ClassicEditorUpdateOptions,
  ClassicEditorUiController,
  ClassicEditorViewBackend
} from "../types";
import {
  canExecuteClassicEditorContribution,
  executeClassicEditorContribution,
  isClassicEditorContributionAvailable
} from "./behaviors";
import {
  exportClassicEditorDocument,
  readClassicEditorJSON
} from "./documents";
import { resolveBuiltinClassicEditorMessage } from "../localization";
import {
  createClassicEditorBehaviorContext,
  createClassicEditorHookContext,
  createClassicEditorRenderContext
} from "./contexts";
import type { ResolvedClassicEditorOptions } from "./options";
import { ClassicEditorUiControllerRuntime } from "./ui";
import { ClassicEditorHostResourceCoordinator } from "./host-resource/coordinator";
import { ClassicEditorTaskFeedbackRuntime } from "./tasks";
import { ClassicEditorHostResourceTaskRuntime } from "./resource-task";
import { createClassicEditorReadOnlySnapshot } from "./snapshot/create";
import type { Node as PMNode } from "@quirekit/pm";
import { ClassicDocumentImportController } from "./document-import/controller";

/** Shared state, contribution contexts, behaviors, and services for the lifecycle runtime. */
export abstract class ClassicEditorRuntimeServices implements ClassicEditorInstance {
  protected resolved: ResolvedClassicEditorOptions;
  protected editorValue: QuireEditor | undefined;
  protected shellValue: ClassicEditorShellElements | undefined;
  protected documentValue: QuireEditorContent;
  protected registryValue: ClassicEditorRegistrySnapshot;
  protected readonly uiValue: ClassicEditorUiControllerRuntime;
  protected readonly mediaValue: ClassicEditorMediaServices;
  protected readonly hostResourcesValue: ClassicEditorHostResourceCoordinator;
  protected readonly tasksValue: ClassicEditorTaskFeedbackRuntime;
  protected readonly resourceTasksValue: ClassicEditorHostResourceTaskRuntime;
  protected documentNameValue: string | null = null;
  protected documentRevisionValue = 0;
  protected readonly documentImports: ClassicDocumentImportController;

  /** @returns Whether final product destruction has completed. */
  abstract get isDestroyed(): boolean;

  /** @returns Logical and rendered document body-font facts. */
  abstract get documentFontStatus(): ClassicEditorDocumentFontStatus;

  /** @returns Mounted explicit external font library, or undefined while unmounted. */
  abstract get fontLibrary(): ClassicEditorFontLibrary | undefined;

  /** @param element - Consumer host element. */
  abstract mount(element: HTMLElement): void;

  /** Reusably unmounts all browser-owned product resources. */
  abstract unmount(): void;

  /** @param options - Partial product updates. */
  abstract update(options: ClassicEditorUpdateOptions): void;

  /** Final, idempotent product destruction. */
  abstract destroy(): void;

  /**
   * Creates the product service state shared across mount cycles.
   *
   * @param resolved - Fully resolved product configuration.
   * @param registry - Normalized product registry.
   */
  protected constructor(
    resolved: ResolvedClassicEditorOptions,
    registry: ClassicEditorRegistrySnapshot
  ) {
    this.resolved = resolved;
    this.documentValue = resolved.document;
    this.registryValue = registry;
    this.mediaValue = resolved.media;
    this.hostResourcesValue = new ClassicEditorHostResourceCoordinator(resolved.host);
    this.tasksValue = new ClassicEditorTaskFeedbackRuntime(this.hostResourcesValue);
    this.resourceTasksValue = new ClassicEditorHostResourceTaskRuntime(this.tasksValue);
    this.uiValue = new ClassicEditorUiControllerRuntime(
      resolved.shell.leftSidebar ?? false,
      resolved.shell.rightSidebar ?? false,
      resolved.shell.ruler ?? true,
      (resolved.backend === "svg" ? resolved.svgRuntime : resolved.canvasRuntime).hiddenTextViewMode === "formatting-inspection"
    );
    let invisibleCharactersVisible = this.uiValue.state.invisibleCharactersVisible;
    this.documentImports = new ClassicDocumentImportController({
      readContext: () => this.renderContext(),
      readRevision: () => this.documentRevisionValue,
    });
    let hiddenTextVisible = this.uiValue.state.hiddenTextVisible;
    this.uiValue.subscribe((state) => {
      if (hiddenTextVisible !== state.hiddenTextVisible) {
        hiddenTextVisible = state.hiddenTextVisible;
        this.editorValue?.mountedView?.setHiddenTextViewMode(hiddenTextVisible ? "formatting-inspection" : "normal");
      }
      this.refreshShell();
      if (invisibleCharactersVisible !== state.invisibleCharactersVisible) {
        invisibleCharactersVisible = state.invisibleCharactersVisible;
        // Refresh presentation against the same accepted state; no transaction,
        // document mutation or structural remount is needed for editing hints.
        this.editorValue?.view.updateState(this.editorValue.state.pm);
      }
    });
  }

  /** @returns Whether the product currently owns a mounted shell. */
  get isMounted(): boolean {
    return this.editorValue !== undefined && this.shellValue !== undefined;
  }

  /** @returns Mounted Core editor, or undefined while unmounted. */
  get editor(): QuireEditor | undefined {
    return this.editorValue;
  }

  /** @returns Mounted product root, or undefined while unmounted. */
  get root(): HTMLElement | undefined {
    return this.shellValue?.root;
  }

  /** @returns Current resolved feature map. */
  get features(): ClassicEditorResolvedFeatures {
    return this.resolved.features;
  }

  /** @returns Current product-interface locale. */
  get locale(): ClassicEditorLocale {
    return this.resolved.locale;
  }

  /** @returns Current explicit name or the locale-aware untitled fallback. */
  get documentName(): string {
    return this.documentNameValue ?? resolveBuiltinClassicEditorMessage(
      this.resolved.locale,
      "untitledDocument"
    );
  }

  /** @returns Active rendering backend. */
  get backend(): ClassicEditorViewBackend {
    return this.resolved.backend;
  }

  /** @returns Current normalized product registry. */
  get registry(): ClassicEditorRegistrySnapshot {
    return this.registryValue;
  }

  /** @returns Typed authority for non-document product UI state. */
  get ui(): ClassicEditorUiController {
    return this.uiValue;
  }

  /** @returns Instance-scoped media registration and resolution authorities. */
  get media(): ClassicEditorMediaServices {
    return this.mediaValue;
  }

  /** @returns Stable create-time Host resource coordinator. */
  get hostResources(): ClassicEditorHostResourceCoordinator { return this.hostResourcesValue; }

  /** @returns Stable instance-scoped task feedback authority. */
  get tasks(): ClassicEditorTaskFeedbackRuntime { return this.tasksValue; }

  /** @returns Stable concurrent resource-workflow authority. */
  get resourceTasks(): ClassicEditorHostResourceTaskRuntime { return this.resourceTasksValue; }

  /** @inheritdoc */
  setDocumentName(name: string): void {
    const next = normalizeDocumentName(name);
    if (next === this.documentNameValue) return;
    this.documentNameValue = next;
    this.refreshShell();
  }

  /** @inheritdoc */
  isContributionAvailable(
    behavior: ClassicEditorBehavior,
    payload?: unknown
  ): boolean {
    return isClassicEditorContributionAvailable(
      behavior,
      createClassicEditorBehaviorContext(this.renderContext(), payload)
    );
  }

  /** @inheritdoc */
  canExecuteContribution(
    behavior: ClassicEditorBehavior,
    payload?: unknown
  ): boolean {
    return canExecuteClassicEditorContribution(
      behavior,
      createClassicEditorBehaviorContext(this.renderContext(), payload)
    );
  }

  /** @inheritdoc */
  executeContribution(
    behavior: ClassicEditorBehavior,
    payload?: unknown,
    trigger: ClassicEditorBehaviorTrigger = { source: "api" }
  ): boolean | Promise<boolean> {
    const handled = executeClassicEditorContribution(
      behavior,
      createClassicEditorBehaviorContext(this.renderContext(), payload, trigger)
    );
    if (handled instanceof Promise) {
      return handled.then((result) => {
        this.refreshShell();
        return result;
      });
    }
    this.refreshShell();
    return handled;
  }

  /** Re-evaluates action, panel, status, and widget presentation state. */
  refreshProductUi(): void {
    this.refreshShell();
  }

  /** @inheritdoc */
  createReadOnlySnapshot(document: PMNode): QuireEditor {
    const context = this.renderContext();
    if (!context) throw new Error("A document snapshot requires a mounted Classic editor.");
    const viewport = context.root.querySelector<HTMLElement>(".qk-classic-editor__workspace-viewport");
    if (!viewport) throw new Error("A document snapshot requires a mounted Classic workspace.");
    return createClassicEditorReadOnlySnapshot(context.editor, document, this.resolved, viewport);
  }

  /**
   * Imports input through a registered service.
   *
   * @param serviceId - Service id.
   * @param input - File artifact consumed by the service.
   * @param options - Optional host cancellation signal.
   * @returns Asynchronous completion.
   */
  async importDocument(serviceId: string, input: ClassicEditorImportArtifact, options: ClassicEditorImportOptions = {}): Promise<void> {
    const current = await this.documentImports.run(this.registryValue, serviceId, input, options);
    if (!current) return;
    const service = this.registryValue.services.get(serviceId);
    const leafName = input.fileName.split(/[\\/]/u).at(-1) ?? input.fileName;
    const extension = [...(service?.format.extensions ?? [])]
      .sort((left, right) => right.length - left.length)
      .find(candidate => leafName.toLocaleLowerCase()
        .endsWith(candidate.toLocaleLowerCase())) ?? "";
    this.documentNameValue = normalizeDocumentName(
      extension === "" ? leafName : leafName.slice(0, -extension.length)
    );
    this.shellValue?.workspaceViewport.scrollTo({ top: 0 });
    this.refreshShell();
  }

  /**
   * Exports through a registered service.
   *
   * @param serviceId - Service id.
   * @returns Downloadable export artifact.
   */
  exportDocument(serviceId: string): Promise<ClassicEditorExportArtifact> {
    return exportClassicEditorDocument(
      this.registryValue,
      serviceId,
      this.renderContext(),
      this.documentName
    );
  }

  /** @returns Current canonical document JSON. */
  getJSON(): QuireJSONContent {
    return readClassicEditorJSON(this.editorValue, this.documentValue);
  }

  /** Refreshes dynamic action, panel, and status contributions. */
  protected refreshShell(): void {
    const context = this.renderContext();
    if (this.shellValue && context) this.shellValue.update(context);
  }

  /** @returns Current mounted render context, or undefined while unmounted. */
  protected renderContext(): ClassicEditorRenderContext | undefined {
    return createClassicEditorRenderContext(this.contextOptions());
  }

  /** @returns Current lifecycle context. */
  protected hookContext(): ClassicEditorHookContext {
    return createClassicEditorHookContext(this.contextOptions());
  }

  /** @returns Registry derived from current resolved configuration. */
  protected createRegistry(): ClassicEditorRegistrySnapshot {
    return createClassicEditorRegistry({
      plugins: this.resolved.plugins,
      features: this.resolved.features,
      surfaceMode: this.resolved.surfaceMode,
      extensions: this.editorValue?.extensions,
      ui: this.resolved.ui,
      deferReferenceValidation: this.editorValue === undefined
    });
  }

  /** @returns Current mounted and unmounted context authorities. */
  private contextOptions() {
    return {
      instance: this,
      editor: this.editorValue,
      root: this.shellValue?.root,
      workspaceToolbarHost: this.shellValue?.workspaceToolbar,
      theme: this.resolved.theme,
      features: this.resolved.features,
      locale: this.resolved.locale,
      backend: this.resolved.backend,
      ui: this.uiValue
    };
  }
}

/**
 * Normalizes text committed by the document-name field.
 *
 * @param name - Editable or imported document name.
 * @returns Trimmed name, or null for the localized fallback.
 */
function normalizeDocumentName(name: string): string | null {
  const normalized = name.trim().slice(0, 120);
  return normalized === "" ? null : normalized;
}
