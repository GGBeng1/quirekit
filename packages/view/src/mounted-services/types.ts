import type {
  QuireEditor,
  QuireMountedEditorView,
  QuireExtensionThisContext
} from "@quirekit/core";
import type { EditorState, Node } from "@quirekit/pm";
import type { QuirePresentationOverlay } from "@quirekit/view-engine";
import type { QuireTextContextHost } from "../input/text-context/types";

/** Immutable source selection requested by a mounted service. */
export interface QuireMountedTextTarget {
  /** Exact document used to resolve the target. */
  readonly doc: Node;
  /** Canonical anchor, preserving backward selections. */
  readonly anchor: number;
  /** Canonical moving endpoint. */
  readonly head: number;
}

/** Policy for one text activation request. */
export interface QuireMountedTextActivationOptions {
  /** Whether the view takes keyboard focus; defaults to true. */
  readonly focus?: boolean | undefined;
}

/** Public capabilities supplied to one mounted service instance. */
export interface QuireMountedServiceContext {
  /** Canonical editor, shared by all its mounted surfaces. */
  readonly editor: QuireEditor;
  /** Current mounted facade; services must not substitute a PM DOM EditorView. */
  readonly view: QuireMountedEditorView;
  /** Native text context capability, absent on locked views. */
  readonly input: QuireTextContextHost | undefined;
  /**
   * Hides duplicate painted document semantics while a separate reading surface is active.
   * @returns Restoration lease, or null if a visual descendant still owns focus.
   */
  suspendVisualAccessibility(): (() => void) | null;
  /**
   * Selects and reveals a verified text target using this view's input ownership.
   *
   * Targets inside a header, footer, footnote, or endnote enter that story's editing
   * ownership on the occurrence nearest the viewport.
   *
   * @param target - Version-bound canonical text selection.
   * @param options - Optional focus policy.
   * @returns Whether the target was accepted.
   */
  activateText(target: QuireMountedTextTarget, options?: QuireMountedTextActivationOptions): boolean;
  /**
   * Replaces this view's render-only presentation overlay; renders coalesce per animation frame.
   * @param overlay - Overlay planned against the current document, or null to clear it.
   * @returns Whether this backend renders presentation overlays.
   */
  presentOverlay(overlay: QuirePresentationOverlay | null): boolean;
}

/** Optional service whose lifetime follows one mount rather than PM plugin lists. */
export interface QuireMountedViewService {
  /**
   * Observes accepted state before painting; geometry may still belong to the previous commit.
   * @param state - Current accepted editor state.
   */
  update?(state: EditorState): void;
  /** Releases this instance's DOM, leases and subscriptions. */
  destroy(): void;
}

/** Extension contribution that creates one service for each mounted view. */
export interface QuireMountedViewServiceContribution {
  /** Unique service id within an editor's resolved extension set. */
  readonly id: string;
  /**
   * Creates a view-local service after its input and DOM are ready.
   * @param context - Public mounted capabilities.
   * @returns Service, or null for an unsupported backend.
   */
  create(context: QuireMountedServiceContext): QuireMountedViewService | null;
}

/** Typed factory consumed only by the mounted View runtime. */
export type QuireMountedViewServiceFactory<
  Options extends object = object,
  Storage extends object = object
> = (
  this: QuireExtensionThisContext<Options, Storage>
) => readonly QuireMountedViewServiceContribution[];
