import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import type { CanvasGlyphPathOutline } from "@quirekit/renderer";
import { createFontKitGlyphPathFontLoader } from "../fontkit-outline";
import { createHarfBuzzTextShaperBackend } from "../harfbuzz";
import {
  createQuireFontFetchSourceDataLoader,
  createQuireFontService
} from "./index";
import type {
  QuireLoadedShaperFont,
  QuireShapeRunOptions,
  QuireShaperFontSource,
  QuireTextShaperBackend
} from "../types";
import type { QuireShapedTextRun } from "../../text/types";

const require = createRequire(import.meta.url);

describe("canvas font service", () => {
  it("loads font sources and exposes a fallback-aware text measurer", async () => {
    const destroyed: string[] = [];
    const service = await createQuireFontService({
      backend: createFakeFontBackend(destroyed),
      sources: [
        createFontSource("inter", "Inter"),
        createFontSource("noto-hans", "Noto Sans Hans")
      ],
      fallbackFamilies: ["Noto Sans Hans"]
    });

    expect(service.resolver.resolveTextRuns("Hello 世界", "16px Inter").map((run) => ({
      text: run.text,
      font: run.font.id
    }))).toEqual([
      { text: "Hello ", font: "inter" },
      { text: "世界", font: "noto-hans" }
    ]);
    expect(service.textMeasurer.measureText("A你", "16px Inter")).toMatchObject({ width: 30 });

    await service.destroy();

    expect(destroyed).toEqual(["inter", "noto-hans", "backend"]);
  });

  it("exposes loaded font outlines through a renderer glyph path source", async () => {
    const destroyed: string[] = [];
    const service = await createQuireFontService({
      backend: createFakeFontBackend(destroyed),
      sources: [
        createFontSource("inter", "Inter")
      ]
    });

    expect(service.glyphPathSource.getGlyphPath({
      glyphId: 65,
      fontId: "inter",
      fontFamily: "Inter"
    })).toEqual(createFakeGlyphPathOutline(65));
    expect(service.glyphPathSource.getGlyphPath({
      glyphId: 65,
      fontId: "missing",
      fontFamily: "Inter"
    })).toBeNull();
    expect(service.glyphPathSource.getGlyphPath({
      glyphId: 65,
      fontId: "inter",
      fontFamily: "Wrong Family"
    })).toBeNull();
    expect(service.glyphPathSource.getGlyphPath({
      glyphId: 65
    })).toBeNull();
    expect(service.glyphPathSource.resolveGlyphPath?.({
      glyphId: 65,
      fontId: "missing",
      fontFamily: "Inter"
    })).toEqual({
      request: {
        glyphId: 65,
        fontId: "missing",
        fontFamily: "Inter"
      },
      reason: "glyph-path-font-not-loaded",
      status: "fallback"
    });
    expect(service.glyphPathSource.resolveGlyphPath?.({
      glyphId: 65,
      fontId: "inter",
      fontFamily: "Wrong Family"
    })).toEqual({
      loadedFamily: "Inter",
      request: {
        glyphId: 65,
        fontId: "inter",
        fontFamily: "Wrong Family"
      },
      reason: "glyph-path-font-family-mismatch",
      requestedFamily: "Wrong Family",
      status: "fallback"
    });

    await service.destroy();
  });

  it("resolves real DejaVu outlines for CSS-quoted family requests", async () => {
    const service = await createQuireFontService({
      backend: createHarfBuzzTextShaperBackend({
        glyphPathFontLoader: createFontKitGlyphPathFontLoader()
      }),
      sources: [loadDejaVuSansSource()]
    });
    const font = "16px \"DejaVu Sans\"";
    const shaped = service.textMeasurer.shapeRun?.("A", font);
    const glyph = shaped?.glyphs?.[0];

    expect(glyph).toEqual(expect.objectContaining({
      fontId: "dejavu-sans",
      glyphId: expect.any(Number)
    }));
    expect(service.glyphPathSource.getGlyphPath({
      glyphId: glyph!.glyphId,
      font,
      ...(glyph!.fontId === undefined ? {} : { fontId: glyph!.fontId }),
      fontFamily: "\"DejaVu Sans\""
    })?.segments.length).toBeGreaterThan(0);

    await service.destroy();
  });

  it("explains missing outlines from loaded glyph path fonts", async () => {
    const destroyed: string[] = [];
    const service = await createQuireFontService({
      backend: createFakeFontBackend(
        destroyed,
        undefined,
        undefined,
        undefined,
        66
      ),
      sources: [
        createFontSource("inter", "Inter")
      ]
    });
    const request = {
      glyphId: 66,
      fontId: "inter",
      fontFamily: "Inter"
    };

    expect(service.glyphPathSource.getGlyphPath(request)).toBeNull();
    expect(service.glyphPathSource.resolveGlyphPath?.(request)).toEqual({
      request,
      reason: "glyph-path-outline-missing",
      status: "fallback"
    });

    await service.destroy();
  });

  it("caches glyph path source requests by font token", async () => {
    const destroyed: string[] = [];
    const glyphPathCalls: number[] = [];
    const service = await createQuireFontService({
      backend: createFakeFontBackend(
        destroyed,
        undefined,
        undefined,
        glyphPathCalls
      ),
      sources: [
        createFontSource("inter", "Inter")
      ]
    });
    const request = {
      glyphId: 65,
      font: "20px Inter",
      fontId: "inter",
      fontFamily: "Inter"
    };

    expect(service.glyphPathSource.getGlyphPath(request)).toEqual(
      createFakeGlyphPathOutline(65)
    );
    expect(service.glyphPathSource.getGlyphPath(request)).toEqual(
      createFakeGlyphPathOutline(65)
    );
    expect(glyphPathCalls).toEqual([65]);

    expect(service.glyphPathSource.getGlyphPath({
      ...request,
      font: "24px Inter"
    })).toEqual(createFakeGlyphPathOutline(65));
    expect(glyphPathCalls).toEqual([65, 65]);

    await service.destroy();
  });

  it("resolves host-provided async font data before loading sources", async () => {
    const destroyed: string[] = [];
    const loadedSources: Array<{ readonly id: string; readonly bytes: readonly number[] }> = [];
    const service = await createQuireFontService({
      backend: createFakeFontBackend(destroyed, undefined, loadedSources),
      sources: [
        {
          id: "inline",
          family: "Inline Sans",
          data: async () => new Uint8Array([1, 2, 3])
        },
        {
          id: "remote",
          family: "Remote Sans"
        }
      ],
      loadSourceData: async (source) => {
        expect(source.id).toBe("remote");

        return new Uint8Array([4, 5]);
      }
    });

    expect(loadedSources).toEqual([
      { id: "inline", bytes: [1, 2, 3] },
      { id: "remote", bytes: [4, 5] }
    ]);

    await service.destroy();
  });

  it("cleans up loaded fonts when host data loading fails", async () => {
    const destroyed: string[] = [];

    await expect(createQuireFontService({
      backend: createFakeFontBackend(destroyed),
      sources: [
        {
          id: "inter",
          family: "Inter",
          data: new Uint8Array([1])
        },
        {
          id: "missing",
          family: "Missing Sans"
        }
      ],
      loadSourceData(source) {
        throw new Error(`Cannot read ${source.id}`);
      }
    })).rejects.toThrow("Cannot read missing");

    expect(destroyed).toEqual(["inter", "backend"]);
  });

  it("creates a fetch-backed font data loader for URL sources", async () => {
    const requested: Array<string | URL> = [];
    const loader = createQuireFontFetchSourceDataLoader({
      fetch: async (url) => {
        requested.push(url);

        return new Response(new Uint8Array([9, 8, 7]));
      }
    });
    const data = await loader({
      id: "remote-font",
      family: "Remote Sans",
      url: "/fonts/remote.otf"
    });

    expect(requested).toEqual(["/fonts/remote.otf"]);
    expect(await toByteArray(data)).toEqual([9, 8, 7]);
  });

  it("requires a URL or resolver for fetch-backed font data", async () => {
    const loader = createQuireFontFetchSourceDataLoader({
      fetch: async () => new Response(new ArrayBuffer(0))
    });

    await expect(loader({
      id: "missing-url",
      family: "Missing Sans"
    })).rejects.toThrow("missing a URL");
  });

  it("cleans up already loaded resources when later font loading fails", async () => {
    const destroyed: string[] = [];
    const backend = createFakeFontBackend(destroyed, "broken");

    await expect(createQuireFontService({
      backend,
      sources: [
        createFontSource("inter", "Inter"),
        createFontSource("broken", "Broken")
      ]
    })).rejects.toThrow("Cannot load broken");

    expect(destroyed).toEqual(["inter", "backend"]);
  });
});

