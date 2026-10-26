import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const standaloneGraph = readModuleGraph("dist/index.mjs");
const hostVueGraph = readModuleGraph("dist/vue.mjs");
const imageGalleryGraph = readModuleGraph("dist/image-gallery.mjs");
const standalone = standaloneGraph.source;
const hostVue = hostVueGraph.source;
const imageGallery = imageGalleryGraph.source;
const standaloneTypes = read("dist/index.d.mts");
const hostVueTypes = read("dist/vue.d.mts");
const imageGalleryTypes = read("dist/image-gallery.d.mts");
const styleEntry = read("dist/styles.css");
const componentStyles = ["standalone-components.css", "vue-components.css"];
if (existsSync(resolve(packageRoot, "dist/image-gallery-components.css"))) componentStyles.push("image-gallery-components.css");
for (const file of componentStyles) {
  assert(styleEntry.includes(`@import "./${file}";`), `Public styles must load ${file}.`);
}
const styles = [styleEntry, ...componentStyles.map(file => read(`dist/${file}`))].join("\n");
assert(styles.includes(".qk-block-rail"), "Public styles must include positioned block controls.");
const packageManifest = JSON.parse(read("package.json"));
const fontAssetDependencyPrefixes = Object.freeze([
  "@fontsource/",
  "@quirekit/font-pack-"
]);

// Migration checkpoints report size without a ceiling; assess final delivery size after UI migration.
console.log(JSON.stringify({
  standaloneEntryBytes: size("dist/index.mjs"),
  standaloneGraphBytes: standaloneGraph.bytes,
  hostVueEntryBytes: size("dist/vue.mjs"),
  hostVueGraphBytes: hostVueGraph.bytes,
  imageGalleryEntryBytes: size("dist/image-gallery.mjs"),
  imageGalleryGraphBytes: imageGalleryGraph.bytes,
  stylesBytes: size("dist/styles.css")
}, null, 2));

assert(!/from["']vue["']/.test(standalone), "Standalone entry must not import host Vue.");
assert(/from["']vue["']/.test(hostVue), "Host-Vue entry must preserve a Vue import.");
assert(
  /from["']vue["']/.test(imageGallery),
  "Image-gallery entry must preserve a Vue import."
);
assert(!standalone.includes("node:module"), "Standalone entry must be browser-pure ESM.");
assert(!hostVue.includes("node:module"), "Host-Vue entry must be browser-pure ESM.");
assert(
  !imageGallery.includes("node:module"),
  "Image-gallery entry must be browser-pure ESM."
);
assert(
  !/\bsideEffect\(/u.test(standalone)
    && !/\bsideEffect\(/u.test(hostVue)
    && !/\bsideEffect\(/u.test(imageGallery),
  "Runtime module graphs must not contain declaration-bundler pseudo code."
);
assert(
  !standalone.includes("naive-ui/es/") && !hostVue.includes("naive-ui/es/"),
  "Product artifacts must not retain Naive UI modules."
);
assert(
  !imageGallery.includes("naive-ui/es/"),
  "Image-gallery artifact must not retain Naive UI modules."
);
assert(standalone.includes("createApp"), "Standalone entry must contain the Vue runtime.");
assert(
  standalone.includes("Tabler Icons 3.45.0 - MIT")
    && hostVue.includes("Tabler Icons 3.45.0 - MIT"),
  "Product entries that bundle QuireKit icons must retain the allowlisted Tabler SVG license marker."
);
assert(
  !standalone.includes("@iconify-json")
    && !hostVue.includes("@iconify-json")
    && !standalone.includes("iconify-json")
    && !hostVue.includes("iconify-json")
    && !imageGallery.includes("@iconify-json")
    && !imageGallery.includes("iconify-json"),
  "Runtime entries must not contain the Iconify collection package."
);
assert(
  !standaloneTypes.includes("ClassicEditorFontHub:")
    && hostVueTypes.includes("ClassicEditorFontHub:"),
  "Only the host-Vue entry may expose the reusable Vue font Hub component."
);
assert(
  !standaloneTypes.includes("ClassicEditorImageGallery:")
    && !hostVueTypes.includes("ClassicEditorImageGallery:")
    && imageGalleryTypes.includes("ClassicEditorImageGallery:"),
  "Only the optional image-gallery entry may expose the public gallery component."
);
assert(
  standaloneTypes.includes("ClassicEditorPopupMenu:")
    && hostVueTypes.includes("ClassicEditorPopupMenu:"),
  "Both entries must expose the public Classic Editor Popup Menu components."
);
assert(
  !standaloneTypes.includes("naive-ui")
    && !hostVueTypes.includes("naive-ui"),
  "Public Classic Editor declarations must not expose the private component library."
);
assert(
  !imageGalleryTypes.includes("naive-ui"),
  "Public image-gallery declarations must not expose the private component library."
);
for (const dependency of Object.keys(packageManifest.dependencies ?? {})) {
  assert(
    !fontAssetDependencyPrefixes.some((prefix) => dependency.startsWith(prefix)),
    `Classic Editor must not depend on font asset package ${dependency}.`
  );
}
assert(
  !styles.includes("@fontsource/")
    && !styles.includes("@quirekit/font-pack-")
    && !styles.includes("@font-face")
    && !/\.(?:woff2?|ttf|otf)\b/iu.test(styles),
  "Classic Editor CSS must not import or embed font assets."
);
assert(
  listFiles("dist").every((path) => !/\.(?:woff2?|ttf|otf)$/iu.test(path)),
  "Classic Editor artifacts must not contain font binaries."
);

function readModuleGraph(entryPath) {
  const visited = new Set();
  const sources = [];
  let bytes = 0;

  function visit(path) {
    if (visited.has(path)) return;
    visited.add(path);
    const source = read(path);
    sources.push(source);
    bytes += size(path);
    for (const match of source.matchAll(
      /(?:from|import\()\s*["'`]\.\/([^"'`]+\.mjs)["'`]/gu
    )) {
      visit(`dist/${match[1]}`);
    }
  }

  visit(entryPath);
  return { bytes, source: sources.join("\n") };
}

function read(path) {
  return readFileSync(resolve(packageRoot, path), "utf8");
}

function size(path) {
  return statSync(resolve(packageRoot, path)).size;
}

function listFiles(directory) {
  return readdirSync(resolve(packageRoot, directory), { withFileTypes: true })
    .flatMap((entry) => {
      const path = `${directory}/${entry.name}`;
      return entry.isDirectory() ? listFiles(path) : [path];
    });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
