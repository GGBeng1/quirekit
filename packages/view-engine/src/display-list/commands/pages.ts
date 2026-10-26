import type {
  QuireDisplayCommand,
  QuireFillRectCommand,
  QuirePathCommand,
  QuireRect
} from "@quirekit/renderer";
import type { QuireLayoutPage } from "../../layout/types";
import type { QuireDisplayListStyles } from "../types";

/**
 * Appends page background and body-outline commands for paginated snapshots.
 *
 * @param commands - Mutable display command list being built.
 * @param pages - Page metadata carried by the layout snapshot.
 * @param styles - Resolved display-list styles.
 */
export function appendPageChromeCommands(
  commands: QuireDisplayCommand[],
  pages: readonly QuireLayoutPage[],
  styles: QuireDisplayListStyles
): void {
  for (const page of pages) {
    appendPageBackgroundCommand(commands, page, styles);
    appendPageBodyOutlineCommand(commands, page, styles);
    appendPageBodyCornerCommand(commands, page, styles);
  }
}

/**
 * Appends printed page rules: column separators and footnote separators.
 *
 * Rules belong to the text plane, so they paint above behind-text drawings
 * such as watermarks and below body content.
 *
 * @param commands - Mutable display command list being built.
 * @param pages - Page metadata carrying resolved rule positions.
 */
export function appendPageRuleCommands(
  commands: QuireDisplayCommand[],
  pages: readonly QuireLayoutPage[]
): void {
  for (const page of pages) {
    appendPageColumnSeparatorCommands(commands, page);
    page.noteSeparators?.forEach((rule, index) => commands.push({
      id: `page-${page.pageIndex}:note-separator-${index}`,
      kind: "fill-rect",
      range: page.range,
      rect: rule,
      fillStyle: columnSeparatorStyle.strokeStyle
    } satisfies QuireFillRectCommand));
  }
}

/** Column separator stroke: black, 0.75pt (one CSS pixel). */
const columnSeparatorStyle = { strokeStyle: "#000000", lineWidth: 1 } as const;

/**
 * Appends document-content separator lines between a page's columns.
 *
 * Separators are part of the printed page, so they stay on the content layer
 * that fixed-layout export consumes.
 *
 * @param commands - Mutable display command list being built.
 * @param page - Page metadata carrying resolved separator positions.
 */
function appendPageColumnSeparatorCommands(
  commands: QuireDisplayCommand[],
  page: QuireLayoutPage
): void {
  page.columnSeparators?.forEach((separator, index) => {
    commands.push({
      id: `page-${page.pageIndex}:column-separator-${index}`,
      kind: "path",
      range: page.range,
      rect: {
        x: separator.x - columnSeparatorStyle.lineWidth / 2,
        y: separator.y,
        width: columnSeparatorStyle.lineWidth,
        height: separator.height
      },
      segments: [
        { kind: "move-to", point: { x: separator.x, y: separator.y } },
        { kind: "line-to", point: { x: separator.x, y: separator.y + separator.height } }
      ],
      ...columnSeparatorStyle
    } satisfies QuirePathCommand);
  });
}

/**
 * Appends one page paper background command.
 *
 * @param commands - Mutable display command list being built.
 * @param page - Page metadata to paint.
 * @param styles - Resolved display-list styles.
 */
function appendPageBackgroundCommand(
  commands: QuireDisplayCommand[],
  page: QuireLayoutPage,
  styles: QuireDisplayListStyles
): void {
  commands.push({
    id: `page-${page.pageIndex}:background`,
    kind: "fill-rect",
    range: page.range,
    rect: page.pageRect,
    fillStyle: styles.pageFillStyle
  } satisfies QuireFillRectCommand);
}

/**
 * Appends one page body rectangle outline command.
 *
 * @param commands - Mutable display command list being built.
 * @param page - Page metadata to paint.
 * @param styles - Resolved display-list styles.
 */
