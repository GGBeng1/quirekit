import { inject } from "vue";
import type { InjectionKey } from "vue";
import type { QuireKitFormContext } from "./types";

/** One context per native QuireForm boundary. */
export const quireFormKey: InjectionKey<QuireKitFormContext> = Symbol("QuireForm");

/** Gets the enclosing form without creating a new VeeValidate authority.
 * @returns The existing form's public state and actions.
 */
export function useQuireForm(): QuireKitFormContext {
  const context = inject(quireFormKey);
  if (!context) throw new Error("useQuireForm requires a QuireForm ancestor.");
  return context;
}
