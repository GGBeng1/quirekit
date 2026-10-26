import { describe, expect, it } from "vitest";
import { usesLegacyWordTableOrigin } from "./compatibility";

describe("imported Word table compatibility", () => {
  it.each([
    ["<w:settings><w:compat/></w:settings>", true],
    ["<w:settings><!-- <w:compatSetting w:name='compatibilityMode' w:uri='http://schemas.microsoft.com/office/word' w:val='15'/> --></w:settings>", true],
    ["<d:settings><d:compatSetting d:val='14' d:name='compatibilityMode' d:uri='http://schemas.microsoft.com/office/word'/></d:settings>", true],
    ["<w:settings><w:compatSetting w:val='15' w:name='compatibilityMode' w:uri='http://schemas.microsoft.com/office/word'/></w:settings>", false],
    ["<w:settings><w:compatSetting w:val='unknown' w:name='compatibilityMode' w:uri='http://schemas.microsoft.com/office/word'/></w:settings>", false]
  ])("reads supported settings without reinterpreting unknown modes: %s", (settingsXml, expected) => {
    const attrs = { litAstDocumentPreservation: { meta: { rawXmlFiles: { settingsXml } } } };
    expect(usesLegacyWordTableOrigin(attrs)).toBe(expected);
    expect(usesLegacyWordTableOrigin(attrs)).toBe(expected);
  });
  it("does not decode unrelated binary preservation or activate on native documents", () => {
    expect(usesLegacyWordTableOrigin({})).toBe(false);
    const attrs = { litAstDocumentPreservation: { meta: { rawXmlFiles: { settingsXml: "<w:settings/>" },
      get unrelatedMedia(): never { throw new Error("Must not decode media for table placement"); }
    } } };
    expect(usesLegacyWordTableOrigin(attrs)).toBe(true);
  });
});
