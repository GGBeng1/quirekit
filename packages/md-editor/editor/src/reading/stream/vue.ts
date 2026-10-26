import { useMarkdownSource } from "@quirekit/incremark/vue";
import type { ProseSourceProps } from "./types";
import type { MdReadingError } from "../contributions/types";
import { MdProseStream } from "./session";

/** @param props - Host source or snapshot. @param report - Source-preserving observer. @returns Shared parser lifecycle with the legacy source SSR contract. */
export function useProseSource(props: ProseSourceProps, report: (failure: MdReadingError) => void) {
  return useMarkdownSource({
    get state() { return props.state; }, get content() { return props.content; },
    get identity() { return props.identity; }, get options() { return props.options; }, ssr: "source",
  }, report, () => new MdProseStream(props.options), "md-prose");
}
