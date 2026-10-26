import type {
  QuireLayoutProvider,
  QuireLayoutProviderRegistrationGap,
  QuireLayoutProviderRegistryResult
} from "./types";

/**
 * Builds a deterministic provider registry from extension contributions.
 *
 * Duplicate ids and ambiguous node ownership are rejected instead of being
 * resolved through extension order.
 *
 * @param providers - Provider contributions in extension declaration order.
 * @returns Valid registry or explicit registration gaps.
 */
export function createQuireLayoutProviderRegistry(
  providers: readonly QuireLayoutProvider[]
): QuireLayoutProviderRegistryResult {
  const gaps: QuireLayoutProviderRegistrationGap[] = [];
  const providersById = new Map<string, QuireLayoutProvider[]>();
  const providersByNodeType = new Map<string, QuireLayoutProvider[]>();

  for (const provider of providers) {
    appendMapValue(providersById, provider.id, provider);
    for (const nodeType of provider.nodeTypes) {
      appendMapValue(providersByNodeType, nodeType, provider);
    }
  }

  for (const [providerId, matches] of providersById) {
    if (matches.length > 1) {
      gaps.push({
        code: "duplicate-provider-id",
        message: `Layout provider id "${providerId}" is registered more than once.`,
        providerId
      });
    }
  }

  for (const [nodeType, matches] of providersByNodeType) {
    const providerIds = [...new Set(matches.map((provider) => provider.id))];
    if (providerIds.length > 1) {
      gaps.push({
        code: "ambiguous-node-provider",
        message: `Node type "${nodeType}" is claimed by multiple layout providers.`,
        nodeType,
        providerIds
      });
    }
  }

  if (gaps.length > 0) {
    return { valid: false, gaps };
  }

  const uniqueByNodeType = new Map<string, QuireLayoutProvider>();
  for (const [nodeType, matches] of providersByNodeType) {
    const provider = matches[0];
    if (provider !== undefined) {
      uniqueByNodeType.set(nodeType, provider);
    }
  }

  return {
    valid: true,
    registry: {
      providers: [...providers],
      resolve: (nodeType) => uniqueByNodeType.get(nodeType)
    }
  };
}

/**
 * Appends one value to an array-valued map entry.
 *
 * @param map - Mutable array-valued map.
 * @param key - Entry key.
 * @param value - Value to append.
 */
function appendMapValue<Value>(
  map: Map<string, Value[]>,
  key: string,
  value: Value
): void {
  const values = map.get(key);
  if (values === undefined) {
    map.set(key, [value]);
    return;
  }
  values.push(value);
}
