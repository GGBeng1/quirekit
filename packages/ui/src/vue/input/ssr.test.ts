import { createSSRApp, h, type VNodeChild } from "vue";
import { renderToString } from "vue/server-renderer";
import { describe, expect, it, vi } from "vitest";
import QuireLocaleProvider from "../locale-provider/locale-provider.vue";
import Input from "./input.vue";

describe("Input password server rendering", () => {
  it("starts masked with a focusable non-submit action tied to the named native input", async () => {
    const html = await renderInput({
      type: "password", id: "account-password", name: "password", modelValue: "example-secret",
      autocomplete: "current-password", form: "login", required: true, "aria-label": "账户密码"
    });
    const input = openingTag(html, "input");
    const button = openingTag(html, "button");
    expect(html.match(/<input\b/gu)).toHaveLength(1);
    for (const attribute of [
      'id="account-password"', 'type="password"', 'name="password"', 'value="example-secret"',
      'autocomplete="current-password"', 'form="login"', 'aria-label="账户密码"'
    ]) expect(input).toContain(attribute);
    expect(input).toMatch(/\srequired(?:[\s=>])/u);
    expect(button).toContain('type="button"');
    expect(button).toContain('tabindex="0"');
    expect(button).toContain('aria-controls="account-password"');
    expect(button).toContain('aria-label="显示密码"');
    expect(html).toContain('data-icon-name="eye"');
  });

  it.each([
    { name: "initial visibility", props: { defaultVisible: true }, type: "text", label: "隐藏密码", icon: "eyeOff" },
    { name: "controlled visible value", props: { visible: true, defaultVisible: false }, type: "text", label: "隐藏密码", icon: "eyeOff" },
    { name: "controlled hidden value", props: { visible: false, defaultVisible: true }, type: "password", label: "显示密码", icon: "eye" }
  ])("honors $name without emitting a visibility update during rendering", async ({ props, type, label, icon }) => {
    const updateVisible = vi.fn();
    const html = await renderInput({
      type: "password", ...props, "onUpdate:visible": updateVisible
    });
    const input = openingTag(html, "input");
    const button = openingTag(html, "button");
    const inputId = input.match(/\sid="([^"]+)"/u)?.[1];
    expect(inputId).toBeTruthy();
    expect(input).toContain(`type="${type}"`);
    expect(button).toContain(`aria-label="${label}"`);
    expect(button).toContain(`aria-controls="${inputId}"`);
    expect(html).toContain(`data-icon-name="${icon}"`);
    expect(updateVisible).not.toHaveBeenCalled();
  });

  it("can hide the visibility action while retaining a native password field", async () => {
    const html = await renderInput({ type: "password", visibilityToggle: false });
    expect(openingTag(html, "input")).toContain('type="password"');
    expect(html).not.toContain("<button");
    expect(html).not.toContain("visibilityToggle");
    expect(html).not.toContain("visibilitytoggle");
  });

  it.each([
    { name: "disabled", props: { disabled: true }, nativeAttribute: "disabled" },
    { name: "readonly", props: { readOnly: true }, nativeAttribute: "readonly" }
  ])("disables visibility changes for a $name password", async ({ props, nativeAttribute }) => {
    const html = await renderInput({ type: "password", ...props });
    expect(openingTag(html, "input")).toMatch(new RegExp(`\\s${nativeAttribute}(?:[\\s=>])`, "u"));
    expect(openingTag(html, "button")).toMatch(/\sdisabled(?:[\s=>])/u);
  });

  it.each(["text", "search", "email", "tel", "url"])("ignores password-only props on a %s field without leaking them into HTML", async (type) => {
    const html = await renderInput({
      type, name: "query", modelValue: "example", visible: true, defaultVisible: true,
      visibilityToggle: true
    });
    const input = openingTag(html, "input");
    expect(input).toContain(`type="${type}"`);
    expect(input).toContain('name="query"');
    expect(input).toContain('value="example"');
    expect(html).not.toContain("<button");
    expect(html).not.toMatch(/\s(?:visible|default-?visible|visibility-?toggle|show-?password-?label|hide-?password-?label)=/iu);
  });

  it("keeps clear and trailing content beside the password visibility action", async () => {
    const html = await renderInput({
      type: "password", modelValue: "example-secret", clearable: true
    }, { trailing: () => h("span", { "data-password-hint": "" }, "至少 8 位") });
    const buttons = html.match(/<button\b[^>]*>/gu) ?? [];
    expect(html.match(/<input\b/gu)).toHaveLength(1);
    expect(buttons).toHaveLength(2);
    expect(buttons.some((button) => button.includes('aria-label="显示密码"'))).toBe(true);
    expect(buttons.some((button) => button.includes('aria-label="清除输入"'))).toBe(true);
    expect(buttons.every((button) => button.includes('type="button"'))).toBe(true);
    expect(html).toContain('data-slot="trailing"');
    expect(html).toContain("data-password-hint");
    expect(html).toContain("至少 8 位");
  });

  it("names the clear and visibility actions in the provider language", async () => {
    const html = await renderToString(createSSRApp({
      render: () => h(QuireLocaleProvider, { locale: "en" }, () => h(Input, { type: "password", modelValue: "secret", clearable: true }))
    }));
    expect(html).toContain('aria-label="Show password"');
    expect(html).toContain('aria-label="Clear input"');
    expect(html).not.toMatch(/[\p{Script=Han}]/u);
  });
});

/**
 * Renders the public Input adapter without mounting or simulating browser interactions.
 * @param props Public and native input attributes supplied by a host.
 * @param slots Optional stable adornment content.
 * @returns The server-rendered input markup.
 */
async function renderInput(props: Record<string, unknown>, slots: Record<string, () => VNodeChild> = {}): Promise<string> {
  return renderToString(createSSRApp({ render: () => h(Input, props, slots) }));
}

/**
 * Reads one native control's opening tag without depending on attribute order.
 * @param html Server-rendered markup for one Input.
 * @param tag Native control tag to inspect.
 * @returns The control's opening tag and attributes.
 */
function openingTag(html: string, tag: "input" | "button"): string {
  const match = html.match(new RegExp(`<${tag}\\b[^>]*>`, "u"));
  expect(match, `Expected one native ${tag}`).not.toBeNull();
  return match?.[0] ?? "";
}
