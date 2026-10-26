import { executeClassicEditorAction } from "../ui/action-catalog";
import type { ClassicEditorRenderContext } from "../../types";
import type {
  ClassicEditorInsertCatalogOptions,
  ClassicEditorInsertItemDefinition,
  ClassicEditorInsertQuery,
  ResolvedClassicEditorInsertItem
} from "../../types/insert";
import {
  compareClassicEditorInsertDefinitions,
  matchesClassicEditorInsertQuery,
  normalizeClassicEditorInsertRecentLimit
} from "./query";
import {
  isClassicEditorInsertCapabilityExecutable,
  resolveClassicEditorInsertCapability,
  resolveClassicEditorInsertDefinition
} from "./resolve";

/** Typed, instance-scoped Insert discovery and recent-success authority. */
export class ClassicEditorInsertCatalog {
  private readonly definitionsValue: readonly ClassicEditorInsertItemDefinition[];
  private readonly recentLimit: number;
  private recentIds: readonly string[] = Object.freeze([]);

  /**
   * Creates one catalog without registering commands, transactions, or document listeners.
   *
   * @param options - Feature-owned actions and UI-only recent limit.
   */
  constructor(options: ClassicEditorInsertCatalogOptions) {
    const ids = new Set<string>();
    for (const item of options.items) {
      if (ids.has(item.id)) {
        throw new RangeError(`Classic Insert item ids must be unique: ${item.id}`);
      }
      ids.add(item.id);
    }
    this.definitionsValue = Object.freeze([
      ...options.items
    ].sort(compareClassicEditorInsertDefinitions));
    this.recentLimit = normalizeClassicEditorInsertRecentLimit(options.recentLimit);
  }

  /** @returns Ordered feature-owned definitions retained by object identity. */
  get definitions(): readonly ClassicEditorInsertItemDefinition[] {
    return this.definitionsValue;
  }

  /** @returns Most recently successful definitions, newest first. */
  get recentDefinitions(): readonly ClassicEditorInsertItemDefinition[] {
    return Object.freeze(this.recentIds.flatMap((id) => {
      const item = this.definitionsValue.find((candidate) => candidate.id === id);
      return item === undefined ? [] : [item];
    }));
  }

  /**
   * Resolves searchable, localized presentation state from current command facts.
   *
   * @param context - Latest mounted editor and Host authorities.
   * @param query - Committed search query and optional narrow-screen group.
   * @returns Visible matching items in deterministic action order.
   */
  resolve(
    context: ClassicEditorRenderContext,
    query: ClassicEditorInsertQuery
  ): readonly ResolvedClassicEditorInsertItem[] {
    return Object.freeze(this.definitionsValue.flatMap((definition) => {
      if (query.group !== undefined && definition.group !== query.group) return [];
      const resolved = resolveClassicEditorInsertDefinition(
        definition,
        context,
        query.locale
      );
      if (resolved === null || !matchesClassicEditorInsertQuery(definition, query)) return [];
      return [resolved];
    }));
  }

  /**
   * Resolves recent successful items against live capability and command state.
   *
   * @param context - Latest mounted editor and Host authorities.
   * @param query - Locale used to localize visible recent entries.
   * @returns Visible recent items, newest first.
   */
  resolveRecent(
    context: ClassicEditorRenderContext,
    query: Pick<ClassicEditorInsertQuery, "locale">
  ): readonly ResolvedClassicEditorInsertItem[] {
    return Object.freeze(this.recentDefinitions.flatMap((definition) => {
      const resolved = resolveClassicEditorInsertDefinition(
        definition,
        context,
        query.locale
      );
      return resolved === null ? [] : [resolved];
    }));
  }

  /**
   * Revalidates and executes the retained canonical action exactly once.
   *
   * @param definition - Retained item selected by the presenter.
   * @param context - Latest mounted editor and Host authorities.
   * @returns Whether the feature-owned action reported success.
   */
  async execute(
    definition: ClassicEditorInsertItemDefinition,
    context: ClassicEditorRenderContext
  ): Promise<boolean> {
    if (!this.definitionsValue.includes(definition)) return false;
    const capability = resolveClassicEditorInsertCapability(definition, context);
    if (!isClassicEditorInsertCapabilityExecutable(capability.mode)) return false;
    const handled = await executeClassicEditorAction(
      definition.action,
      context,
      undefined,
      "menu",
      Object.freeze({ surface: "insert-catalog", itemId: definition.id })
    );
    if (handled) this.recordSuccessfulUse(definition.id);
    return handled;
  }

  /**
   * Records only successful action receipts in instance-local presentation state.
   *
   * @param id - Stable item identity whose action returned true.
   */
  private recordSuccessfulUse(id: string): void {
    this.recentIds = Object.freeze([
      id,
      ...this.recentIds.filter((candidate) => candidate !== id)
    ].slice(0, this.recentLimit));
  }
}
