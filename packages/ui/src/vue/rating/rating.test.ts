// @vitest-environment happy-dom
import { createApp, defineComponent, h, nextTick, reactive } from 'vue';
import { afterEach, describe, expect, it } from 'vitest';
import Rating from './rating.vue';
import Field from '../field/field.vue';

const cleanups: Array<() => void> = [];
afterEach(() => cleanups.splice(0).forEach(cleanup => cleanup()));

/** Lets Ark's change notification and focus scheduling settle. @returns Pending reactive and DOM updates. */
async function settle(): Promise<void> {
  await nextTick();
  await new Promise(resolve => setTimeout(resolve, 30));
  await nextTick();
}

/** Mounts a controlled score in a real native form.
 * @param options - Initial feature and form configuration.
 * @returns Form, mutable model and rendered radio nodes.
 */
async function mountRating(options: { value?: number; readOnly?: boolean; disabled?: boolean; allowHalf?: boolean; required?: boolean; field?: boolean } = {}) {
  const state = reactive({ value: 0, readOnly: false, disabled: false, allowHalf: false, required: false, ...options });
  const form = document.createElement('form');
  document.body.append(form);
  const rating = () => h(Rating, {
    label: '模板评分', name: 'score', clearable: true, modelValue: state.value,
    readOnly: state.readOnly, disabled: state.disabled, allowHalf: state.allowHalf, required: state.required,
    'onUpdate:modelValue': (value: number | undefined) => { if (value !== undefined) state.value = value; }
  });
  const app = createApp(defineComponent({ setup: () => () => options.field
    ? h(Field, { label: '模板体验', description: '请选择评分', width: '100%' }, { default: rating }) : rating() }));
  app.mount(form);
  cleanups.push(() => { app.unmount(); form.remove(); });
  await settle();
  return { form, state, radios: [...form.querySelectorAll<HTMLElement>('[role=radio]')] };
}

describe('Rating semantics and native composition', () => {
  it('represents an empty score without announcing the first star as selected', async () => {
    const { form, radios } = await mountRating();
    expect(radios).toHaveLength(5);
    expect(radios.filter(radio => radio.getAttribute('aria-checked') === 'true')).toHaveLength(0);
    expect(radios.filter(radio => radio.tabIndex === 0)).toHaveLength(1);
    expect(new FormData(form).get('score')).toBe('0');
  });

  it('uses Ark keyboard selection and clears back to the first focus target', async () => {
    const { form, state, radios } = await mountRating({ value: 2 });
    radios[1]!.focus();
    await settle();
    radios[1]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    await settle();
    expect(state.value).toBe(3);
    expect(new FormData(form).get('score')).toBe('3');
    form.querySelector<HTMLButtonElement>('button')!.click();
    await settle();
    expect(state.value).toBe(0);
    expect(new FormData(form).get('score')).toBe('0');
    expect(document.activeElement).toBe(radios[0]);
  });

  it('keeps keyboard selection active while a mouse preview is still over the group', async () => {
    const { state, radios } = await mountRating();
    radios[1]!.dispatchEvent(new PointerEvent('pointermove', { pointerType: 'mouse', bubbles: true }));
    radios[1]!.click();
    await settle();
    radios[1]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    await settle();
    expect(state.value).toBe(3);
  });

  it('reports the committed half score and accepts half-step keyboard changes', async () => {
    const { form, state, radios } = await mountRating({ value: 2.5, allowHalf: true });
    expect(radios[2]!.getAttribute('aria-label')).toContain('2.5');
    radios[2]!.focus();
    await settle();
    radios[2]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    await settle();
    expect(state.value).toBe(3);
    expect(new FormData(form).get('score')).toBe('3');
  });

  it('retains readonly focus and submission while preventing pointer and keyboard edits', async () => {
    const { form, state, radios } = await mountRating({ value: 3, readOnly: true });
    radios[2]!.focus();
    radios[4]!.click();
    radios[2]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    await settle();
    expect(state.value).toBe(3);
    expect(document.activeElement).toBe(radios[2]);
    expect(new FormData(form).get('score')).toBe('3');
    expect(form.querySelector('button')).toBeNull();
  });

  it('excludes disabled values and restores the same mounted input when enabled', async () => {
    const { form, state } = await mountRating({ value: 4, disabled: true, readOnly: true });
    const input = form.querySelector('input')!;
    expect(new FormData(form).has('score')).toBe(false);
    expect(form.querySelector('[role=radio][tabindex="0"]')).toBeNull();
    state.disabled = false;
    await settle();
    expect(form.querySelector('input')).toBe(input);
    expect(new FormData(form).get('score')).toBe('4');
  });

  it('associates Field feedback and redirects the native label target into the group', async () => {
    const { form, radios } = await mountRating({ value: 2, field: true });
    const label = form.querySelector('label')!;
    const target = form.querySelector<HTMLInputElement>(`[id="${label.htmlFor}"]`)!;
    target.focus();
    await settle();
    expect(document.activeElement).toBe(radios[1]);
    const group = form.querySelector('[role=radiogroup]')!;
    expect(group.getAttribute('aria-labelledby')).toBe(label.id);
    expect(group.getAttribute('aria-describedby')).toContain(form.querySelector('[data-part=helper-text]')!.id);
    expect(form.querySelectorAll('label')).toHaveLength(1);
  });

  it('requires a positive score without preventing an optional zero score from submitting', async () => {
    const { form, state } = await mountRating({ required: true });
    expect(form.checkValidity()).toBe(false);
    state.value = 3;
    await settle();
    expect(form.checkValidity()).toBe(true);
    state.value = 0;
    state.required = false;
    await settle();
    expect(form.checkValidity()).toBe(true);
  });

  it('restores the initial score through the native form reset lifecycle', async () => {
    const { form, state, radios } = await mountRating({ value: 2 });
    radios[4]!.click();
    await settle();
    expect(state.value).toBe(5);
    form.reset();
    await settle();
    expect(state.value).toBe(2);
    expect(new FormData(form).get('score')).toBe('2');
  });
});
