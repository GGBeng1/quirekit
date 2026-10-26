import type {
  ClassicEditorHostAcquireIntent,
  ClassicEditorHostAdapterRequest,
  ClassicEditorHostOpenIntent,
  ClassicEditorHostResolveIntent,
  ClassicEditorHostServices,
  ClassicEditorHostUploadIntent
} from "../../types/host";

/** Creates deterministic denied adapters without browser, network, or storage effects. */
export function createDefaultClassicEditorHostServices(): ClassicEditorHostServices {
  return Object.freeze({
    acquire: async (request: ClassicEditorHostAdapterRequest<ClassicEditorHostAcquireIntent>) => rejected(request),
    resolve: async (request: ClassicEditorHostAdapterRequest<ClassicEditorHostResolveIntent>) => rejected(request),
    upload: async (request: ClassicEditorHostAdapterRequest<ClassicEditorHostUploadIntent>) => rejected(request),
    open: async (request: ClassicEditorHostAdapterRequest<ClassicEditorHostOpenIntent>) => rejected(request)
  });
}

/**
 * Creates a matching denied result for the default no-effect adapter.
 *
 * @param request - Coordinator-bound typed request.
 * @returns Matching rejected result.
 */
function rejected<Intent extends import("../../types/host").ClassicEditorHostResourceIntent>(
  request: ClassicEditorHostAdapterRequest<Intent>
): Extract<import("../../types/host").ClassicEditorHostResourceResult, { readonly kind: Intent["kind"] }> {
  return Object.freeze({
    kind: request.intent.kind,
    jobId: request.intent.jobId,
    operationId: request.intent.operationId,
    attempt: request.intent.attempt,
    generation: request.intent.generation,
    outcome: "denied",
    diagnostic: Object.freeze({ code: "host-adapter-unavailable", retryable: false })
  }) as Extract<import("../../types/host").ClassicEditorHostResourceResult, { readonly kind: Intent["kind"] }>;
}
