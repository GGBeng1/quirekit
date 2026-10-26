import { describe, expect, it } from "vitest";
import { shouldStartMountedPointerSelection } from "./start";

/** @param platform - Event window platform, absent on headless hosts. @param overrides - Native pointer differences. @returns Platform-owned pointer event. */
function pointer(platform?: string, overrides: Partial<PointerEvent> = {}): PointerEvent {
  return { button: 0, pointerType: "mouse", ctrlKey: true,
    ...(platform === undefined ? {} : { view: { navigator: { platform } } }), ...overrides } as PointerEvent;
}

describe("platform-specific primary pointer admission", () => {
  it("retains Apple/unknown Ctrl menus and admits Windows/Linux modifier actions", () => {
    for (const platform of ["MacIntel", "iPhone", "iPad", undefined]) expect(shouldStartMountedPointerSelection(pointer(platform))).toBe(false);
    for (const platform of ["Win32", "Linux x86_64"]) expect(shouldStartMountedPointerSelection(pointer(platform))).toBe(true);
  });
  it("keeps secondary buttons reserved, while plain clicks, Command and pens use selection", () => {
    for (const platform of ["MacIntel", "Win32", "Linux x86_64"]) {
      expect(shouldStartMountedPointerSelection(pointer(platform, { button: 2 }))).toBe(false);
      expect(shouldStartMountedPointerSelection(pointer(platform, { ctrlKey: false }))).toBe(true);
      expect(shouldStartMountedPointerSelection(pointer(platform, { ctrlKey: false, metaKey: true }))).toBe(true);
    }
    expect(shouldStartMountedPointerSelection(pointer("MacIntel", { pointerType: "pen" }))).toBe(true);
  });
});
