import {
  readQuireTransactionRenderImpact,
  type QuireEditor,
  type QuireEditorPasteEvent,
  type QuireEditorSelectionUpdateEvent,
  type QuireEditorTransactionEvent
} from "@quirekit/core";
import { transactionChangesFormatPainterState } from "@quirekit/extensions";
import { transactionChangesHighlighterPenState } from "@quirekit/extension-text-style";
import { syncClassicHighlighterPenCursor } from "../extensions/typography/highlighter-cursor";
import type {
  ClassicEditorDocumentFontStatus,
  ClassicEditorPageLayout,
  ClassicEditorFontLibrary,
  ClassicEditorOptions,
  ClassicEditorUpdateOptions
} from "../types";
import {
  invokeClassicEditorHooks,
  invokeClassicEditorPasteHooks
} from "./hooks";
import { findClassicEditorShortcut } from "./keyboard";
import { readClassicEditorPageLayout } from "./page-layout";
import type { QuireLayoutSnapshot } from "@quirekit/view-engine";
import type { Node as PMNode } from "@quirekit/pm";
import {
  mountClassicEditorResources,
  releaseClassicEditorResources
} from "./mount";
import {
  mergeClassicEditorUpdate,
  resolveClassicEditorOptions
} from "./options";
import { reconcileClassicEditorPlugins } from "./plugins";
import { ClassicEditorRuntimeServices } from "./runtime-services";
import { canCoalesceClassicEditorSelectionProjection } from "./updates/selection";
import { needsClassicEditorStoredMarkProjection } from "./updates/stored-marks";
import { canRetainClassicEditorSession } from "./updates/policy";
import { applyClassicEditorLocale, applyClassicEditorTheme } from "../shell";
import { createClassicEditorRegistry } from "../plugin";
import {
  createClassicEditorDocumentFontReadiness,
  gateClassicEditorFirstPaint,
  type ClassicEditorDocumentFontReadiness,
  type ClassicEditorDocumentFontSource
} from "./document-fonts";

/** Product lifecycle that owns shell assembly above Core and mounted View. */
export class ClassicEditorRuntime extends ClassicEditorRuntimeServices {
  private consumerOptions: ClassicEditorOptions;
  private hostValue: HTMLElement | undefined;
  private documentFontsValue: ClassicEditorDocumentFontReadiness | undefined;
  private releaseFirstPaintGate: (() => void) | undefined;
  private documentFontOwnerValue: Document | undefined;
  private documentSnapshotValue: QuireEditor["state"]["doc"] | undefined;
  private transactionStateValue: QuireEditor["state"]["pm"] | undefined;
  private destroyed = false;
  private layoutSnapshotValue: QuireLayoutSnapshot | undefined;

  /**
   * Creates an optionally mounted product instance.
   *
   * @param options - Consumer product options.
   */
  constructor(options: ClassicEditorOptions) {
    const resolved = resolveClassicEditorOptions(options);
    super(resolved, createClassicEditorRegistry({
      plugins: resolved.plugins,
      features: resolved.features,
      surfaceMode: resolved.surfaceMode,
      ui: resolved.ui,
      deferReferenceValidation: true
    }));
    this.consumerOptions = {
      ...options,
      media: this.mediaValue,
      host: resolved.host
    };
    invokeClassicEditorHooks(this.registryValue.plugins, "onCreate", this.hookContext());
    if (options.element) this.mount(options.element);
  }

  /** @returns Whether final product destruction has completed. */
  get isDestroyed(): boolean {
    return this.destroyed;
  }

  /** @param document - Document the layout must belong to. @returns Pages of the latest rendered layout, or null. */
  readPageLayout(document: PMNode): readonly ClassicEditorPageLayout[] | null {
    return readClassicEditorPageLayout(this.layoutSnapshotValue, document);
  }

  /** @returns Logical and rendered body-font facts for the current host. */
  get documentFontStatus(): ClassicEditorDocumentFontStatus {
    return this.documentFontsValue?.status ?? {
      requestedFamily: null,
      renderedFamily: null,
      status: "unresolved",
      source: null
    };
  }

