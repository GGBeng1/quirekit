import type { QuireMountedServiceContext, QuireTextContextLease, QuireTextContextProvider } from "@quirekit/view/mounted-services";
import type { QuireAccessibilityDiagnostics, QuireAccessibilityOptions } from "../types";
import type { AccessibilitySession, AccessibilityWork } from "./types";
import { projectTextContext } from "../text/projection";
import { ReadingSurface } from "../reading/surface";
import type { AccessibilityRegistry } from "../registry/types";

/** One optional service per mount; it never owns native input listeners or PM plugins. */
export class MountedAccessibilitySession implements AccessibilitySession {
  private enabled = false;
  private destroyed = false;
  private lease: QuireTextContextLease | undefined;
  private surface: ReadingSurface | undefined;
  private readonly work: AccessibilityWork = { contextCompiles: 0, contextCharacters: 0, readingCompiles: 0, readingDomUpdates: 0 };
  private readonly provider: QuireTextContextProvider;

  /** @param context - Actual mounted capabilities. @param options - Validated installation policy. @param getRegistry - Lazy editor-local semantic owners. @param onDestroy - Removes this mount from its controller. */
  constructor(private readonly context: QuireMountedServiceContext, private readonly options: QuireAccessibilityOptions,
    private readonly getRegistry: () => AccessibilityRegistry,
    private readonly onDestroy: () => void) {
    this.provider = { label: options.labels.input, unavailableDescription: options.labels.unavailable, read: (state) => {
      this.work.contextCompiles++;
      const result = projectTextContext(state, options.textBudget, this.getRegistry());
      this.work.contextCharacters += result?.text.length ?? 0;
      return result;
    } };
  }

  /** @inheritdoc */
  setEnabled(enabled: boolean): void {
    if (this.destroyed || enabled === this.enabled) return;
    if (enabled) this.getRegistry();
    this.enabled = enabled;
    if (enabled) {
      this.lease = this.context.input?.attachTextContext(this.provider);
      this.surface = new ReadingSurface(this.context, this.options, this.work, this.getRegistry());
    } else {
      this.surface?.destroy();
      this.surface = undefined;
      this.lease?.dispose();
      if (!this.lease?.composing) this.lease = undefined;
    }
  }

  /** @inheritdoc */
  update(): void {
    if (!this.enabled || this.destroyed) return;
    this.lease?.refresh();
    this.surface?.update();
  }

  /** @inheritdoc */
  focusReading(): boolean { return !this.destroyed && (this.surface?.open() ?? false); }

  /** @inheritdoc */
  focusEditing(): boolean { return !this.destroyed && (this.surface?.closeToEditor() ?? false); }

  /** @inheritdoc */
  diagnostics(): QuireAccessibilityDiagnostics {
    return { ...this.work, viewId: this.context.view.id, enabled: this.enabled, composing: this.lease?.composing ?? false };
  }

  /** @inheritdoc */
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.enabled = false;
    this.surface?.destroy(false);
    this.surface = undefined;
    this.lease?.dispose();
    this.onDestroy();
  }
}
