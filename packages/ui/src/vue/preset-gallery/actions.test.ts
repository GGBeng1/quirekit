// @vitest-environment happy-dom
import { createApp, h, nextTick } from 'vue';
import { expect, it } from 'vitest';
import PresetGallery from './preset-gallery.vue';

it('keeps card actions outside selection buttons and navigates without selecting', async () => {
  const host = document.createElement('div'); document.body.append(host);
  const selected: string[] = [], edited: string[] = [];
  const app = createApp({ render: () => h(PresetGallery, {
    label: 'Templates', items: [
      { value: 'first', label: 'First' }, { value: 'locked', label: 'Locked', disabled: true },
      { value: 'last', label: 'Last' },
    ], defaultValue: 'first', onSelect: value => selected.push(value),
  }, {
    actions: ({ item }: { item: { value: string; label: string } }) => h('button', { onClick: () => edited.push(item.value) }, `Edit ${item.label}`),
  }) });
  try {
    app.mount(host); await nextTick();
    const buttons = [...host.querySelectorAll<HTMLButtonElement>('button[aria-pressed]')];
    expect(buttons).toHaveLength(3);
    expect(host.querySelector('[role="listbox"]')).toBeNull();
    expect(buttons[0]!.getAttribute('aria-pressed')).toBe('true');
    const edit = [...host.querySelectorAll('button')].find(button => button.textContent === 'Edit First')!;
    expect(edit.closest('button[aria-pressed]')).toBeNull();
    edit.click(); await nextTick();
    expect(edited).toEqual(['first']); expect(selected).toEqual([]);
    buttons[0]!.focus();
    buttons[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(buttons[2]); expect(selected).toEqual([]);
    buttons[2]!.click(); await nextTick();
    expect(buttons[2]!.getAttribute('aria-pressed')).toBe('true');
    expect(selected).toEqual(['last']);
    buttons[1]!.click(); expect(selected).toEqual(['last']);
  } finally { app.unmount(); host.remove(); }
});
