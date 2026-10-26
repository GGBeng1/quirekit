import type {} from "@quirekit/msfe-core";

/** Named commands contributed when this feature is installed. */
declare module "@quirekit/msfe-core" {
  interface Commands<ReturnType> {
    /** bold feature commands. */
    bold: {
    /** @returns The caller’s result or pending chain. */
    toggleBold(): ReturnType;
    };
  }
}
