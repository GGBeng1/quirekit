import type { RuleConfig } from "./types";

/** Suffix transformation after ordinary native typing; composition is never intercepted. */
export class InputRule {
  /** @param config - Pattern and source replacement callback. */
  constructor(readonly config: RuleConfig) {}
}

/** Source transformations limited to the inserted clipboard text. */
export class PasteRule {
  /** @param config - Pattern and source replacement callback. */
  constructor(readonly config: RuleConfig) {}
}
