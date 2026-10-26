import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createQuireMemoryFontCache,
  createQuireStaticWebFontCatalog,
  type QuireWebFontFamilyManifest
} from "@quirekit/web-fonts";
import { createClassicEditorDocumentFontReadiness } from "./document-fonts";

describe("Classic document font readiness", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not preload a font asset when no document font is requested", async () => {
    const loadedFonts: string[] = [];
    const load = vi.fn(async (font: string) => {
      loadedFonts.push(font);
      return [] as FontFace[];
    });
    const onReady = vi.fn();
    const ready = Promise.resolve({} as FontFaceSet);
    createClassicEditorDocumentFontReadiness({
      ownerDocument: { fonts: { load, ready } } as unknown as Document,
      onReady
    });

    await vi.waitFor(() => {
      expect(onReady).toHaveBeenCalledTimes(1);
    });

    expect(loadedFonts).toEqual([]);
  });

  it("uses an application-registered Carlito face without owning its assets", async () => {
    installLocalFontProbe(new Set());
    const registeredFace = {
      family: "Carlito",
      load: vi.fn(async () => registeredFace as unknown as FontFace)
    };
    const readiness = createClassicEditorDocumentFontReadiness({
      ownerDocument: {
        fonts: {
          forEach(callback: (face: FontFace) => void): void {
            callback(registeredFace as unknown as FontFace);
          },
          ready: Promise.resolve({} as FontFaceSet)
        }
      } as unknown as Document,
      document: createFontDocument("Calibri"),
      onReady: vi.fn()
    });

    await vi.waitFor(() => {
      expect(readiness.status).toEqual({
        requestedFamily: "Calibri",
        renderedFamily: "Carlito",
        status: "substituted",
        source: "metric-compatible"
      });
    });
    expect(registeredFace.load).toHaveBeenCalledTimes(1);
  });

  it("does not refresh a released editor when a font load completes later", async () => {
    let releaseLoad: (() => void) | undefined;
    const load = vi.fn(() => new Promise<FontFace[]>((resolve) => {
      releaseLoad = () => resolve([]);
    }));
    const onReady = vi.fn();
    const ready = Promise.resolve({} as FontFaceSet);
    const readiness = createClassicEditorDocumentFontReadiness({
      ownerDocument: { fonts: { load, ready } } as unknown as Document,
      onReady
    });

    readiness.destroy();
    releaseLoad?.();
    await Promise.resolve();
    await Promise.resolve();

    expect(onReady).not.toHaveBeenCalled();
  });

  it("keeps the logical family while reporting a document alternate", async () => {
    installLocalFontProbe(new Set(["Aptos"]));
    const load = vi.fn(async () => [{} as FontFace]);
    const readiness = createClassicEditorDocumentFontReadiness({
      ownerDocument: {
        fonts: { load, ready: Promise.resolve({} as FontFaceSet) }
      } as unknown as Document,
      document: createFontDocument("Calibri", ["Aptos"]),
      onReady: vi.fn()
    });

    await vi.waitFor(() => {
      expect(readiness.status).toEqual({
        requestedFamily: "Calibri",
        renderedFamily: "Aptos",
        status: "substituted",
        source: "document-alternate"
      });
    });
  });

  it("reports an installed requested family without changing it", async () => {
    installLocalFontProbe(new Set(["Calibri"]));
    const readiness = createClassicEditorDocumentFontReadiness({
      ownerDocument: {
        fonts: {
          load: vi.fn(async () => [{} as FontFace]),
          ready: Promise.resolve({} as FontFaceSet)
        }
      } as unknown as Document,
      document: createFontDocument("Calibri"),
      onReady: vi.fn()
    });

    await vi.waitFor(() => {
      expect(readiness.status.status).toBe("available");
    });
    expect(readiness.status.renderedFamily).toBe("Calibri");
    expect(readiness.status.source).toBe("requested");
  });

  it("does not let a stale local probe overwrite a newer document", async () => {
    let releaseCalibri: (() => void) | undefined;
    vi.stubGlobal("FontFace", class {
      private readonly source: string;

      /** @param _family - Probe alias. @param source - `local()` source. */
      constructor(_family: string, source: string) {
        this.source = source;
      }

      /** @returns A controlled Calibri probe or an immediately loaded Aptos face. */
      load(): Promise<FontFace> {
        if (this.source.includes("Calibri")) {
          return new Promise((resolve) => {
            releaseCalibri = () => resolve(this as unknown as FontFace);
          });
        }
        if (this.source.includes("Aptos")) {
          return Promise.resolve(this as unknown as FontFace);
        }
        return Promise.reject(new DOMException("Missing local font", "NetworkError"));
      }
    });
    const readiness = createClassicEditorDocumentFontReadiness({
      ownerDocument: {
        fonts: {
          load: vi.fn(async () => [{} as FontFace]),
          ready: Promise.resolve({} as FontFaceSet)
        }
      } as unknown as Document,
      document: createFontDocument("Calibri"),
      onReady: vi.fn()
    });

    readiness.update(createFontDocument("Aptos"));
    await vi.waitFor(() => {
      expect(readiness.status.renderedFamily).toBe("Aptos");
    });
    releaseCalibri?.();
    await Promise.resolve();
    await Promise.resolve();
    expect(readiness.status.renderedFamily).toBe("Aptos");
  });

  it("downloads only after an explicit library action and resolves the unchanged family", async () => {
    installBrowserFontEnvironment();
    const fetcher = vi.fn(async () => new Response(new Uint8Array([1, 2, 3, 4]), {
      status: 200,
      headers: { "cache-control": "public, max-age=3600" }
    }));
    const onReady = vi.fn();
    const readiness = createClassicEditorDocumentFontReadiness({
      ownerDocument: createOwnerDocument(),
      document: createFontDocument("Fixture Serif"),
      webFonts: {
        families: [{
          family: "Fixture Serif",
          sourceId: "fixture",
          sourceLabel: "Fixture CDN",
          license: { name: "Fixture license", url: "https://example.test/license" }
        }],
        catalogs: [createQuireStaticWebFontCatalog({
          id: "fixture",
          manifests: [externalManifest]
        })],
        cache: createQuireMemoryFontCache(),
        fetch: fetcher
      },
      onReady,
      onStatusChange: vi.fn()
    });

    await vi.waitFor(() => expect(readiness.status.status).toBe("unresolved"));
    expect(fetcher).not.toHaveBeenCalled();

    await readiness.fontLibrary.install("Fixture Serif");

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(readiness.status).toMatchObject({
      requestedFamily: "Fixture Serif",
      renderedFamily: "Fixture Serif",
      status: "available",
      source: "requested"
    });
    expect(readiness.fontLibrary.getStatus("Fixture Serif").phase).toBe("installed");
  });
});

