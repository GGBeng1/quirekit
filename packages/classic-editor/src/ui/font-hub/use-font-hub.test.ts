import {
  computed,
  effectScope,
  nextTick
} from "vue";
import { describe, expect, it, vi } from "vitest";
import type {
  ClassicEditorFontLibrary,
  ClassicEditorWebFontFamily,
  ClassicEditorWebFontSource
} from "@classic/types";
import { useClassicFontHub } from "./use-font-hub";

const fixtureFamily: ClassicEditorWebFontFamily = {
  family: "Fixture Serif",
  sourceId: "source-b",
  sourceLabel: "Source B",
  license: { name: "Fixture license", url: "https://example.test/license" }
};

describe("public Classic font Hub state", () => {
  it("retains confirmation after a failed removal and allows retry", async () => {
    const removeFamily = vi.fn()
      .mockRejectedValueOnce(new Error("Cache unavailable"))
      .mockResolvedValueOnce(undefined);
    const library = createLibrary([], vi.fn(async () => []), vi.fn(), { removeFamily });
    const scope = effectScope();
    const hub = scope.run(() => useClassicFontHub(
      computed(() => true), computed(() => library), (key) => key, (source) => source.label.en
    ))!;
    expect(await hub.removeFont(fixtureFamily)).toBe(false);
    expect(hub.feedback.value).toBe("Cache unavailable");
    expect(hub.isPending(fixtureFamily)).toBe(false);
    expect(await hub.removeFont(fixtureFamily)).toBe(true);
    expect(removeFamily).toHaveBeenCalledTimes(2);
    expect(hub.feedback.value).toBe("");
    scope.stop();
  });

  it("switches arbitrary configured sources without provider-specific state", async () => {
    const sources = [createSource("source-a", "Source A"), createSource("source-b", "Source B")];
    const search = vi.fn(async (sourceId: string) => (
      sourceId === "source-b" ? [fixtureFamily] : []
    ));
    const configureSource = vi.fn();
    const library = createLibrary(sources, search, configureSource, {
      getSourceSettings: () => ({ token: "existing-token" })
    });
    const scope = effectScope();
    const hub = scope.run(() => useClassicFontHub(
      computed(() => true),
      computed(() => library),
      (key) => key,
      (source) => source.label.en
    ));
    if (hub === undefined) throw new Error("Font Hub state was not created.");

    await nextTick();
    expect(hub.sourceOptions.value).toEqual([
      { label: "Source A", value: "source-a" },
      { label: "Source B", value: "source-b" }
    ]);
    expect(hub.selectedSourceId.value).toBe("source-a");

    hub.selectedSourceId.value = "source-b";
    await nextTick();
    hub.query.value = "serif";
    await hub.searchFonts();
    expect(search).toHaveBeenCalledWith("source-b", "serif");
    expect(hub.displayedResults.value).toEqual([fixtureFamily]);

    hub.sourceSettings.open("source-b");
    await nextTick();
    hub.sourceSettings.update("token", "local-token");
    hub.sourceSettings.save();
    expect(configureSource).toHaveBeenCalledWith("source-b", { token: "local-token" });
    scope.stop();
  });

  it("loads the complete default catalog after a required source is configured", async () => {
    const source = createSource("source-b", "Source B");
    const search = vi.fn(async () => [fixtureFamily]);
    const library = createLibrary([source], search, vi.fn(), {
      getSourceSettings: () => ({ token: "local-token" })
    });
    const scope = effectScope();
    const hub = scope.run(() => useClassicFontHub(
      computed(() => true),
      computed(() => library),
      (key) => key,
      (entry) => entry.label.en
    ));
    if (hub === undefined) throw new Error("Font Hub state was not created.");

    await vi.waitFor(() => expect(search).toHaveBeenCalledWith("source-b", ""));
    expect(hub.displayedResults.value).toEqual([fixtureFamily]);
    scope.stop();
  });

  it("uses provider cursors and replaces rows when changing pages", async () => {
    const secondPageFamily = { ...fixtureFamily, familyId: "page-2", family: "Page Two" };
    const browse = vi.fn(async (
      _sourceId: string,
      _query: string,
      _limit: number,
      cursor?: string
    ) => cursor === undefined
      ? { items: [fixtureFamily], total: 48, nextCursor: "next-page" }
      : { items: [secondPageFamily], total: 48 });
    const library = createLibrary(
      [createSource("source-b", "Source B")],
      vi.fn(async () => []),
      vi.fn(),
      { getSourceSettings: () => ({ token: "local-token" }), browse }
    );
    const scope = effectScope();
    const hub = scope.run(() => useClassicFontHub(
      computed(() => true),
      computed(() => library),
      (key) => key,
      (source) => source.label.en
    ));
    if (hub === undefined) throw new Error("Font Hub state was not created.");

    await vi.waitFor(() => expect(browse).toHaveBeenCalledTimes(1));
    await hub.changePage(2);

    expect(browse).toHaveBeenLastCalledWith("source-b", "", 24, "next-page");
    expect(hub.displayedResults.value).toEqual([secondPageFamily]);
    expect(hub.page.value).toBe(2);
    scope.stop();
  });

  it("applies language metadata before provider pagination", async () => {
    const browse = vi.fn(async () => ({ items: [fixtureFamily], total: 1 }));
    const library = createLibrary(
      [createSource("source-b", "Source B")],
      vi.fn(async () => []),
      vi.fn(),
      { getSourceSettings: () => ({ token: "local-token" }), browse }
    );
    const scope = effectScope();
    const hub = scope.run(() => useClassicFontHub(
      computed(() => true),
      computed(() => library),
      (key) => key,
      (source) => source.label.en
    ));
    if (hub === undefined) throw new Error("Font Hub state was not created.");

    await vi.waitFor(() => expect(browse).toHaveBeenCalledTimes(1));
    browse.mockClear();
    await hub.changeScriptFilter("simplified-chinese");

    expect(hub.scriptFilter.value).toBe("simplified-chinese");
    expect(browse).toHaveBeenCalledWith(
      "source-b",
      "",
      24,
      undefined,
      ["chinese-simplified", "simplified-chinese", "sc"]
    );
    expect(hub.page.value).toBe(1);
    scope.stop();
  });

  it("keeps independent pending state for concurrent family imports", async () => {
    const secondFamily: ClassicEditorWebFontFamily = {
      ...fixtureFamily,
      family: "Fixture Sans"
    };
    const resolvers: Array<() => void> = [];
    const importFamily = vi.fn(async () => new Promise<void>((resolve) => {
      resolvers.push(resolve);
    }));
    const library = createLibrary(
      [createSource("source-b", "Source B")],
      vi.fn(async () => []),
      vi.fn(),
      { importFamily }
    );
    const scope = effectScope();
    const hub = scope.run(() => useClassicFontHub(
      computed(() => true),
      computed(() => library),
      (key) => key,
      (source) => source.label.en
    ));
    if (hub === undefined) throw new Error("Font Hub state was not created.");

    const firstImport = hub.importFont(fixtureFamily);
    const secondImport = hub.importFont(secondFamily);
    await nextTick();
    expect(hub.pendingFamilies.value).toEqual(new Set([
      "source-b\u0000fixture serif",
      "source-b\u0000fixture sans"
    ]));
    expect(importFamily).toHaveBeenCalledTimes(2);

    for (const resolve of resolvers) resolve();
    await Promise.all([firstImport, secondImport]);
    expect(hub.pendingFamilies.value.size).toBe(0);
    scope.stop();
  });

  it("adds only unavailable suggested fonts and treats mounted pack families as ready", async () => {
    const mounted = { ...fixtureFamily, family: "Mounted Serif" };
    const alreadyAdded = { ...fixtureFamily, family: "Added Serif", familyId: "added" };
    const pending = { ...fixtureFamily, family: "Remote Serif", familyId: "remote" };
    const importFamily = vi.fn(async () => {});
    const library = createLibrary([], vi.fn(async () => []), vi.fn(), {
      families: [mounted, alreadyAdded, pending],
      mountedFamilies: [{ family: "Mounted Serif" }],
      importedFamilies: [{ ...alreadyAdded, importedAt: 1 }],
      importFamily
    });
    const scope = effectScope();
    const hub = scope.run(() => useClassicFontHub(
      computed(() => true), computed(() => library), (key) => key, (source) => source.label.en
    ))!;

    expect(hub.isMounted(mounted)).toBe(true);
    expect(hub.isPreviewReady(mounted)).toBe(true);
    expect(hub.addableRecommendedFamilies.value).toEqual([pending]);
    await hub.importRecommendedFonts();
    expect(importFamily).toHaveBeenCalledExactlyOnceWith(pending, true);
    expect(hub.feedback.value).toBe("recommendedFontsAdded");
    scope.stop();
  });

  it("loads a real preview without importing the family", async () => {
    let previewReady = false;
    const previewFamily = vi.fn(async () => {
      previewReady = true;
    });
    const importFamily = vi.fn(async () => {});
    const library = createLibrary(
      [createSource("source-b", "Source B")],
      vi.fn(async () => [fixtureFamily]),
      vi.fn(),
      {
        previewFamily,
        importFamily,
        getStatus: (family) => ({
          family,
          phase: previewReady ? "installed" : "idle"
        })
      }
    );
    const scope = effectScope();
    const hub = scope.run(() => useClassicFontHub(
      computed(() => true),
      computed(() => library),
      (key) => key,
      (source) => source.label.en
    ));
    if (hub === undefined) throw new Error("Font Hub state was not created.");

    await hub.previewFont(fixtureFamily);

    expect(previewFamily).toHaveBeenCalledWith(fixtureFamily);
    expect(importFamily).not.toHaveBeenCalled();
    expect(hub.isPreviewReady(fixtureFamily)).toBe(true);
    expect(hub.feedback.value).toBe("");
    scope.stop();
  });

  it("shows the provider cause when a preview cannot be resolved", async () => {
    const previewFamily = vi.fn(async () => {
      throw new Error("Failed to resolve web font family \"Fixture Serif\".", {
        cause: new Error("Source stylesheet mirrors returned HTTP 404.")
      });
    });
    const library = createLibrary(
      [createSource("source-b", "Source B")],
      vi.fn(async () => [fixtureFamily]),
      vi.fn(),
      { previewFamily }
    );
    const scope = effectScope();
    const hub = scope.run(() => useClassicFontHub(
      computed(() => true),
      computed(() => library),
      (key) => key,
      (source) => source.label.en
    ));
    if (hub === undefined) throw new Error("Font Hub state was not created.");

    await hub.previewFont(fixtureFamily);

    expect(hub.feedback.value).toBe(
      "previewFontFailed：Failed to resolve web font family \"Fixture Serif\".；"
      + "原因：Source stylesheet mirrors returned HTTP 404."
    );
    scope.stop();
  });
});

