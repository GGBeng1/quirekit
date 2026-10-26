import { inject, provide, ref } from "vue";
import type { InjectionKey } from "vue";
import type { QuireKitFormLifecycle } from "./types";
import { normalizeFormFieldPath } from "../form-field/path";

const lifecycleKey: InjectionKey<QuireKitFormLifecycle> = Symbol("QuireFormLifecycle");

/** Creates an instance-local lifecycle seam for reset and path ownership.
 * @returns Lifecycle controls used by the form controller.
 */
export function provideFormLifecycle(): QuireKitFormLifecycle {
  const paths = new Set<string>();
  const lifecycle: QuireKitFormLifecycle = {
    resetEpoch: ref(0),
    /** Claims a unique normalized VeeValidate path.
     * @param name - Declared field name.
     * @returns Function releasing only this registration.
     */
    register(name) {
      const path = normalizeFormFieldPath(name);
      if (!path) throw new Error("QuireFormField requires a nonempty name.");
      if (paths.has(path)) throw new Error(`Duplicate QuireFormField name "${name}".`);
      paths.add(path);
      return () => { paths.delete(path); };
    }
  };
  provide(lifecycleKey, lifecycle);
  return lifecycle;
}

/** Obtains the parent lifecycle without exposing its mutable generation publicly.
 * @returns The enclosing form lifecycle.
 */
export function useFormLifecycle(): QuireKitFormLifecycle {
  const lifecycle = inject(lifecycleKey);
  if (!lifecycle) throw new Error("QuireFormField requires a QuireForm ancestor.");
  return lifecycle;
}
