import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: { index: 'src/index.ts', browser: 'src/browser/index.ts' }, format: 'esm', fixedExtension: true,
  dts: true, clean: true, outDir: 'dist',
  deps: { neverBundle: [/^@quirekit\//], dts: { neverBundle: [/^@quirekit\//] } },
});