/**
 * Creates one arbitrary source fixture with a schema-driven setting field.
 *
 * @param id - Stable fixture source identity.
 * @param label - Visible fixture label.
 * @returns Source adapter independent from any built-in provider.
 */
function createSource(id: string, label: string): ClassicEditorWebFontSource {
  return {
    id,
    label: { "zh-CN": label, en: label },
    settingFields: [{
      key: "token",
      label: { "zh-CN": "Token", en: "Token" },
      required: true
    }],
    search: async () => [],
    resolveFamily: async () => {
      throw new Error("Manifest resolution is outside this state test.");
    }
  };
}

/**
 * Creates the public headless library consumed by the reusable Hub.
 *
 * @param sources - Arbitrary configured source adapters.
 * @param search - Search spy routed by source id.
 * @param configureSource - Settings spy routed by source id.
 * @param overrides - Optional library methods or state used by one focused test.
 * @returns Complete public font-library fixture.
 */
function createLibrary(
  sources: readonly ClassicEditorWebFontSource[],
  search: ClassicEditorFontLibrary["search"],
  configureSource: ClassicEditorFontLibrary["configureSource"],
  overrides: Partial<ClassicEditorFontLibrary> = {}
): ClassicEditorFontLibrary {
  return {
    families: [],
    sources,
    importedFamilies: [],
    mountedFamilies: [],
    recentFamilies: [],
    rememberRecentFamily: () => {},
    subscribe: () => () => {},
    getSourceSettings: () => ({}),
    configureSource,
    search,
    previewFamily: async () => {},
    importFamily: async () => {},
    removeFamily: async () => {},
    getStatus: (family) => ({ family, phase: "idle" }),
    getInstallations: () => [],
    install: async () => {},
    ...overrides
  };
}
