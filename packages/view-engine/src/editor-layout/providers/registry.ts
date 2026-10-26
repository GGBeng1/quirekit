import type { QuireExtensionManager } from "@quirekit/core";
import type { QuireLayoutProviderEntry } from "@quirekit/core/layout-provider";
import { createQuireLayoutProviderRegistry } from "../../layout/providers/registry";
import type {
  QuireLayoutProvider,
  QuireLayoutProviderCapabilityKind,
  QuireLayoutProviderRegistry
} from "../../layout/providers/types";
import type { QuireLayoutProvider as QuirePublicLayoutProvider } from "../../layout-provider";
import { quireHorizontalRuleProvider } from "../../layout/providers/built-in/horizontal-rule/provider";
import { quireRecursiveChildFlowProvider } from "../../layout/providers/built-in/recursive-child-flow";
import type { QuireTableProductCache } from "../../layout/cache/table";
import { adaptQuireExternalLayoutProvider } from "./external-adapter";
import { createQuireWordGridLayoutProvider } from "./word-table";
import { resolveQuireDocumentProfile } from "../../document-profile/resolve";
import type { QuireTableModelProfile, QuireTableStyleContext } from "../../document-profile/types";

/** Error raised when extension provider registration is not canonical. */
export class QuireLayoutProviderRegistrationError extends Error {
  /** Stable diagnostics explaining why registry construction failed. */
  readonly diagnostics: readonly string[];

  /**
   * Creates a registration failure without a compatibility fallback.
   *
   * @param diagnostics - Stable registration or payload mismatch messages.
   */
  constructor(diagnostics: readonly string[]) {
    super(`Invalid layout-provider registration: ${diagnostics.join(", ")}`);
    this.name = "QuireLayoutProviderRegistrationError";
    this.diagnostics = diagnostics;
  }
}

/**
 * Creates the provider registry owned by one editor layout snapshot.
 *
 * Built-ins and extension registrations enter the same deterministic registry.
 * Invalid Core registries, opaque payloads, or metadata disagreements are
 * rejected before source collection, so no node can fall through to a weaker
 * non-provider layout path by accident.
 *
 * @param extensionManager - Optional Core manager that owns extension registrations.
 * @returns Validated provider registry for the snapshot build.
 */
export function createQuireEditorLayoutProviderRegistry(
  extensionManager?: Pick<
    QuireExtensionManager,
    "layoutProviders" | "layoutProviderRegistry"
  > & Partial<Pick<QuireExtensionManager, "documentProfiles" | "documentProfileRegistry">> | undefined
): QuireLayoutProviderRegistry {
  const profileSource = extensionManager?.documentProfiles === undefined
    ? undefined
    : extensionManager as Pick<QuireExtensionManager, "documentProfiles" | "documentProfileRegistry">;
  return createQuireSnapshotLayoutProviderRegistry(
    extensionManager,
    resolveQuireDocumentProfile(profileSource).tableModel,
    noTableStyles
  );
}

/** Style context without table styles, for registries built outside a snapshot. */
const noTableStyles: QuireTableStyleContext = { token: undefined, signature: null, blockSignature: null };

/**
 * Creates a snapshot registry with internal retained layout services.
 *
 * This function is intentionally not re-exported from the provider barrel. It
 * keeps built-in table caching out of the plugin-facing provider contract.
 *
 * @param extensionManager - Optional Core manager that owns extension registrations.
 * @param tableModel - Table model whose table node type receives the built-in grid provider.
 * @param tableStyleContext - Document table style context.
 * @param tableProductCache - Optional per-view retained table products.
 * @param fitTablesToWidth - Whether overwide tables shrink into the flow width (multi-column flows).
 * @returns Validated provider registry for one snapshot build.
 */
export function createQuireSnapshotLayoutProviderRegistry(
  extensionManager: Pick<
    QuireExtensionManager,
    "layoutProviders" | "layoutProviderRegistry"
  > | undefined,
  tableModel: QuireTableModelProfile,
  tableStyleContext: QuireTableStyleContext,
  tableProductCache?: QuireTableProductCache,
  fitTablesToWidth = false
): QuireLayoutProviderRegistry {
  const externalProviders = readExtensionLayoutProviders(extensionManager);
  const result = createQuireLayoutProviderRegistry([
    ...(tableModel.tableNodeType === null
      ? []
      : [createQuireWordGridLayoutProvider(tableModel.tableNodeType, tableModel, tableStyleContext, tableProductCache, fitTablesToWidth)]),
    adaptQuireExternalLayoutProvider(quireHorizontalRuleProvider),
    quireRecursiveChildFlowProvider,
    ...externalProviders
  ]);

  if (!result.valid) {
    throw new QuireLayoutProviderRegistrationError(
      result.gaps.map((gap) => gap.message)
    );
  }

  return result.registry;
}

