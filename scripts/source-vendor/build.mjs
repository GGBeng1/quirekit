import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import ts from "typescript";
import { build } from "tsdown";

const cwd = process.cwd();
const temporary = resolve(cwd, "dist/.compiled");
const upstream = JSON.parse(readFileSync(resolve(cwd, "UPSTREAM.json"), "utf8"));
const entry = relative("src", upstream.sourceEntry).replace(/\.ts$/, "");
rmSync(resolve(cwd, "dist"), { recursive: true, force: true });

// Upstream combines type/value re-exports. TypeScript's semantic emit resolves
// them without rewriting the original source into isolated-module style.
const config = ts.readConfigFile(resolve(cwd, "tsconfig.json"), ts.sys.readFile);
if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, "\n"));
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, cwd, {
  outDir: temporary, rootDir: resolve(cwd, "src"), declarationMap: false,
});
const host = ts.createCompilerHost(parsed.options);
const readFile = host.readFile.bind(host);
// Upstream's build helper turns its /// documentation into JSDoc. Do the same
// in the compiler's virtual input while retaining the checked-in source bytes.
host.readFile = (file) => {
  const text = readFile(file);
  return file.startsWith(resolve(cwd, "src") + "/") ? text?.replace(
    /(?:^[ \t]*\/\/\/[^\n]*\n)+/gm,
    (comment) => "/**\n" + comment.trimEnd().split("\n")
      .map(line => " *" + line.replace(/^[ \t]*\/\/\//, "")).join("\n") + "\n */\n",
  ) : text;
};
const program = ts.createProgram(parsed.fileNames, parsed.options, host);
const diagnostics = [...parsed.errors, ...ts.getPreEmitDiagnostics(program)];
if (diagnostics.length) throw new Error(ts.formatDiagnosticsWithColorAndContext(diagnostics, {
  getCanonicalFileName: file => file, getCurrentDirectory: () => cwd, getNewLine: () => "\n",
}));
if (program.emit().emitSkipped) throw new Error("Vendor TypeScript emit was skipped.");
// Declaration-only inputs (such as EditContext's browser contract) are not
// copied by tsc, but remain dependencies of the emitted declarations.
for (const file of parsed.fileNames.filter(file => file.endsWith(".d.ts"))) {
  const target = resolve(temporary, relative(resolve(cwd, "src"), file));
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, host.readFile(file));
}
try {
  await build({ config: false, entry: { index: resolve(temporary, entry + ".js") }, format: "esm",
    dts: false, clean: false, sourcemap: true, outDir: "dist" });
  await build({ config: false, entry: { index: resolve(temporary, entry + ".d.ts") }, format: "esm",
    dts: { dtsInput: true, emitDtsOnly: true, sourcemap: false }, clean: false, outDir: "dist" });
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
