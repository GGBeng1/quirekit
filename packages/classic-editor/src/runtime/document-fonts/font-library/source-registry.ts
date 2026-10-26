import { createQuireRemoteFontSourceClient } from "@quirekit/web-fonts";
import type {
  ClassicEditorCustomWebFontSourceRecord,
  ClassicEditorStylesheetFontSourceRecord,
  ClassicEditorWebFontOptions
} from "../../../types";
import { createClassicRemoteWebFontSource } from "../../web-fonts/remote-source";
import { createClassicStylesheetFontSource, inspectClassicStylesheetFontSource } from "../../web-fonts/stylesheet";

import type { ClassicWebFontSourceRegistry } from "./types";

/**
 * Creates the bundled-plus-declarative source registry for one mount.
 *
 * @param configured - Enabled host web-font options.
 * @param persisted - Previously enabled declarative sources.
 * @param stylesheets - Previously enabled static CSS snapshots.
 * @returns Dynamic source registry.
 */
export function createClassicWebFontSourceRegistry(
  configured: ClassicEditorWebFontOptions | undefined,
  persisted: readonly ClassicEditorCustomWebFontSourceRecord[],
  stylesheets: readonly ClassicEditorStylesheetFontSourceRecord[] = []
): ClassicWebFontSourceRegistry {
  const sources = new Map((configured?.sources ?? []).map((source) => [source.id, source]));
  const customSources = new Map<string, ClassicEditorCustomWebFontSourceRecord>();
  const stylesheetSources = new Map<string, ClassicEditorStylesheetFontSourceRecord>();
  const client = createQuireRemoteFontSourceClient({
    ...(configured?.fetch === undefined ? {} : {
      fetch: async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const compatibleInput = input instanceof Request ? input.url : input;
        return configured.fetch?.(compatibleInput, init)
          ?? Promise.reject(new Error("Font source fetch boundary is unavailable."));
      }
    })
  });

  /**
   * Enables one record without allowing a custom descriptor to shadow a built-in source.
   *
   * @param record - Validated custom-source record.
   */
  function enable(record: ClassicEditorCustomWebFontSourceRecord): void {
    const existing = sources.get(record.descriptor.id);
    if (existing !== undefined && existing.kind !== "custom") {
      throw new Error(`Font source "${record.descriptor.id}" conflicts with a built-in source.`);
    }
    customSources.set(record.descriptor.id, record);
    sources.set(record.descriptor.id, createClassicRemoteWebFontSource(record, client));
  }

  for (const record of persisted) {
    try {
      enable(record);
    } catch {
      // Invalid or colliding persisted sources stay disabled after migration.
    }
  }

  /**
   * Validates and enables one stylesheet snapshot without replacing built-ins.
   * @param record - User-connected static directory.
   */
  function enableStylesheet(record: ClassicEditorStylesheetFontSourceRecord): void {
    const source = createClassicStylesheetFontSource(record);
    if (sources.has(source.id) && !stylesheetSources.has(source.id)) {
      throw new Error(`Font source "${source.id}" conflicts with an existing source.`);
    }
    stylesheetSources.set(source.id, { ...record });
    sources.set(source.id, source);
  }
  for (const record of stylesheets) {
    try { enableStylesheet(record); } catch { /* Invalid persisted snapshots remain disabled. */ }
  }

  return {
    sources,
    customSources,
    stylesheetSources,
    /** @inheritdoc */
    inspectStylesheet: (url, name) => inspectClassicStylesheetFontSource(url, name, configured?.fetch),
    enableStylesheet,
    /** @inheritdoc */
    async inspect(descriptorUrl) {
      const descriptor = await client.loadDescriptor(descriptorUrl);
      return { descriptorUrl, descriptor, enabledAt: Date.now() };
    },
    enable,
    /** @inheritdoc */
    remove(sourceId) {
      if (!customSources.delete(sourceId) && !stylesheetSources.delete(sourceId)) return false;
      sources.delete(sourceId);
      return true;
    }
  };
}
