import { Extension } from "@quirekit/core";
import { createSearchCommands } from "./commands/create";
import { createSearchPlugin } from "./plugin/state";
import type { SearchCommandMethods, SearchExtensionOptions } from "./types";

/** Headless find and replace with transient match highlights. */
export const Search = Extension.create<SearchExtensionOptions>({
  name: "search",

  /** @returns Whole-document scope, unrestricted replacement, and default colors. */
  addOptions() {
    return {
      resolveScope: undefined,
      resolveExcludedScope: undefined,
      checkReplaceable: undefined,
      reveal: undefined,
      highlight: {
        match: "rgba(255, 196, 0, 0.35)",
        active: "transparent",
        activeOutline: "#e8710a"
      }
    };
  },

  /** @returns Plugin owning matches and decorations. */
  addProseMirrorPlugins() {
    return [createSearchPlugin(this.options)];
  },

  /** @returns Query, navigation, and replacement commands. */
  addCommands() {
    return createSearchCommands(this.options);
  }
});

declare module "@quirekit/core" {
  interface Commands<ReturnType> {
    /** Commands installed by the Search extension. */
    readonly search: SearchCommandMethods<ReturnType>;
  }
}
