// @vitest-environment happy-dom
import { createApp, defineComponent, h, nextTick, reactive } from "vue";
import { afterEach, expect, it } from "vitest";
import PresetGallery from "./preset-gallery.vue";

const cleanups: Array<() => void> = [];
afterEach(() => cleanups.splice(0).reverse().forEach(cleanup => cleanup()));

/** @returns A controlled gallery with independent value and submission evidence. */
async function mountGallery() {
  const host = document.createElement("div");
  document.body.append(host);
  const state = reactive({ value: "body", highlighted: "body", disabled: false, bodyDisabled: false });
  const changes: Array<string | null> = [];
  const selected: string[] = [];
  const app = createApp(defineComponent({ setup: () => () => h(PresetGallery, {
    label: "Styles", items: [
      { value: "body", label: "Body", disabled: state.bodyDisabled },
      { value: "title", label: "Title" },
      { value: "locked", label: "Locked", disabled: true }
    ], modelValue: state.value, highlightedValue: state.highlighted, disabled: state.disabled,
    "onUpdate:modelValue": (value: string | null) => { if (value !== null) state.value = value; },
    "onUpdate:highlightedValue": (value: string | null | undefined) => { if (typeof value === "string") state.highlighted = value; },
    onValueChange: value => changes.push(value), onSelect: value => selected.push(value)
  }) }));
  app.mount(host);
  cleanups.push(() => { app.unmount(); host.remove(); });
  await nextTick();
  const content = host.querySelector<HTMLElement>('[role="listbox"]')!;
  return { host, content, state, changes, selected };
}

it("submits every valid click once while valueChange only reports changed values", async () => {
  const fixture = await mountGallery();
  const body = fixture.host.querySelector<HTMLElement>('[data-value="body"]')!;
  const title = fixture.host.querySelector<HTMLElement>('[data-value="title"]')!;
  body.click();
  await nextTick();
  expect(fixture.selected).toEqual(["body"]);
  expect(fixture.changes).toEqual([]);
  title.click();
  await nextTick();
  title.click();
  await nextTick();
  expect(fixture.selected).toEqual(["body", "title", "title"]);
  expect(fixture.changes).toEqual(["title"]);
  fixture.state.value = "body";
  await nextTick();
  expect(fixture.selected).toEqual(["body", "title", "title"]);
});

it("submits Enter and Space exactly once, including the selected item, without submitting navigation", async () => {
  const fixture = await mountGallery();
  fixture.content.focus();
  for (const key of ["Enter", " "]) {
    fixture.content.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
    await nextTick();
  }
  expect(fixture.selected).toEqual(["body", "body"]);
  expect(fixture.changes).toEqual([]);
  fixture.content.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }));
  await nextTick();
  expect(fixture.selected).toEqual(["body", "body"]);
  fixture.content.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
  await nextTick();
  expect(fixture.selected).toEqual(["body", "body", "title"]);
  expect(fixture.changes).toEqual(["title"]);
});

it("rejects disabled, cancelled, secondary and composing activation", async () => {
  const fixture = await mountGallery();
  const body = fixture.host.querySelector<HTMLElement>('[data-value="body"]')!;
  const locked = fixture.host.querySelector<HTMLElement>('[data-value="locked"]')!;
  locked.click();
  const cancelled = new MouseEvent("click", { bubbles: true, cancelable: true });
  cancelled.preventDefault();
  body.dispatchEvent(cancelled);
  body.dispatchEvent(new MouseEvent("click", { bubbles: true, button: 2 }));
  fixture.content.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", isComposing: true, bubbles: true }));
  fixture.state.bodyDisabled = true;
  await nextTick();
  body.click();
  fixture.content.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true, cancelable: true }));
  fixture.state.disabled = true;
  fixture.state.bodyDisabled = false;
  await nextTick();
  body.click();
  fixture.content.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
  expect(fixture.selected).toEqual([]);
  expect(fixture.changes).toEqual([]);
});
