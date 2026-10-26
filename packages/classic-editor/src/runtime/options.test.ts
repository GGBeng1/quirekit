import { createTheme, defaultTheme } from "@quirekit/ui";
import { describe, expect, it } from "vitest";
import type { ClassicEditorUpdateOptions } from "../types";
import { createDefaultClassicEditorHostServices } from "./host-resource/services";
import {
  mergeClassicEditorUpdate,
  resolveClassicEditorOptions
} from "./options";

describe("Classic Editor runtime options", () => {
  it("defaults the create-time surface to user and preserves an explicit mode", () => {
    expect(resolveClassicEditorOptions({}).surfaceMode).toBe("user");
    expect(resolveClassicEditorOptions({ surfaceMode: "developer" }).surfaceMode)
      .toBe("developer");
  });

  it("rejects an invalid create-time surface instead of retaining it", () => {
    expect(() => resolveClassicEditorOptions({
      surfaceMode: "diagnostic" as "developer"
    })).toThrow(/Unknown Classic Editor surface mode/u);
  });

  it("does not admit a surface-mode runtime update", () => {
    const current = { surfaceMode: "developer" as const };
    const merged = mergeClassicEditorUpdate(
      current,
      { locale: "en" },
      { type: "doc", content: [{ type: "paragraph" }] }
    );

    expect(merged.surfaceMode).toBe("developer");
    expect(resolveClassicEditorOptions(merged).surfaceMode).toBe("developer");
  });

  it("retains create-time Host services and excludes them from updates", () => {
    const host = createDefaultClassicEditorHostServices();
    const replacement = createDefaultClassicEditorHostServices();
    const resolved = resolveClassicEditorOptions({ host });
    const current = { host };
    const runtimeOnlyInput = {
      locale: "en",
      host: replacement
    } as ClassicEditorUpdateOptions;

    const merged = mergeClassicEditorUpdate(
      current,
      runtimeOnlyInput,
      { type: "doc", content: [{ type: "paragraph" }] }
    );

    expect(resolved.host).toBe(host);
    expect(merged.host).toBe(host);
  });

  it("keeps Host services out of the public update type", () => {
    const host = createDefaultClassicEditorHostServices();
    const update: ClassicEditorUpdateOptions = {
      // @ts-expect-error Host adapters are create-time-only.
      host
    };

    expect(update).toHaveProperty("host", host);
  });

  it("keeps compact marker collision as the default", () => {
    const options = resolveClassicEditorOptions({});

    expect(options.canvasRuntime.listMarkerCollision).toBeUndefined();
    expect(options.svgRuntime.listMarkerCollision).toBeUndefined();
  });

  it("forwards one view policy to Canvas and SVG runtimes", () => {
    const options = resolveClassicEditorOptions({
      view: { listMarkerCollision: "word-compatible" }
    });

    expect(options.canvasRuntime.listMarkerCollision).toBe("word-compatible");
    expect(options.svgRuntime.listMarkerCollision).toBe("word-compatible");
  });

  it("uses the shared default and replaces complete instance themes", () => {
    expect(resolveClassicEditorOptions({}).theme).toBe(defaultTheme);
    const theme = createTheme({ scheme: "dark", sources: { primary: "#7257d5" } });
    expect(resolveClassicEditorOptions({ theme }).theme).toBe(theme);
    const next = createTheme({ sources: { primary: "#246b55" } });
    const merged = mergeClassicEditorUpdate({ theme }, { theme: next }, { type: "doc" });
    expect(merged.theme).toBe(next);
  });

  it("configures dormant recommendations and keyless fallback sources by default", () => {
    const options = resolveClassicEditorOptions({});

    expect(options.webFonts).not.toBe(false);
    if (options.webFonts === false) throw new Error("Default web fonts are disabled");
    expect(options.webFonts.families.map((entry) => entry.family)).toEqual([
      "Noto Sans SC",
      "Noto Serif SC",
      "LXGW WenKai",
      "Source Han Serif CN VF",
      "Source Sans 3",
      "Source Serif 4",
      "JetBrains Mono",
      "Carlito",
      "Arimo",
      "Tinos"
    ]);
    expect(options.webFonts.sources?.map((source) => source.id)).toEqual([
      "fontsource",
      "chinese-web-fonts",
      "google-fonts"
    ]);
  });

  it("allows a host to disable external font acquisition", () => {
    expect(resolveClassicEditorOptions({ webFonts: false }).webFonts).toBe(false);
  });
});
