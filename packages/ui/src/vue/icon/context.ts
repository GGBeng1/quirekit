import type { ComputedRef, InjectionKey } from "vue";
import type { QuireKitIconRegistry } from "../../components/icon";

/** Internal provider key for one product-owned icon registry. */
export const quireKitIconRegistryKey: InjectionKey<
  ComputedRef<QuireKitIconRegistry>
> = Symbol("quirekit-icon-registry");
