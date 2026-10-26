import type { DefinitionLayer } from "./types";
import { field } from "./fields";
import { cloneValue, mergeOptions } from "./options";
import { bindDefinition } from "./binding";
import type { AuthoringExtension, ExtensionConfig, PartialOptions } from "./types";
import type { MsfeEditor } from "../editor/types";
import type { MsfeExtension } from "../extensions/types";

const supported = new Set(["name", "priority", "requires", "addOptions", "addStorage", "addExtensions", "addCommands",
  "addKeyboardShortcuts", "addBlockInput", "addEditingBoundaries", "addInputRules", "addPasteRules", "addSource", "addAttributes", "addNodeView",
  "addMarkdownExtensions", "addProjections", "addCodeMirrorExtensions", "onBeforeCreate", "onCreate", "onUpdate",
  "onTransaction", "onSelectionUpdate", "onFocus", "onBlur", "onDestroy", "addState", "addProjectionLayers", "addSourceProvider", "history", "addAiCapabilities"]);

/** Shared declarative inheritance; definitions never retain mounted editor state. */
export class Extendable<Options extends object, Storage, Kind extends AuthoringExtension["type"]> implements AuthoringExtension {
  /** Immutable inheritance chain. */
  readonly layer: DefinitionLayer;

  /** @param type - Definition family. @param config - Hook declarations. @param parent - Previous definition. @param options - configure patch. */
  constructor(readonly type: Kind, config: ExtensionConfig<Options, Storage>, parent?: DefinitionLayer, options?: unknown) {
    for (const key of Object.keys(config)) if (!supported.has(key)) throw new Error(`unsupported-extension-field: ${key}`);
    this.layer = Object.freeze({ config: Object.freeze(cloneValue({ ...config })), ...(parent ? { parent } : {}), ...(options ? { options: cloneValue(options) } : {}) });
    if (!this.name) throw new Error("missing-extension-name");
  }

  /** @returns The final inherited name. */
  get name(): string { return field(this.layer, "name") as string; }

  /** @returns Independently resolved defaults and recursive configure patches. */
  get options(): Options {
    const context = { name: this.name, type: this.type };
    /** @param layer - One inheritance/configuration level. @returns Defaults with patches applied in order. */
    function resolve(layer?: DefinitionLayer): unknown {
      if (!layer) return {};
      const method = layer.config.addOptions;
      const defaults = method === undefined ? resolve(layer.parent)
        : (method as (...args: never[]) => unknown).call({ ...context, parent: layer.parent ? () => resolve(layer.parent) : undefined });
      return mergeOptions(defaults, layer.options);
    }
    return resolve(this.layer) as Options;
  }

  /** @param options - Deep plain-record patch; arrays replace. @returns A fresh definition of the same family. */
  configure(options: PartialOptions<Options>): Extendable<Options, Storage, Kind> {
    const Family = this.constructor as typeof Extendable<Options, Storage, Kind>;
    return new Family(this.type, {}, this.layer, options);
  }

  /** @param config - Overridden hooks, with this.parent available inside each override. @returns Derived same-family definition. */
  extend<NextOptions extends object = Options, NextStorage = Storage>(config: ExtensionConfig<NextOptions, NextStorage>): Extendable<NextOptions, NextStorage, Kind> {
    const Family = this.constructor as typeof Extendable<NextOptions, NextStorage, Kind>;
    return new Family(this.type, config, this.layer);
  }

  /** @param editor - Late canonical editor reference. @returns A fresh installation with independent options/storage. */
  resolve(editor: () => MsfeEditor): MsfeExtension {
    return bindDefinition(this.layer, { name: this.name, type: this.type, options: this.options }, editor);
  }
}

/** @param config - Object or factory. @returns Evaluated author configuration. */
function configuration<O extends object, S>(config: ExtensionConfig<O, S> | (() => ExtensionConfig<O, S>)): ExtensionConfig<O, S> {
  return typeof config === "function" ? config() : config;
}

/** General editor behavior, including presets. */
export class Extension<O extends object = Record<string, never>, S = Record<string, never>> extends Extendable<O, S, "extension"> {
  /** @param config - Object or factory. @returns Reusable general extension. */
  static create<O extends object = Record<string, never>, S = Record<string, never>>(config: ExtensionConfig<O, S> | (() => ExtensionConfig<O, S>)): Extension<O, S> {
    return new Extension("extension", configuration(config));
  }
}

/** Source-backed node behavior; does not introduce a second document schema. */
export class Node<O extends object = Record<string, never>, S = Record<string, never>> extends Extendable<O, S, "node"> {
  /** @param config - Object or factory. @returns Reusable source node declaration. */
  static create<O extends object = Record<string, never>, S = Record<string, never>>(config: ExtensionConfig<O, S> | (() => ExtensionConfig<O, S>)): Node<O, S> {
    return new Node("node", configuration(config));
  }
}

/** Source-backed inline annotation behavior. */
export class Mark<O extends object = Record<string, never>, S = Record<string, never>> extends Extendable<O, S, "mark"> {
  /** @param config - Object or factory. @returns Reusable source mark declaration. */
  static create<O extends object = Record<string, never>, S = Record<string, never>>(config: ExtensionConfig<O, S> | (() => ExtensionConfig<O, S>)): Mark<O, S> {
    return new Mark("mark", configuration(config));
  }
}
