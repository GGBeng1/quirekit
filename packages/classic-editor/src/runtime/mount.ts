import {
  Editor,
  type QuireEditor,
  type QuireEditorContent,
  type QuireEditorPasteEvent,
  type QuireEditorSelectionUpdateEvent,
  type QuireEditorTransactionEvent,
  type QuireHiddenTextViewMode,
  type QuireJSONContent
} from "@quirekit/core";
import type { QuireLayoutSnapshot } from "@quirekit/view-engine";
import {
  applyClassicEditorLocale,
  applyClassicEditorTheme,
  createClassicEditorShell,
  type ClassicEditorShellElements
} from "../shell";
import type { ResolvedClassicEditorOptions } from "./options";
import { collectClassicEditorPluginExtensions } from "../plugin/registry/audience";
import type { ClassicEditorFitZoomListener } from "../shell/stage/types";

/** Resources owned by one mounted Classic Editor session. */
export interface MountedClassicEditorResources {
  /** Mounted Core editor and Canvas View owner. */
  readonly editor: QuireEditor;
  /** Mounted product shell elements. */
  readonly shell: ClassicEditorShellElements;
}

/** Input required to assemble one mounted product session. */
export interface MountClassicEditorResourcesOptions {
  /** Consumer host element. */
  readonly element: HTMLElement;
  /** Fully resolved product options. */
  readonly resolved: ResolvedClassicEditorOptions;
  /** Canonical or import-compatible document content. */
  readonly document: QuireEditorContent;
  /** @returns Live visibility of nonprinting editor hints. */
  readonly getInvisibleCharactersVisible?: (() => boolean) | undefined;
  /** Current instance preference, overriding backend defaults during remount. */
  readonly hiddenTextViewMode?: QuireHiddenTextViewMode | undefined;
  /** Stable Core update listener. */
  readonly onEditorUpdate: () => void;
  /** Stable selection listener that may share the same dispatch's document projection. */
  readonly onEditorSelectionUpdate: (event: QuireEditorSelectionUpdateEvent) => void;
  /** Stable listener for local state transactions that affect product presentation. */
  readonly onEditorTransaction: (event: QuireEditorTransactionEvent) => void;
  /** Stable product keyboard listener. */
  readonly onKeydown: (event: KeyboardEvent) => void;
  /** Stable product paste listener. */
  readonly onPaste: (event: QuireEditorPasteEvent) => void;
  /** Receives each rendered layout, from which page facts are read. */
  readonly onLayout?: ((snapshot: QuireLayoutSnapshot) => void) | undefined;
  /** Publishes automatic zoom resolution into instance-owned product UI state. */
  readonly onFitZoom?: ClassicEditorFitZoomListener | undefined;
}

/**
 * Assembles the product shell, Core editor, and real Canvas View as one resource set.
 *
 * @param options - Mount host, resolved options, content, and listeners.
 * @returns Mounted resources owned by the product runtime.
 */
