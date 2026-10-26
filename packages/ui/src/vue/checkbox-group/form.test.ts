// @vitest-environment happy-dom
import { h } from 'vue';
import { expect, it } from 'vitest';
import CheckboxGroup from './checkbox-group.vue';
import Form from '../form/form.vue';
import FormField from '../form-field/form-field.vue';
import { mountForm, settle } from '../form/testing';
import type { QuireKitFormFieldSlotProps } from '../form-field/types';

it('gives each checkbox its own field identity and focuses the first option after array validation', async () => {
  const items = [{ value: 'email', label: 'Email' }, { value: 'message', label: 'Message' }];
  const { context, host } = await mountForm(probe => h(Form, { initialValues: { channels: [] } }, () => [probe,
    h(FormField, { name: 'channels', label: 'Channels', required: true }, {
      default: (field: QuireKitFormFieldSlotProps) => h(CheckboxGroup, { ...field.controlProps, modelValue: field.value as string[], label: 'Channels', items })
    })
  ]));
  const inputs = [...host.querySelectorAll<HTMLInputElement>('input[type=checkbox]')];
  expect(new Set(inputs.map(input => input.id)).size).toBe(2);
  expect(inputs.map(input => host.querySelector(`[id="${input.getAttribute('aria-labelledby')}"]`)?.textContent?.trim())).toEqual(['Email', 'Message']);
  await context.submit();
  await settle();
  expect(context.errors.value.channels).toBe('请填写Channels');
  expect(document.activeElement).toBe(inputs[0]);
});
