// @vitest-environment happy-dom
import { createApp, createSSRApp, h } from "vue";
import { afterEach, expect, it, vi } from "vitest";
import { renderToString } from "vue/server-renderer";
import DialogRoot from "../dialog/root.vue";
import DialogContent from "../dialog/content.vue";
import DrawerRoot from "../drawer/root.vue";
import DrawerContent from "../drawer/content.vue";
import ColorPicker from "../color-picker/color-picker.vue";
import PopoverRoot from "./root.vue";
import PopoverContent from "./content.vue";
import PopoverTrigger from "./trigger.vue";
import TooltipRoot from "../tooltip/root.vue";
import TooltipTrigger from "../tooltip/trigger.vue";
import TooltipContent from "../tooltip/content.vue";
import { QuireThemeProvider } from "../theme-provider";
import { defaultTheme } from "../../theme";

const cleanup: Array<() => void> = [];
afterEach(() => cleanup.splice(0).forEach(dispose => dispose()));

it("preserves caller sizing and supports explicit or anchor-width list surfaces", async () => {
  const cases = [
    { props: { style: { width: '260px' } }, expected: ['width:260px'] },
    { props: { width: 240 }, expected: ['width:240px'] },
    { props: { width: 'anchor', padding: 'none' as const }, expected: ['width:min(var(--reference-width), calc(100vw - 16px))', 'padding:0', 'gap:0'] }
  ];
  for (const { props, expected } of cases) {
    const app = createSSRApp({ render: () => h(PopoverRoot, { defaultOpen: true }, {
      default: () => [h(PopoverTrigger, {}, () => 'Options'), h(PopoverContent, props, () => 'Commands')]
    }) });
    const html = await renderToString(app);
    for (const style of expected) expect(html).toContain(style);
  }
});

it("does not forward scoped style attributes to the renderless provider", async () => {
  const warnings: string[] = [];
  const app = createSSRApp({ render: () => h(PopoverRoot, { "data-v-theme": "" }, {
    default: () => [h(PopoverTrigger, {}, () => "Theme"), h(PopoverContent, {}, () => "Options")]
  }) });
  app.config.warnHandler = message => { warnings.push(message); };
  expect(await renderToString(app)).toContain("Theme");
  expect(warnings.filter(message => message.includes("Extraneous non-props attributes"))).toEqual([]);
});

for (const owner of ["page", "dialog", "drawer"] as const) {
  for (const themed of [false, true]) {
    it(`preserves the ${owner} owner when popups teleport to body, themed=${themed}`, async () => {
      const host = document.createElement("div");
      document.body.append(host);
      /** @returns Real popup components that keep their default body portal behavior. */
      function popups() {
        return [
          h(PopoverRoot, { defaultOpen: true, autoFocus: false }, {
            default: () => [h(PopoverTrigger, {}, () => "Options"), h(PopoverContent, {}, () => h("button", "Option"))]
          }),
          h(ColorPicker, { defaultOpen: true, label: "Accent" }),
          h(TooltipRoot, { open: true }, { default: () => [
            h(TooltipTrigger, {}, () => "Help"), h(TooltipContent, { content: "Explanation" })
          ] })
        ];
      }
      /** @returns The original modal/page owner, independently of the enclosing theme scope. */
      function renderOwner() {
        const options = { defaultOpen: true, trapFocus: false, preventScroll: false, restoreFocus: false };
        if (owner === "dialog") return h(DialogRoot, options, {
          default: () => h(DialogContent, { title: "Document" }, { default: popups })
        });
        if (owner === "drawer") return h(DrawerRoot, options, {
          default: () => h(DrawerContent, { title: "Document" }, { default: popups })
        });
        return h("main", {}, popups());
      }
      const app = createApp({ render: () => themed
        ? h(QuireThemeProvider, { theme: defaultTheme }, { default: renderOwner })
        : renderOwner()
      });
      app.mount(host);
      cleanup.push(() => { app.unmount(); host.remove(); });
      for (const family of ["popover", "color-picker", "tooltip"]) {
        await vi.waitFor(() => expect(document.querySelector(`.qk-${family}__positioner`)).not.toBeNull());
        const positioner = document.querySelector(`.qk-${family}__positioner`)!;
        await vi.waitFor(() => expect(themed ? positioner.parentElement?.parentElement : positioner.parentElement).toBe(document.body));
        if (themed) expect((positioner.parentElement as HTMLElement).style.getPropertyValue("--qk-color-selection-document"))
          .toBe(defaultTheme.color.selection.document);
        expect(positioner.closest('[aria-hidden="true"]')).toBeNull();
        if (family === "popover") {
          const content = positioner.querySelector('.qk-popover__content')!;
          expect((content as HTMLElement).style.maxHeight).toBe("min(60dvh, var(--available-height, calc(100dvh - 16px)))");
          const arrow = positioner.querySelector('.qk-popover__arrow')!;
          expect(arrow.parentElement).toBe(positioner);
          expect(content.contains(arrow)).toBe(false);
          expect(arrow.getAttribute('aria-hidden')).toBe('true');
        }
        if (family !== "tooltip") expect(positioner.classList.contains(`qk-${family}__positioner--modal`)).toBe(owner !== "page");
      }
    });
  }
}


it("server-renders each popup beside its trigger before attaching the body portal", async () => {
  const context: { teleports?: Record<string, string> } = {};
  const app = createSSRApp({ render: () => h(PopoverRoot, { defaultOpen: true, autoFocus: false }, {
    default: () => [h(PopoverTrigger, {}, () => "Options"), h(PopoverContent, {}, () => "Popup body")]
  }) });
  const html = await renderToString(app, context);
  expect(html).toContain('qk-popover__content');
  expect(html).toContain('Popup body');
  expect(context.teleports?.body ?? '').not.toContain('qk-popover__content');
});
