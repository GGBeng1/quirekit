import type {
  QuireExtensionConfig,
  QuireExtensionFieldSource,
  QuireMarkConfig,
  QuireNodeConfig
} from "./types";
import { getExtensionField } from "./helpers/getExtensionField";
import { mergeExtensionOptions } from "./utilities/mergeDeep";

/** Config shapes that can be authored through Tiptap-compatible classes. */
export type QuireExtendableConfig<
  Options extends object = object,
  Storage extends object = object
> =
  | QuireExtensionConfig<Options, Storage>
  | QuireNodeConfig<Options, Storage>
  | QuireMarkConfig<Options, Storage>;

/** Base class for Tiptap-compatible extension, node, and mark instances. */
export class Extendable<
  Options extends object = object,
  Storage extends object = object,
  Config extends QuireExtendableConfig<Options, Storage> = QuireExtendableConfig<
    Options,
    Storage
  >
> implements QuireExtensionFieldSource {
  /** Authoring family, overridden by concrete subclasses. */
  type = "extendable";

  /** Parent extension in an `extend()` chain. */
  parent?: Extendable<any, any, any> | undefined;

  /** Most recent child extension created from this instance. */
  child?: Extendable<any, any, any> | undefined;

  /** Extension name resolved from config. */
  name = "";

  /** Original config object used for Tiptap-compatible field lookup. */
  config: Config & Readonly<Record<string, unknown>> = {
    name: this.name
  } as Config & Readonly<Record<string, unknown>>;

  /** Cached resolved option object for this extension instance. */
  private optionsValue?: Readonly<Options> | undefined;

  /** Cached storage object for this extension instance. */
  private storageValue?: Storage | undefined;

  /**
   * Creates an extendable runtime instance.
   *
   * @param config - Partial config merged over the default config.
   */
  constructor(config: Partial<Config> = {}) {
    this.config = {
      ...this.config,
      ...config
    } as Config & Readonly<Record<string, unknown>>;
    this.name = this.config.name;
  }

  /**
   * Resolves default options from `addOptions()`.
   *
   * @returns Resolved option object.
   */
  get options(): Readonly<Options> {
    if (this.optionsValue) {
      return this.optionsValue;
    }

    const addOptions = getExtensionField<(() => Options) | Options>(
      this,
      "addOptions",
      { name: this.name }
    );

    const resolvedOptions = typeof addOptions === "function"
      ? (addOptions as (context: Readonly<Record<string, unknown>>) => Options)({
        name: this.name
      })
      : addOptions;

    this.optionsValue = {
      ...(resolvedOptions ?? {})
    } as Options;

    return this.optionsValue;
  }

  /**
   * Resolves extension storage from `addStorage()`.
   *
   * @returns Resolved storage object.
   */
  get storage(): Storage {
    if (this.storageValue) {
      return this.storageValue;
    }

    const addStorage = getExtensionField<(() => Storage) | Storage>(
      this,
      "addStorage",
      {
        name: this.name,
        options: this.options
      }
    );

    const resolvedStorage = typeof addStorage === "function"
      ? (addStorage as (context: Readonly<Record<string, unknown>>) => Storage)({
        name: this.name,
        options: this.options
      })
      : addStorage;

    this.storageValue = {
      ...(resolvedStorage ?? {})
    } as Storage;

    return this.storageValue;
  }

  /**
   * Creates a configured copy using Tiptap's `configure()` semantics.
   *
   * @param options - Option overrides merged over the current options.
   * @returns Configured extendable instance.
   */
  configure(options: Partial<Options> = {}): Extendable<any, any, any> {
    const extension = this.extend<Options, Storage, Config>({
      ...this.config,
      addOptions: () =>
        mergeExtensionOptions(this.options as Options, options)
    } as Partial<Config>);

    extension.name = this.name;
    extension.parent = this.parent;

    return extension;
  }

  /**
   * Creates a child instance with config fields merged over this instance.
   *
   * @param extendedConfig - Config fields to merge on top of this instance.
   * @returns Extended child instance.
   */
  extend<
    ExtendedOptions extends object = Options,
    ExtendedStorage extends object = Storage,
    ExtendedConfig extends QuireExtendableConfig<
      ExtendedOptions,
      ExtendedStorage
    > = QuireExtendableConfig<ExtendedOptions, ExtendedStorage>
  >(
    extendedConfig: any = {}
  ): Extendable<any, any, any> {
    const extension = new (this.constructor as any)({
      ...this.config,
      ...extendedConfig
    }) as Extendable<ExtendedOptions, ExtendedStorage, ExtendedConfig>;

    extension.parent = this;
    this.child = extension;
    extension.name = Object.prototype.hasOwnProperty.call(extendedConfig, "name")
      ? extension.name
      : this.name;

    return extension;
  }
}
