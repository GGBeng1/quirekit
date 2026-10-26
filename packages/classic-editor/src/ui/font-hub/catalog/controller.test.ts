import { computed, effectScope } from "vue";
import { describe, expect, it, vi } from "vitest";
import type { ClassicEditorFontLibrary, ClassicEditorWebFontFamily } from "@classic/types";
import { useClassicFontCatalog } from "./controller";

const family: ClassicEditorWebFontFamily = {
  family: "Test",
  sourceId: "test",
  sourceLabel: "Test",
  license: { name: "OFL", url: "https://example.test" }
};

/**
 * Builds a scoped catalog with controlled provider timing.
 * @param browse - Provider browse behavior.
 * @returns Controller and teardown.
 */
function setup(browse: NonNullable<ClassicEditorFontLibrary["browse"]>) {
  const scope = effectScope();
  const catalog = scope.run(() =>
    useClassicFontCatalog({
      library: computed(() => ({ browse } as ClassicEditorFontLibrary)),
      selectedSource: computed(() => ({
        id: "test",
        label: { en: "Test", "zh-CN": "Test" },
        settingFields: [],
        search: async () => [],
        resolveFamily: async () => {
          throw new Error("unused");
        }
      })),
      curatedResults: computed(() => []),
      selectedSubsets: computed(() => [])
    })
  )!;
  return { catalog, stop: () => scope.stop() };
}

describe("Font catalog query ownership", () => {
  it("paginates the submitted query, not the editable draft", async () => {
    const browse = vi.fn(async () => ({ items: [family], total: 48, nextCursor: "next" }));
    const { catalog, stop } = setup(browse);
    catalog.query.value = "old";
    await catalog.searchFonts();
    catalog.query.value = "new draft";
    await catalog.changePage(2);
    expect(browse).toHaveBeenLastCalledWith("test", "old", 24, "next");
    expect(catalog.submittedQuery.value).toBe("old");
    stop();
  });

  it("ignores a failed obsolete request after newer results arrive", async () => {
    let rejectOld!: (reason: Error) => void;
    const browse = vi
      .fn<NonNullable<ClassicEditorFontLibrary["browse"]>>()
      .mockImplementationOnce(
        () =>
          new Promise((_resolve, reject) => {
            rejectOld = reject;
          })
      )
      .mockResolvedValue({ items: [family], total: 1 });
    const { catalog, stop } = setup(browse);
    const old = catalog.searchFonts();
    await catalog.searchFonts();
    rejectOld(new Error("obsolete"));
    await old;
    expect(catalog.error.value).toBe("");
    expect(catalog.displayedResults.value).toEqual([family]);
    expect(catalog.totalResultCount.value).toBe(1);
    stop();
  });

  it("keeps prior rows on page failure and invalidates work at disposal", async () => {
    const browse = vi
      .fn<NonNullable<ClassicEditorFontLibrary["browse"]>>()
      .mockResolvedValueOnce({ items: [family], total: 48, nextCursor: "next" })
      .mockRejectedValueOnce(new Error("offline"));
    const { catalog, stop } = setup(browse);
    await catalog.searchFonts();
    await catalog.changePage(2);
    expect(catalog.error.value).toBe("offline");
    expect(catalog.displayedResults.value).toEqual([family]);
    expect(catalog.page.value).toBe(1);
    stop();
  });
});
