import { describe, expect, it } from "vitest";
import {
  createClassicEditorLocalFontLibraryPersistence,
  createClassicEditorMemoryFontLibraryPersistence
} from "./persistence";

describe("Classic font Hub persistence", () => {
  it("keeps source settings and imported families outside document state", () => {
    const persistence = createClassicEditorMemoryFontLibraryPersistence();
    persistence.save({
      sourceSettings: { google: { apiKey: "local-key" } },
      customSources: [],
      importedFamilies: [{
        family: "Noto Serif SC",
        sourceId: "google",
        sourceLabel: "Google Fonts",
        license: { name: "OFL", url: "https://example.test/license" },
        importedAt: 12
      }],
      recentFamilies: ["Noto Serif SC"]
    });

    expect(persistence.load()).toMatchObject({
      sourceSettings: { google: { apiKey: "local-key" } },
      importedFamilies: [{ family: "Noto Serif SC", importedAt: 12 }],
      recentFamilies: ["Noto Serif SC"]
    });
  });

  it("ignores malformed local storage instead of breaking editor mount", () => {
    const storage = {
      getItem: () => "{broken",
      setItem: () => undefined
    } as unknown as Storage;

    expect(createClassicEditorLocalFontLibraryPersistence(storage).load()).toEqual({
      sourceSettings: {},
      importedFamilies: [],
      recentFamilies: [],
      customSources: []
    });
  });
});