/**
 * Reads typed providers from Core registrations after strict payload validation.
 *
 * @param extensionManager - Optional Core extension manager registration surface.
 * @returns Typed extension providers in deterministic extension order.
 */
function readExtensionLayoutProviders(
  extensionManager?: Pick<
    QuireExtensionManager,
    "layoutProviders" | "layoutProviderRegistry"
  > | undefined
): readonly QuireLayoutProvider[] {
  if (extensionManager === undefined || extensionManager.layoutProviders.length === 0) {
    return [];
  }
  if (extensionManager.layoutProviderRegistry === null) {
    throw new QuireLayoutProviderRegistrationError([
      "Core rejected duplicate or ambiguous extension layout providers."
    ]);
  }

  return extensionManager.layoutProviderRegistry.entries.map((entry) =>
    readTypedLayoutProvider(entry)
  );
}

/**
 * Validates one opaque Core payload and its repeated registration metadata.
 *
 * @param entry - Core-owned registration entry with an opaque provider payload.
 * @returns Typed provider whose metadata agrees with the Core registration.
 */
function readTypedLayoutProvider(
  entry: QuireLayoutProviderEntry
): QuireLayoutProvider {
  const provider = entry.provider;
  if (!isLayoutProvider(provider)) {
    throw new QuireLayoutProviderRegistrationError([
      `Extension "${entry.extensionName}" registered provider "${entry.id}" with an invalid payload.`
    ]);
  }
  if (
    provider.id !== entry.id
    || !sameStrings(provider.nodeTypes, entry.nodeTypes)
    || !sameCapabilities(provider.capabilities, entry.capabilities)
  ) {
    throw new QuireLayoutProviderRegistrationError([
      `Extension "${entry.extensionName}" registration metadata disagrees with provider "${entry.id}".`
    ]);
  }

  return adaptQuireExternalLayoutProvider(provider);
}

/**
 * Reports whether an opaque payload has the complete provider authoring shape.
 *
 * Detailed output validation remains framework-owned and runs after execution;
 * this boundary check only prevents non-provider payloads from entering layout.
 *
 * @param value - Opaque Core registration payload.
 * @returns Whether the payload can enter typed provider validation.
 */
function isLayoutProvider(value: unknown): value is QuirePublicLayoutProvider {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Partial<QuirePublicLayoutProvider>;
  return typeof candidate.id === "string"
    && Array.isArray(candidate.nodeTypes)
    && candidate.nodeTypes.every((nodeType) => typeof nodeType === "string")
    && Array.isArray(candidate.capabilities)
    && candidate.capabilities.every(isProviderCapability)
    && typeof candidate.regionContract === "object"
    && candidate.regionContract !== null
    && typeof candidate.layout === "function";
}

/**
 * Reports whether a value is one supported provider capability class.
 *
 * @param value - Candidate capability value.
 * @returns Whether the value belongs to the canonical capability union.
 */
function isProviderCapability(
  value: unknown
): value is QuireLayoutProviderCapabilityKind {
  return value === "child-flow"
    || value === "fragmentation"
    || value === "selection-domain"
    || value === "semantic-export";
}

/**
 * Reports whether two string lists carry the same ordered metadata.
 *
 * @param left - First metadata list.
 * @param right - Second metadata list.
 * @returns Whether both lists are identical.
 */
function sameStrings(
  left: readonly string[],
  right: readonly string[]
): boolean {
  return left.length === right.length
    && left.every((value, index) => value === right[index]);
}

/**
 * Reports whether provider capability lists match their Core registration.
 *
 * @param left - Provider-owned capability list.
 * @param right - Core registration capability list.
 * @returns Whether both capability lists are identical.
 */
function sameCapabilities(
  left: readonly QuireLayoutProviderCapabilityKind[],
  right: readonly QuireLayoutProviderCapabilityKind[]
): boolean {
  return sameStrings(left, right);
}