/**
 * Creates source metadata for a fake font.
 *
 * @param id - Font source id.
 * @param family - CSS font family represented by the source.
 * @returns Font source metadata.
 */
function createFontSource(id: string, family: string): QuireShaperFontSource {
  return {
    id,
    family,
    data: new ArrayBuffer(0)
  };
}

/**
 * Loads the DejaVu Sans fixture source metadata.
 *
 * @returns Font source containing fixture bytes and CSS metadata.
 */
function loadDejaVuSansSource(): QuireShaperFontSource {
  const bytes = readFileSync(require.resolve("dejavu-fonts-ttf/ttf/DejaVuSans.ttf"));

  return {
    id: "dejavu-sans",
    family: "DejaVu Sans",
    data: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    style: "normal",
    weight: 400
  };
}

/**
 * Resolves service source data into byte values for assertions.
 *
 * @param data - Source data returned by a service loader.
 * @returns Byte values from the resolved source data.
 */
async function toByteArray(
  data: Awaited<ReturnType<ReturnType<typeof createQuireFontFetchSourceDataLoader>>>
): Promise<number[]> {
  const resolved = typeof data === "function" ? await data() : await data;

  if (resolved instanceof ArrayBuffer) {
    return Array.from(new Uint8Array(resolved));
  }

  return Array.from(
    new Uint8Array(resolved.buffer, resolved.byteOffset, resolved.byteLength)
  );
}

