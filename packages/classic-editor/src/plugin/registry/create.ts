import type {
  ClassicEditorPlugin,
  ClassicEditorRegistrySnapshot,
  ClassicEditorResolvedFeatures,
  ClassicEditorSurfaceMode,
  ClassicEditorUiProfileOptions
} from "../../types";
import type { QuireAnyExtension } from "@quirekit/core";
import {
  collectClassicEditorContributionDeclarations,
  collectClassicEditorContributions,
  collectClassicEditorServices,
  collectClassicEditorShortcutDeclarations,
  collectClassicEditorShortcuts
} from "./collect";
import {
  filterClassicEditorPluginsByAudience,
  resolveClassicEditorSurfaceMode
} from "./audience";
import {
  validateClassicEditorContributionReferences,
  validateClassicEditorPluginIds
} from "./validation";

/** Registry construction input shared by product creation and runtime updates. */
export interface ClassicEditorRegistryOptions {
  /** Product plugins in installation order. */
  readonly plugins: readonly ClassicEditorPlugin[];
  /** Resolved features used to filter UI and shortcut contributions. */
  readonly features: ClassicEditorResolvedFeatures;
  /** Create-time product surface mode. Defaults to the user-facing product. */
  readonly surfaceMode?: ClassicEditorSurfaceMode | undefined;
  /** Resolved ordinary extensions that may expose Classic hooks. */
  readonly extensions?: readonly QuireAnyExtension[] | undefined;
  /** Final composition for action-backed surfaces. */
  readonly ui?: ClassicEditorUiProfileOptions | undefined;
  /**
   * Defers service and surface reference validation until mount.
   * Product and contribution ids are still normalized.
   */
  readonly deferReferenceValidation?: boolean | undefined;
}

/**
 * Builds and validates the normalized Classic Editor product registry.
 *
 * @param options - Installed plugins and resolved feature switches.
 * @returns Immutable registry snapshot.
 */
export function createClassicEditorRegistry(
  options: ClassicEditorRegistryOptions
): ClassicEditorRegistrySnapshot {
  const surfaceMode = resolveClassicEditorSurfaceMode(options.surfaceMode);
  const allPlugins = validateClassicEditorPluginIds(options.plugins);
  const allServices = collectClassicEditorServices(allPlugins);
  const shortcutDeclarations = collectClassicEditorShortcutDeclarations(allPlugins);
  const declarations = collectClassicEditorContributionDeclarations(
    allPlugins,
    options.extensions ?? []
  );

  if (options.deferReferenceValidation !== true) {
    validateClassicEditorContributionReferences(
      declarations.map(({ value }) => value),
      allServices
    );
  }

  const plugins = filterClassicEditorPluginsByAudience(allPlugins, surfaceMode);
  const services = collectClassicEditorServices(plugins);
  const contributions = collectClassicEditorContributions(
    declarations,
    options.features,
    surfaceMode,
    options.ui
  );
  const keyboardShortcuts = collectClassicEditorShortcuts(
    shortcutDeclarations,
    options.features,
    surfaceMode
  );

  if (options.deferReferenceValidation !== true) {
    validateClassicEditorContributionReferences(contributions, services);
  }

  return Object.freeze({
    surfaceMode,
    plugins,
    contributions,
    keyboardShortcuts,
    services
  });
}
