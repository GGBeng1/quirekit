import {
  createDevtoolsExportText,
  type QuireDevtoolsExportPayload
} from "./data";

/**
 * Downloads an export payload as a JSON file when browser APIs are available.
 *
 * @param payload - Payload to download.
 * @param ownerDocument - Document used to create the anchor element.
 * @returns True when a download was started.
 */
export function downloadDevtoolsExport(
  payload: QuireDevtoolsExportPayload,
  ownerDocument: Document | undefined
): boolean {
  if (
    !ownerDocument ||
    typeof Blob !== "function" ||
    typeof URL === "undefined" ||
    typeof URL.createObjectURL !== "function"
  ) {
    return false;
  }

  const blob = new Blob([createDevtoolsExportText(payload)], {
    type: "application/json;charset=utf-8"
  });
  const url = URL.createObjectURL(blob);
  const anchor = ownerDocument.createElement("a");
  anchor.href = url;
  anchor.download = createDevtoolsExportFileName(payload);
  anchor.style.display = "none";
  ownerDocument.body?.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);

  return true;
}

/**
 * Creates a stable file name for an export payload.
 *
 * @param payload - Payload being downloaded.
 * @returns Download file name.
 */
function createDevtoolsExportFileName(payload: QuireDevtoolsExportPayload): string {
  const stamp = payload.exportedAt.replace(/[:.]/g, "-");

  return `quirekit-devtools-${payload.scope}-${stamp}.json`;
}
