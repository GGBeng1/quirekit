import type {
  QuireDisplayCommand,
  QuireFillRectCommand
} from "@quirekit/renderer";
import type { QuireDisplayListStyles } from "../types";

/**
 * Appends the document background fill command.
 *
 * @param commands - Mutable display command list being built.
 * @param rect - Document rectangle to paint.
 * @param styles - Resolved display-list styles.
 */
export function appendDocumentBackgroundCommand(
  commands: QuireDisplayCommand[],
  rect: QuireFillRectCommand["rect"],
  styles: QuireDisplayListStyles
): void {
  commands.push({
    id: "document-background",
    kind: "fill-rect",
    rect,
    fillStyle: styles.documentFillStyle
  } satisfies QuireFillRectCommand);
}
