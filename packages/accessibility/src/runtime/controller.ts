import type { QuireEditor } from "@quirekit/core";
import type { QuireMountedServiceContext, QuireMountedViewService } from "@quirekit/view/mounted-services";
import type { QuireAccessibilityController, QuireAccessibilityOptions } from "../types";
import { MountedAccessibilitySession } from "./session";
import { compileAccessibilityRegistry } from "../registry/registry";
import type { AccessibilityRegistry } from "../registry/types";

/** Editor-local policy registry; using one Extension constant in two editors is safe. */
const controllers = new WeakMap<QuireEditor, AccessibilityController>();

/** Runtime owner independent of ProseMirror plugin lists and their view rebuilds. */
class AccessibilityController implements QuireAccessibilityController {
  private readonly sessions = new Map<string, MountedAccessibilitySession>();
  private enabledValue: boolean;
  private destroyed = false;
  private registry: AccessibilityRegistry | undefined;

  /** @param editor - Shared state authority. @param options - Validated initial policy. */
  constructor(private readonly editor: QuireEditor, private readonly options: QuireAccessibilityOptions) {
    this.enabledValue = options.enabled;
    for (const [name, value] of Object.entries({ textBudget: options.textBudget, readingBudget: options.readingBudget, readingBlocks: options.readingBlocks })) {
      if (!Number.isSafeInteger(value) || value < (name === "readingBlocks" ? 1 : 32)) throw new RangeError(`Invalid accessibility ${name}: ${value}`);
    }
  }

  /** @inheritdoc */
  get enabled(): boolean { return this.enabledValue; }

  /** @inheritdoc */
  setEnabled(enabled: boolean): void {
    if (this.destroyed || this.enabledValue === enabled) return;
    if (enabled) this.getRegistry();
    this.enabledValue = enabled;
    this.sessions.forEach((session) => session.setEnabled(enabled));
  }

  /** @inheritdoc */
  focusReading(viewId = this.editor.view.id): boolean { return this.sessions.get(viewId)?.focusReading() ?? false; }

  /** @inheritdoc */
  focusEditing(viewId = this.editor.view.id): boolean { return this.sessions.get(viewId)?.focusEditing() ?? false; }

  /** @inheritdoc */
  getDiagnostics() { return [...this.sessions.values()].map((session) => session.diagnostics()); }

  /** @param context - Newly mounted View capabilities. @returns Service owned by this actual mount. */
  mount(context: QuireMountedServiceContext): QuireMountedViewService | null {
    if (this.destroyed || (context.view.mode !== "canvas" && context.view.mode !== "svg")) return null;
    const session = new MountedAccessibilitySession(context, this.options, () => this.getRegistry(), () => { this.sessions.delete(context.view.id); });
    this.sessions.set(context.view.id, session);
    try { session.setEnabled(this.enabled); }
    catch (error) { session.destroy(); throw error; }
    return session;
  }

  /** @returns One lazily compiled registry shared by all enabled mounts of this editor. */
  private getRegistry(): AccessibilityRegistry {
    return this.registry ??= compileAccessibilityRegistry(this.editor.state.extensions,
      this.editor.state.schema, this.options.describeBlock);
  }

  /** Releases resources when an editor is destroyed before or after its views. */
  destroy(): void {
    this.destroyed = true;
    [...this.sessions.values()].forEach((session) => session.destroy());
    this.sessions.clear();
  }
}

/** @param editor - Canonical editor. @returns Optional installed controller without creating any resources. */
export function getAccessibility(editor: QuireEditor): QuireAccessibilityController | null {
  return controllers.get(editor) ?? null;
}

/** @param editor - Owning editor. @param options - Installation options. @returns Existing or newly initialized policy owner. */
export function installAccessibility(editor: QuireEditor, options: QuireAccessibilityOptions): AccessibilityController {
  let controller = controllers.get(editor);
  if (!controller) { controller = new AccessibilityController(editor, options); controllers.set(editor, controller); }
  return controller;
}

/** @param editor - Editor whose extension lifecycle has ended. */
export function destroyAccessibility(editor: QuireEditor): void {
  controllers.get(editor)?.destroy();
  controllers.delete(editor);
}
