import { collectQuireExtensionContributions } from "@quirekit/core";
import type { EditorState } from "@quirekit/pm";
import { presentMountedOverlay } from "./presentation-overlay";
import { createMountedRevealingTextActivator, type MountedRevealingTextActivator } from "./revealing-text-activation";
import type {
  QuireMountedServiceContext,
  QuireMountedViewService,
  QuireMountedViewServiceContribution
} from "./types";

/** Owns optional service instances independently of PM plugin reconfiguration. */
export class MountedViewServices {
  private services: QuireMountedViewService[] = [];
  private initialized = false;
  private destroyed = false;
  private textActivator: MountedRevealingTextActivator | null = null;

  /**
   * Resolves contributions once after concrete mounting has finished.
   * @param mountContext - Public capabilities of this mounted view, except the overlay channel this runtime adds.
   */
  initialize(mountContext: Omit<QuireMountedServiceContext, "presentOverlay">): void {
    if (this.initialized || this.destroyed) return;
    this.initialized = true;
    const { view } = mountContext;
    const textActivator = createMountedRevealingTextActivator({
      activate: (target, options) => mountContext.activateText(target, options),
      reveal: (position) => view.scrollRangeIntoView({ from: position, to: position }),
      onGeometryUpdate: (listener) => view.onGeometryUpdate?.(listener) ?? (() => undefined),
      readDoc: () => view.state.doc,
      readSelection: () => view.state.selection
    });
    this.textActivator = textActivator;
    const context: QuireMountedServiceContext = {
      ...mountContext,
      activateText: (target, options) => !this.destroyed && textActivator.activate(target, options),
      presentOverlay: (overlay) => !this.destroyed && presentMountedOverlay(mountContext.view, overlay)
    };
    const contributions = collectQuireExtensionContributions<QuireMountedViewServiceContribution>(
      context.editor.extensions ?? [], "addMountedViewServices"
    );
    const ids = new Set<string>();
    for (const { contribution } of contributions) {
      if (!contribution.id || ids.has(contribution.id)) {
        throw new RangeError(`Duplicate or empty mounted service id: ${contribution.id}`);
      }
      ids.add(contribution.id);
    }
    try {
      for (const { contribution } of contributions) {
        const service = contribution.create(context);
        if (service) this.services.push(service);
      }
    } catch (error) {
      this.destroy();
      throw error;
    }
  }

  /**
   * Updates services after the matching mounted presentation phase.
   * @param state - Current accepted state, never a speculative composition document.
   */
  update(state: EditorState): void {
    for (const service of this.services) {
      if (this.destroyed) return;
      service.update?.(state);
    }
  }

  /** Releases every service exactly once in reverse installation order. */
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.textActivator?.cancel();
    let failure: unknown;
    for (const service of this.services.splice(0).reverse()) {
      try { service.destroy(); } catch (error) { failure ??= error; }
    }
    if (failure !== undefined) throw failure;
  }
}
