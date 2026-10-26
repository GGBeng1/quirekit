import type { HunspellDictionarySource } from "../types";

/** Request posted to the Hunspell worker. */
export type HunspellWorkerRequest =
  | { readonly id: number; readonly type: "has"; readonly key: string }
  | { readonly id: number; readonly type: "load"; readonly key: string; readonly source: HunspellDictionarySource }
  | { readonly id: number; readonly type: "unload"; readonly key: string }
  | { readonly id: number; readonly type: "check"; readonly key: string; readonly words: readonly string[] }
  | { readonly id: number; readonly type: "suggest"; readonly key: string; readonly word: string }
  | { readonly id: number; readonly type: "set-user-words"; readonly words: readonly string[] };

/** Response posted by the Hunspell worker. */
export type HunspellWorkerResponse =
  | { readonly id: number; readonly ok: true; readonly value: unknown }
  | { readonly id: number; readonly ok: false; readonly error: string };
