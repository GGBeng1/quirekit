import {
  resolveQuireFontSubstitutionCandidates
} from "@quirekit/core";
import {
  normalizeQuireWebFontFamily
} from "@quirekit/web-fonts";
import type { ClassicEditorDocumentFontStatus } from "../../types";
import {
  probeClassicLocalFontFace,
  probeClassicRegisteredFontFace
} from "./browser";
import {
  readClassicDocumentFontRequest
} from "./request";
import { createClassicDocumentWebFontLibrary } from "./font-library/library";
import type {
  ClassicEditorDocumentFontReadiness,
  ClassicDocumentFontRequest,
  ClassicEditorDocumentFontSource,
  CreateClassicEditorDocumentFontReadinessOptions
} from "./types";

/**
 * Resolves Classic's logical body font and reports readiness after metrics settle.
 *
 * Canvas and SVG may measure before a web font's first network load completes.
 * The controller therefore preloads managed faces, probes exact local families,
 * and requests one full layout refresh after the winning result is authoritative.
 *
 * @param options - Owner document, canonical content, and layout callback.
 * @returns Destroyable document-font resolution lifecycle.
 */
export function createClassicEditorDocumentFontReadiness(
  options: CreateClassicEditorDocumentFontReadinessOptions
): ClassicEditorDocumentFontReadiness {
  let destroyed = false;
  let requestVersion = 0;
  let requestKey: string | undefined;
  let currentRequest: ClassicDocumentFontRequest | undefined;
  let status: ClassicEditorDocumentFontStatus = emptyFontStatus("pending");
  const fonts = options.ownerDocument.fonts;
  const localAvailability = new Map<string, Promise<boolean>>();
  const webFontLibrary = createClassicDocumentWebFontLibrary({
    ownerDocument: options.ownerDocument,
    webFonts: options.webFonts,
    probeLocalFamily,
    onStatusChange: options.onStatusChange,
    async onInstalled(family: string): Promise<void> {
      if (destroyed) return;
      localAvailability.delete(normalizeQuireWebFontFamily(family));
      options.onStatusChange?.();
      if (currentRequest !== undefined) {
        await commitRequest(
          currentRequest,
          requestKey ?? JSON.stringify(currentRequest),
          true
        );
      }
    }
  });

  /**
   * Selects the first exactly available requested, document, or host candidate.
   *
   * @param request - Logical family and canonical alternate table.
   * @returns Product-facing font status.
   */
  async function resolveDocumentFont(
    request: ClassicDocumentFontRequest
  ): Promise<ClassicEditorDocumentFontStatus> {
    if (request.requestedFamily === null) {
      return emptyFontStatus("unresolved");
    }
    const candidates = resolveQuireFontSubstitutionCandidates({
      requestedFamily: request.requestedFamily,
      fontTable: request.fontTable
    });
    // Exact probes are independent but selection remains candidate-ordered.
    // Parallel probing prevents several unavailable local fallbacks from
    // multiplying the bounded browser-probe timeout.
    const availability = await Promise.all(candidates.map(async (candidate) => {
      const normalizedFamily = normalizeQuireWebFontFamily(candidate.family);
      return webFontLibrary.isInstalled(normalizedFamily)
        || await probeClassicRegisteredFontFace(fonts, candidate.family)
        || await probeLocalFamily(candidate.family);
    }));
    const availableIndex = availability.findIndex(Boolean);
    const available = candidates[availableIndex];
    if (available !== undefined) {
      return {
        requestedFamily: request.requestedFamily,
        renderedFamily: available.family,
        status: available.source === "requested" ? "available" : "substituted",
        source: available.source
      };
    }
    return {
      requestedFamily: request.requestedFamily,
      renderedFamily: null,
      status: "unresolved",
      source: null
    };
  }

  /**
   * Probes one exact installed family and caches the owner-document result.
   *
   * @param family - Exact family to probe.
   * @returns Whether the host can load that local family.
   */
  function probeLocalFamily(family: string): Promise<boolean> {
    const key = normalizeQuireWebFontFamily(family);
    const cached = localAvailability.get(key);
    if (cached !== undefined) return cached;
    const probe = probeClassicLocalFontFace(options.ownerDocument, family);
    localAvailability.set(key, probe);
    return probe;
  }

  /**
   * Resolves and commits the current document body family.
   *
   * @param document - Latest document-owned font attributes.
   */
  function update(document: ClassicEditorDocumentFontSource): void {
    const request = readClassicDocumentFontRequest(document);
    const nextKey = JSON.stringify(request);
    currentRequest = request;
    void commitRequest(request, nextKey);
  }

  /**
   * Starts or restarts resolution for one logical document-font request.
   *
   * @param request - Canonical logical family and alternates.
   * @param nextKey - Stable request identity.
   * @param force - Whether newly registered bytes require the same request to rerun.
   */
  async function commitRequest(
    request: ClassicDocumentFontRequest,
    nextKey: string,
    force = false
  ): Promise<void> {
    if (!force && nextKey === requestKey) return;
    requestKey = nextKey;
    const version = ++requestVersion;
    status = {
      requestedFamily: request.requestedFamily,
      renderedFamily: null,
      status: "pending",
      source: null
    };
    const resolved = await resolveDocumentFont(request);
    // FontFaceSet.ready settles after loading events and browser layout have
    // observed the new face, so measurement caches clear before pagination.
    await fonts?.ready;
    if (destroyed || version !== requestVersion) return;
    status = resolved;
    options.onReady();
  }

  if (options.document === undefined) {
    void Promise.resolve(fonts?.ready).then(() => {
      if (!destroyed) options.onReady();
    });
  } else {
    update(options.document);
  }
  return {
    get status(): ClassicEditorDocumentFontStatus {
      return status;
    },
    fontLibrary: webFontLibrary.library,
    update,
    destroy(): void {
      destroyed = true;
      requestVersion += 1;
      webFontLibrary.destroy();
    }
  };
}

/**
 * Creates a status with no logical or rendered family.
 *
 * @param kind - Pending or unresolved state.
 * @returns Empty status.
 */
function emptyFontStatus(
  kind: "pending" | "unresolved"
): ClassicEditorDocumentFontStatus {
  return {
    requestedFamily: null,
    renderedFamily: null,
    status: kind,
    source: null
  };
}
