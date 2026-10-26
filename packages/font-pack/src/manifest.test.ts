import { describe, expect, it } from "vitest";
import { quireFontPackManifest } from "./manifest";

describe("unified font pack manifest", () => {
  it("declares every application-mounted family and OFL notice", () => {
    expect(quireFontPackManifest).toEqual({
      id: "@quirekit/font-pack",
      cssPath: "@quirekit/font-pack/styles.css",
      families: [
        {
          family: "Carlito",
          styles: ["normal", "italic"],
          weights: { kind: "discrete", values: [400, 700] },
          cssPath: "@quirekit/font-pack/carlito.css",
          fontLicenseSpdxId: "OFL-1.1",
          fontLicensePath: "@quirekit/font-pack/licenses/carlito-OFL.txt"
        },
        {
          family: "Noto Sans SC",
          displayName: "Noto 黑体（简体中文）",
          styles: ["normal"],
          weights: {
            kind: "discrete",
            values: [100, 200, 300, 400, 500, 600, 700, 800, 900]
          },
          cssPath: "@quirekit/font-pack/noto-sans-sc.css",
          fontLicenseSpdxId: "OFL-1.1",
          fontLicensePath: "@quirekit/font-pack/licenses/noto-sans-sc-OFL.txt"
        },
        {
          family: "Noto Serif SC",
          displayName: "Noto 宋体（简体中文）",
          styles: ["normal"],
          weights: {
            kind: "discrete",
            values: [200, 300, 400, 500, 600, 700, 800, 900]
          },
          cssPath: "@quirekit/font-pack/noto-serif-sc.css",
          fontLicenseSpdxId: "OFL-1.1",
          fontLicensePath: "@quirekit/font-pack/licenses/noto-serif-sc-OFL.txt"
        },
        {
          family: "LXGW WenKai",
          displayName: "霞鹜文楷",
          styles: ["normal"],
          weights: { kind: "discrete", values: [300, 400, 500] },
          cssPath: "@quirekit/font-pack/lxgw-wenkai.css",
          fontLicenseSpdxId: "OFL-1.1",
          fontLicensePath: "@quirekit/font-pack/licenses/lxgw-wenkai-OFL.txt"
        },
        {
          family: "Zhuque Fangsong",
          displayName: "朱雀仿宋",
          styles: ["normal"],
          weights: { kind: "discrete", values: [400] },
          cssPath: "@quirekit/font-pack/zhuque-fangsong.css",
          fontLicenseSpdxId: "OFL-1.1",
          fontLicensePath: "@quirekit/font-pack/licenses/zhuque-fangsong-OFL.txt",
          stability: "preview"
        },
        {
          family: "JetBrains Mono",
          styles: ["normal", "italic"],
          weights: { kind: "range", min: 100, max: 800 },
          faces: [
            { style: "normal", weights: { kind: "range", min: 100, max: 800 } },
            { style: "italic", weights: { kind: "discrete", values: [400] } }
          ],
          cssPath: "@quirekit/font-pack/jetbrains-mono.css",
          fontLicenseSpdxId: "OFL-1.1",
          fontLicensePath: "@quirekit/font-pack/licenses/jetbrains-mono-OFL.txt"
        }
      ]
    });
  });
});
