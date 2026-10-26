import { Extension } from "@quirekit/core";
import { createProofingCommands } from "./commands/create";
import { createProofingPlugin } from "./plugin/state";
import { destroyProofingSession, installProofingSession } from "./session/registry";
import { resolveDefaultProofingVisibleRange } from "./session/visible";
import type { ProofingCommandMethods, ProofingExtensionOptions } from "./types";

/** Spelling and grammar proofing with a replaceable provider; findings are presentation only. */
export const Proofing = Extension.create<ProofingExtensionOptions>({
  name: "proofing",

  /** @returns Enabled checking without a provider, Word-like underline colors, and conservative limits. */
  addOptions() {
    return {
      enabled: true,
      provider: null,
      policy: null,
      defaultLanguage: "en-US",
      debounceMs: 400,
      maxWaitMs: 2000,
      timeoutMs: 10_000,
      maxConcurrentRequests: 2,
      maxSegmentsPerBatch: 40,
      maxCharactersPerBatch: 8000,
      maxSuggestions: 5,
      maxIssues: 2000,
      dictionaryStore: null,
      appearance: { spelling: "#e5484d", grammar: "#3e63dd", style: "#8e4ec6" },
      onError: null,
      resolveVisibleRange: resolveDefaultProofingVisibleRange
    };
  },

  /** @returns Plugin owning findings and the checking queue. */
  addProseMirrorPlugins() {
    return [createProofingPlugin(this.options)];
  },

  /** @returns Enable, recheck, replace, and ignore commands. */
  addCommands() {
    return createProofingCommands();
  },

  /** Starts the editor-local scheduler. */
  onCreate() {
    if (this.editor) installProofingSession(this.editor, this.options);
  },

  /** Stops timers and pending requests. */
  onDestroy() {
    if (this.editor) destroyProofingSession(this.editor);
  }
});

declare module "@quirekit/core" {
  interface Commands<ReturnType> {
    /** Commands installed by the Proofing extension. */
    readonly proofing: ProofingCommandMethods<ReturnType>;
  }
}
