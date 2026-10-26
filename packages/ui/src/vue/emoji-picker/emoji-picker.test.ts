// @vitest-environment happy-dom
import { createApp, h, nextTick } from "vue";
import { afterEach, describe, expect, it } from "vitest";
import EmojiPicker from "./emoji-picker.vue";
import QuireLocaleProvider from "../locale-provider/locale-provider.vue";
import type { QuireKitEmojiPickerProps } from "../../components/emoji-picker";

const cleanup: (() => void)[] = [];
afterEach(() => { cleanup.splice(0).forEach(dispose => dispose()); });

/** @param props - Public picker contract. @param locale - Interface language, if any. @returns Mounted element and explicit choices. */
function mount(props: QuireKitEmojiPickerProps = {}, locale?: string) {
  const host = document.createElement("div"), choices: string[] = [];
  document.body.append(host);
  const picker = () => h(EmojiPicker, { ...props, onSelect: item => choices.push(item.value) });
  const app = createApp({ render: () => locale === undefined ? picker() : h(QuireLocaleProvider, { locale }, picker) });
  app.mount(host);
  cleanup.push(() => { app.unmount(); host.remove(); });
  return { host, choices };
}

describe("continuous emoji picker", () => {
  it("renders shortcuts and every category in one shared custom scroll area", () => {
    const { host, choices } = mount();
    expect(host.querySelectorAll(".qk-scroll-area__viewport")).toHaveLength(1);
    expect(host.querySelectorAll(".qk-scroll-area__scrollbar")).toHaveLength(1);
    expect(host.querySelectorAll("[data-emoji-section]")).toHaveLength(8);
    expect(host.querySelector('[data-emoji-section="common"]')?.querySelectorAll('[role="option"]')).toHaveLength(10);
    expect(host.querySelector('[data-emoji-section="category:symbols"]')).not.toBeNull();
    expect(choices).toEqual([]);
  });

  it("deduplicates search across shortcuts and categories and emits the exact Unicode only on selection", async () => {
    const { host, choices } = mount({ recent: ["🧑‍💻"] }, "en");
    const input = host.querySelector("input")!;
    expect(host.querySelectorAll('[data-emoji-section="recent"] [role="option"]')).toHaveLength(1);
    input.value = "developer";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await nextTick();
    expect(host.querySelectorAll("[data-emoji-section]")).toHaveLength(0);
    const options = host.querySelectorAll<HTMLElement>('[role="option"]');
    expect(options).toHaveLength(1);
    expect(choices).toEqual([]);
    options[0]!.click();
    expect(choices).toEqual(["🧑‍💻"]);
    input.value = "no-match";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await nextTick();
    expect(host.textContent).toContain("No matching emoji");
    expect(host.textContent).not.toMatch(/[\p{Script=Han}]/u);
  });

  it("allows hiding common shortcuts and preserves disabled controls", () => {
    const { host, choices } = mount({ common: [], disabled: true });
    expect(host.querySelector('[data-emoji-section="common"]')).toBeNull();
    expect(host.querySelector("input")?.disabled).toBe(true);
    host.querySelector<HTMLElement>('[role="option"]')?.click();
    expect(choices).toEqual([]);
  });
});
