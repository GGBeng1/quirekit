import type { MdProseProps } from "../../vue/types";

/** Vue resolves omitted optional props to undefined; retain their reactive getters at this boundary. */
export type ProseSourceProps = { readonly [Key in "state" | "content" | "identity" | "options"]?: MdProseProps[Key] | undefined };
