import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vue from '@vitejs/plugin-vue';
import UnoCSS from '@unocss/vite';
import { defineConfig } from 'vite';

const workspaceRoot = fileURLToPath(new URL('../../../', import.meta.url));
const paths = JSON.parse(readFileSync(`${workspaceRoot}tsconfig.base.json`, 'utf8')).compilerOptions.paths as Record<string, string[]>;
export default defineConfig({
  root: fileURLToPath(new URL('./', import.meta.url)), plugins: [vue(), UnoCSS({ configFile: fileURLToPath(new URL('./uno.config.ts', import.meta.url)) })],
  resolve: { alias: Object.entries(paths).filter(([name]) => !name.includes('*')).map(([name, entries]) => ({
    find: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`), replacement: `${workspaceRoot}${entries[0]!.replace(/\.d\.mts$/, '.mjs')}`,
  })) },
  server: { host: '127.0.0.1', port: Number(process.env.PW_MATH_PORT ?? 8987), strictPort: true, fs: { allow: [workspaceRoot] } },
});
