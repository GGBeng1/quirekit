import type {
  ClassicEditorLocale,
  ClassicEditorRenderContext,
  ClassicEditorShellOptions,
  QuireKitTheme,
  ClassicEditorViewBackend
} from "../types";
import type { QuireRect } from "@quirekit/renderer";
import type { ClassicEditorStagePage } from "./stage/types";

/** Mutable reactive state consumed only by the private Vue product shell. */
export interface ClassicEditorShellModel {
  /** Instance-container compact presentation, independent of browser user agent. */
  compact?: boolean;
  /** Latest mounted contribution context, assigned after Core is mounted. */
  context: ClassicEditorRenderContext | undefined;
  /** Initial interface locale before the mounted context is available. */
  locale: ClassicEditorLocale;
  /** Initial rendering backend before the mounted context is available. */
  backend: ClassicEditorViewBackend;
  /** Resolved product theme shared by CSS and private component-library controls. */
  theme: QuireKitTheme;
  /** Resolved region visibility and active-tab defaults. */
  options: Required<ClassicEditorShellOptions>;
  /**
   * Admits pointer menus using the mounted stage's public paper geometry.
   * @param clientX - Horizontal client CSS coordinate.
   * @param clientY - Vertical client CSS coordinate.
   * @returns Whether the point lies on visible paper; absent before staging exists.
   */
  containsPagePoint?: (clientX: number, clientY: number) => boolean;
}

/** Options for standalone UI roots outside a themed Classic Editor instance. */
/** Theme and interface language of the instance owning a product surface. */
export interface ClassicEditorUiAppearance {
  /** @returns Current shared theme. */
  readonly theme: () => QuireKitTheme;
  /** @returns Current interface locale tag. */
  readonly locale: () => string;
}

/** Options of one product-owned Vue application. */
export interface ClassicEditorUiAppOptions {
  /** Whether to create a local variable surface instead of inheriting the instance root. */
  readonly themeSurface?: boolean | undefined;
}

/** Stable DOM regions owned by one mounted Classic Editor shell. */
export interface ClassicEditorShellRegions {
  /** Product root appended to the consumer host. */
  readonly root: HTMLElement;
  /** Top-level product header. */
  readonly header: HTMLElement;
  /** Menu contribution host. */
  readonly menuBar: HTMLElement;
  /** Compact toolbar contribution host. */
  readonly toolbar: HTMLElement;
  /** Ribbon tab button host. */
  readonly ribbonTabs: HTMLElement;
  /** Active default Ribbon or explicit typed-preview command surface. */
  readonly commandSurface: HTMLElement;
  /** Horizontal ruler slot. */
  readonly ruler: HTMLElement;
  /** Vertically fixed companion controls projected beside the horizontal ruler. */
  readonly workspaceToolbar: HTMLElement;
  /** Left sidebar contribution host. */
  readonly leftSidebar: HTMLElement;
  /** Product-owned scrolling document viewport. */
  readonly workspaceViewport: HTMLElement;
  /** Complete document-and-companion content inside the shared scroll owner. */
  readonly documentScrollContent: HTMLElement;
  /** Mount element claimed by `@quirekit/view`. */
  readonly canvasMount: HTMLElement;
  /** Product-owned document-space overlay sibling of the mounted View. */
  readonly documentOverlayHost: HTMLElement;
  /** Right sidebar contribution host. */
  readonly rightSidebar: HTMLElement;
  /** Right document-companion host inside the shared workspace scroller. */
  readonly documentSidebar: HTMLElement;
  /** Status contribution host. */
  readonly statusBar: HTMLElement;
}

/** DOM regions and lifecycle owned by one mounted Classic Editor shell. */
export interface ClassicEditorShellElements extends ClassicEditorShellRegions {
  /** @param bounds - Canonical full document bounds before zoom. @param pages - Complete public page table from the mounted View. */
  updateDocumentLayout(bounds: QuireRect, pages: readonly ClassicEditorStagePage[] | undefined): void;
  /**
   * Updates Vue chrome and framework-neutral plugin contribution hosts.
   *
   * @param context - Latest mounted product context.
   */
  update(context: ClassicEditorRenderContext): void;
  /** Unmounts the private Vue application and interactive contributions. */
  destroy(): void;
}
