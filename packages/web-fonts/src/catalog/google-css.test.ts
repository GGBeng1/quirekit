import { describe, expect, it, vi } from "vitest";
import { createGoogleFontsCssCatalog } from "./google-css";

const googleCss = `
/* latin */
@font-face {
  font-family: 'Noto Sans SC';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url(https://fonts.gstatic.test/noto/v39/latin.woff2) format('woff2');
  unicode-range: U+0000-00FF;
}
/* cjk */
@font-face {
  font-family: 'Noto Sans SC';
  font-style: normal;
  font-weight: 400;
  src: url(https://fonts.gstatic.test/noto/v39/cjk.woff2) format('woff2');
  unicode-range: U+4E00-9FFF;
}
`;

describe("Google Fonts CSS catalog", () => {
  it("resolves only configured families and preserves Unicode shards", async () => {
    const fetcher = vi.fn(async (_input: string | URL) =>
      new Response(googleCss, { status: 200 })
    );
    const catalog = createGoogleFontsCssCatalog({
      families: [{ family: "Noto Sans SC", weights: [400] }],
      fetch: fetcher
    });

    await expect(catalog.resolveFamily("Unconfigured Font")).resolves.toBeNull();
    const manifest = await catalog.resolveFamily("Noto Sans SC");

    expect(manifest).toMatchObject({
      providerId: "google-fonts",
      family: "Noto Sans SC",
      version: "v39"
    });
    expect(manifest?.faces).toHaveLength(1);
    expect(manifest?.faces[0]?.assets.map((asset) => asset.unicodeRange)).toEqual([
      "U+0000-00FF",
      "U+4E00-9FFF"
    ]);
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url] = fetcher.mock.calls[0] ?? [];
    const requestUrl = new URL(String(url));
    expect(requestUrl.origin).toBe("https://fonts.googleapis.com");
    expect(requestUrl.searchParams.has("text")).toBe(false);
  });

  it("does not contact Google until an allowed family is explicitly resolved", () => {
    const fetcher = vi.fn();
    createGoogleFontsCssCatalog({
      families: [{ family: "Noto Serif SC" }],
      fetch: fetcher
    });

    expect(fetcher).not.toHaveBeenCalled();
  });
});
