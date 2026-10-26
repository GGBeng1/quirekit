import { formatJson } from "../format";
import {
  createDevtoolsExportPayload,
  createDevtoolsExportText,
  type QuireDevtoolsExportScope
} from "./data";
import { downloadDevtoolsExport } from "./download";
import { readDocumentJson } from "../snapshot";
import type { QuireDevtools } from "../../types";

/** Text copy function used for export fallbacks. */
export type QuireDevtoolsTextCopy = (text: string) => Promise<void>;

/** Options used when exporting panel data. */
export interface QuireDevtoolsPanelExportActionOptions {
  /** Devtools instance to read. */
  readonly devtools: Pick<QuireDevtools, "getEntries">;
  /** Owner document used for download links. */
  readonly ownerDocument: Document | undefined;
  /** Export scope selected by the user. */
  readonly scope: QuireDevtoolsExportScope;
  /** Number of newest entries for recent exports. */
  readonly topCount: number;
  /** Copy sink used so browser automation can inspect the exported JSON. */
  readonly copyText: QuireDevtoolsTextCopy;
}

/**
 * Copies the current document JSON.
 *
 * @param devtools - Devtools instance to read.
 * @param copyText - Text copy function.
 */
export async function copyDocumentJson(
  devtools: Pick<QuireDevtools, "getSnapshot">,
  copyText: QuireDevtoolsTextCopy
): Promise<void> {
  await copyText(formatJson(readDocumentJson(devtools)));
}

/**
 * Exports selected devtools data and copies the JSON text.
 *
 * @param options - Export action options.
 */
export async function exportPanelData(
  options: QuireDevtoolsPanelExportActionOptions
): Promise<void> {
  const payload = createDevtoolsExportPayload(options.devtools, {
    scope: options.scope,
    topCount: options.topCount
  });
  const text = createDevtoolsExportText(payload);

  downloadDevtoolsExport(payload, options.ownerDocument);

  await options.copyText(text);
}
