import { describe, expect, it, vi } from "vitest";
import { createClassicChineseWebFontsSource } from "./source";

const directory = {
  lxgwwenkai: {
    name: "霞鹜文楷",
    remotePath: [
      {
        path: "packages/lxgwwenkai/dist/LXGWWenKai-Regular/result.css",
        css: { family: "LXGW WenKai", style: "normal", weight: "400", display: "swap" }
      },
      {
        path: "packages/lxgwwenkai/dist/LXGWWenKai-Bold/result.css",
        css: { family: "LXGW WenKai", style: "normal", weight: "700", display: "swap" }
      }
    ]
  },
  zqfs: {
    name: "朱雀仿宋",
    remotePath: [{
      path: "packages/zqfs/dist/ZhuqueFangsong-Regular/result.css",
      css: {
        family: "Zhuque Fangsong (technical preview)",
        style: "normal",
        weight: "400",
        display: "swap"
      }
    }]
  },
  hwmct: {
    name: "汇文明朝体",
    remotePath: [{
      path: "packages/hwmct/dist/汇文明朝体/result.css",
      css: {
        family: "Huiwen-mincho",
        style: "normal",
        weight: "400",
        display: "swap"
      }
    }]
  }
};

describe("Classic Chinese Web Fonts source", () => {
  it("browses and searches Chinese display names without source settings", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify(directory), { status: 200 }));
    const source = createClassicChineseWebFontsSource({ fetch: fetcher });

    const all = await source.search({ query: "", settings: {} });
    const fangsong = await source.search({ query: "仿宋", settings: {} });
    const latin = await source.search({ query: "", subsets: ["latin"], settings: {} });

    expect(all).toHaveLength(3);
    expect(fangsong).toEqual([expect.objectContaining({
      family: "Zhuque Fangsong (technical preview)",
      displayName: "朱雀仿宋",
      sourceId: "chinese-web-fonts"
    })]);
    expect(latin).toEqual([]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("resolves relative shards through versioned public npm packages", async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("index.json")) {
        return new Response(JSON.stringify(directory), { status: 200 });
      }
      if (url.includes("data.jsdelivr.com")) {
        return new Response(JSON.stringify({ version: "3.0.0" }), { status: 200 });
      }
      const weight = url.includes("Bold") ? "700" : "400";
      return new Response(`
        @font-face {
          font-family: "LXGW WenKai";
          src: url("./${weight}.woff2") format("woff2");
          font-style: normal;
          font-weight: ${weight};
          unicode-range: U+4E00-9FFF;
        }
      `, { status: 200 });
    });
    const source = createClassicChineseWebFontsSource({ fetch: fetcher });
    const [family] = await source.search({ query: "霞鹜", settings: {} });
    if (family === undefined) throw new Error("Fixture family was not found.");

    const manifest = await source.resolveFamily({ family, settings: {} });

    expect(manifest).toMatchObject({
      providerId: "chinese-web-fonts",
      family: "LXGW WenKai",
      version: "3.0.0"
    });
    expect(manifest.faces.map((face) => face.weight)).toEqual(["400", "700"]);
    expect(manifest.faces[0]?.assets[0]?.sources[0]?.url).toBe(
      "https://cdn.jsdelivr.net/npm/@chinese-fonts/lxgwwenkai@3.0.0/dist/LXGWWenKai-Regular/400.woff2"
    );
  });

  it("keeps usable family faces when the provider directory contains a stale shard", async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("index.json")) {
        return new Response(JSON.stringify(directory), { status: 200 });
      }
      if (url.includes("data.jsdelivr.com")) {
        return new Response(JSON.stringify({ version: "3.0.0" }), { status: 200 });
      }
      if (url.includes("LXGWWenKai-Regular")) {
        return new Response(`
          @font-face {
            font-family: "LXGW WenKai";
            src: url("./400.woff2") format("woff2");
            font-style: normal;
            font-weight: 400;
          }
        `, { status: 200 });
      }
      return new Response("", { status: 404 });
    });
    const source = createClassicChineseWebFontsSource({ fetch: fetcher });
    const [family] = await source.search({ query: "霞鹜", settings: {} });
    if (family === undefined) throw new Error("Fixture family was not found.");

    const manifest = await source.resolveFamily({ family, settings: {} });

    expect(manifest.faces.map((face) => face.weight)).toEqual(["400"]);
    expect(fetcher.mock.calls.map(([input]) => String(input))).toEqual(expect.arrayContaining([
      "https://cdn.jsdelivr.net/npm/@chinese-fonts/lxgwwenkai@3.0.0/dist/LXGWWenKai-Bold/result.css",
      "https://unpkg.com/@chinese-fonts/lxgwwenkai@3.0.0/dist/LXGWWenKai-Bold/result.css"
    ]));
  });

  it("uses unpkg for Unicode package paths that jsDelivr cannot serve", async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("index.json")) {
        return new Response(JSON.stringify(directory), { status: 200 });
      }
      if (url.includes("data.jsdelivr.com")) {
        return new Response(JSON.stringify({ version: "3.0.0" }), { status: 200 });
      }
      if (url.startsWith("https://unpkg.com/")) {
        return new Response(`
          @font-face {
            font-family: "Huiwen-mincho";
            src: url("./huiwen-mincho.woff2") format("woff2");
            font-style: normal;
            font-weight: 400;
            unicode-range: U+4E00-9FFF;
          }
        `, { status: 200 });
      }
      return new Response("", { status: 404 });
    });
    const source = createClassicChineseWebFontsSource({ fetch: fetcher });
    const [family] = await source.search({ query: "汇文", settings: {} });
    if (family === undefined) throw new Error("Fixture family was not found.");

    const manifest = await source.resolveFamily({ family, settings: {} });

    expect(manifest.faces[0]?.assets[0]?.sources[0]?.url).toBe(
      "https://unpkg.com/@chinese-fonts/hwmct@3.0.0/dist/%E6%B1%87%E6%96%87%E6%98%8E%E6%9C%9D%E4%BD%93/huiwen-mincho.woff2"
    );
    expect(fetcher.mock.calls.map(([input]) => String(input))).not.toContain(
      "https://cdn.jsdelivr.net/npm/@chinese-fonts/hwmct@3.0.0/dist/%E6%B1%87%E6%96%87%E6%98%8E%E6%9C%9D%E4%BD%93/result.css"
    );
  });

  it("falls back to unpkg when jsDelivr rejects an ASCII stylesheet path", async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("index.json")) {
        return new Response(JSON.stringify(directory), { status: 200 });
      }
      if (url.includes("data.jsdelivr.com")) {
        return new Response(JSON.stringify({ version: "3.0.0" }), { status: 200 });
      }
      if (url.startsWith("https://cdn.jsdelivr.net/")) {
        return new Response("", { status: 404 });
      }
      return new Response(`
        @font-face {
          font-family: "Zhuque Fangsong (technical preview)";
          src: url("./zhuque.woff2") format("woff2");
          font-style: normal;
          font-weight: 400;
        }
      `, { status: 200 });
    });
    const source = createClassicChineseWebFontsSource({ fetch: fetcher });
    const [family] = await source.search({ query: "朱雀", settings: {} });
    if (family === undefined) throw new Error("Fixture family was not found.");

    const manifest = await source.resolveFamily({ family, settings: {} });

    expect(manifest.faces[0]?.assets[0]?.sources[0]?.url).toBe(
      "https://unpkg.com/@chinese-fonts/zqfs@3.0.0/dist/ZhuqueFangsong-Regular/zhuque.woff2"
    );
  });
});
