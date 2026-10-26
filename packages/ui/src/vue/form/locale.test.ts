// @vitest-environment happy-dom
import { h } from "vue";
import { expect, it } from "vitest";
import QuireLocaleProvider from "../locale-provider/locale-provider.vue";
import Form from "./form.vue";
import FormField from "../form-field/form-field.vue";
import { mountForm, settle } from "./testing";
import type { QuireKitFormFieldSlotProps } from "../form-field/types";

/**
 * Mounts a required field whose save fails without a message.
 * @param locale - Provider language.
 * @returns Mounted form fixture.
 */
async function mountFailingForm(locale: string) {
  return mountForm(probe => h(QuireLocaleProvider, { locale }, () => h(Form, {
    initialValues: { name: "" }, onSubmit: () => Promise.reject({}), onError: () => undefined
  }, () => [probe, h(FormField, { name: "name", label: locale === "en" ? "name" : "名称", required: true }, {
    default: (field: QuireKitFormFieldSlotProps) => h("input", { id: field.controlProps.id, value: field.value })
  })])));
}

it("renders required and submission feedback in the provider language", async () => {
  const fixture = await mountFailingForm("en");
  await fixture.context.submit();
  await settle();
  expect(fixture.host.textContent).toContain("Enter name");
  fixture.context.setFieldValue("name", "Draft");
  await fixture.context.submit();
  await settle();
  expect(fixture.host.textContent).toContain("Submission failed. Try again.");
  expect(fixture.host.innerHTML).not.toMatch(/[\p{Script=Han}]/u);
});

it("keeps Chinese feedback by default", async () => {
  const fixture = await mountFailingForm("zh-CN");
  await fixture.context.submit();
  await settle();
  expect(fixture.host.textContent).toContain("请填写名称");
});
