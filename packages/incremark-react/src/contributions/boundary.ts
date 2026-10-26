import { Component, createElement as h, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { TaskScope } from "@quirekit/msfe-core";
import type { MarkdownReadingError } from "@quirekit/incremark-core";
import type { ReadingBoundaryProps, BoundaryState, ResourceState } from "../rendering/types";

/** @param props - Validated immutable input. @returns A source-preserving local resource/render boundary. */
function ReadingContent(props: ReadingBoundaryProps): ReactNode {
  const { input } = props, load = input.contribution.definition.load;
  const scope = useRef<TaskScope | undefined>(undefined);
  const [resource, setResource] = useState<ResourceState>({ input, ready: !load, value: undefined, failed: false });
  useEffect(() => {
    if (!load) return;
    let active = true;
    const generation = new TaskScope(cause => {
      const disposed = generation.disposed || !active;
      if (!disposed) setResource({ input, ready: false, value: undefined, failed: true });
      input.report({ owner: input.contribution.owner, phase: disposed ? "dispose" : "load", from: input.context.node.from, to: input.context.node.to, cause });
    });
    scope.current = generation;
    setResource({ input, ready: false, value: undefined, failed: false });
    generation.acquire(signal => load(input.context, signal), value => { if (active) setResource({ input, ready: true, value, failed: false }); });
    return () => { active = false; generation.dispose(); if (scope.current === generation) scope.current = undefined; };
  }, [input, load]);
  let output: ReactNode, failure: MarkdownReadingError | undefined;
  if ((!load || resource.input === input && resource.ready) && !(resource.input === input && resource.failed)) {
    try { output = input.contribution.definition.render(input.context, load ? resource.value : undefined); }
    catch (cause) { failure = { owner: input.contribution.owner, phase: "render", from: input.context.node.from, to: input.context.node.to, cause }; }
  }
  useEffect(() => {
    if (!failure) return;
    scope.current?.dispose(); setResource({ input, ready: false, value: undefined, failed: true }); input.report(failure);
  }, [input, failure]);
  return output === undefined ? h("span", { style: { whiteSpace: "pre-wrap" } }, input.source()) : output;
}

/** React catches descendant failures after commit; direct callback failures also fall back during SSR. */
export class ReadingBoundary extends Component<ReadingBoundaryProps, BoundaryState> {
  /** @param props - Accepted contribution input. */
  constructor(props: ReadingBoundaryProps) { super(props); this.state = { input: props.input, failed: false }; }
  /** @param props - New source snapshot. @param state - Current local error state. @returns Reset state only when this node's accepted input changes. */
  static getDerivedStateFromProps(props: ReadingBoundaryProps, state: BoundaryState): BoundaryState | null {
    return props.input === state.input ? null : { input: props.input, failed: false };
  }
  /** @param _cause - Descendant error, reported during commit. @returns Local fallback state. */
  static getDerivedStateFromError(_cause: unknown): Partial<BoundaryState> { return { failed: true }; }
  /** @param cause - Original descendant exception. */
  componentDidCatch(cause: unknown): void {
    const { input } = this.props;
    input.report({ owner: input.contribution.owner, phase: "render", from: input.context.node.from, to: input.context.node.to, cause });
  }
  /** @returns Isolated semantic content or escaped source; failure cannot replace surrounding blocks. */
  render(): ReactNode {
    return this.state.failed ? h("span", { style: { whiteSpace: "pre-wrap" } }, this.props.input.source()) : h(ReadingContent, this.props);
  }
}
