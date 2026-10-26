import { MarkdownStream } from "@quirekit/incremark-core";
import type { MarkdownSourceInput, MarkdownSourceSnapshot } from "../types";

/** Commit-owned source session; construction is timer-free for SSR and abandoned renders. */
export class MarkdownSourceStore {
  private stream: MarkdownStream | undefined;
  private input: MarkdownSourceInput;
  private snapshot: MarkdownSourceSnapshot;
  private readonly initial: MarkdownSourceSnapshot;
  private readonly listeners = new Set<() => void>();
  private timer: ReturnType<typeof setTimeout> | undefined;
  private initialized = false;

  /** @param input - Initial SSR/hydration source; semantic initialization completes deterministically. */
  constructor(input: MarkdownSourceInput) {
    this.input = { ...input };
    this.snapshot = { state: undefined, pending: false, generation: 0, error: undefined };
    if (input.state || input.ssr !== "source") this.accept(input, true);
    this.initial = this.snapshot;
  }

  /** @returns One immutable object until the accepted source or parse progresses. */
  readonly getSnapshot = (): MarkdownSourceSnapshot => this.snapshot;
  /** @returns The exact initial semantic/source snapshot for SSR and first hydration. */
  readonly getServerSnapshot = (): MarkdownSourceSnapshot => this.initial;

  /** @param listener - React external-store listener. @returns Subscription cleanup that cancels the last reader's continuation. */
  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener); this.schedule();
    return () => { this.listeners.delete(listener); if (!this.listeners.size) this.cancel(); };
  };

  /** @param input - Committed host inputs; transport status is deliberately absent. */
  update(input: MarkdownSourceInput): void {
    if (this.initialized && this.input.content === input.content && this.input.state === input.state
      && this.input.identity === input.identity && this.input.options === input.options) return;
    this.cancel(); this.accept(input, false); this.schedule();
  }

  /** Cancel before accepting a replacement, so a previous continuation cannot publish. */
  private cancel(): void { if (this.timer !== undefined) clearTimeout(this.timer); this.timer = undefined; }

  /** Keep one cooperative continuation while subscribed; StrictMode disconnect/reconnect is safe. */
  private schedule(): void {
    if (!this.listeners.size || !this.snapshot.pending || this.timer !== undefined || !this.stream) return;
    const stream = this.stream;
    this.timer = setTimeout(() => {
      this.timer = undefined;
      if (!this.listeners.size || this.stream !== stream) return;
      try { stream.advance(); this.publish({ ...this.snapshot, state: stream.state, pending: stream.pending }); }
      catch (cause) { this.fail(cause); }
      this.schedule();
    }, 16);
  }

  /** @param input - Committed source/configuration. @param initial - Whether deterministic semantic initialization is required. */
  private accept(input: MarkdownSourceInput, initial: boolean): void {
    const previous = this.input; let generation = this.snapshot.generation;
    try {
      if (input.content !== undefined && input.state !== undefined) throw new Error("markdown-content-and-state");
      if (input.content === undefined) {
        if (this.stream || input.identity !== previous.identity) generation++;
        this.stream = undefined;
        this.publish({ state: input.state, pending: false, generation, error: undefined });
      } else {
        if (!this.stream || input.identity !== previous.identity || input.options !== previous.options || !input.content.startsWith(this.stream.content)) {
          this.stream = new MarkdownStream(input.options); generation++;
        }
        this.stream.update(input.content);
        if (!this.stream.advance(initial ? Number.MAX_SAFE_INTEGER : 4) && initial) throw new Error("incremark-incomplete-static-parse");
        this.publish({ state: this.stream.state, pending: this.stream.pending, generation, error: undefined });
      }
    } catch (cause) { this.fail(cause, input); }
    this.input = { ...input }; this.initialized = true;
  }

  /** @param cause - Parser/configuration failure. @param input - Failing source, before accepting new input identity. */
  private fail(cause: unknown, input = this.input): void {
    this.cancel(); this.stream = undefined;
    this.publish({ state: undefined, pending: false, generation: this.snapshot.generation + 1,
      error: { owner: "source", phase: "parse", from: 0, to: input.content?.length ?? input.state?.doc.length ?? 0, cause } });
  }

  /** @param snapshot - Accepted immutable result; equivalent results retain their previous identity. */
  private publish(snapshot: MarkdownSourceSnapshot): void {
    const before = this.snapshot;
    if (before.state === snapshot.state && before.pending === snapshot.pending && before.generation === snapshot.generation && before.error === snapshot.error) return;
    this.snapshot = Object.freeze(snapshot);
    for (const listener of this.listeners) listener();
  }
}
