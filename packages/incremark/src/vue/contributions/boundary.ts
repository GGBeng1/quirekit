import { defineComponent, h, onBeforeUnmount, onErrorCaptured, onMounted, shallowRef, watch, type PropType } from "vue";
import { TaskScope } from "@quirekit/msfe-core";
import type { MarkdownReadingError, ReadingInput } from "./types";

/** One node owns one resource generation; failures never replace the surrounding document. */
export const ReadingBoundary = defineComponent({
  name: "MarkdownReadingBoundary",
  props: { input: { type: Object as PropType<ReadingInput>, required: true } },
  /** @param props - Current immutable node input. @returns A local presentation or escaped source fallback. */
  setup(props) {
    const failed = shallowRef(false), ready = shallowRef(!props.input.contribution.definition.load);
    const resource = shallowRef<unknown>();
    let mounted = false, scope: TaskScope | undefined;
    /** @param phase - Failed operation. @param cause - Original error. */
    function fail(phase: MarkdownReadingError["phase"], cause: unknown): void {
      if (failed.value) return;
      failed.value = true; scope?.dispose();
      const { contribution, context, report } = props.input;
      report({ owner: contribution.owner, phase, from: context.node.from, to: context.node.to, cause });
    }
    /** Cancel before publishing new inputs, so old leases cannot write into a replacement snapshot. */
    function restart(): void {
      scope?.dispose(); scope = undefined; failed.value = false; resource.value = undefined;
      const input = props.input, load = input.contribution.definition.load;
      ready.value = !load;
      if (!mounted || !load) return;
      const generation = new TaskScope(error => {
        if (generation.disposed || props.input !== input) input.report({ owner: input.contribution.owner,
          phase: "dispose", from: input.context.node.from, to: input.context.node.to, cause: error });
        else fail("load", error);
      });
      scope = generation;
      scope.acquire(signal => load(input.context, signal), value => { resource.value = value; ready.value = true; });
    }
    watch(() => props.input, restart, { flush: "sync" });
    onMounted(() => { mounted = true; if (props.input.contribution.definition.load) restart(); });
    onBeforeUnmount(() => { mounted = false; scope?.dispose(); });
    onErrorCaptured(error => { fail("render", error); return false; });
    return () => {
      if (!failed.value && ready.value) {
        try {
          const output = props.input.contribution.definition.render(props.input.context, resource.value);
          if (output !== undefined) return output;
        } catch (error) { fail("render", error); }
      }
      return h("span", { style: { whiteSpace: "pre-wrap" } }, props.input.source());
    };
  },
});
