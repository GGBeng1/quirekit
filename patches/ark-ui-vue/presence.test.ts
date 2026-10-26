import { createApp, h, nextTick, ref } from "vue";
import { expect, it, vi } from "vitest";
import { Menu } from "@ark-ui/vue/menu";

/** Waits for Presence's deferred animation listeners to attach. @returns The completed frame pair. */
async function animationFrames(): Promise<void> {
  await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
  await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
}

for (const unmountOnExit of [false, true]) {
  for (const motion of ["animation", "none", "reduced"] as const) {
    it(`preserves bare Ark lifecycle with ${motion} and unmountOnExit=${unmountOnExit}`, async () => {
      // Keep Vue diagnostics observable; the spy forwards every message to the original console.
      const warnings = vi.spyOn(console, "warn");
      const host = document.createElement("div");
      document.body.append(host);
      const open = ref(false);
      const enter = vi.fn();
      const exit = vi.fn();
      const app = createApp({
        render: () => h(Menu.Root, {
          open: open.value,
          unmountOnExit,
          "onUpdate:open": (value: boolean) => { open.value = value; },
          onEnterComplete: enter,
          onExitComplete: exit
        }, { default: () => [
          h(Menu.Trigger, {}, () => "Open actions"),
          h(Menu.Positioner, {}, () => h(Menu.Content, {
            style: {
              animationName: motion === "none" ? "none" : open.value ? "probe-enter" : "probe-exit",
              animationDuration: motion === "reduced" ? "0s" : "1s"
            }
          }, () => h(Menu.Item, { value: "apply" }, () => "Apply")))
        ] })
      });
      try {
        app.mount(host);
        await nextTick();
        const trigger = host.querySelector<HTMLButtonElement>("button")!;
        let initialEnterCount = 0;
        // The first transition establishes upstream Presence's initial-mount policy unchanged.
        // Two subsequent full cycles prove enter/exit delivery and cleanup across reopening.
        for (let cycle = 0; cycle < 3; cycle += 1) {
          trigger.click();
          await vi.waitFor(() => expect(open.value).toBe(true));
          const content = host.querySelector<HTMLElement>('[data-part="content"]')!;
          await vi.waitFor(() => expect(content.dataset.state).toBe("open"));
          await animationFrames();
          if (motion === "animation") {
            content.dispatchEvent(new AnimationEvent("animationend", { animationName: "probe-enter", bubbles: true }));
          }
          await nextTick();
          if (cycle === 0) initialEnterCount = enter.mock.calls.length;
          else expect(enter).toHaveBeenCalledTimes(initialEnterCount + cycle);
          // Duplicate completion events must not emit a second callback.
          content.dispatchEvent(new AnimationEvent("animationend", { animationName: "probe-enter", bubbles: true }));
          expect(enter).toHaveBeenCalledTimes(initialEnterCount + cycle);
          trigger.click();
          await vi.waitFor(() => expect(open.value).toBe(false));
          await animationFrames();
          if (motion === "animation") {
            content.dispatchEvent(new AnimationEvent("animationend", { animationName: "probe-exit", bubbles: true }));
          }
          await vi.waitFor(() => expect(exit).toHaveBeenCalledTimes(cycle + 1));
          await vi.waitFor(() => {
            if (unmountOnExit) expect(host.querySelector('[data-part="content"]')).toBeNull();
            else expect(content.hidden).toBe(true);
          });
        }
        expect(enter.mock.calls.length).toBeGreaterThanOrEqual(2);
        expect(warnings.mock.calls).toEqual([]);
      } finally {
        app.unmount();
        host.remove();
        warnings.mockRestore();
      }
    });
  }
}
