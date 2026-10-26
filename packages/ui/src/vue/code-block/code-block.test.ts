// @vitest-environment happy-dom
import { createApp, h, nextTick, ref } from "vue";
import type { VNode } from "vue";
import { afterEach, expect, it, vi } from "vitest";
import { QuireCodeBlock, QuireCodeBlockHeader } from "./index";
import QuireLocaleProvider from "../locale-provider/locale-provider.vue";
import type { QuireKitCodeBlockLineSlotProps, QuireKitCodeBlockNavigationSlotProps } from "./types";

const cleanups: Array<() => void> = [];
afterEach(() => {
  cleanups.splice(0).forEach((cleanup) => cleanup());
  vi.restoreAllMocks();
});

it("shares a standalone header and reads live editor code only at explicit copy", async () => {
  let source = "first\n";
  const getCode = vi.fn(() => source);
  const write = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
  const label = ref("typescript");
  const host = mount(() => h(QuireCodeBlockHeader, { language: label.value, getCode }));
  label.value = "javascript";
  await nextTick();
  expect(getCode).not.toHaveBeenCalled();
  source = "  latest\r\n\n";
  host.querySelector<HTMLButtonElement>('[aria-label="复制代码"]')!.click();
  await vi.waitFor(() => expect(write).toHaveBeenCalledWith(source));
  expect(getCode).toHaveBeenCalledOnce();
  expect(host.querySelector("pre")).toBeNull();
});
it("reads copy, collapse and fallback names from the active language", async () => {
  const host = mount(() => h(QuireLocaleProvider, { locale: "en" }, () => [
    h(QuireCodeBlock, { code: "pnpm i", collapsible: true }),
    h(QuireCodeBlock, { code: "pnpm i", header: false }),
  ]));
  expect(host.querySelectorAll('[aria-label="Copy code"]')).toHaveLength(2);
  expect(host.querySelector(".qk-code-block__filename")?.textContent).toBe("Code");
  expect(host.querySelector("pre")?.getAttribute("aria-label")).toBe("Code");
  const toggle = host.querySelector<HTMLButtonElement>(".qk-code-block__toggle")!;
  expect(toggle.getAttribute("aria-label")).toBe("Expand code");
  expect(toggle.getAttribute("aria-expanded")).toBe("false");
  expect(toggle.textContent?.trim()).toBe("");
  expect(host.querySelector("pre")!.hidden).toBe(true);
  expect(toggle.querySelector("svg")).not.toBeNull();
  toggle.click();
  await nextTick();
  expect(toggle.getAttribute("aria-label")).toBe("Collapse code");
  expect(toggle.getAttribute("aria-expanded")).toBe("true");
  expect(host.querySelector("pre")!.hidden).toBe(false);
  expect(host.innerHTML).not.toMatch(/[\p{Script=Han}]/u);
});
/** @param render - Reactive consumer. @returns Mounted native host. */
function mount(render: () => VNode) {
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({ render });
  app.mount(host);
  cleanups.push(() => {
    app.unmount();
    host.remove();
  });
  return host;
}
it("escapes source text and copies exactly the original string even with a custom renderer", async () => {
  const source = '<script>alert("x")</script>\r\n  const value = 1;\n\n';
  const write = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
  const copied = vi.fn();
  const host = mount(() =>
    h(QuireCodeBlock, { code: source, filename: "example.ts", onCopy: copied })
  );
  expect(host.querySelector("script")).toBeNull();
  expect(host.querySelector("pre")!.textContent).toBe(source);
  host.querySelector<HTMLButtonElement>('[aria-label="复制代码"]')!.click();
  await vi.waitFor(() => expect(copied).toHaveBeenCalledOnce());
  expect(write).toHaveBeenCalledWith(source);
  const highlighted = mount(() =>
    h(
      QuireCodeBlock,
      { code: source },
      { code: () => h("code", "different visual representation") }
    )
  );
  highlighted
    .querySelector<HTMLButtonElement>('[aria-label="复制代码"]')!
    .click();
  await vi.waitFor(() => expect(write).toHaveBeenCalledTimes(2));
  expect(write.mock.calls[1]![0]).toBe(source);
});
it("supports controlled collapse and returns focus before hiding the viewport", async () => {
  const collapsed = ref(false);
  const host = mount(() =>
    h(QuireCodeBlock, {
      code: "hello",
      collapsible: true,
      collapsed: collapsed.value,
      "onUpdate:collapsed": (value) => {
        collapsed.value = value;
      },
    })
  );
  const pre = host.querySelector("pre")!;
  const button = host.querySelector<HTMLButtonElement>("[aria-expanded]")!;
  expect(button.getAttribute("aria-controls")).toBe(pre.id);
  pre.focus();
  collapsed.value = true;
  await nextTick();
  expect(pre.hidden).toBe(true);
  expect(document.activeElement).toBe(button);
  button.click();
  await nextTick();
  expect(pre.hidden).toBe(false);
  expect(button.getAttribute("aria-expanded")).toBe("true");
});
it("keeps uncontrolled collapse optional, handles empty code and finite heights", async () => {
  const host = mount(() =>
    h(QuireCodeBlock, {
      code: "",
      collapsible: true,
      defaultCollapsed: true,
      maxHeight: Number.NaN,
    })
  );
  expect(host.querySelector("pre")!.hidden).toBe(true);
  expect(host.querySelector("pre")!.style.maxHeight).toBe("400px");
  expect(
    host.querySelector<HTMLButtonElement>('[aria-label="复制代码"]')!.disabled
  ).toBe(true);
  host.querySelector<HTMLButtonElement>("[aria-expanded]")!.click();
  await nextTick();
  expect(host.querySelector("pre")!.hidden).toBe(false);
  const plain = mount(() =>
    h(QuireCodeBlock, { code: "plain", collapsed: true, copy: false })
  );
  expect(plain.querySelector("button")).toBeNull();
  expect(plain.querySelector("pre")!.hidden).toBe(false);
});