const externalManifest: QuireWebFontFamilyManifest = {
  providerId: "fixture",
  family: "Fixture Serif",
  version: "1",
  license: { name: "Fixture license", url: "https://example.test/license" },
  faces: [{
    id: "regular",
    weight: "400",
    assets: [{
      id: "regular",
      sources: [{ url: "https://example.test/fixture-serif.woff2", format: "woff2" }]
    }]
  }]
};

/**
 * Creates minimal canonical document JSON for font-resolution tests.
 *
 * @param family - Logical body family.
 * @param alternates - Optional document font-table alternates.
 * @returns Canonical document-shaped value.
 */
function createFontDocument(family: string, alternates: readonly string[] = []) {
  return {
    type: "doc",
    attrs: {
      fontTheme: { body: { latin: family } },
      ...(alternates.length === 0
        ? {}
        : { fontTable: { fonts: [{ family, alternates }] } })
    }
  };
}

/**
 * Installs a deterministic `FontFace local()` test double.
 *
 * @param available - Installed family names accepted by the fake host.
 */
function installLocalFontProbe(available: ReadonlySet<string>): void {
  vi.stubGlobal("FontFace", class {
    private readonly source: string;

    /** @param _family - Probe alias. @param source - `local()` source. */
    constructor(_family: string, source: string) {
      this.source = source;
    }

    /** @returns Loaded fake face or a missing-local rejection. */
    async load(): Promise<FontFace> {
      const family = /local\("((?:\\.|[^"\\])*)"\)/u.exec(this.source)?.[1]
        ?.replaceAll('\\"', '"')
        .replaceAll("\\\\", "\\");
      if (family !== undefined && available.has(family)) {
        return this as unknown as FontFace;
      }
      throw new DOMException("Missing local font", "NetworkError");
    }
  });
}

/** Installs a FontFace test double that rejects local probes and accepts bytes. */
function installBrowserFontEnvironment(): void {
  vi.stubGlobal("FontFace", class {
    readonly status = "loaded";
    private readonly source: string | ArrayBuffer;

    /** @param _family - Registered family. @param source - Local source or bytes. */
    constructor(_family: string, source: string | ArrayBuffer) {
      this.source = source;
    }

    /** @returns Loaded byte face or rejected unavailable local face. */
    async load(): Promise<FontFace> {
      if (typeof this.source === "string") {
        throw new DOMException("Missing local font", "NetworkError");
      }
      return this as unknown as FontFace;
    }
  });
}

/** @returns Minimal document realm with a mutable FontFaceSet. */
function createOwnerDocument(): Document {
  return {
    fonts: {
      add: vi.fn(),
      delete: vi.fn(() => true),
      load: vi.fn(async () => [] as FontFace[]),
      ready: Promise.resolve({} as FontFaceSet)
    }
  } as unknown as Document;
}
