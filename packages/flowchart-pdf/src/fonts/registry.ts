import type { FlowchartPdfFontProvider } from "../types";
import type { FontRegistration } from "./types";

const providers = new WeakMap<Document, FontRegistration>();
/** @param owner - Application browser document. @param provider - Explicit resource authority. @returns Idempotent disposer that preserves later or prior active registrations. */
export function provideFlowchartPdfFonts(owner: Document, provider: FlowchartPdfFontProvider): () => void {
  const registration: FontRegistration = { provider, previous: providers.get(owner), active: true }; providers.set(owner, registration);
  return () => {
    registration.active = false;
    if (providers.get(owner) !== registration) return;
    let previous = registration.previous; while (previous && !previous.active) previous = previous.previous;
    if (previous) providers.set(owner, previous); else providers.delete(owner);
  };
}
/** @param owner - Export document. @returns Current explicit font authority, frozen by the caller at task creation. */
export function readPdfFontProvider(owner: Document): FlowchartPdfFontProvider | undefined { return providers.get(owner)?.provider; }
