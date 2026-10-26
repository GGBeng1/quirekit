import { searchMathCommands } from '@quirekit/math';
import type { MathEditor, MathEditorSnapshot, MathFormulaLayout } from '@quirekit/math';
import { bindMathEditor } from '@quirekit/math/browser';
import { paintStandaloneOverlay } from './overlay';
import type { StandaloneMathView } from './types';

/**
 * Implements a real plain-DOM consumer, with no Vue or QuireKit UI import.
 * @param editor - Borrowed public headless instance.
 * @param host - Caller-owned container and stylesheet.
 * @returns View lifetime separate from source/history/backend lifetime.
 */
export function createStandaloneMathView(editor: MathEditor, host: HTMLElement): StandaloneMathView {
  // The external application owns markup, controls and appearance; the core creates none.
  host.innerHTML = `<nav aria-label="公式操作"><button data-command="fraction">分数</button><button data-command="square-root">平方根</button><button data-command="definite-integral">定积分</button><button data-command="matrix-bmatrix">矩阵</button><button data-action="undo">撤销</button><button data-action="redo">重做</button><button data-action="save">保存</button></nav>
    <div class="surface"><div class="graphic"></div><div class="overlay" aria-hidden="true"></div><textarea class="capture" aria-label="可视化公式输入" autocomplete="off" spellcheck="false"></textarea></div>
    <div class="commands" hidden><input aria-label="搜索公式" placeholder="搜索结构或符号"><select aria-label="公式命令" size="6"></select><button data-action="choose">插入</button><button data-action="close">关闭</button></div>
    <label>LaTeX 源码<input class="source" aria-label="LaTeX 源码"></label><output class="draft" aria-label="当前公式"></output><output class="status" aria-label="编辑状态"></output>`;
  const surface = host.querySelector<HTMLElement>('.surface')!; const capture = host.querySelector<HTMLTextAreaElement>('.capture')!;
  const graphic = host.querySelector<HTMLElement>('.graphic')!; const overlay = host.querySelector<HTMLElement>('.overlay')!;
  const source = host.querySelector<HTMLInputElement>('.source')!; const commands = host.querySelector<HTMLElement>('.commands')!;
  const query = commands.querySelector<HTMLInputElement>('input')!; const choices = commands.querySelector<HTMLSelectElement>('select')!;
  const binding = bindMathEditor({ editor, surface, input: capture, graphic: () => graphic.firstElementChild });
  let painted: MathFormulaLayout | undefined; let paused = false; let alive = true; let menu = false;
  /** Rebuilds consumer-owned discovery controls using the shared semantic catalog. */
  function search(): void {
    choices.replaceChildren(...searchMathCommands(query.value).map(command => {
      const option = host.ownerDocument.createElement('option'); option.value = command.value; option.textContent = `${command.label} · ${command.english}`; return option;
    }));
    choices.selectedIndex = choices.options.length ? 0 : -1;
  }
  /**
   * Projects core facts, installing graphic output only after this consumer's DOM commit.
   * @param state - Immutable public snapshot.
   */
  function paint(state: MathEditorSnapshot): void {
    if (!alive) return;
    if (!paused && state.presentation.ready && state.presentation.layout) {
      if (painted !== state.presentation.layout) { painted = state.presentation.layout; graphic.innerHTML = painted.svg; }
      binding.setRenderedLayout(painted);
    }
    if (source.value !== state.draft) source.value = state.draft;
    source.disabled = state.disabled || state.busy || state.conflict || state.disposed;
    host.querySelector('.draft')!.textContent = state.draft;
    host.querySelector('.status')!.textContent = state.diagnostic?.message ?? state.feedback ?? '';
    for (const button of host.querySelectorAll<HTMLButtonElement>('[data-command]')) button.disabled = !state.canEdit;
    host.querySelector<HTMLButtonElement>('[data-action="save"]')!.disabled = !state.canCommit;
    surface.dataset.ready = String(state.presentation.ready); surface.dataset.layouts = String(state.presentation.layouts);
    if (menu !== state.commandOpen) {
      menu = state.commandOpen; commands.hidden = !menu;
      if (menu) { query.value = ''; search(); query.focus({ preventScroll: true }); }
    }
    paintStandaloneOverlay(overlay, binding.getSnapshot(), state);
  }
  /** Sends the selected command to the core and restores native focus. */
  function choose(): void { editor.chooseCommand(choices.value); binding.focus(); }
  /**
   * Routes consumer-owned controls into typed public commands.
   * @param event - Consumer DOM click.
   */
  function click(event: Event): void {
    const button = (event.target as Element).closest<HTMLButtonElement>('button'); if (!button || !host.contains(button)) return;
    if (button.dataset.command) { editor.chooseCommand(button.dataset.command); binding.focus(); return; }
    const action = button.dataset.action;
    if (action === 'undo') editor.undo(); if (action === 'redo') editor.redo(); if (action === 'save') void editor.commit();
    if (action === 'choose') choose(); if (action === 'close') { editor.setCommandOpen(false); binding.focus(); }
  }
  /**
   * Leaves discovery search text editable while supporting Enter/Escape.
   * @param event - Consumer-owned chooser key.
   */
  function key(event: KeyboardEvent): void {
    if (event.isComposing || event.keyCode === 229) return;
    if (event.key === 'Enter') { event.preventDefault(); choose(); }
    if (event.key === 'Escape') { event.preventDefault(); editor.setCommandOpen(false); binding.focus(); }
  }
  /** Sends exact raw source through the same admission/history authority. */
  function updateSource(): void { editor.setLatex(source.value); }
  host.addEventListener('click', click); commands.addEventListener('keydown', key); query.addEventListener('input', search); source.addEventListener('input', updateSource);
  const unsubscribe = editor.subscribe(paint);
  const stopOverlay = binding.subscribe(browser => { paintStandaloneOverlay(overlay, browser, editor.getSnapshot()); });
  paint(editor.getSnapshot());
  return {
    binding,
    /** @param value - Whether the consumer delays its graphic commit. */
    pauseGraphic(value) { paused = value; if (!paused) paint(editor.getSnapshot()); },
    /** Releases this DOM consumer while retaining the caller's model and renderer. */
    destroy() {
      if (!alive) return; alive = false; unsubscribe(); stopOverlay(); binding.destroy();
      host.removeEventListener('click', click); commands.removeEventListener('keydown', key); query.removeEventListener('input', search); source.removeEventListener('input', updateSource);
    },
  };
}