/**
 * Creates a fake shaper backend for service tests.
 *
 * @param destroyed - Destroy call sink.
 * @param failingSourceId - Optional source id that fails loading.
 * @param loadedSources - Optional sink for loaded source bytes.
 * @param glyphPathCalls - Optional sink for glyph path requests.
 * @param missingOutlineGlyphId - Optional glyph id whose outline should be missing.
 * @returns Text shaper backend that returns deterministic fonts.
 */
function createFakeFontBackend(
  destroyed: string[],
  failingSourceId?: string,
  loadedSources?: Array<{ readonly id: string; readonly bytes: readonly number[] }>,
  glyphPathCalls?: number[],
  missingOutlineGlyphId?: number
): QuireTextShaperBackend {
  return {
    name: "fake",
    /**
     * Loads one fake font or throws for the configured failing id.
     *
     * @param source - Font source to load.
     * @returns Loaded fake font.
     */
    async loadFont(source) {
      if (source.id === failingSourceId) {
        throw new Error(`Cannot load ${source.id}`);
      }

      loadedSources?.push({
        id: source.id,
        bytes: Array.from(new Uint8Array(source.data))
      });

      return createFakeLoadedFont(source, destroyed, glyphPathCalls, missingOutlineGlyphId);
    },
    /**
     * Records fake backend cleanup.
     */
    destroy() {
      destroyed.push("backend");
    }
  };
}

/**
 * Creates a fake loaded font with Latin or CJK coverage.
 *
 * @param source - Font source represented by the loaded font.
 * @param destroyed - Destroy call sink.
 * @param glyphPathCalls - Optional sink for glyph path requests.
 * @param missingOutlineGlyphId - Optional glyph id whose outline should be missing.
 * @returns Loaded shaper font.
 */
function createFakeLoadedFont(
  source: QuireShaperFontSource,
  destroyed: string[],
  glyphPathCalls?: number[],
  missingOutlineGlyphId?: number
): QuireLoadedShaperFont {
  const coverage =
    source.family === "Noto Sans Hans" ? /[\u4E00-\u9FFF]/u : /[A-Za-z ]/u;
  const advance = source.family === "Noto Sans Hans" ? 20 : 10;

  return {
    id: source.id,
    source,
    /**
     * Checks whether the fake font can shape the provided text.
     *
     * @param text - Text content to inspect.
     * @returns Whether every character is covered by the fake font.
     */
    canShapeText(text) {
      return Array.from(text).every((character) => coverage.test(character));
    },
    /**
     * Shapes text with deterministic fake advances.
     *
     * @param options - Shape run options.
     * @returns Shaped fake text run.
     */
    shapeRun(options) {
      return shapeFakeText(options, advance);
    },
    /**
     * Resolves a deterministic fake glyph outline.
     *
     * @param glyphId - Glyph id to resolve.
     * @returns Fake glyph path outline.
     */
    getGlyphPath(glyphId) {
      glyphPathCalls?.push(glyphId);

      return glyphId === missingOutlineGlyphId ? null : createFakeGlyphPathOutline(glyphId);
    },
    /**
     * Records fake loaded-font cleanup.
     */
    destroy() {
      destroyed.push(source.id);
    }
  };
}

/**
 * Creates a deterministic fake glyph path outline.
 *
 * @param glyphId - Glyph id represented by the path.
 * @returns Fake glyph path outline.
 */
function createFakeGlyphPathOutline(glyphId: number): CanvasGlyphPathOutline {
  return {
    segments: [
      { kind: "move-to", point: { x: glyphId, y: 0 } },
      { kind: "line-to", point: { x: glyphId + 1, y: 1 } },
      { kind: "close-path" }
    ]
  };
}

/**
 * Shapes text with a fixed glyph advance.
 *
 * @param options - Shape run options.
 * @param advance - Width assigned to every grapheme.
 * @returns Shaped text run.
 */
function shapeFakeText(
  options: QuireShapeRunOptions,
  advance: number
): QuireShapedTextRun {
  const characters = Array.from(options.text);
  let x = 0;

  return {
    clusters: characters.map((character, index) => {
      const cluster = {
        from: index,
        to: index + character.length,
        x,
        advance,
        rtl: false
      };
      x += advance;

      return cluster;
    }),
    width: x,
    ascent: 12,
    descent: 4
  };
}
