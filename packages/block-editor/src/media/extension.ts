import { Node as CoreNode, mergeAttributes, type QuireNodeViewRenderer, type QuireSchemaAttributeMap } from "@quirekit/core";
import type { DOMOutputSpec } from "@quirekit/pm";
import type { BlockMediaNodeView } from "./types";
import { mediaShellStyle, readMediaPresentation } from "./presentation";
import { wrapMediaView } from "./view";
import { withBlockAtomicSelection } from "../selection/atomic";
/**
 * Adapts an installed source atom without replacing its commands, schema content or preview.
 * @param extension - Configured source-owning node.
 * @returns The same extension with persistent flow geometry and shared manipulation UI.
 */
export function withBlockMedia<Options extends object, Storage extends object>(extension: CoreNode<Options, Storage>): CoreNode<Options, Storage> {
 return withBlockAtomicSelection(extension).extend({
  /** @returns Existing source attributes plus portable display geometry. */
  addAttributes() {
   return { ...(this.parent as (() => QuireSchemaAttributeMap) | undefined)?.(), media: {
    default: null, rendered: false,
    /** @param element - Source-preserving imported object. @returns Validated display attributes. */
    parseHTML(element: HTMLElement) { try { return readMediaPresentation(JSON.parse(element.getAttribute("data-qk-block-media") ?? "null")); } catch { return null; } }
   } };
  },
  /** @returns Existing preview wrapped in a continuous-flow manipulation surface. */
  addNodeView() {
   const render = (this.parent as (() => QuireNodeViewRenderer) | undefined)?.();
   if (!render) return null;
   return props => wrapMediaView(props, render(props) as BlockMediaNodeView);
  },
  /** @param context - Existing source renderer arguments. @returns Source-preserving HTML with display geometry. */
  renderHTML(context) {
   const output = (this.parent as ((value: typeof context) => DOMOutputSpec) | undefined)?.(context);
   if (!Array.isArray(output)) return output ?? ["figure", {}];
   const attrs = typeof output[1] === "object" && !Array.isArray(output[1]) ? output[1] : {};
   const start = attrs === output[1] ? 2 : 1;
   const media = readMediaPresentation(context.node.attrs.media);
   return [output[0], mergeAttributes(attrs, { "data-qk-block-media": JSON.stringify(media), style: mediaShellStyle(media) }), ...output.slice(start)] as DOMOutputSpec;
  }
 });
}
