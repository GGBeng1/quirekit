import { copyFile, mkdir, writeFile, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const destination = new URL("../dist/runner/", import.meta.url);
await mkdir(destination, { recursive: true });
await writeFile(new URL("runner.html", destination), `<!doctype html><html><head><meta charset="utf-8"><meta name="referrer" content="no-referrer"><title>HTML sandbox runner</title><style>html,body,#sandbox-root{margin:0;width:100%;height:100%;overflow:hidden}</style></head><body><div id="sandbox-root"></div><script src="./runner.iife.js"></script></body></html>`);
await writeFile(new URL("_headers.template", destination), `# Replace https://YOUR-APP.example with the exact allowed host origin. Deploy on a separate registrable domain with no business cookies.
/*
  Content-Security-Policy: default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src data:; frame-src 'self'; connect-src 'none'; base-uri 'none'; form-action 'none'; object-src 'none'; worker-src 'none'; frame-ancestors https://YOUR-APP.example
  Referrer-Policy: no-referrer
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), display-capture=()
  X-Content-Type-Options: nosniff
`);
const parser = require.resolve("parse5");
const entities = require.resolve("entities", { paths: [dirname(parser)] });
// Package license texts travel with the bundled runner, independent of node_modules.
for (const [name, entry] of [["parse5", parser], ["entities", entities]]) {
  let directory = dirname(entry);
  for (let depth = 0; depth < 5; depth++, directory = dirname(directory)) {
    try { await readFile(resolve(directory, "LICENSE")); await copyFile(resolve(directory, "LICENSE"), new URL(`${name}.LICENSE.txt`, destination)); break; }
    catch { if (depth === 4) throw new Error(`Missing ${name} license`); }
  }
}
