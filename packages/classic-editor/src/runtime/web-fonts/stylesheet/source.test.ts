import { describe, expect, it, vi } from "vitest";
import { createClassicStylesheetFontSource, inspectClassicStylesheetFontSource } from "./index";
import { createClassicWebFontSourceRegistry } from "../../document-fonts/font-library/source-registry";
import { createClassicEditorLocalFontLibraryPersistence } from "../persistence";

const css = `@font-face { font-family: 'Company Serif'; font-weight: 400; src: url('./serif.woff2') format('woff2'); }
@font-face { font-family: 'Company Sans'; font-weight: 400; src: url('./sans-latin.woff2'); unicode-range: U+0-FF; }
@font-face { font-family: 'Company Sans'; font-weight: 400; src: url('./sans-cjk.woff2'); unicode-range: U+4E00-9FFF; }
@font-face { font-family: 'Company Sans'; font-weight: 700; src: url('./sans-bold.woff2'); }`;
const record = {
  url: "http://localhost:8080/fonts/fonts.css",
  name: "Company fonts",
  css,
  enabledAt: 10
};

describe("static CSS font sources", () => {
  it("reads only the explicitly requested CSS and preserves multiple families, relative URLs and shards", async () => {
    const fetcher = vi.fn(
      async () => new Response(css, { headers: { "content-type": "text/css" } })
    );
    const snapshot = await inspectClassicStylesheetFontSource(record.url, record.name, fetcher);
    const source = createClassicStylesheetFontSource(snapshot);
    const families = await source.search({ query: "sans", settings: {} });
    expect(families).toHaveLength(1);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith(
      new URL(record.url),
      expect.objectContaining({ credentials: "omit", mode: "cors", redirect: "error" })
    );
    const manifest = await source.resolveFamily({ family: families[0]!, settings: {} });
    expect(manifest.faces).toHaveLength(2);
    expect(manifest.faces[0]?.assets).toMatchObject([
      {
        unicodeRange: "U+0-FF",
        sources: [{ url: "http://localhost:8080/fonts/sans-latin.woff2" }]
      },
      {
        unicodeRange: "U+4E00-9FFF",
        sources: [{ url: "http://localhost:8080/fonts/sans-cjk.woff2" }]
      }
    ]);
    expect(await source.search({ query: "", subsets: ["cjk"], settings: {} })).toEqual([]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it.each([
    "file:///tmp/fonts.css",
    "javascript:alert(1)",
    "https://user:secret@example.com/fonts.css"
  ])("rejects unsafe URLs before network access: %s", async (url) => {
    const fetcher = vi.fn();
    await expect(inspectClassicStylesheetFontSource(url, "", fetcher)).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("rejects import indirection, executable asset URLs, incomplete shards and HTML responses", async () => {
    expect(() =>
      createClassicStylesheetFontSource({ ...record, css: `@import 'other.css'; ${css}` })
    ).toThrow(/@import/);
    expect(() =>
      createClassicStylesheetFontSource({
        ...record,
        css: css.replace("./serif.woff2", "javascript:alert")
      })
    ).toThrow(/HTTP/);
    expect(() =>
      createClassicStylesheetFontSource({
        ...record,
        css: css.replace("unicode-range: U+0-FF;", "")
      })
    ).toThrow(/unicode-range/);
    await expect(
      inspectClassicStylesheetFontSource(
        record.url,
        "",
        async () => new Response(css, { headers: { "content-type": "text/html" } })
      )
    ).rejects.toThrow(/web page/);
  });

  it("bounds streamed metadata even without a content-length header", async () => {
    await expect(
      inspectClassicStylesheetFontSource(
        record.url,
        "",
        async () => new Response(" ".repeat(1024 * 1024 + 1))
      )
    ).rejects.toThrow(/1 MiB/);
  });

  it("restores static snapshots without networking, updates same URL, and only removes the source", async () => {
    let saved = "";
    const persistence = createClassicEditorLocalFontLibraryPersistence({
      getItem: () => saved || null,
      setItem: (_key: string, value: string) => {
        saved = value;
      },
      length: 1,
      clear: () => {
        saved = "";
      },
      key: () => null,
      removeItem: () => {
        saved = "";
      }
    });
    persistence.save({ importedFamilies: [], sourceSettings: {}, stylesheetSources: [record] });
    const fetcher = vi.fn();
    const registry = createClassicWebFontSourceRegistry(
      { families: [], catalogs: [], fetch: fetcher },
      [],
      persistence.load().stylesheetSources
    );
    expect(registry.sources.size).toBe(1);
    registry.enableStylesheet({ ...record, name: "Updated" });
    expect(registry.sources.size).toBe(1);
    expect([...registry.sources.values()][0]?.label.en).toBe("Updated");
    expect(fetcher).not.toHaveBeenCalled();
    expect(registry.remove(`stylesheet:${record.url}`)).toBe(true);
    expect(registry.stylesheetSources.size).toBe(0);
  });
});