function appendPageBodyOutlineCommand(
  commands: QuireDisplayCommand[],
  page: QuireLayoutPage,
  styles: QuireDisplayListStyles
): void {
  if (styles.pageBodyStrokeWidth <= 0) {
    return;
  }

  commands.push({
    id: `page-${page.pageIndex}:body-outline`,
    kind: "path",
    layer: "overlay",
    range: page.range,
    rect: page.bodyRect,
    segments: createRectanglePathSegments(page.bodyRect),
    strokeStyle: styles.pageBodyStrokeStyle,
    lineWidth: styles.pageBodyStrokeWidth
  } satisfies QuirePathCommand);
}

/**
 * Appends four editor-only L-shaped marks around one measured body rectangle.
 *
 * @param commands - Mutable display command list being built.
 * @param page - Page whose measured body geometry owns the marks.
 * @param styles - Resolved display-list styles.
 */
function appendPageBodyCornerCommand(
  commands: QuireDisplayCommand[],
  page: QuireLayoutPage,
  styles: QuireDisplayListStyles
): void {
  const length = Math.max(0, styles.pageBodyCornerLength);
  if (styles.pageBodyCornerStrokeWidth <= 0 || length === 0) {
    return;
  }

  const left = page.bodyRect.x;
  const right = left + page.bodyRect.width;
  const top = page.bodyRect.y;
  const bottom = top + page.bodyRect.height;
  const pageRight = page.pageRect.x + page.pageRect.width;
  const pageBottom = page.pageRect.y + page.pageRect.height;

  // Each arm points into the surrounding page margin. Clamp directions
  // independently so narrow authored margins cannot push one page's chrome
  // into its body, a neighboring page, or the editor surround.
  const leftLength = Math.min(length, Math.max(0, left - page.pageRect.x));
  const rightLength = Math.min(length, Math.max(0, pageRight - right));
  const topLength = Math.min(length, Math.max(0, top - page.pageRect.y));
  const bottomLength = Math.min(length, Math.max(0, pageBottom - bottom));

  commands.push({
    id: `page-${page.pageIndex}:body-corners`,
    kind: "path",
    layer: "overlay",
    range: page.range,
    rect: {
      x: left - leftLength,
      y: top - topLength,
      width: page.bodyRect.width + leftLength + rightLength,
      height: page.bodyRect.height + topLength + bottomLength
    },
    segments: [
      { kind: "move-to", point: { x: left - leftLength, y: top } },
      { kind: "line-to", point: { x: left, y: top } },
      { kind: "line-to", point: { x: left, y: top - topLength } },
      { kind: "move-to", point: { x: right + rightLength, y: top } },
      { kind: "line-to", point: { x: right, y: top } },
      { kind: "line-to", point: { x: right, y: top - topLength } },
      { kind: "move-to", point: { x: left - leftLength, y: bottom } },
      { kind: "line-to", point: { x: left, y: bottom } },
      { kind: "line-to", point: { x: left, y: bottom + bottomLength } },
      { kind: "move-to", point: { x: right + rightLength, y: bottom } },
      { kind: "line-to", point: { x: right, y: bottom } },
      { kind: "line-to", point: { x: right, y: bottom + bottomLength } }
    ],
    strokeStyle: styles.pageBodyCornerStrokeStyle,
    lineWidth: styles.pageBodyCornerStrokeWidth
  } satisfies QuirePathCommand);
}

/**
 * Creates path segments for a rectangle outline.
 *
 * @param rect - Rectangle to convert into path segments.
 * @returns Closed path that traces the rectangle border.
 */
function createRectanglePathSegments(
  rect: QuireRect
): QuirePathCommand["segments"] {
  const right = rect.x + rect.width;
  const bottom = rect.y + rect.height;

  return [
    { kind: "move-to", point: { x: rect.x, y: rect.y } },
    { kind: "line-to", point: { x: right, y: rect.y } },
    { kind: "line-to", point: { x: right, y: bottom } },
    { kind: "line-to", point: { x: rect.x, y: bottom } },
    { kind: "close-path" }
  ];
}
