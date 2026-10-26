import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = fileURLToPath(new URL('../', import.meta.url));
const workspaceRoot = path.resolve(packageRoot, '../..');
const consumer = mkdtempSync(path.join(tmpdir(), 'quirekit-math-headless-'));
mkdirSync(path.join(consumer, 'node_modules/@quirekit'), { recursive: true });
writeFileSync(path.join(consumer, 'package.json'), JSON.stringify({ private: true, type: 'module' }));

/**
 * Installs actual published contents, without source aliases or unrelated workspace dependencies.
 * @param source - Built package directory.
 * @param name - Public scoped package name.
 */
function installPacked(source, name) {
  execFileSync('pnpm', ['pack', '--pack-destination', consumer], { cwd: source, stdio: 'pipe' });
  const { version } = JSON.parse(readFileSync(path.join(source, 'package.json'), 'utf8'));
  const archive = path.join(consumer, `${name.replace('@', '').replace('/', '-')}-${version}.tgz`);
  const target = path.join(consumer, 'node_modules', name); mkdirSync(target, { recursive: true });
  execFileSync('tar', ['-xzf', archive, '--strip-components=1', '-C', target]);
}

installPacked(packageRoot, '@quirekit/math');
const core = `
import assert from 'node:assert/strict';
import { createMathEditor, searchMathCommands } from '@quirekit/math';
assert.equal(typeof document, 'undefined');
const editor = createMathEditor({ latex: '' });
editor.chooseCommand('fraction'); editor.insertText('a'); editor.move('next'); editor.insertText('b');
assert.equal(editor.getSnapshot().draft, String.raw\`\\frac{a}{b}\`);
assert(Object.isFrozen(editor.getSnapshot()));
assert.equal(editor.getSnapshot(), editor.getSnapshot());
assert(searchMathCommands('alpha').some(item => item.value === 'symbol:α'));
assert(import.meta.resolve('@quirekit/math/browser').endsWith('/dist/browser.mjs'));
editor.destroy();
console.log('Packed core works without DOM, Vue, MathJax, Editor or even the optional IME runtime installed.');
`;
writeFileSync(path.join(consumer, 'core.mjs'), core);
const first = execFileSync(process.execPath, ['core.mjs'], { cwd: consumer, encoding: 'utf8' });
assert.match(first, /Packed core works/u);

// The root declarations must be consumable by a Node project with no DOM or ambient framework types.
writeFileSync(path.join(consumer, 'consumer.ts'), `
import { createMathEditor, type MathEditorSnapshot, type MathRenderer } from '@quirekit/math';
const renderer: MathRenderer = { render: () => ({ svg: '<svg/>', width: 1, height: 1, baseline: .8, slots: [] }) };
const editor = createMathEditor({ latex: 'x', renderer });
const state: MathEditorSnapshot = editor.getSnapshot();
const stop = editor.subscribe(() => { editor.getSnapshot(); });
editor.select({ focus: { slot: 'root', index: 0 } }); stop(); editor.destroy();
export { state };
`);
writeFileSync(path.join(consumer, 'tsconfig.json'), JSON.stringify({ compilerOptions: {
  target: 'ES2023', lib: ['ES2023'], types: [], module: 'NodeNext', moduleResolution: 'NodeNext', strict: true, noEmit: true, skipLibCheck: false,
}, include: ['consumer.ts'] }));
execFileSync(path.join(workspaceRoot, 'node_modules/.bin/tsc'), ['-p', 'tsconfig.json'], { cwd: consumer, stdio: 'pipe' });

// Optional browser imports only the existing independent IME; evaluating the entry still needs no DOM.
installPacked(path.join(workspaceRoot, 'packages/input/ime'), '@quirekit/ime');
writeFileSync(path.join(consumer, 'browser.mjs'), `
import assert from 'node:assert/strict';
import { bindMathEditor } from '@quirekit/math/browser';
assert.equal(typeof document, 'undefined'); assert.equal(typeof bindMathEditor, 'function');
`);
execFileSync(process.execPath, ['browser.mjs'], { cwd: consumer, stdio: 'pipe' });
console.log(first.trim());
console.log('Packed root types compile without lib.dom; optional browser entry resolves and imports with independent IME.');
console.log(`Consumer fixture: ${consumer}`);
