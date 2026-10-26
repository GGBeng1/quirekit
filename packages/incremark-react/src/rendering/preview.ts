import { createElement as h, useLayoutEffect, useRef } from "react";
import type { ReactNode } from "react";
import { TaskScope } from "@quirekit/msfe-core";
import { createMathRenderer, createMermaidRenderer, createTextDiagramRenderer } from "@quirekit/msfe-markdown-extras";
import type { PreviewComponentProps } from "./types";

/** @param props - Confirmed immutable preview data. @returns A client-owned renderer mount; SSR and first hydration share the empty mount. */
export function Preview(props: PreviewComponentProps): ReactNode {
  const parent = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const dom = parent.current;
    if (!dom) return;
    const scope = new TaskScope(), inputs = props.inputs;
    const renderer = inputs.kind === "mermaid" ? createMermaidRenderer(undefined)
      : inputs.kind === "textDiagram" ? createTextDiagramRenderer(undefined) : createMathRenderer(undefined);
    const handle = renderer({ dom, props: { ...inputs, range: { from: 0, to: inputs.source.length }, readOnly: true,
      target: () => ({ reveal: () => false, release() {} }) }, scope, host: undefined, requestMeasure() {} });
    return () => { handle.destroy(); scope.dispose(); };
  }, [props.inputs]);
  return h("span", { ref: parent, className: `quire-markdown-preview${props.inputs.kind === "inlineMath" ? "" : " quire-markdown-preview-block"}`, "data-qk-not-prose": "" });
}
