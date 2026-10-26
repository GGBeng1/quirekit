import {
  quireViewGraphRequiredInvalidationScopeKinds,
  quireViewGraphRequiredPerformanceInvariants
} from "./kinds";
import type {
  QuireViewGraphInvalidationScopeKind,
  QuireViewGraphPerformanceContract,
  QuireViewGraphPerformanceInvariantKind,
  QuireViewGraphValidationIssue
} from "./types";

/**
 * Validates graph-level performance invariants.
 *
 * @param performance - Performance contract to validate.
 * @param issues - Mutable issue list.
 */
export function validateQuireViewGraphPerformanceContract(
  performance: QuireViewGraphPerformanceContract | undefined,
  issues: QuireViewGraphValidationIssue[]
): void {
  if (performance === undefined) {
    issues.push({
      code: "missing-performance-contract",
      message: "View graph snapshot must declare a performance contract."
    });
    return;
  }

  validatePerformanceInvariants(performance, issues);
  validateInvalidationScopes(performance, issues);
  validateQueryBudget(performance, issues);
}

/**
 * Validates required performance invariant declarations.
 *
 * @param performance - Performance contract to validate.
 * @param issues - Mutable issue list.
 */
function validatePerformanceInvariants(
  performance: QuireViewGraphPerformanceContract,
  issues: QuireViewGraphValidationIssue[]
): void {
  const seen = new Set<QuireViewGraphPerformanceInvariantKind>();

  for (const invariant of performance.invariants) {
    if (seen.has(invariant)) {
      issues.push({
        code: "duplicate-performance-invariant",
        message: `View graph performance invariant "${invariant}" is duplicated.`
      });
      continue;
    }

    seen.add(invariant);
  }

  for (const requiredInvariant of quireViewGraphRequiredPerformanceInvariants) {
    if (seen.has(requiredInvariant)) {
      continue;
    }

    issues.push({
      code: "missing-performance-invariant",
      message: `View graph performance contract must declare "${requiredInvariant}".`
    });
  }
}

/**
 * Validates supported invalidation scope declarations.
 *
 * @param performance - Performance contract to validate.
 * @param issues - Mutable issue list.
 */
function validateInvalidationScopes(
  performance: QuireViewGraphPerformanceContract,
  issues: QuireViewGraphValidationIssue[]
): void {
  const scopes = new Set<QuireViewGraphInvalidationScopeKind>(
    performance.invalidationScopes.map((scope) => scope.kind)
  );

  for (const requiredScope of quireViewGraphRequiredInvalidationScopeKinds) {
    if (scopes.has(requiredScope)) {
      continue;
    }

    issues.push({
      code: "missing-invalidation-scope",
      message: `View graph performance contract must support "${requiredScope}" invalidation.`
    });
  }
}

/**
 * Validates the hot-query budget declaration.
 *
 * @param performance - Performance contract to validate.
 * @param issues - Mutable issue list.
 */
function validateQueryBudget(
  performance: QuireViewGraphPerformanceContract,
  issues: QuireViewGraphValidationIssue[]
): void {
  const queryBudget = performance.queryBudget as
    typeof performance.queryBudget | undefined;

  if (queryBudget === undefined) {
    issues.push({
      code: "invalid-query-budget",
      message: "View graph queries must declare a query budget."
    });
    return;
  }

  if (queryBudget.kind !== "scan-bounded") {
    return;
  }

  if (
    queryBudget.maxScannedItems !== undefined
    && queryBudget.maxScannedItems > 0
  ) {
    return;
  }

  issues.push({
    code: "invalid-query-budget",
    message:
      "Scan-bounded view graph queries must declare a positive maxScannedItems cap."
  });
}
