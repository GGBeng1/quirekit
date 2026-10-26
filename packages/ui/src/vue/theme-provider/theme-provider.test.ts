// @vitest-environment happy-dom
import { createApp, createSSRApp, h, nextTick, shallowRef, Teleport } from "vue";
import { renderToString } from "vue/server-renderer";
import { afterEach, expect, it, vi } from "vitest";
import { createTheme, defaultTheme } from "../../theme";
import { createUiThemeCssVariables } from "../../styles/theme";
import { QuireThemeProvider } from "./index";
import QuireThemeSurface from "./surface.vue";

const color = "--qk-color-action-primary";
const dark = createTheme({ scheme: "dark", sources: { primary: "#7257d5" } });
const cleanups: Array<() => void> = [];
afterEach(() => {
  cleanups.splice(0).reverse().forEach(cleanup => cleanup());
  vi.restoreAllMocks();
});

/**
 * Creates a connected mount/portal destination and registers its disposal.
 * @param owner - Document owning the destination, including another document.
 * @returns Empty connected destination.
 */
function container(owner: Document = document): HTMLDivElement {
  const element = owner.createElement("div");
  owner.body.append(element);
  cleanups.push(() => element.remove());
  return element;
}

it("preserves the original DOM and global theme when no provider exists", () => {
  const host = container();
  const app = createApp({ render: () => h(QuireThemeSurface, {}, () => h("button", "Plain")) });
  app.mount(host);
  cleanups.push(() => app.unmount());
  expect(host.children).toHaveLength(1);
  expect(host.firstElementChild?.tagName).toBe("BUTTON");
  expect(host.querySelector("[data-qk-theme-surface]")).toBeNull();
});

it("isolates nested scopes and another Document while retaining styles across content updates", async () => {
  const host = container();
  const target = container(document.implementation.createHTMLDocument("portal"));
  const theme = shallowRef(defaultTheme);
  const label = shallowRef("First");
  const app = createApp({ render: () => h(QuireThemeProvider, { theme: theme.value }, () => [
    h("button", label.value),
    h(Teleport, { to: target }, h(
      QuireThemeSurface,
      { layout: "bridge" },
      () => h("button", label.value)
    )),
    h(QuireThemeProvider, { theme: dark }, () => h("span", "Nested")),
  ]) });
  app.mount(host);
  cleanups.push(() => app.unmount());
  await nextTick();
  const outer = host.querySelector<HTMLElement>("[data-qk-theme-surface]")!;
  const inner = outer.querySelector<HTMLElement>("[data-qk-theme-surface]")!;
  const portal = target.querySelector<HTMLElement>("[data-qk-theme-surface]")!;
  expect(outer.style.display).toBe("contents");
  expect(portal.style.display).toBe("block");
  expect(portal.style.position).toBe("absolute");
  expect(outer.style.position).toBe("");
  expect(outer.dataset.qkScheme).toBe("light");
  expect(inner.dataset.qkScheme).toBe("dark");
  expect(portal.dataset.qkScheme).toBe("light");
  expect(portal.style.getPropertyValue(color)).toBe(defaultTheme.color.action.primary);
  expect(inner.style.getPropertyValue(color)).toBe(dark.color.action.primary);

  const writes = vi.spyOn(CSSStyleDeclaration.prototype, "setProperty");
  for (const value of ["Second", "Third", "Fourth"]) {
    label.value = value;
    await nextTick();
  }
  expect(target.textContent).toContain("Fourth");
  expect(writes.mock.calls.filter(([name]) => name.startsWith("--qk-"))).toHaveLength(0);

  theme.value = dark;
  await nextTick();
  expect(outer.style.getPropertyValue(color)).toBe(dark.color.action.primary);
  expect(portal.style.getPropertyValue(color)).toBe(dark.color.action.primary);
  expect(portal.style.colorScheme).toBe("dark");
  expect(outer.dataset.qkScheme).toBe("dark");
  expect(portal.dataset.qkScheme).toBe("dark");
  expect(host.querySelector("[data-qk-theme-surface]")).toBe(outer);
  expect(target.querySelector("[data-qk-theme-surface]")).toBe(portal);
  app.unmount();
  expect(target.childElementCount).toBe(0);
  cleanups.pop();
});

it("keeps independent app themes separate without global style registrations", async () => {
  const first = container();
  const second = container();
  const theme = shallowRef(defaultTheme);
  const rootStyle = document.documentElement.getAttribute("style");
  const head = document.head.innerHTML;
  const app = createApp({ render: () => h(QuireThemeProvider, { theme: theme.value }, () => "A") });
  const other = createApp({ render: () => h(QuireThemeProvider, { theme: defaultTheme }, () => "B") });
  app.mount(first);
  other.mount(second);
  cleanups.push(() => app.unmount(), () => other.unmount());
  theme.value = dark;
  await nextTick();
  expect((first.firstElementChild as HTMLElement).style.getPropertyValue(color)).toBe(dark.color.action.primary);
  expect((second.firstElementChild as HTMLElement).style.getPropertyValue(color)).toBe(defaultTheme.color.action.primary);
  expect(document.documentElement.getAttribute("style")).toBe(rootStyle);
  expect(document.head.innerHTML).toBe(head);
});

it("renders the theme on the server and hydrates its existing scope", async () => {
  const view = () => h(QuireThemeProvider, { theme: dark }, () => h("button", "Hydrate"));
  const html = await renderToString(createSSRApp({ render: view }));
  expect(html).toContain(`${color}:${dark.color.action.primary}`);
  expect(html).toContain("display:contents");
  expect(html).toContain('data-qk-scheme="dark"');
  const host = container();
  host.innerHTML = html;
  const surface = host.firstElementChild;
  const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  const app = createSSRApp({ render: view });
  app.mount(host);
  cleanups.push(() => app.unmount());
  expect(host.firstElementChild).toBe(surface);
  expect(warn.mock.calls).toEqual([]);
  for (const [name, value] of Object.entries(createUiThemeCssVariables(dark))) {
    expect((surface as HTMLElement).style.getPropertyValue(name)).toBe(value);
  }
});