  /** @returns Mounted explicit external font library, or undefined while unmounted. */
  get fontLibrary(): ClassicEditorFontLibrary | undefined {
    return this.isMounted ? this.documentFontsValue?.fontLibrary : undefined;
  }

  /**
   * Mounts or remounts the product and its real Canvas View.
   *
   * @param element - Consumer host element.
   */
  mount(element: HTMLElement): void {
    this.assertActive();
    if (this.isMounted) this.unmount();
    const resources = mountClassicEditorResources({
      element,
      resolved: this.resolved,
      document: this.documentValue,
      getInvisibleCharactersVisible: () => this.uiValue.state.invisibleCharactersVisible,
      hiddenTextViewMode: this.uiValue.state.hiddenTextVisible ? "formatting-inspection" : "normal",
      onEditorUpdate: this.handleEditorUpdate,
      onEditorSelectionUpdate: this.handleEditorSelectionUpdate,
      onEditorTransaction: this.handleEditorTransaction,
      onKeydown: this.handleKeydown,
      onPaste: this.handlePaste,
      onLayout: snapshot => { this.layoutSnapshotValue = snapshot; },
      onFitZoom: (percent, mode) => this.uiValue.resolveFitZoom(percent, mode)
    });
    const registry = createClassicEditorRegistry({
      plugins: this.resolved.plugins,
      features: this.resolved.features,
      surfaceMode: this.resolved.surfaceMode,
      extensions: resources.editor.extensions,
      ui: this.resolved.ui
    });
    const document = resources.editor.state.doc;
    try {
      this.prepareDocumentFonts(element.ownerDocument, document);
    } catch (error) {
      this.documentValue = releaseClassicEditorResources(
        resources,
        this.handleEditorUpdate,
        this.handleEditorSelectionUpdate,
        this.handleEditorTransaction,
        this.handleKeydown,
        this.handlePaste
      );
      throw error;
    }
    this.hostValue = element;
    this.editorValue = resources.editor;
    this.documentValue = document;
    this.documentSnapshotValue = resources.editor.state.doc;
    this.transactionStateValue = resources.editor.state.pm;
    this.shellValue = resources.shell;
    this.registryValue = registry;
    const view = resources.editor.view;
    // Only a mounted View commits frames; a headless editor has no page area to hide.
    this.releaseFirstPaintGate = view.onGeometryUpdate === undefined ? undefined : gateClassicEditorFirstPaint({
      element: view.dom,
      fonts: element.ownerDocument.fonts,
      onGeometryUpdate: view.onGeometryUpdate.bind(view)
    });
    this.refreshShell();
    invokeClassicEditorHooks(this.registryValue.plugins, "onMount", this.hookContext());
  }

  /** Reusably unmounts product shell, Core, View, and browser listeners. */
  unmount(): void {
    this.documentImports.cancel();
    this.releaseFirstPaintGate?.();
    this.releaseFirstPaintGate = undefined;
    if (!this.editorValue || !this.shellValue) return;
    invokeClassicEditorHooks(this.registryValue.plugins, "onUnmount", this.hookContext());
    this.documentValue = releaseClassicEditorResources(
      {
        editor: this.editorValue,
        shell: this.shellValue
      },
      this.handleEditorUpdate,
      this.handleEditorSelectionUpdate,
      this.handleEditorTransaction,
      this.handleKeydown,
      this.handlePaste
    );
    this.editorValue = undefined;
    this.documentSnapshotValue = undefined;
    this.transactionStateValue = undefined;
    this.shellValue = undefined;
    this.hostValue = undefined;
  }