export function mountClassicEditorResources(
  options: MountClassicEditorResourcesOptions
): MountedClassicEditorResources {
  const shell = createClassicEditorShell(
    options.element,
    options.resolved.shell,
    options.resolved.locale,
    options.resolved.backend,
    options.resolved.theme,
    options.onFitZoom
  );

  try {
    applyClassicEditorTheme(shell.root, options.resolved.theme);
    applyClassicEditorLocale(shell.root, options.resolved.locale);
    const presetExtensions = options.resolved.preset.resolveExtensions({
      features: options.resolved.features,
      theme: options.resolved.theme,
      workspaceViewport: shell.workspaceViewport,
      backend: options.resolved.backend,
      canvasRuntime: {
        ...options.resolved.canvasRuntime,
        hiddenTextViewMode: options.hiddenTextViewMode ?? options.resolved.canvasRuntime.hiddenTextViewMode,
        surfaceConfig: {
          ...options.resolved.canvasRuntime.surfaceConfig,
          invisibleCharacters: {
            visible: options.getInvisibleCharactersVisible ?? false,
            color: options.resolved.theme.color.text.muted,
            opacity: options.resolved.theme.opacity.muted,
            pageBreakLabel: options.resolved.locale.startsWith("zh") ? "分页符" : "Page break",
            columnBreakLabel: options.resolved.locale.startsWith("zh") ? "分栏符" : "Column break"
          }
        },
        onRender(event) {
          shell.updateDocumentLayout(event.renderResult.layoutSnapshot.documentRect, event.renderResult.layoutSnapshot.pages);
          options.onLayout?.(event.renderResult.layoutSnapshot);
          options.resolved.canvasRuntime.onRender?.(event);
        },
        mediaResolver: options.resolved.media.resolver
      },
      svgRuntime: {
        ...options.resolved.svgRuntime,
        hiddenTextViewMode: options.hiddenTextViewMode ?? options.resolved.svgRuntime.hiddenTextViewMode,
        surfaceConfig: {
          ...options.resolved.svgRuntime.surfaceConfig,
          invisibleCharacters: {
            visible: options.getInvisibleCharactersVisible ?? false,
            color: options.resolved.theme.color.text.muted,
            opacity: options.resolved.theme.opacity.muted,
            pageBreakLabel: options.resolved.locale.startsWith("zh") ? "分页符" : "Page break",
            columnBreakLabel: options.resolved.locale.startsWith("zh") ? "分栏符" : "Column break"
          }
        },
        onRender(event) {
          shell.updateDocumentLayout(event.renderResult.layoutSnapshot.documentRect, event.renderResult.layoutSnapshot.pages);
          options.onLayout?.(event.renderResult.layoutSnapshot);
          options.resolved.svgRuntime.onRender?.(event);
        },
        mediaResolver: options.resolved.media.resolver
      }
    });
    const editor = new Editor({
      element: shell.canvasMount,
      mode: options.resolved.backend,
      viewId: "classic-editor-primary",
      editable: options.resolved.editable,
      content: options.document,
      editorProps: {
        scrollThreshold: { top: 24, right: 20, bottom: 32, left: 20 },
        scrollMargin: { top: 36, right: 28, bottom: 48, left: 28 }
      },
      extensions: [
        ...presetExtensions,
        ...options.resolved.extensions,
        ...collectClassicEditorPluginExtensions(options.resolved.plugins, options.resolved.surfaceMode)
      ]
    });
    editor.on("update", options.onEditorUpdate);
    editor.on("selectionUpdate", options.onEditorSelectionUpdate);
    editor.on("transaction", options.onEditorTransaction);
    editor.on("focus", options.onEditorUpdate);
    editor.on("blur", options.onEditorUpdate);
    editor.on("paste", options.onPaste);
    shell.root.addEventListener("keydown", options.onKeydown, true);
    return { editor, shell };
  } catch (error) {
    shell.destroy();
    throw error;
  }
}

/**
 * Releases one mounted product resource set and preserves canonical JSON.
 *
 * @param resources - Mounted Core editor and product shell.
 * @param onEditorUpdate - Registered Core update listener.
 * @param onEditorSelectionUpdate - Registered Core selection listener.
 * @param onEditorTransaction - Registered local-state transaction listener.
 * @param onKeydown - Registered product keyboard listener.
 * @param onPaste - Registered product paste listener.
 * @returns Last canonical editor document.
 */
export function releaseClassicEditorResources(
  resources: MountedClassicEditorResources,
  onEditorUpdate: () => void,
  onEditorSelectionUpdate: (event: QuireEditorSelectionUpdateEvent) => void,
  onEditorTransaction: (event: QuireEditorTransactionEvent) => void,
  onKeydown: (event: KeyboardEvent) => void,
  onPaste: (event: QuireEditorPasteEvent) => void
): QuireJSONContent {
  const document = resources.editor.getJSON();
  resources.editor.off("update", onEditorUpdate);
  resources.editor.off("selectionUpdate", onEditorSelectionUpdate);
  resources.editor.off("transaction", onEditorTransaction);
  resources.editor.off("focus", onEditorUpdate);
  resources.editor.off("blur", onEditorUpdate);
  resources.editor.off("paste", onPaste);
  resources.editor.destroy();
  resources.shell.root.removeEventListener("keydown", onKeydown, true);
  resources.shell.destroy();
  return document;
}
