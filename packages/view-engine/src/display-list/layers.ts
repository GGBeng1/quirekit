import type {
  QuireDisplayCommand,
  QuireDisplayListLayers,
  QuireRect
} from "@quirekit/renderer";
import type { QuireDisplayCommandPaintSurface } from "./types";

/**
 * Resolves the last-mile paint surface for one display command.
 *
 * `content`/`overlay` here are renderer targets, not editor layer-stack planes.
 * Semantic z-order and pointer policy remain owned by `view-graph`; this helper
 * only centralizes how display command surface tags route into the current
 * two-surface painters.
 *
 * @param command - Display command being routed to a paint surface.
 * @returns Paint surface bucket used by render-result and page-stack collectors.
 */
export function resolveQuireDisplayCommandPaintSurface(
  command: QuireDisplayCommand
): QuireDisplayCommandPaintSurface {
  return command.layer === "overlay" ? "overlay" : "content";
}

/**
 * Creates an online collector for content and overlay display-list layers.
 *
 * @returns Collector that observes appended commands and finalizes layer lists.
 */
export function createQuireDisplayListLayerCollector(): {
  readonly observe: (command: QuireDisplayCommand) => void;
  readonly finish: (bounds: QuireRect) => QuireDisplayListLayers;
} {
  const contentCommands: QuireDisplayCommand[] = [];
  const overlayCommands: QuireDisplayCommand[] = [];

  /**
   * Routes one top-level display command into its paint layer.
   *
   * @param command - Command appended to the composite display list.
   */
  function observe(command: QuireDisplayCommand): void {
    if (resolveQuireDisplayCommandPaintSurface(command) === "overlay") {
      overlayCommands.push(command);
      return;
    }

    contentCommands.push(command);
  }

  /**
   * Finalizes collected layer display lists using the composite bounds.
   *
   * @param bounds - Composite display-list bounds.
   * @returns Content and overlay display lists.
   */
  function finish(bounds: QuireRect): QuireDisplayListLayers {
    return {
      content: {
        bounds,
        commands: contentCommands
      },
      overlay: {
        bounds,
        commands: overlayCommands
      }
    };
  }

  return {
    observe,
    finish
  };
}