  /**
   * Updates product options and remounts structural configuration safely.
   *
   * @param options - Partial product updates.
   */
  update(options: ClassicEditorUpdateOptions): void {
    this.assertActive();
    if (options.editable !== undefined) this.documentImports.cancel();
    if (canRetainClassicEditorSession(options, this.resolved.preset, this.resolved.theme)) {
      const previous = this.resolved;
      this.consumerOptions = mergeClassicEditorUpdate(this.consumerOptions, options, this.editorValue?.state.doc ?? this.documentValue);
      this.resolved = resolveClassicEditorOptions(this.consumerOptions);
      if (this.editorValue && this.shellValue) {
        if (previous.editable !== this.resolved.editable) this.editorValue.setEditable(this.resolved.editable, false);
        if (previous.locale !== this.resolved.locale) applyClassicEditorLocale(this.shellValue.root, this.resolved.locale);
        if (previous.theme !== this.resolved.theme) applyClassicEditorTheme(this.shellValue.root, this.resolved.theme);
        if (previous.locale !== this.resolved.locale || previous.theme !== this.resolved.theme) {
          this.resolved.preset.updatePresentation?.({
            editor: this.editorValue, theme: this.resolved.theme, locale: this.resolved.locale,
            canvasRuntime: this.resolved.canvasRuntime, svgRuntime: this.resolved.svgRuntime,
          });
          this.editorValue.view.updateState(this.editorValue.state.pm);
        }
        this.refreshShell();
      }
      invokeClassicEditorHooks(this.registryValue.plugins, "onUpdate", this.hookContext());
      return;
    }
    const host = this.hostValue;
    const previousPlugins = this.registryValue.plugins;
    if (this.isMounted) this.unmount();
    if (options.webFonts !== undefined) this.releaseDocumentFonts();
    this.consumerOptions = mergeClassicEditorUpdate(
      this.consumerOptions,
      options,
      this.documentValue
    );
    this.resolved = resolveClassicEditorOptions(this.consumerOptions);
    const hiddenTextMode = (this.resolved.backend === "svg" ? options.svgRuntime : options.canvasRuntime)?.hiddenTextViewMode;
    if (hiddenTextMode !== undefined) this.uiValue.setHiddenTextVisible(hiddenTextMode === "formatting-inspection");
    // Initial shell defaults must not overwrite live choices during unrelated updates.
    this.uiValue.reconcileVisibility(
      options.shell?.leftSidebar ?? this.uiValue.state.leftSidebar.visible,
      options.shell?.rightSidebar ?? this.uiValue.state.rightSidebar.visible,
      options.shell?.ruler ?? this.uiValue.state.rulerVisible
    );
    this.documentValue = this.resolved.document;
    this.registryValue = this.createRegistry();
    reconcileClassicEditorPlugins(previousPlugins, this.registryValue.plugins, this.hookContext());
    if (host) this.mount(host);
    invokeClassicEditorHooks(this.registryValue.plugins, "onUpdate", this.hookContext());
  }

  /** Final, idempotent product destruction. */
  destroy(): void {
    if (this.destroyed) return;
    this.unmount();
    this.resourceTasksValue.destroy();
    this.tasksValue.destroy();
    this.hostResourcesValue.destroy();
    this.releaseDocumentFonts();
    invokeClassicEditorHooks(this.registryValue.plugins, "onDestroy", this.hookContext());
    this.destroyed = true;
  }

  /**
   * Keeps pure selection updates synchronous while coalescing document event pairs.
   *
   * @param event - Accepted Core selection change.
   */
  private readonly handleEditorSelectionUpdate = (event: QuireEditorSelectionUpdateEvent): void => {
    if (!canCoalesceClassicEditorSelectionProjection(event, this.registryValue.plugins)) {
      this.handleEditorUpdate();
    }
  };

  /** @param event - Accepted transaction whose caret formats or brush-tool state may need projection. */
  private readonly handleEditorTransaction = (event: QuireEditorTransactionEvent): void => {
    const current = event.editor.state.pm;
    if (current.doc !== this.transactionStateValue?.doc) {
      this.documentRevisionValue += 1;
      this.documentImports.cancel();
    }
    const refreshMarks = needsClassicEditorStoredMarkProjection(this.transactionStateValue, current);
    // Advance before invoking product hooks, which may synchronously dispatch again.
    this.transactionStateValue = current;
    syncClassicHighlighterPenCursor(event.editor);
    const transactions = [event.transaction, ...event.appendedTransactions];
    if (refreshMarks || transactions.some(transaction => (
      !transaction.docChanged
      && (transactionChangesFormatPainterState(transaction) || transactionChangesHighlighterPenState(transaction)
        // Presentation-only changes, such as showing bookmarks, may switch a ribbon toggle;
        // selection changes are already projected by the selection update.
        || (!transaction.selectionSet && readQuireTransactionRenderImpact(transaction) !== undefined))
    ))) {
      this.handleEditorUpdate();
    }
  };

