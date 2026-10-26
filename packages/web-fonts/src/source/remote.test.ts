import { describe, expect, it, vi } from "vitest";
import { createQuireRemoteFontSourceClient } from "./remote";

describe("remote font source client", () => {
  it("omits credentials, applies local header auth, and resolves exact manifests", async () => {
    const fetcher = vi.fn(async (input: URL | RequestInfo, init?: RequestInit) => {
      const url = new URL(String(input));
      if (url.pathname === "/source.json") return jsonResponse({
        specVersion: "quirekit-font-source/v1",
        id: "org.example.fonts",
        name: { default: "Example Fonts" },
        catalogUrl: "/catalog",
        resolveUrl: "/resolve",
        capabilities: ["browse", "search", "resolve"],
        authentication: {
          type: "header",
          settingKey: "token",
          headerName: "Authorization",
          prefix: "Bearer ",
          label: { default: "Token" }
        }
      });
      expect(init).toMatchObject({ credentials: "omit", redirect: "error" });
      expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer local-secret");
      if (url.pathname === "/catalog") {
        expect(url.searchParams.getAll("subset")).toEqual([
          "chinese-simplified",
          "latin"
        ]);
        return jsonResponse({
          items: [{
            familyId: "serif",
            family: "Example Serif",
            version: "1.0.0",
            license: { name: "OFL", url: "https://example.test/license" }
          }],
          total: 1
        });
      }
      return jsonResponse({
        providerId: "org.example.fonts",
        familyId: "serif",
        family: "Example Serif",
        version: "1.0.0",
        license: { name: "OFL", url: "https://example.test/license" },
        faces: [{
          id: "regular",
          assets: [{
            id: "regular",
            sizeBytes: 3,
            integrity: "sha256-AQID",
            sources: [{ url: "https://example.test/serif.woff2", format: "woff2" }]
          }]
        }]
      });
    });
    const client = createQuireRemoteFontSourceClient({ fetch: fetcher });
    const source = await client.loadDescriptor("https://fonts.example.test/source.json");
    const page = await client.browse(source, {
      query: "serif",
      limit: 20,
      subsets: ["chinese_simplified", "latin", "latin"],
      settings: { token: "local-secret" }
    });
    const manifest = await client.resolveFamily(source, {
      familyId: page.items[0]!.familyId,
      version: page.items[0]!.version,
      settings: { token: "local-secret" }
    });
    expect(page.total).toBe(1);
    expect(manifest.familyId).toBe("serif");
  });

  it("rejects non-JSON and oversized source responses", async () => {
    const nonJson = createQuireRemoteFontSourceClient({
      fetch: async () => new Response("<script />", {
        headers: { "content-type": "text/html" }
      })
    });
    await expect(nonJson.loadDescriptor("https://example.test/source.json"))
      .rejects.toThrow(/application\/json/u);

    const oversized = createQuireRemoteFontSourceClient({
      maxDescriptorBytes: 2,
      fetch: async () => jsonResponse({ value: "too large" })
    });
    await expect(oversized.loadDescriptor("https://example.test/source.json"))
      .rejects.toThrow(/exceeds 2 bytes/u);
  });
});

/** @returns One deterministic JSON response. */
function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    headers: { "content-type": "application/json" }
  });
}
