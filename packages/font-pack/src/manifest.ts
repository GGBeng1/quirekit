import type {
  QuireStaticFontFamilyManifest,
  QuireStaticFontPackManifest
} from "./types";

/**
 * Immutable metadata for the application-mounted Carlito family.
 *
 * Importing this JavaScript entry does not register the family.
 */
const carlitoFamilyManifest: QuireStaticFontFamilyManifest = Object.freeze({
  family: "Carlito",
  styles: Object.freeze(["normal", "italic"]),
  weights: Object.freeze({
    kind: "discrete",
    values: Object.freeze([400, 700])
  }),
  cssPath: "@quirekit/font-pack/carlito.css",
  fontLicenseSpdxId: "OFL-1.1",
  fontLicensePath: "@quirekit/font-pack/licenses/carlito-OFL.txt"
});

/** Immutable metadata for the application-mounted Noto Sans SC family. */
const notoSansScFamilyManifest: QuireStaticFontFamilyManifest = Object.freeze({
  family: "Noto Sans SC",
  displayName: "Noto 黑体（简体中文）",
  styles: Object.freeze(["normal"]),
  weights: Object.freeze({
    kind: "discrete",
    values: Object.freeze([100, 200, 300, 400, 500, 600, 700, 800, 900])
  }),
  cssPath: "@quirekit/font-pack/noto-sans-sc.css",
  fontLicenseSpdxId: "OFL-1.1",
  fontLicensePath: "@quirekit/font-pack/licenses/noto-sans-sc-OFL.txt"
});

/**
 * Immutable metadata for the application-mounted Noto Serif SC family.
 *
 * Importing this JavaScript entry does not register the family.
 */
const notoSerifScFamilyManifest: QuireStaticFontFamilyManifest = Object.freeze({
  family: "Noto Serif SC",
  displayName: "Noto 宋体（简体中文）",
  styles: Object.freeze(["normal"]),
  weights: Object.freeze({
    kind: "discrete",
    values: Object.freeze([200, 300, 400, 500, 600, 700, 800, 900])
  }),
  cssPath: "@quirekit/font-pack/noto-serif-sc.css",
  fontLicenseSpdxId: "OFL-1.1",
  fontLicensePath: "@quirekit/font-pack/licenses/noto-serif-sc-OFL.txt"
});

/** Immutable metadata for the application-mounted LXGW WenKai family. */
const lxgwWenKaiFamilyManifest: QuireStaticFontFamilyManifest = Object.freeze({
  family: "LXGW WenKai",
  displayName: "霞鹜文楷",
  styles: Object.freeze(["normal"]),
  weights: Object.freeze({
    kind: "discrete",
    values: Object.freeze([300, 400, 500])
  }),
  cssPath: "@quirekit/font-pack/lxgw-wenkai.css",
  fontLicenseSpdxId: "OFL-1.1",
  fontLicensePath: "@quirekit/font-pack/licenses/lxgw-wenkai-OFL.txt"
});

/** Immutable metadata for the preview Zhuque Fangsong family. */
const zhuqueFangsongFamilyManifest: QuireStaticFontFamilyManifest = Object.freeze({
  family: "Zhuque Fangsong",
  displayName: "朱雀仿宋",
  styles: Object.freeze(["normal"]),
  weights: Object.freeze({
    kind: "discrete",
    values: Object.freeze([400])
  }),
  cssPath: "@quirekit/font-pack/zhuque-fangsong.css",
  fontLicenseSpdxId: "OFL-1.1",
  fontLicensePath: "@quirekit/font-pack/licenses/zhuque-fangsong-OFL.txt",
  stability: "preview"
});

/** Approved self-hosted code family; JavaScript import never registers faces. */
const jetBrainsMonoFamilyManifest: QuireStaticFontFamilyManifest = Object.freeze({
  family: "JetBrains Mono",
  styles: Object.freeze(["normal", "italic"]),
  weights: Object.freeze({ kind: "range", min: 100, max: 800 }),
  faces: Object.freeze([
    Object.freeze({
      style: "normal",
      weights: Object.freeze({ kind: "range" as const, min: 100, max: 800 })
    }),
    Object.freeze({
      style: "italic",
      weights: Object.freeze({ kind: "discrete" as const, values: Object.freeze([400]) })
    })
  ]),
  cssPath: "@quirekit/font-pack/jetbrains-mono.css",
  fontLicenseSpdxId: "OFL-1.1",
  fontLicensePath: "@quirekit/font-pack/licenses/jetbrains-mono-OFL.txt"
});

/**
 * Immutable metadata for the optional, application-mounted open font pack.
 *
 * Importing this JavaScript entry does not register fonts. An application must
 * also import the aggregate `@quirekit/font-pack/styles.css` entry or one of
 * the family-specific CSS subpaths explicitly.
 */
export const quireFontPackManifest: QuireStaticFontPackManifest = Object.freeze({
  id: "@quirekit/font-pack",
  cssPath: "@quirekit/font-pack/styles.css",
  families: Object.freeze([
    carlitoFamilyManifest,
    notoSansScFamilyManifest,
    notoSerifScFamilyManifest,
    lxgwWenKaiFamilyManifest,
    zhuqueFangsongFamilyManifest,
    jetBrainsMonoFamilyManifest
  ])
});
