import type { HocuspocusProviderOptions, HocuspocusSessionManifest } from "./types";

/** @param options - Configured credential source. @returns Current credential, without logging or persistence. */
export async function credential(options: HocuspocusProviderOptions): Promise<string> {
  return typeof options.token === "function" ? options.token() : options.token ?? "";
}

/** @param options - Configured host endpoint. @param documentId - Requested identity. @param signal - Cancellation. @returns Validated transport additions to session admission. */
export async function openManifest(options: HocuspocusProviderOptions, documentId: string, signal: AbortSignal): Promise<HocuspocusSessionManifest> {
  const token = await credential(options); signal.throwIfAborted();
  const response = await (options.fetch ?? globalThis.fetch)(options.sessionEndpoint, { method: "POST", signal,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ documentId, protocolVersion: 1 }), redirect: "error" });
  if (!response.ok) throw new Error(`collaboration-admission-http-${response.status}`);
  const manifest = await response.json() as HocuspocusSessionManifest;
  if (!manifest || manifest.documentId !== documentId || typeof manifest.room !== "string" || !manifest.room
    || (manifest.connectionToken !== undefined && typeof manifest.connectionToken !== "string")) throw new Error("collaboration-invalid-admission");
  if (manifest.checkpointEndpoint) {
    const endpoint = new URL(manifest.checkpointEndpoint, options.sessionEndpoint), origin = new URL(options.sessionEndpoint).origin;
    if (endpoint.origin !== origin) throw new Error("collaboration-checkpoint-origin");
    return { ...manifest, checkpointEndpoint: endpoint.href };
  }
  return manifest;
}
