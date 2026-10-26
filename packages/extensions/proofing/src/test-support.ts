import { QuireEditor, type JSONContent } from "@quirekit/core";
import { StarterKit } from "@quirekit/starter-kit";
import { Proofing } from "./extension";
import { getProofingIssues } from "./plugin/state";
import type {
  ProofingCheckRequest,
  ProofingExtensionOptions,
  ProofingProvider,
  ProofingProviderIssue
} from "./types";

/** Provider double that flags listed words and records its requests. */
export interface FakeProofingProvider extends ProofingProvider {
  /** Every request received. */
  readonly requests: ProofingCheckRequest[];
}

/**
 * Creates a provider flagging whole words from a list.
 *
 * @param misspelled - Words to flag.
 * @param answer - Optional hook deciding when and how a request settles.
 * @returns Provider double.
 */
export function createFakeProvider(
  misspelled: readonly string[],
  answer?: (request: ProofingCheckRequest, issues: ProofingProviderIssue[]) => Promise<{ issues: ProofingProviderIssue[] }>
): FakeProofingProvider {
  const requests: ProofingCheckRequest[] = [];
  const pattern = new RegExp(`(?<![\\p{L}])(?:${misspelled.join("|")})(?![\\p{L}])`, "gu");
  return {
    id: "fake",
    requests,
    getCapabilities: () => ({ issueKinds: ["spelling"], supportsLanguage: (language) => language.startsWith("en") }),
    check: (request) => {
      requests.push(request);
      const issues = request.segments.flatMap((segment) => [...segment.text.matchAll(pattern)].map((match) => ({
        segmentId: segment.id,
        start: match.index,
        end: match.index + match[0].length,
        kind: "spelling" as const
      })));
      return answer === undefined ? Promise.resolve({ issues }) : answer(request, issues);
    },
    suggest: async ({ text }) => [`${text}-fixed`]
  };
}

/**
 * Creates an editor with immediate proofing.
 *
 * @param content - Block content.
 * @param options - Proofing options.
 * @returns Editor.
 */
export function createProofingEditor(content: JSONContent[], options: Partial<ProofingExtensionOptions>): QuireEditor {
  return new QuireEditor({
    extensions: [StarterKit, Proofing.configure({ debounceMs: 0, maxWaitMs: 0, ...options })],
    content: { type: "doc", content }
  });
}

/**
 * @param content - Inline content.
 * @returns Paragraph JSON.
 */
export function paragraph(...content: JSONContent[]): JSONContent {
  return { type: "paragraph", content };
}

/**
 * @param value - Text value.
 * @param marks - Mark type names.
 * @returns Text JSON.
 */
export function text(value: string, marks: readonly string[] = []): JSONContent {
  return { type: "text", text: value, ...(marks.length > 0 ? { marks: marks.map((type) => ({ type })) } : {}) };
}

/**
 * Reads the document text under every finding.
 *
 * @param editor - Editor.
 * @returns Flagged texts in document order.
 */
export function readFlagged(editor: QuireEditor): string[] {
  return getProofingIssues(editor.state.pm).map((issue) => editor.state.pm.doc.textBetween(issue.from, issue.to));
}

/**
 * Waits for pending timers and promise callbacks.
 *
 * @param rounds - Macrotask rounds.
 */
export async function settle(rounds = 6): Promise<void> {
  for (let index = 0; index < rounds; index += 1) await new Promise((resolve) => setTimeout(resolve, 0));
}
