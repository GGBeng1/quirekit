// @vitest-environment happy-dom
import { createApp, h, nextTick, reactive, ref } from 'vue';
import { afterEach, expect, it } from 'vitest';
import { useHierarchyPicker } from './use-picker';
import { useHierarchyForm } from './use-form';
import type { QuireKitHierarchyPickerProps } from './types';

const dispose: Array<() => void> = [];
afterEach(() => dispose.splice(0).forEach(fn => fn()));

it('keeps controlled requests separate, protects read-only and accepts an explicit empty value', async () => {
  const props = reactive<{ -readonly [Key in keyof QuireKitHierarchyPickerProps]: QuireKitHierarchyPickerProps[Key] }>({ label: 'Path', nodes: [], modelValue: ['unknown'], defaultValue: ['initial'] });
  const requested: string[][] = [];
  let picker!: ReturnType<typeof useHierarchyPicker>;
  const host = document.createElement('div');
  const app = createApp({ setup() { picker = useHierarchyPicker(props, ids => requested.push(ids), () => {}); return () => h('div'); } });
  app.mount(host); dispose.push(() => app.unmount());
  picker.query.value = 'draft'; picker.setOpen(true); picker.commit(['next']);
  expect(picker.value.value).toEqual(['unknown']); expect(requested).toEqual([['next']]);
  props.modelValue = []; await nextTick(); expect(picker.value.value).toEqual([]);
  props.readOnly = true; picker.commit(['blocked']); picker.setOpen(true);
  expect(requested).toHaveLength(1); expect(picker.open.value).toBe(false);
  picker.reset(); expect(requested.at(-1)).toEqual(['initial']); expect(picker.query.value).toBe('');
});

it('uses current native form ownership and restores validation after nonempty and cancelled resets', async () => {
  const host = document.createElement('div'); document.body.append(host);
  const value = ref(['initial']); const resets: string[] = [];
  const app = createApp({ setup() {
    const field = ref<HTMLSelectElement>();
    useHierarchyForm(field, () => value.value, () => { resets.push('reset'); value.value = ['initial']; });
    return () => h('select', { ref: field, form: 'late-form', required: true, value: value.value.length ? 'selected' : '' }, [h('option', { value: '' }), h('option', { value: 'selected' }, 'chosen')]);
  } });
  app.mount(host); await nextTick();
  const form = document.createElement('form'); form.id = 'late-form'; document.body.append(form);
  dispose.push(() => { app.unmount(); host.remove(); form.remove(); });
  const field = host.querySelector('select')!;
  value.value = ['changed']; await nextTick(); form.reset(); await nextTick(); await nextTick();
  expect(resets).toEqual(['reset']); expect(value.value).toEqual(['initial']); expect(field.value).toBe('selected');
  form.addEventListener('reset', event => event.preventDefault(), { once: true });
  value.value = ['kept']; form.reset(); await nextTick(); await nextTick();
  expect(resets).toHaveLength(1); expect(value.value).toEqual(['kept']); expect(field.value).toBe('selected');
});
