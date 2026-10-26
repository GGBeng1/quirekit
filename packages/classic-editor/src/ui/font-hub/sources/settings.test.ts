import { computed, effectScope, nextTick, ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import type { ClassicEditorFontLibrary, ClassicEditorWebFontSource } from "@classic/types";
import { useFontSourceSettings } from "./settings";

describe("Font source settings drafts", () => {
  it("discards cancelled drafts and validates before saving", async () => {
    const sources = ref(["a", "b"].map(
      (id) =>
        ({
          id,
          label: { en: id, "zh-CN": id },
          search: async () => [],
          resolveFamily: async () => {
            throw new Error("Unused fixture resolver");
          },
          settingFields: [{ key: "token", label: { en: "Token", "zh-CN": "密钥" }, required: true }]
        } as ClassicEditorWebFontSource)
    ));
    const configureSource = vi.fn();
    const library = {
      getSourceSettings: () => ({}),
      configureSource
    } as unknown as ClassicEditorFontLibrary;
    const onSaved = vi.fn();
    const scope = effectScope();
    const settings = scope.run(() =>
      useFontSourceSettings(
        computed(() => library),
        computed(() => sources.value),
        (key) => key,
        onSaved
      )
    )!;
    expect(settings.sourceId.value).toBe("");
    settings.open("a");
    await nextTick();
    expect(settings.save()).toBe(false);
    expect(settings.invalidKeys.value).toEqual(["token"]);
    expect(configureSource).not.toHaveBeenCalled();
    settings.update("token", "draft-a");
    settings.close();
    await nextTick();
    expect(settings.source.value).toBeUndefined();
    sources.value = [...sources.value];
    await nextTick();
    expect(settings.sourceId.value).toBe("");
    settings.open("a");
    await nextTick();
    expect(settings.settings.value).toEqual({});
    settings.open("b");
    await nextTick();
    expect(settings.settings.value).toEqual({});
    settings.update("token", "draft-b");
    settings.open("a");
    await nextTick();
    expect(settings.settings.value).toEqual({});
    settings.update("token", "saved-a");
    expect(settings.save()).toBe(true);
    expect(configureSource).toHaveBeenCalledWith("a", { token: "saved-a" });
    expect(onSaved).toHaveBeenCalledWith("a");
    sources.value = sources.value.filter((source) => source.id !== "a");
    await nextTick();
    expect(settings.sourceId.value).toBe("");
    scope.stop();
  });
});