it("keeps headerless copy available and preserves a way to expand collapsible content", async () => {
  const write = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
  const code = ref("pnpm add example");
  const host = mount(() => h(QuireCodeBlock, { code: code.value, header: false, scheme: "dark" }));
  expect(host.querySelector('.qk-code-block__header')).toBeNull();
  expect(host.querySelector('[data-qk-scheme="dark"]')).not.toBeNull();
  expect((host.firstElementChild as HTMLElement).style.getPropertyValue('--qk-type-code-font-family')).toBe('');
  code.value = "npm install example\r\n";
  await nextTick();
  host.querySelector<HTMLButtonElement>('button')!.click();
  await vi.waitFor(() => expect(write).toHaveBeenCalledWith(code.value));
  const collapsible = mount(() => h(QuireCodeBlock, { code: "example", header: false, collapsible: true, defaultCollapsed: true }));
  collapsible.querySelector<HTMLButtonElement>('[aria-expanded="false"]')!.click();
  await nextTick();
  expect(collapsible.querySelector('pre')!.hidden).toBe(false);
});

it("numbers and annotates rendered lines without changing original copy or trusted tokens", async () => {
  const source = 'one\r\n\r\nthree\r\n';
  const write = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
  const host = mount(() => h(QuireCodeBlock, {
    code: source, lineNumbers: true, startLine: 10, highlightedLines: [11], addedLines: [12], removedLines: [12],
  }, { line: ({ text, number }: QuireKitCodeBlockLineSlotProps) => h('em', { 'data-number': number }, text) }));
  expect([...host.querySelectorAll('.qk-code-block__number')].map(el => el.textContent)).toEqual(['10', '11', '12']);
  expect(host.querySelector('[data-highlighted] em')!.textContent).toBe('');
  expect(host.querySelector('[data-change="removed"] em')!.textContent).toBe('three');
  host.querySelector<HTMLButtonElement>('button')!.click();
  await vi.waitFor(() => expect(write).toHaveBeenCalledWith(source));
  const complete = mount(() => h(QuireCodeBlock, { code: source, lineNumbers: true }, { code: () => h('code', 'external renderer') }));
  expect(complete.querySelector('.qk-code-block__number')).toBeNull();
});

it("exposes a stable navigation panel and additional actions without duplicating copy", () => {
  const host = mount(() => h(QuireCodeBlock, { code: 'text', header: false }, {
    title: () => 'config.ts',
    actions: () => h('button', 'Download'),
    navigation: ({ contentId }: QuireKitCodeBlockNavigationSlotProps) => h('a', { href: `#${contentId}` }, 'File'),
  }));
  expect(host.querySelector('a')!.hash).toBe(`#${host.querySelector('[role="tabpanel"]')!.id}`);
  expect(host.querySelectorAll('[aria-label="复制代码"]')).toHaveLength(1);
  expect(host.querySelector('.qk-code-block__header')!.textContent).toContain('Download');
});
