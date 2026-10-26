import type { FlowRuntime } from "../types";
import { resolveFlowRuntimeLocale } from "./messages";

/** @param runtime - Instance-owned presentation lifetime. @param present - Bounded native control label update. @returns Idempotent unsubscribe. */
export function bindFlowLocale(runtime: FlowRuntime, present: () => void): () => void {
  runtime.localeListeners.add(present); present();
  return () => { runtime.localeListeners.delete(present); };
}
/** @param runtime - Instance language authority. @param locale - Host preference; never a document mutation. */
export function setFlowLocale(runtime: FlowRuntime, locale: string): void {
  const next = resolveFlowRuntimeLocale(locale);
  if (runtime.destroyed || runtime.locale === next) return;
  runtime.locale = next;
  // Only mounted control labels depend on locale. No graph traversal, native
  // text commit, history operation, or content invalidation belongs here.
  runtime.localeListeners.forEach(present => present());
}
