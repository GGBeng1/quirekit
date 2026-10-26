import { afterEach, vi } from "vitest";
import { createApp, h, nextTick, shallowRef } from "vue";
import MdProse from "../../vue/prose.vue";
import type { MdProseProps } from "../../vue/types";
import type { MdReadingError } from "../contributions/types";

const cleanups: (() => void)[] = [];
afterEach(() => { for (const cleanup of cleanups.splice(0)) cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });

/** @param initial - Public reading inputs. @returns A mounted consumer with observable errors and replaceable props. */
export function mountProse(initial: MdProseProps) {
  const props = shallowRef(initial), errors = vi.fn<(failure: MdReadingError) => void>(), unhandled = vi.fn<(error: unknown) => void>();
  const root = document.createElement("div"); document.body.append(root);
  const app = createApp({ render: () => h(MdProse, { ...props.value, onError: errors }) });
  app.config.errorHandler = unhandled;
  let active = true;
  /** Releases the actual Vue component and its pending work. */
  function dispose(): void { if (active) { active = false; app.unmount(); root.remove(); } }
  cleanups.push(dispose); app.mount(root);
  return { root, props, errors, unhandled, dispose,
    /** @param patch - Host input update. @returns Vue's accepted render tick. */
    async update(patch: Partial<MdProseProps>): Promise<void> { props.value = { ...props.value, ...patch }; await nextTick(); },
  };
}
