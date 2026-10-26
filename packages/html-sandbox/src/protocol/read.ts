import type { SandboxMessage } from "./types";
/** Read only a small set of scalar fields; never spread a guest payload.
 * @param value - Untrusted structured-cloned message. @param runId - Current generation. @returns Valid envelope or null.
 */
export function readMessage(value: unknown, runId: number): SandboxMessage | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const data = value as Record<string, unknown>;
  if (data.version !== 1 || data.runId !== runId) return null;
  if (data.type === "ready" || data.type === "exit") return { version: 1, runId, type: data.type };
  if (data.type === "resize" && typeof data.height === "number" && Number.isFinite(data.height) && data.height >= 0 && data.height <= 100_000) return { version: 1, runId, type: "resize", height: data.height };
  if ((data.type === "diagnostic" || data.type === "failed") && typeof data.message === "string" && data.message.length <= 4096 && new TextEncoder().encode(data.message).length <= 4096 && typeof data.code === "string" && data.code.length <= 80 && typeof data.level === "string" && ["info", "warn", "error"].includes(data.level)) {
    return { version: 1, runId, type: data.type, message: data.message, code: data.code, level: data.level as "info" | "warn" | "error" };
  }
  return null;
}
