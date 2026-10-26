import type { CodeLanguage } from "@quirekit/msfe-core";

/** A product code language with the name shown in the language picker. */
export interface MdCodeLanguage extends CodeLanguage {
  /** Display name, such as "C++" for the `cpp` fence. */
  readonly label: string;
}
