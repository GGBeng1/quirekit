import type { ProofingMeta } from "../plugin/types";
import type { ProofingDictionaryStore, ProofingProvider } from "../types";

/** User dictionary shared by the plugin filter, the host store, and the provider. */
export class ProofingUserWords {
  private words: string[] = [];

  /**
   * @param store - Host store, or null for session-only words.
   * @param dispatch - Applies a proofing meta.
   */
  constructor(
    private readonly store: ProofingDictionaryStore | null,
    private readonly dispatch: (meta: ProofingMeta) => void
  ) {}

  /**
   * Loads stored words, hides their findings, and shares them with the provider.
   *
   * @param provider - Current provider.
   */
  async load(provider: ProofingProvider | null): Promise<void> {
    if (this.store === null) return;
    this.words = [...new Set([...this.words, ...await this.store.list()])];
    if (this.words.length > 0) this.dispatch({ type: "suppress-words", words: this.words });
    await this.share(provider);
  }

  /**
   * Stores one added word and shares the updated list.
   *
   * @param word - Added word.
   * @param provider - Current provider.
   */
  async add(word: string, provider: ProofingProvider | null): Promise<void> {
    if (!this.words.includes(word)) this.words = [...this.words, word];
    await this.store?.add(word);
    await this.share(provider);
  }

  /**
   * Shares the word list with a provider.
   *
   * @param provider - Provider receiving the list.
   */
  async share(provider: ProofingProvider | null): Promise<void> {
    if (this.words.length > 0) await provider?.setUserWords?.(this.words);
  }
}
