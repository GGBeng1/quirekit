import { createEditorUIUnsupportedAnchor } from "./result";
import type {
  EditorUIAnchorGeometryResolution,
  EditorUIAnchorRequest
} from "./types";
import { isEditorUIAnchorSnapshotVersion } from "./validation";

/**
 * Validates expected and actual snapshot versions before any geometry query.
 *
 * @param snapshotVersion - Version carried by the current retained graph.
 * @param request - Explicit anchor request.
 * @returns Early stale/unsupported result, or undefined when versions match.
 */
export function validateEditorUIAnchorFreshness(
  snapshotVersion: unknown,
  request: EditorUIAnchorRequest
): EditorUIAnchorGeometryResolution | undefined {
  if (!isEditorUIAnchorSnapshotVersion(request.expectedSnapshotVersion)) {
    return createEditorUIUnsupportedAnchor(
      request,
      "expected-snapshot-version-invalid"
    );
  }
  if (snapshotVersion === undefined) {
    return createEditorUIUnsupportedAnchor(request, "snapshot-version-unavailable");
  }
  if (!isEditorUIAnchorSnapshotVersion(snapshotVersion)) {
    return createEditorUIUnsupportedAnchor(request, "snapshot-version-invalid");
  }
  return request.expectedSnapshotVersion === snapshotVersion
    ? undefined
    : {
        status: "stale",
        kind: request.kind,
        expectedSnapshotVersion: request.expectedSnapshotVersion,
        snapshotVersion
      };
}
