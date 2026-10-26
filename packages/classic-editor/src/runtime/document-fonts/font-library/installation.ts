import {
  normalizeQuireWebFontFamily,
  type QuireWebFontInstallation,
  type QuireWebFontLoader
} from "@quirekit/web-fonts";
import type {
  ClassicEditorImportedWebFontFamily,
  ClassicEditorWebFontFamily
} from "../../../types";
import {
  createClassicWebFontRecordKey,
  findClassicWebFontByCssFamily
} from "./family-identity";

/** Installation lifecycle used by the mounted font-library API. */
export interface ClassicWebFontInstallationController {
  /**
   * Reads completed installation results in readiness order.
   *
   * @returns Immutable installation snapshot.
   */
  getInstallations(): readonly QuireWebFontInstallation[];
  /**
   * Installs one exact provider record or legacy CSS-family request.
   *
   * @param family - Exact record or legacy CSS family.
   * @returns Completion after the family becomes authoritative.
   */
  install(family: ClassicEditorWebFontFamily | string): Promise<void>;
  /**
   * Installs one exact provider record without persisting an import record.
   *
   * @param family - Exact provider family selected for preview.
   * @returns Completion after browser registration.
   */
  preview(family: ClassicEditorWebFontFamily): Promise<void>;
  /** Starts cache-only restoration for every persisted manifest. */
  restoreImported(): void;
  /**
   * Forgets one unregistered CSS family.
   *
   * @param family - Exact CSS family.
   */
  forget(family: string): void;
  /**
   * Reports whether this runtime installed one CSS family.
   *
   * @param family - Exact CSS family.
   * @returns Whether installation completed.
   */
  isInstalled(family: string): boolean;
}

/** Inputs for one mounted installation lifecycle. */
interface CreateClassicWebFontInstallationControllerOptions {
  /** Optional loader when external fonts are disabled. */
  readonly loader: QuireWebFontLoader | undefined;
  /** Product-curated family records. */
  readonly curated: ReadonlyMap<string, ClassicEditorWebFontFamily>;
  /** Mutable imported family records. */
  readonly imported: Map<string, ClassicEditorImportedWebFontFamily>;
  /** Exact active import override consumed by the dynamic catalog. */
  readonly preferred: Map<string, ClassicEditorWebFontFamily>;
  /** Persists updated imported manifests. */
  readonly persist: () => void;
  /** Notifies product chrome after cache restoration. */
  readonly notify: () => void;
  /** Reports whether the owning mount was destroyed. */
  readonly isDestroyed: () => boolean;
  /** Applies one newly authoritative CSS family to the document. */
  readonly onInstalled: (family: string) => void | Promise<void>;
}

/**
 * Creates exact-record installation plus cache-only remount restoration.
 *
 * @param options - Loader, family maps, persistence, and mount callbacks.
 * @returns Mounted installation lifecycle.
 */
export function createClassicWebFontInstallationController(
  options: CreateClassicWebFontInstallationControllerOptions
): ClassicWebFontInstallationController {
  const installations = new Map<string, QuireWebFontInstallation>();

  /**
   * Installs one known record and retains its resolved manifest.
   *
   * @param family - Exact record or legacy CSS family.
   * @returns Completion after installation and persistence.
   */
  async function install(family: ClassicEditorWebFontFamily | string): Promise<void> {
    const entry = typeof family === "string"
      ? findClassicWebFontByCssFamily(options.imported, family)
        ?? findClassicWebFontByCssFamily(options.curated, family)
      : family;
    if (entry === undefined || options.loader === undefined) {
      const name = typeof family === "string" ? family : family.family;
      throw new Error(`External font family "${name}" is not imported or configured.`);
    }
    await installEntry(entry, true);
  }

  /**
   * Registers one exact record and optionally persists its resolved manifest.
   *
   * @param entry - Exact provider family metadata.
   * @param persistManifest - Whether an imported record should retain the manifest.
   * @returns Completion after registration and readiness notification.
   */
  async function installEntry(
    entry: ClassicEditorWebFontFamily,
    persistManifest: boolean
  ): Promise<void> {
    if (options.loader === undefined) {
      throw new Error(`External font family "${entry.family}" is not configured.`);
    }
    const familyKey = normalizeQuireWebFontFamily(entry.family);
    options.preferred.set(familyKey, entry);
    const result = await options.loader.installFamily(entry.family).finally(() => {
      if (options.preferred.get(familyKey) === entry) options.preferred.delete(familyKey);
    });
    installations.set(familyKey, result);
    const recordKey = createClassicWebFontRecordKey(entry);
    const importedEntry = options.imported.get(recordKey);
    if (persistManifest && importedEntry !== undefined && result.manifest !== undefined) {
      options.imported.set(recordKey, { ...importedEntry, manifest: result.manifest });
      options.persist();
    }
    await options.onInstalled(entry.family);
  }

  return {
    getInstallations(): readonly QuireWebFontInstallation[] {
      return [...installations.values()];
    },
    install,
    /** @inheritdoc */
    preview(family): Promise<void> {
      return installEntry(family, false);
    },
    restoreImported(): void {
      if (options.loader === undefined) return;
      for (const entry of options.imported.values()) {
        if (entry.manifest === undefined) continue;
        void options.loader.restoreFamily(entry.manifest).then(async (result) => {
          if (options.isDestroyed() || result === null) return;
          installations.set(
            normalizeQuireWebFontFamily(entry.family),
            result
          );
          await options.onInstalled(entry.family);
          options.notify();
        }).catch(options.notify);
      }
    },
    forget(family): void {
      installations.delete(normalizeQuireWebFontFamily(family));
    },
    isInstalled(family): boolean {
      return installations.has(normalizeQuireWebFontFamily(family));
    }
  };
}