  /** Handles Core state updates without rebuilding the product lifecycle. */
  private readonly handleEditorUpdate = (): void => {
    const snapshot = this.editorValue?.state.doc;
    // PM already owns an immutable accepted document. Preserve that authority
    // until an explicit JSON read or unmount needs a serialized representation.
    if (snapshot !== undefined && snapshot !== this.documentSnapshotValue) {
      this.documentValue = snapshot;
      this.documentSnapshotValue = snapshot;
      this.documentFontsValue?.update(snapshot);
    }
    this.refreshShell();
    invokeClassicEditorHooks(this.registryValue.plugins, "onUpdate", this.hookContext());
  };

  /** Routes one Core paste event through synchronous product-plugin ownership. */
  private readonly handlePaste = (event: QuireEditorPasteEvent): void => {
    if (
      invokeClassicEditorPasteHooks(
        this.registryValue.plugins,
        this.hookContext(),
        event
      )
    ) {
      event.event.preventDefault();
    }
  };

  /** Invalidates the currently mounted backend after authoritative font metrics settle. */
  private readonly handleDocumentFontsReady = (): void => {
    if (!this.editorValue || this.editorValue.isDestroyed) return;
    // Loading events already reset measurements for fetched faces; only faces
    // installed already loaded (from cached bytes) still need a reset here.
    this.editorValue.view.refreshFontMetrics?.({ onlyIfFontSetChanged: true });
    this.handleEditorUpdate();
  };

  /**
   * Reuses one browser-font authority across structural View remounts.
   *
   * Canvas/SVG switching replaces the painter and shell, but it must not remove
   * registered FontFace objects or restart cache restoration. Keeping the
   * controller at instance scope makes the new backend's first frame observe
   * the same ready font set as the backend it replaces.
   *
   * @param ownerDocument - Browser document that owns the mounted font set.
   * @param document - Document-owned font attributes mounted into the new backend.
   */
  private prepareDocumentFonts(
    ownerDocument: Document,
    document: ClassicEditorDocumentFontSource
  ): void {
    if (
      this.documentFontsValue !== undefined
      && this.documentFontOwnerValue === ownerDocument
    ) {
      this.documentFontsValue.update(document);
      return;
    }
    this.releaseDocumentFonts();
    this.documentFontOwnerValue = ownerDocument;
    this.documentFontsValue = createClassicEditorDocumentFontReadiness({
      ownerDocument,
      document,
      webFonts: this.resolved.webFonts,
      onStatusChange: this.handleEditorUpdate,
      onReady: this.handleDocumentFontsReady
    });
  }

  /** Releases the instance-owned font controller after final teardown or policy replacement. */
  private releaseDocumentFonts(): void {
    this.documentFontsValue?.destroy();
    this.documentFontsValue = undefined;
    this.documentFontOwnerValue = undefined;
  }

  /** Routes registered product shortcuts before browser-default product behaviors. */
  private readonly handleKeydown = (event: KeyboardEvent): void => {
    if (event.defaultPrevented) return;
    // A readonly result owns its input. Product shortcuts still target the live
    // editor, so they must not cross the preview boundary (copy stays native).
    if (this.root?.hasAttribute("data-qk-document-preview")) return;
    const shortcut = findClassicEditorShortcut(event, this.registryValue.keyboardShortcuts);
    if (!shortcut) return;
    const handled = this.executeContribution(
      shortcut.behavior,
      undefined,
      { source: "keyboard", detail: { shortcut: shortcut.shortcut } }
    );
    if (!(handled instanceof Promise) && !handled) return;
    event.preventDefault();
    event.stopPropagation();
  };

  /** Throws after final destruction. */
  private assertActive(): void {
    if (this.destroyed) {
      throw new Error("Classic Editor has been destroyed and cannot be reused.");
    }
  }
}
