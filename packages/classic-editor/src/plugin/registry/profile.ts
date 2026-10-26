import type {
  ClassicEditorContribution,
  ClassicEditorUiProfileOptions,
  ClassicEditorUiSurfaceProfile
} from "../../types";
import { assertClassicEditorUniqueId } from "./validation";

/**
 * Applies explicit surface allowlists after stable contribution ordering.
 *
 * @param contributions - Feature-filtered contributions.
 * @param ui - Optional surface profiles.
 * @returns Contributions with configured surfaces replaced in final order.
 */
export function applyClassicEditorUiProfile(
  contributions: readonly ClassicEditorContribution[],
  ui: ClassicEditorUiProfileOptions | undefined
): ClassicEditorContribution[] {
  const profiles: readonly {
    readonly kinds: readonly ClassicEditorContribution["kind"][];
    readonly profile: ClassicEditorUiSurfaceProfile | false | undefined;
  }[] = [
    {
      kinds: ["toolbar-control", "toolbar-action-control"],
      profile: ui?.toolbar
    },
    { kinds: ["context-menu-item"], profile: ui?.contextMenu },
    { kinds: ["selection-popup-item"], profile: ui?.selectionPopup }
  ];
  const profileKinds = new Set(profiles.flatMap(({ kinds }) => kinds));
  const result = contributions.filter((item) => !profileKinds.has(item.kind));

  for (const { kinds, profile } of profiles) {
    if (profile === false) continue;
    const surface = contributions.filter((item) => kinds.includes(item.kind));
    if (!profile?.items) {
      result.push(...surface);
      continue;
    }
    const byId = new Map(surface.map((item) => [item.id, item]));
    const seen = new Set<string>();
    for (const id of profile.items) {
      assertClassicEditorUniqueId(seen, id, `${kinds[0]} profile item`);
      const item = byId.get(id);
      if (item) result.push(item);
    }
  }
  return result;
}
