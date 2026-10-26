import type { ComponentView, ComponentViewRenderer } from "./types";
import type { MsfeComponentHost } from "../types";
import { createSourceIdentity } from "../../identity/uuid";

/** @param renderer - Typed renderer. @param props - Typed immutable inputs.
 * @param map - Pure relocation of source-coordinate props for incremental layers; no resource acquisition or source writes.
 * @returns Installable view description. */
export function componentView<Props extends object>(renderer: ComponentViewRenderer<Props>, props: Props,
  map?: (props: Props, offset: number) => Props): ComponentView {
  return { renderer: renderer as unknown as ComponentViewRenderer<object>, props,
    ...(map ? { map: map as unknown as (props: object, offset: number) => object } : {}) };
}

/** @param framework - Required host adapter. @param component - Framework component accepting a view prop.
 * @returns Generic renderer retaining the consumer's provider tree. */
export function componentViewRenderer<Props extends object>(framework: MsfeComponentHost["framework"], component: unknown): ComponentViewRenderer<Props> {
  return ({ dom, props, host }) => {
    if (host?.framework !== framework) throw new Error(`component-view-host-required: ${framework}`);
    const id = createSourceIdentity();
    host.publishView({ id, component, dom, props });
    return { update(next) { host.publishView({ id, component, dom, props: next }); }, destroy() { host.removeView(id); } };
  };
}
