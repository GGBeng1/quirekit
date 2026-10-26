import type { QuireEditor, QuireJSONContent } from "@quirekit/core";
import type { Node as PMNode } from "@quirekit/pm";
import type {
  ClassicEditorLocale,
  ClassicEditorResolvedFeatures,
  ClassicEditorViewBackend
} from "./base";
import type { ClassicEditorUpdateOptions } from "./config";
import type { ClassicEditorRegistrySnapshot } from "./plugin";
import type { ClassicEditorBehavior, ClassicEditorBehaviorTrigger } from "./behaviors";
import type {
  ClassicEditorExportArtifact,
  ClassicEditorImportArtifact,
  ClassicEditorImportOptions
} from "./services";
import type {
  ClassicEditorDocumentFontStatus,
  ClassicEditorFontLibrary
} from "./fonts";
import type { ClassicEditorUiController } from "./ui";
import type { ClassicEditorMediaServices } from "./media";
import type { ClassicEditorHostResourceController } from "./host";
import type { ClassicEditorTaskFeedbackController } from "./tasks";
import type { ClassicEditorHostResourceTaskController } from "./resource-task";

/** One page of the mounted layout, vertical coordinates within that page in document CSS pixels. */
export interface ClassicEditorPageLayout {
  /** Accepted terminal-region placement from this exact source document. */
  readonly terminalPlacement?: import("@quirekit/layout/pagination").QuireTerminalPlacement | undefined;
  /** First document position of the page's body content. */
  readonly from: number;
  /** End document position of the page's body content. */
  readonly to: number;
  /** Top of the page body. */
  readonly bodyTop: number;
  /** Bottom of the page body. */
  readonly bodyBottom: number;
  /** Lowest bottom of body content laid out on the page, or null when its content is not realized. */
  readonly contentBottom: number | null;
}

/** Public lifecycle and integration surface returned by `createClassicEditor`. */
export interface ClassicEditorInstance {
  /** Whether the product currently owns a mounted shell and Core editor. */
  readonly isMounted: boolean;
  /** Whether final destruction has completed. */
  readonly isDestroyed: boolean;
  /** Mounted Core editor, or undefined while unmounted. */
  readonly editor: QuireEditor | undefined;
  /** Mounted product root, or undefined while unmounted. */
  readonly root: HTMLElement | undefined;
  /** Current resolved feature switches. */
  readonly features: ClassicEditorResolvedFeatures;
  /** Current product-interface locale. */
  readonly locale: ClassicEditorLocale;
  /** Current product-level document name shown by chrome and used for exports. */
  readonly documentName: string;
  /** Active rendering backend. */
  readonly backend: ClassicEditorViewBackend;
  /** Current normalized product registry. */
  readonly registry: ClassicEditorRegistrySnapshot;
  /** Typed runtime authority for non-document product UI state. */
  readonly ui: ClassicEditorUiController;
  /** Logical and rendered body-font facts for the mounted host. */
  readonly documentFontStatus: ClassicEditorDocumentFontStatus;
  /**
   * Reads where each page of the latest rendered layout starts and how much of its body is used.
   * @param document - Document the layout must belong to; a layout of an older document is not returned.
   * @returns Pages in order, or null before the current document is laid out.
   */
  readPageLayout?(document: PMNode): readonly ClassicEditorPageLayout[] | null;
  /** Mounted explicit external font library, or undefined while unmounted. */
  readonly fontLibrary: ClassicEditorFontLibrary | undefined;
  /** Instance-scoped media registration, identity, and resolution authorities. */
  readonly media: ClassicEditorMediaServices;
  /** Stable Host resource coordinator retained across remounts. */
  readonly hostResources: ClassicEditorHostResourceController;
  /** Instance-scoped task feedback authority retained across remounts. */
  readonly tasks: ClassicEditorTaskFeedbackController;
  /** Concurrent end-to-end resource workflow authority retained across remounts. */
  readonly resourceTasks: ClassicEditorHostResourceTaskController;
  /**
   * Updates the product-level document name without changing editor content.
   *
   * @param name - New name; empty text restores the localized untitled label.
   */
  setDocumentName(name: string): void;
  /**
   * Mounts or remounts the product into a host element.
   *
   * @param element - Host element that receives the product root.
   */
  mount(element: HTMLElement): void;
  /** Reusably unmounts the shell and owned Core/View runtime. */
  unmount(): void;
  /**
   * Updates product configuration, preserving content unless replaced.
   *
   * @param options - Partial product updates.
   */
  update(options: ClassicEditorUpdateOptions): void;
  /**
   * Reports whether one directly bound contribution behavior is installed.
   *
   * @param behavior - Typed contribution behavior.
   * @param payload - Optional behavior payload.
   * @returns Whether the behavior is available.
   */
  isContributionAvailable(
    behavior: ClassicEditorBehavior,
    payload?: unknown
  ): boolean;
  /**
   * Reports whether one directly bound contribution behavior can execute.
   *
   * @param behavior - Typed contribution behavior.
   * @param payload - Optional behavior payload.
   * @returns Whether the behavior is executable.
   */
  canExecuteContribution(
    behavior: ClassicEditorBehavior,
    payload?: unknown
  ): boolean;
  /**
   * Executes one directly bound contribution behavior and refreshes product UI.
   *
   * @param behavior - Typed contribution behavior.
   * @param payload - Optional behavior payload.
   * @param trigger - Normalized source and surface detail.
   * @returns Whether the behavior handled the request.
   */
  executeContribution(
    behavior: ClassicEditorBehavior,
    payload?: unknown,
    trigger?: ClassicEditorBehaviorTrigger
  ): boolean | Promise<boolean>;
  /** Re-evaluates product chrome after external non-document state changes. */
  refreshProductUi(): void;
  /**
   * Creates an isolated read-only snapshot using this product's rendering settings.
   * @param document - Same-schema immutable result to present.
   * @returns Unmounted caller-owned editor; destroy it when the preview closes.
   */
  createReadOnlySnapshot(document: PMNode): QuireEditor;
  /**
   * Imports external input through a named service.
   *
   * @param serviceId - Registered service id.
   * @param input - File artifact consumed by the service.
   * @param options - Optional host cancellation signal.
   * @returns Asynchronous completion.
   */
  importDocument(serviceId: string, input: ClassicEditorImportArtifact, options?: ClassicEditorImportOptions): Promise<void>;
  /**
   * Exports the document through a named service.
   *
   * @param serviceId - Registered service id.
   * @returns Downloadable export artifact.
   */
  exportDocument(serviceId: string): Promise<ClassicEditorExportArtifact>;
  /** Returns the current canonical document JSON. */
  getJSON(): QuireJSONContent;
  /** Final, idempotent destruction of the product instance. */
  destroy(): void;
}
