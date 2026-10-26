import { QuireLayoutJobExecutionError } from "../errors";
import type {
  QuireBackgroundShapingCapabilitySnapshot,
  QuireBackgroundShapingJobHandlerOptions,
  QuireBackgroundShapingJobPayload
} from "./types";

/**
 * Verifies that local live implementations match their clone-safe descriptor.
 *
 * @param options - Handler runtime and declared capabilities.
 */
export function requireLocalRuntimeMatchesCapabilitySnapshot(
  options: QuireBackgroundShapingJobHandlerOptions
): void {
  const measurementMode = options.textMeasurer.shapeRun === undefined
    ? "measure-only"
    : "cluster-shaping";
  const lineBreakerName = options.lineBreaker?.name ?? null;

  if (
    options.capabilities.measurement.mode !== measurementMode
    || options.capabilities.lineBreakerName !== lineBreakerName
  ) {
    throw new QuireLayoutJobExecutionError(
      "capability-mismatch",
      "Background shaping capability snapshot does not describe the local runtime."
    );
  }
}

/**
 * Validates the shallow, job-owned background shaping payload boundary.
 *
 * @param payload - Unknown request payload.
 * @returns Validated background shaping payload.
 */
export function requireBackgroundShapingPayload(
  payload: unknown
): QuireBackgroundShapingJobPayload {
  if (
    typeof payload !== "object"
    || payload === null
    || !("capabilities" in payload)
    || !("blocks" in payload)
    || !Array.isArray(payload.blocks)
    || !isBackgroundShapingCapabilitySnapshot(payload.capabilities)
    || !payload.blocks.every(isBackgroundShapingBlockInput)
  ) {
    throw new QuireLayoutJobExecutionError(
      "invalid-payload",
      "Background shaping requires capabilities and a block array."
    );
  }

  return payload as QuireBackgroundShapingJobPayload;
}

/**
 * Rejects work compiled for a different measurement or line-break runtime.
 *
 * @param requested - Capabilities encoded into the request.
 * @param available - Capabilities owned by the executing runtime.
 */
export function requireMatchingCapabilities(
  requested: QuireBackgroundShapingCapabilitySnapshot,
  available: QuireBackgroundShapingCapabilitySnapshot
): void {
  if (
    requested.measurement.id !== available.measurement.id
    || requested.measurement.version !== available.measurement.version
    || requested.measurement.mode !== available.measurement.mode
    || requested.measurement.transferability !== available.measurement.transferability
    || requested.lineBreakerName !== available.lineBreakerName
  ) {
    throw new QuireLayoutJobExecutionError(
      "capability-mismatch",
      "Background shaping runtime capabilities do not match the compiled payload."
    );
  }
}

/**
 * Checks the clone-safe capability descriptor shape.
 *
 * @param value - Unknown capability value.
 * @returns Whether the value is a supported capability snapshot.
 */
function isBackgroundShapingCapabilitySnapshot(
  value: unknown
): value is QuireBackgroundShapingCapabilitySnapshot {
  if (
    typeof value !== "object"
    || value === null
    || !("measurement" in value)
    || typeof value.measurement !== "object"
    || value.measurement === null
  ) {
    return false;
  }

  const measurement = value.measurement;
  return (
    "id" in measurement
    && typeof measurement.id === "string"
    && "version" in measurement
    && typeof measurement.version === "number"
    && Number.isFinite(measurement.version)
    && "mode" in measurement
    && (measurement.mode === "measure-only" || measurement.mode === "cluster-shaping")
    && "transferability" in measurement
    && (
      measurement.transferability === "local-only"
      || measurement.transferability === "worker-ready"
    )
    && "lineBreakerName" in value
    && (value.lineBreakerName === null || typeof value.lineBreakerName === "string")
  );
}

/**
 * Checks one pre-resolved shaping block without opening editor state.
 *
 * @param value - Unknown block input.
 * @returns Whether the value contains the required clone-safe fields.
 */
function isBackgroundShapingBlockInput(value: unknown): boolean {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  return (
    "attachmentKey" in value
    && typeof value.attachmentKey === "string"
    && "id" in value
    && typeof value.id === "string"
    && "runs" in value
    && Array.isArray(value.runs)
    && "width" in value
    && isFiniteNumber(value.width)
    && "lineHeight" in value
    && isFiniteNumber(value.lineHeight)
    && "textBaselineOffset" in value
    && isFiniteNumber(value.textBaselineOffset)
    && "lineBreakMode" in value
    && (value.lineBreakMode === "word" || value.lineBreakMode === "anywhere")
    && "baseDirection" in value
    && (
      value.baseDirection === "auto"
      || value.baseDirection === "ltr"
      || value.baseDirection === "rtl"
    )
  );
}

/**
 * Checks a finite numeric geometry field.
 *
 * @param value - Unknown numeric value.
 * @returns Whether the value is a finite number.
 */
function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
