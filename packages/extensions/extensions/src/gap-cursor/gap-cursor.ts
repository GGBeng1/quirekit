import {
  callOrReturn,
  Extension,
  getExtensionField,
  type ParentConfig
} from "@quirekit/core";
import { gapCursor } from "@quirekit/pm";

declare module "@quirekit/core" {
  interface QuireNodeConfig<
    Options extends object = object,
    Storage extends object = object
  > {
    /**
     * Determines whether gap cursor selections are allowed around this node.
     */
    readonly allowGapCursor?:
      | boolean
      | null
      | ((
          this: {
            readonly name: string;
            readonly options: Options;
            readonly storage: Storage;
            readonly parent: ParentConfig<QuireNodeConfig<Options, Storage>>["allowGapCursor"];
          }
        ) => boolean | null);
  }
}

/** Extension that installs ProseMirror gap cursor behavior. */
export const Gapcursor = Extension.create({
  name: "gapCursor",

  /**
   * Creates the ProseMirror gap cursor plugin.
   *
   * @returns ProseMirror plugin list containing the gap cursor plugin.
   */
  addProseMirrorPlugins() {
    return [gapCursor()];
  },

  /**
   * Adds the `allowGapCursor` schema field to node specs.
   *
   * @param extension - Node extension whose schema spec is being built.
   * @returns Extra node schema fields consumed by the gap cursor plugin.
   */
  extendNodeSchema(extension) {
    const context = {
      name: extension.name,
      options: extension.options,
      storage: extension.storage
    };
    const allowGapCursor = getExtensionField<boolean | null | (() => boolean | null)>(
      extension,
      "allowGapCursor",
      context
    );

    return {
      allowGapCursor: allowGapCursor === undefined
        ? null
        : callOrReturn(allowGapCursor)
    };
  }
});
