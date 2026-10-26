import type { QuireKitToolbarExecuteEvent, QuireKitToolbarOpenChangeEvent } from "@quirekit/ui";
import { executeClassicEditorContributionAction } from "../utils";
import type { ClassicToolbarContext, ClassicToolbarControl, ClassicToolbarEntryMeta } from "./types";

/**
 * Executes a single registry control through its existing canonical runtime.
 * @param control - Contribution selected by the public entry.
 * @param adapter - Live adapter context, read at activation rather than captured during configuration.
 * @param payload - Parameters submitted by the public entry.
 * @returns Whether the command completed successfully.
 */
async function executeControl(control: ClassicToolbarControl, adapter: ClassicToolbarContext, payload: unknown): Promise<boolean> {
  const context = adapter.model.context;
  if (!context) return false;
  return control.kind === "ribbon-action-control"
    ? executeClassicEditorContributionAction(control, context, payload, "ribbon")
    : context.instance.executeContribution(control.behavior, payload, { source: "ribbon" });
}

/**
 * Routes public Toolbar intent without translating document commands into strings.
 * @param event - Accepted public action, toggle, menu or feature-body intent.
 * @param adapter - Current registry adapter state.
 * @returns Completion of the existing feature command lifecycle.
 */
export async function executeClassicToolbar(event: QuireKitToolbarExecuteEvent, adapter: ClassicToolbarContext): Promise<void> {
  const meta = event.item.meta as ClassicToolbarEntryMeta | undefined;
  if (meta?.kind === "control") {
    await executeControl(meta.control, adapter, event.payload);
  } else if (meta?.kind === "menu") {
    const control = meta.controls.find(control => control.id === event.value);
    if (control && await executeControl(control, adapter, event.payload)) adapter.menus.get(meta.groupId)?.close();
  } else if (meta?.kind === "feature") {
    const feature = adapter.features.get(meta.featureKey);
    if (!feature) return;
    await feature.configuration.execute?.({
      ...event, item: meta.original,
      value: event.source === "menu" ? event.value : meta.original.value,
      path: event.source === "menu" ? [...meta.path, event.value] : meta.path
    });
  }
}

/**
 * Keeps popup ownership and feature drafts controlled by their existing owners.
 * @param event - Public popup state request.
 * @param adapter - Current menu coordinators and retained feature configurations.
 */
export function changeClassicToolbarPopup(event: QuireKitToolbarOpenChangeEvent, adapter: ClassicToolbarContext): void {
  const meta = event.item.meta as ClassicToolbarEntryMeta | undefined;
  if (meta?.kind === "menu") adapter.menus.get(meta.groupId)?.setVisible(event.expanded);
  else if (meta?.kind === "feature") adapter.features.get(meta.featureKey)?.configuration.openChange?.({
    ...event, item: meta.original, path: meta.path
  });
}
