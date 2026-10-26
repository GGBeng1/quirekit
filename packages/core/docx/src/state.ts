import {
  createDocxContributionRegistry,
  type DocxContributionEntry,
  type DocxModelAdapter
} from "@quirekit/lit-docx-contract";
import type {
  DocxManagerExecutionHost
} from "./execution";
import { createDocxJsonModelAdapter } from "./json-adapter";
import {
  createDocxManagerExportDefaults,
  createDocxManagerImportDefaults
} from "./defaults";
import { loadDocxRuntime } from "./runtime";
import type {
  AnyDocxContributionRegistry,
  DocxManagerDiagnostic,
  DocxManagerDiagnosticPhase,
  DocxManagerExportDefaults,
  DocxManagerImportDefaults,
  DocxManagerOptions,
  DocxManagerRuntime,
  DocxManagerRuntimeLoader
} from "./types";

/** Internal lazy runtime and lifecycle state for one public Manager. */
export class DocxManagerState<
  ModelNode,
  ModelMark,
  ModelDocument
> {
  /** Immutable contribution entries captured from the owning Editor. */
  readonly entries: readonly DocxContributionEntry<
    ModelNode,
    ModelMark,
    ModelDocument
  >[];

  /** Default model adapter used when an operation does not override it. */
  readonly adapter: DocxModelAdapter<
    ModelNode,
    ModelMark,
    ModelDocument
  >;

  /** Frozen defaults used by direct and binary import operations. */
  readonly importDefaults: Readonly<DocxManagerImportDefaults<
    ModelNode,
    ModelMark,
    ModelDocument
  >>;

  /** Frozen defaults used by direct, compiler, and binary export operations. */
  readonly exportDefaults: Readonly<DocxManagerExportDefaults<
    ModelNode,
    ModelMark,
    ModelDocument
  >>;

  private readonly loadRuntime: DocxManagerRuntimeLoader | undefined;

  private readonly onDiagnostic: DocxManagerOptions<
    ModelNode,
    ModelMark,
    ModelDocument
  >["onDiagnostic"];

  private destroyed = false;

  private registryPromise: Promise<AnyDocxContributionRegistry<
    ModelNode,
    ModelMark,
    ModelDocument
  >> | undefined;

  private runtimePromise: Promise<DocxManagerRuntime> | undefined;

  /**
   * Creates lazy state for one public Manager.
   *
   * @param options - Contributions, adapter, and runtime loader.
   */
  constructor(
    options: DocxManagerOptions<ModelNode, ModelMark, ModelDocument>
  ) {
    this.entries = Object.freeze(
      (options.entries ?? []).map((entry) => Object.freeze({ ...entry }))
    );
    this.adapter = options.adapter
      ?? createDocxJsonModelAdapter() as unknown as DocxModelAdapter<
        ModelNode,
        ModelMark,
        ModelDocument
      >;
    this.importDefaults = createDocxManagerImportDefaults(
      options.importDefaults
    );
    this.exportDefaults = createDocxManagerExportDefaults(
      options.exportDefaults
    );
    this.loadRuntime = options.loadRuntime;
    this.onDiagnostic = options.onDiagnostic;
  }

  /**
   * Returns the lazily compiled contribution registry.
   *
   * @returns Per-instance immutable registry.
   */
  async getRegistry(): Promise<AnyDocxContributionRegistry<
    ModelNode,
    ModelMark,
    ModelDocument
  >> {
    this.assertActive();
    this.registryPromise ??= this.createRegistry();
    const registry = await this.registryPromise;
    this.assertActive();
    return registry;
  }

  /**
   * Loads and caches the model-neutral runtime.
   *
   * @returns Runtime bound to this Manager state.
   */
  async getRuntime(): Promise<DocxManagerRuntime> {
    this.assertActive();
    this.runtimePromise ??= loadDocxRuntime(this.loadRuntime);
    const runtime = await this.runtimePromise;
    this.assertActive();
    return runtime;
  }

  /**
   * Creates operation callbacks without exposing mutable state.
   *
   * @returns Execution host bound to this Manager state.
   */
  createExecutionHost(): DocxManagerExecutionHost<
    ModelNode,
    ModelMark,
    ModelDocument
  > {
    return {
      adapter: this.adapter,
      getRuntime: () => this.getRuntime(),
      getRegistry: () => this.getRegistry(),
      assertActive: () => this.assertActive()
    };
  }

  /**
   * Emits diagnostics through the instance listener in deterministic order.
   *
   * @param phase - Model or compiler phase that owns the diagnostics.
   * @param diagnostics - Diagnostics emitted by the completed phase.
   */
  reportDiagnostics(
    phase: DocxManagerDiagnosticPhase,
    diagnostics: readonly DocxManagerDiagnostic[]
  ): void {
    for (const diagnostic of diagnostics) {
      this.onDiagnostic?.(Object.freeze({
        phase,
        diagnostic
      }));
    }
  }

  /** Destroys this state and rejects later operations. */
  destroy(): void {
    this.destroyed = true;
  }

  /** Throws when an operation targets destroyed state. */
  assertActive(): void {
    if (this.destroyed) {
      throw new RangeError("Cannot use a destroyed DOCX manager.");
    }
  }

  /**
   * Creates the registry from the contract, so registry inspection needs no DOCX implementation.
   *
   * @returns Per-instance immutable registry.
   */
  private async createRegistry(): Promise<AnyDocxContributionRegistry<
    ModelNode,
    ModelMark,
    ModelDocument
  >> {
    return createDocxContributionRegistry(this.entries);
  }
}
