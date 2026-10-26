import { createApp, defineComponent, h, nextTick } from "vue";
import type { VNode } from "vue";
import { afterEach } from "vitest";
import { useQuireForm } from "./context";
import type { QuireKitFormContext } from "./types";

const cleanups: Array<() => void> = [];
afterEach(() => cleanups.splice(0).forEach(cleanup => cleanup()));

/** Flushes Vue renders and VeeValidate's asynchronous validation queue.
 * @returns Completion after pending validation work.
 */
export async function settle(): Promise<void> {
  await nextTick();
  await new Promise(resolve => setTimeout(resolve, 15));
  await nextTick();
}

/** Mounts a form with a descendant that captures its public context.
 * @param render - Form tree receiving a context probe component.
 * @returns Mounted host and the injected form context.
 */
export async function mountForm(render: (probe: VNode) => VNode) {
  let context!: QuireKitFormContext;
  const probe = defineComponent({ setup() { context = useQuireForm(); return () => null; } });
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({ render: () => render(h(probe)) });
  app.mount(host);
  cleanups.push(() => { app.unmount(); host.remove(); });
  await settle();
  return { host, get context() { return context; } };
}
