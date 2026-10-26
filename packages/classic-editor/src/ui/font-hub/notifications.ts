import type { InjectionKey } from "vue";
import type { QuireKitToaster } from "@quirekit/ui/vue";

/** One dialog-owned notification queue shared by its lazily mounted views. */
export const fontHubToasterKey: InjectionKey<QuireKitToaster> = Symbol("font-hub-toaster");
