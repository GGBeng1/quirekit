import { describe, expect, it } from "vitest";
import { createQuireLocalFontProbe } from "./local";

describe("local web font probe", () => {
  it("loads an isolated local() alias without registering it", async () => {
    const sources: string[] = [];
    class FakeFontFace {
      readonly status = "loaded";

      constructor(
        readonly family: string,
        readonly source: string
      ) {
        sources.push(source);
      }

      /** @returns Loaded fake face. */
      async load(): Promise<FakeFontFace> {
        return this;
      }
    }
    const probe = createQuireLocalFontProbe({
      FontFace: FakeFontFace as unknown as typeof FontFace
    });

    await expect(probe('Fixture "Sans"')).resolves.toBe(true);
    expect(sources).toEqual(['local("Fixture \\"Sans\\"")']);
  });
});
