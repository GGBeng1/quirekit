import { createQuireInteractionGeometryAuthority } from "@quirekit/view-engine";
import { validateEditorUIAnchorFreshness } from "./freshness";
import { resolveEditorUIOccurrenceContext } from "./occurrence";
import { createEditorUIReadyAnchor, createEditorUIUnsupportedAnchor } from "./result";
import { resolveEditorUITableAnchor } from "./table";
import {
  resolveEditorUINodeTargets,
  resolveEditorUIObjectTargets,
  resolveEditorUISemanticTargetAnchor,
  resolveEditorUIWidgetTargets
} from "./targets";
import type {
  EditorUIAnchorGeometryResolution,
  EditorUIAnchorRequest,
  ResolveEditorUIAnchorGeometryOptions
} from "./types";
import { isFiniteEditorUIAnchorRect } from "./validation";

/**
 * Resolves one typed Editor UI anchor from the canonical interaction snapshot.
 *
 * The resolver never reads the current selection, current caret, DOM geometry,
 * or display commands. Missing semantic products stay explicitly unsupported.
 *
 * @param options - Current retained interaction snapshot and explicit request.
 * @returns Version-checked document-space geometry result.
 */
export function resolveEditorUIAnchorGeometry(
  options: ResolveEditorUIAnchorGeometryOptions
): EditorUIAnchorGeometryResolution {
  const versionResult = validateEditorUIAnchorFreshness(
    options.snapshot.viewGraph?.version,
    options.request
  );
  if (versionResult !== undefined) {
    return versionResult;
  }
  const snapshotVersion = options.snapshot.viewGraph!.version;

  switch (options.request.kind) {
    case "caret":
      return resolveCaretAnchor(
        options.snapshot,
        options.request,
        snapshotVersion
      );
    case "text":
      return resolveTextAnchor(
        options.snapshot,
        options.request,
        snapshotVersion
      );
    case "node":
      return resolveEditorUISemanticTargetAnchor(
        options.request,
        resolveEditorUINodeTargets(options.snapshot, options.request),
        snapshotVersion,
        "node-target-unavailable",
        "node-target-ambiguous"
      );
    case "object":
      return resolveEditorUISemanticTargetAnchor(
        options.request,
        resolveEditorUIObjectTargets(options.snapshot, options.request),
        snapshotVersion,
        "object-target-unavailable",
        "object-target-ambiguous"
      );
    case "table":
      return resolveEditorUITableAnchor(
        options.snapshot,
        options.request,
        snapshotVersion
      );
    case "widget":
      return resolveEditorUISemanticTargetAnchor(
        options.request,
        resolveEditorUIWidgetTargets(options.snapshot, options.request),
        snapshotVersion,
        "widget-target-unavailable",
        "widget-target-ambiguous"
      );
    case "virtual":
      return isFiniteEditorUIAnchorRect(options.request.rect)
        ? createEditorUIReadyAnchor({
            request: options.request,
            snapshotVersion,
            rects: [options.request.rect]
          })
        : createEditorUIUnsupportedAnchor(
            options.request,
            "virtual-rect-invalid",
            snapshotVersion
          );
    default:
      return assertUnreachableAnchorRequest(options.request);
  }
}

/**
 * Resolves a collapsed caret without using the viewport fallback of PM coordsAtPos.
 *
 * @param snapshot - Current retained interaction snapshot.
 * @param request - Explicit caret request.
 * @param snapshotVersion - Accepted current snapshot version.
 * @returns Ready caret geometry or explicit unsupported result.
 */
function resolveCaretAnchor(
  snapshot: ResolveEditorUIAnchorGeometryOptions["snapshot"],
  request: Extract<EditorUIAnchorRequest, { readonly kind: "caret" }>,
  snapshotVersion: number
): EditorUIAnchorGeometryResolution {
  const authority = createQuireInteractionGeometryAuthority({
    snapshot
  });
  const occurrence = resolveEditorUIOccurrenceContext(snapshot, request.occurrence);
  if (occurrence.status === "unavailable") {
    return createEditorUIUnsupportedAnchor(
      request,
      "occurrence-target-unavailable",
      snapshotVersion
    );
  }
  const caret = authority.caretAtPosition(request.position, 1, occurrence.context);

  return caret === null
    ? createEditorUIUnsupportedAnchor(
        request,
        "caret-geometry-unavailable",
        snapshotVersion
      )
    : createEditorUIReadyAnchor({
        request,
        snapshotVersion,
        rects: [caret.rect],
        sourceTargetIds: occurrence.sourceTargetIds
      });
}

/**
 * Resolves visible text-range rectangles from retained selection products.
 *
 * @param snapshot - Current retained interaction snapshot.
 * @param request - Explicit text-range request.
 * @param snapshotVersion - Accepted current snapshot version.
 * @returns Ready text geometry or explicit unsupported result.
 */
function resolveTextAnchor(
  snapshot: ResolveEditorUIAnchorGeometryOptions["snapshot"],
  request: Extract<EditorUIAnchorRequest, { readonly kind: "text" }>,
  snapshotVersion: number
): EditorUIAnchorGeometryResolution {
  if (request.range.from >= request.range.to) {
    return createEditorUIUnsupportedAnchor(
      request,
      "text-geometry-unavailable",
      snapshotVersion
    );
  }
  const occurrence = resolveEditorUIOccurrenceContext(snapshot, request.occurrence);
  if (occurrence.status === "unavailable") {
    return createEditorUIUnsupportedAnchor(
      request,
      "occurrence-target-unavailable",
      snapshotVersion
    );
  }
  const geometry = createQuireInteractionGeometryAuthority({
    snapshot
  }).selectionRects(request.range, occurrence.context);

  return geometry.ranges.length === 0
    ? createEditorUIUnsupportedAnchor(
        request,
        "text-geometry-unavailable",
        snapshotVersion
      )
    : createEditorUIReadyAnchor({
        request,
        snapshotVersion,
        rects: geometry.ranges.map((range) => range.rect),
        sourceTargetIds: occurrence.sourceTargetIds
      });
}

/**
 * Preserves exhaustiveness when the public request union grows.
 *
 * @param request - Unhandled request variant.
 * @returns Never; the function always throws.
 */
function assertUnreachableAnchorRequest(request: never): never {
  throw new TypeError(`Unsupported Editor UI anchor request: ${JSON.stringify(request)}`);
}
