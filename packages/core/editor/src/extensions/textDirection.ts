import { Plugin, PluginKey } from "@quirekit/pm";
import { Extension } from "../extension";

/** Supported text direction values. */
export type TextDirectionValue = "ltr" | "rtl" | "auto" | undefined;

/** Options accepted by the Tiptap-compatible text direction extension. */
export interface TextDirectionOptions {
  /** Default text direction applied to nodes and view attributes. */
  readonly direction: TextDirectionValue;
}

/** Tiptap-compatible extension for node-level bidirectional text attributes. */
export const TextDirection = Extension.create<TextDirectionOptions>({
  name: "textDirection",

  /**
   * Creates default text direction options.
   *
   * @returns Default text direction options.
   */
  addOptions() {
    return {
      direction: undefined
    };
  },

  /**
   * Adds `dir` to node schema specs when a default direction is configured.
   *
   * @returns Global attribute contributions for non-text nodes.
   */
  addGlobalAttributes() {
    if (!this.options.direction) {
      return [];
    }

    return [
      {
        types: "nodes" as const,
        attributes: {
          dir: {
            default: this.options.direction,
            parseHTML: (element) => {
              const dir = element.getAttribute("dir");

              return dir === "ltr" || dir === "rtl" || dir === "auto"
                ? dir
                : this.options.direction;
            },
            renderHTML: (attributes) => {
              if (!attributes.dir) {
                return {};
              }

              return {
                dir: attributes.dir
              };
            }
          }
        }
      }
    ];
  },

  /**
   * Creates the view attribute plugin for default text direction.
   *
   * @returns Plugin list containing the text direction attribute bridge.
   */
  addProseMirrorPlugins() {
    const direction = this.options.direction;

    return [
      new Plugin({
        key: new PluginKey("textDirection"),
        props: {
          attributes: () => direction ? { dir: direction } : {}
        }
      })
    ];
  }
});
