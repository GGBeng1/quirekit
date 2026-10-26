import { createElement, Fragment, memo, useSyncExternalStore, type ComponentType } from "react";
import { createPortal } from "react-dom";
import { componentRenderer, componentViewRenderer, type ComponentViewRenderer, type ComponentViewEntry,
  type MsfeComponentEntry, type MsfeComponentHost, type MsfeNodeViewRenderer, type MsfeNodeViewProps } from "@quirekit/msfe-core";
import type { ReactNodeViewComponentProps } from "./types";

/** @param component - React component accepting typed nodeView props. @returns Framework-neutral renderer. */
export function ReactNodeViewRenderer<Attrs extends object, Resource = unknown>(
  component: ComponentType<ReactNodeViewComponentProps<Attrs, Resource>>,
): MsfeNodeViewRenderer { return componentRenderer("react", component); }

/** @param component - React component accepting typed generic view props. @returns Renderer using the existing Portal host. */
export function ReactComponentViewRenderer<Props extends object>(component: ComponentType<{ view: Props }>): ComponentViewRenderer<Props> {
  return componentViewRenderer("react", component);
}

/** @param props - Generic entry snapshot. @returns Retained generic component in the same provider tree. */
const RetainedView = memo(function RetainedView(props: { readonly entry: ComponentViewEntry }) {
  return createElement(props.entry.component as ComponentType<{ view: object }>, { view: props.entry.props });
});

/** @param props - Stable entry snapshot. @returns Component without rerendering its unaffected siblings. */
const RetainedComponent = memo(function RetainedComponent(props: { readonly entry: MsfeComponentEntry }) {
  return createElement(props.entry.component as ComponentType<{ nodeView: MsfeNodeViewProps }>, { nodeView: props.entry.props });
});

/** @param props - Per-editor host under existing Context providers. @returns Portals retaining React ancestry. */
export function ReactNodeViewHost(props: { readonly host: MsfeComponentHost }) {
  const entries = useSyncExternalStore(props.host.subscribe, props.host.getSnapshot, props.host.getSnapshot);
  const views = useSyncExternalStore(props.host.subscribe, props.host.getViewSnapshot, props.host.getViewSnapshot);
  return createElement(Fragment, null, ...entries.map(entry => createPortal(
    createElement(RetainedComponent, { entry }), entry.dom, entry.id,
  )), ...views.map(entry => createPortal(createElement(RetainedView, { entry }), entry.dom, entry.id)));
}
