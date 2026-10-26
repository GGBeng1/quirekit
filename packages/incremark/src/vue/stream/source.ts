import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";
import type { EditorState } from "@quirekit/cm-state";
import type { MarkdownStream } from "../../parse/session";
import type { MarkdownReadingError } from "../../types";
import type { MarkdownSourceInput } from "../types";

/**
 * Owns one cancellable parser; source and transport status have separate lifetimes.
 * @param props - Reactive source inputs, excluding render-only configuration.
 * @param report - Source-preserving error observer.
 * @param create - Fresh source session factory, including any product preset.
 * @param owner - Error identity for a compatibility adapter.
 * @returns Accepted snapshot, pending coverage and resource generation.
 */
export function useMarkdownSource(props: MarkdownSourceInput, report: (failure: MarkdownReadingError) => void,
  create: () => MarkdownStream, owner = "incremark") {
  const state = shallowRef<EditorState | undefined>(props.content === undefined ? props.state : undefined);
  const pending = ref(false), generation = ref(0);
  let mounted = false, initialized = false, stream: MarkdownStream | undefined, timer: ReturnType<typeof setTimeout> | undefined;
  let content = "", identity = props.identity, options = props.options;

  /** Cancels before replacement, so a stale continuation cannot publish into a new document. */
  function cancel(): void { if (timer !== undefined) clearTimeout(timer); timer = undefined; }
  /** @param cause - Local failure; the host source remains authoritative and visible. */
  function fail(cause: unknown): void {
    cancel(); stream = undefined; state.value = undefined; pending.value = false;
    try { report({ owner, phase: "parse", from: 0, to: props.content?.length ?? 0, cause }); }
    catch (error) { console.error(error); }
  }
  /** @param session - Captured parser owner. */
  function advance(session: MarkdownStream): void {
    timer = undefined;
    if (!mounted || stream !== session) return;
    try {
      pending.value = !session.advance(4); state.value = session.state;
      if (pending.value) timer = setTimeout(() => advance(session), 16);
    } catch (cause) { fail(cause); }
  }
  /** @param complete - Initial semantic SSR/client rendering must accept identical complete grammar. */
  function refresh(complete = false): void {
    cancel(); initialized = true;
    try {
      if (props.state && props.content !== undefined) throw new Error("markdown-input: supply state or content, not both");
      if (props.state) {
        if (stream || identity !== props.identity) generation.value++;
        identity = props.identity; stream = undefined; state.value = props.state; pending.value = false; return;
      }
      const next = props.content ?? "";
      if (!stream || identity !== props.identity || options !== props.options || !next.startsWith(content)) {
        stream = create(); generation.value++;
      }
      identity = props.identity; options = props.options; content = next; stream.update(next);
      if (complete) {
        if (!stream.advance(Number.MAX_SAFE_INTEGER)) throw new Error("incremark-incomplete-static-parse");
        state.value = stream.state; pending.value = false;
      } else advance(stream);
    } catch (cause) { fail(cause); }
  }
  // Complete exactly the same grammar before server render and first hydration. The
  // legacy source strategy keeps its identical escaped fallback until client mount.
  if (props.ssr !== "source") refresh(true);
  watch(() => [props.state, props.content, props.identity, props.options] as const, () => { if (mounted) refresh(); });
  onMounted(() => { mounted = true; if (!initialized) refresh(); });
  onBeforeUnmount(() => { mounted = false; cancel(); stream = undefined; });
  return { state, pending, generation };
}
