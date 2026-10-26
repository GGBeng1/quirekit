import { compileQuireLayoutProviderOutput } from "./compile";
import type {
  ExecuteQuireLayoutProviderOptions,
  QuireLayoutProviderContext,
  QuireLayoutProviderExecutionDiagnostics,
  QuireLayoutProviderExecutionResult,
  QuireLayoutProviderGap,
  QuireLayoutProviderOutput
} from "./types";

/**
 * Executes one provider inside the versioned layout lifecycle.
 *
 * @param options - Provider, authoritative context, active version, and clock.
 * @returns Accepted provider output or explicit lifecycle/validation gaps.
 */
export function executeQuireLayoutProvider(
  options: ExecuteQuireLayoutProviderOptions
): QuireLayoutProviderExecutionResult {
  const { provider, context, activeSnapshotVersion } = options;
  const now = options.now ?? defaultNow;

  if (context.snapshotVersion !== activeSnapshotVersion) {
    return rejected(
      context,
      "skipped",
      0,
      [createExecutionGap(
        context,
        "stale-provider-context",
        `Provider context snapshot ${context.snapshotVersion} is not active snapshot ${activeSnapshotVersion}.`
      )]
    );
  }

  if (context.job.isCanceled()) {
    return rejected(
      context,
      "skipped",
      0,
      [createExecutionGap(
        context,
        "provider-job-canceled",
        `Layout provider job "${context.job.jobId}" was canceled before execution.`
      )]
    );
  }

  const startedAt = now();
  try {
    const output = provider.layout(context);
    const durationMs = Math.max(0, now() - startedAt);

    if (context.job.isCanceled()) {
      return rejected(
        context,
        "rejected",
        durationMs,
        [createExecutionGap(
          context,
          "provider-job-canceled",
          `Layout provider job "${context.job.jobId}" was canceled during execution.`
        )]
      );
    }

    const capabilityGaps = validateSemanticExportCapability(options, output);
    if (capabilityGaps.length > 0) {
      return rejected(context, "rejected", durationMs, capabilityGaps);
    }

    const validation = compileQuireLayoutProviderOutput({ context, output });
    if (!validation.valid) {
      return rejected(context, "rejected", durationMs, validation.gaps);
    }

    return {
      status: "accepted",
      result: validation.result,
      diagnostics: createDiagnostics(context, "accepted", durationMs)
    };
  } catch (error) {
    const durationMs = Math.max(0, now() - startedAt);
    return rejected(
      context,
      "failed",
      durationMs,
      [createExecutionGap(
        context,
        "provider-execution-failed",
        error instanceof Error ? error.message : String(error)
      )]
    );
  }
}

/**
 * Validates the semantic-export promise against every declared retained root.
 *
 * The provider capability is a whole-provider commitment. Framework authority
 * therefore requires each exact root occurrence to carry both renderer-neutral
 * semantics and an explicit export policy before compilation. Missing facts are
 * reported; they are never inferred from source node types or region kinds.
 *
 * @param options - Executed provider and authoritative context.
 * @param output - Provider output before retained product compilation.
 * @returns Typed capability gaps that prevent canonical installation.
 */
function validateSemanticExportCapability(
  options: ExecuteQuireLayoutProviderOptions,
  output: QuireLayoutProviderOutput
): readonly QuireLayoutProviderGap[] {
  if (!options.provider.capabilities.includes("semantic-export")) {
    return [];
  }

  const gaps: QuireLayoutProviderGap[] = [];
  const declaredRoots = output.declarations.filter(
    (declaration) => declaration.root !== undefined
  );
  if (declaredRoots.length === 0) {
    gaps.push(
      createExecutionGap(
        options.context,
        "missing-semantic-export-semantics",
        "Semantic-export providers must declare at least one exact retained owner with semantic facts."
      ),
      createExecutionGap(
        options.context,
        "missing-semantic-export-fallback",
        "Semantic-export providers must declare at least one exact retained owner with an export policy."
      )
    );
    return gaps;
  }

  for (const declaration of output.declarations) {
    const root = declaration.root;
    if (root === undefined) {
      continue;
    }
    const rootId = root.rootId;
    if (root.semantics === undefined) {
      gaps.push(createExecutionGap(
        options.context,
        "missing-semantic-export-semantics",
        `Semantic-export provider root "${rootId ?? "unknown"}" must declare semantic facts.`,
        rootId
      ));
    }
    if (root.exportFallbacks === undefined || root.exportFallbacks.length === 0) {
      gaps.push(createExecutionGap(
        options.context,
        "missing-semantic-export-fallback",
        `Semantic-export provider root "${rootId ?? "unknown"}" must declare an export policy.`,
        rootId
      ));
    }
    for (const region of declaration.regions ?? []) {
      const regionId = region.regionId;
      if (region.semantics === undefined) {
        gaps.push(createExecutionGap(
          options.context,
          "missing-semantic-export-semantics",
          `Semantic-export provider region "${regionId ?? "unknown"}" must declare semantic facts.`,
          rootId,
          regionId
        ));
      }
      if (
        region.exportFallbacks === undefined
        || region.exportFallbacks.length === 0
      ) {
        gaps.push(createExecutionGap(
          options.context,
          "missing-semantic-export-fallback",
          `Semantic-export provider region "${regionId ?? "unknown"}" must declare an export policy.`,
          rootId,
          regionId
        ));
      }
    }
  }
  return gaps;
}

/**
 * Creates a rejected provider execution result.
 *
 * @param context - Provider execution context.
 * @param status - Diagnostic lifecycle status.
 * @param durationMs - Execution duration.
 * @param gaps - Explicit lifecycle or validation gaps.
 * @returns Rejected execution result.
 */
function rejected(
  context: QuireLayoutProviderContext,
  status: QuireLayoutProviderExecutionDiagnostics["status"],
  durationMs: number,
  gaps: readonly QuireLayoutProviderGap[]
): QuireLayoutProviderExecutionResult {
  return {
    status: "rejected",
    gaps,
    diagnostics: createDiagnostics(context, status, durationMs)
  };
}

/**
 * Creates provider execution diagnostics.
 *
 * @param context - Provider execution context.
 * @param status - Lifecycle outcome.
 * @param durationMs - Execution duration.
 * @returns Provider execution diagnostics.
 */
function createDiagnostics(
  context: QuireLayoutProviderContext,
  status: QuireLayoutProviderExecutionDiagnostics["status"],
  durationMs: number
): QuireLayoutProviderExecutionDiagnostics {
  return {
    providerId: context.providerId,
    jobId: context.job.jobId,
    snapshotVersion: context.snapshotVersion,
    status,
    durationMs
  };
}

/**
 * Creates one execution lifecycle gap.
 *
 * @param context - Provider execution context.
 * @param code - Stable gap code.
 * @param message - Human-readable lifecycle message.
 * @param rootId - Exact retained root involved in the gap, when known.
 * @param regionId - Exact retained region involved in the gap, when known.
 * @returns Provider execution gap.
 */
function createExecutionGap(
  context: QuireLayoutProviderContext,
  code: QuireLayoutProviderGap["code"],
  message: string,
  rootId?: string,
  regionId?: string
): QuireLayoutProviderGap {
  return {
    code,
    message,
    providerId: context.providerId,
    sourceId: context.source.sourceId,
    ...(rootId === undefined ? {} : { rootId }),
    ...(regionId === undefined ? {} : { regionId })
  };
}

/**
 * Reads a monotonic millisecond clock when available.
 *
 * @returns Current monotonic milliseconds.
 */
function defaultNow(): number {
  return typeof performance === "undefined" ? Date.now() : performance.now();
}
