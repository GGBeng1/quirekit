import { describe, expect, it, vi } from "vitest";
import { createClassicGoogleFontsSource } from "./google-source";

describe("Classic Google Fonts source", () => {
  it("requires local source configuration before full catalog search", async () => {
    const source = createClassicGoogleFontsSource({ fetch: vi.fn() });

    await expect(source.search({ query: "noto", settings: {} }))
      .rejects.toThrow("API key is required");
  });

  it("searches the official directory once and filters many families locally", async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({
      items: [
        { family: "Noto Sans SC", category: "sans-serif", variants: ["regular", "700"], subsets: ["latin"] },
        { family: "Noto Serif SC", category: "serif", variants: ["regular"], subsets: ["chinese-simplified", "latin"] },
        { family: "Roboto", category: "sans-serif", variants: ["regular"], subsets: ["latin"] }
      ]
    }), { status: 200 }));
    const source = createClassicGoogleFontsSource({ fetch: fetcher });

    const first = await source.search({ query: "noto", settings: { apiKey: "browser-key" } });
    const second = await source.search({ query: "serif", settings: { apiKey: "browser-key" } });
    const chinese = await source.search({ query: "宋", settings: { apiKey: "browser-key" } });
    const complete = await source.search({ query: "", settings: { apiKey: "browser-key" } });
    const simplifiedChinese = await source.search({
      query: "",
      subsets: ["chinese-simplified"],
      settings: { apiKey: "browser-key" }
    });

    expect(first.map((item) => item.family)).toEqual(["Noto Sans SC", "Noto Serif SC"]);
    expect(second.map((item) => item.family)).toEqual(["Noto Serif SC"]);
    expect(chinese.map((item) => item.family)).toEqual(["Noto Serif SC"]);
    expect(complete.map((item) => item.family)).toEqual([
      "Noto Sans SC",
      "Noto Serif SC",
      "Roboto"
    ]);
    expect(simplifiedChinese.map((item) => item.family)).toEqual(["Noto Serif SC"]);
    expect(fetcher).toHaveBeenCalledTimes(1);
    const url = new URL(String(fetcher.mock.calls[0]?.[0]));
    expect(url.origin + url.pathname).toBe("https://www.googleapis.com/webfonts/v1/webfonts");
    expect(url.searchParams.get("key")).toBe("browser-key");
    expect(url.searchParams.get("sort")).toBe("popularity");
    expect(url.searchParams.getAll("capability")).toContain("WOFF2");
    expect(url.searchParams.has("text")).toBe(false);
  });

  it("does not truncate the browseable directory before product pagination", async () => {
    const items = Array.from({ length: 120 }, (_, index) => ({
      family: `Fixture Font ${index + 1}`,
      category: "display"
    }));
    const source = createClassicGoogleFontsSource({
      fetch: vi.fn(async () => new Response(JSON.stringify({ items }), { status: 200 }))
    });

    const result = await source.search({ query: "", settings: { apiKey: "browser-key" } });

    expect(result).toHaveLength(120);
  });
});
