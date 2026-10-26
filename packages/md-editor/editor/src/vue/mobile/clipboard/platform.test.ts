// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from "vitest";
import { readMobileClipboard, writeMobileClipboard } from "./platform";

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it("copies synchronously without Clipboard API and releases its temporary native owner", async () => {
  const previous = document.createElement("textarea"); document.body.append(previous); previous.focus();
  vi.spyOn(navigator, "clipboard", "get").mockReturnValue(undefined as unknown as Clipboard);
  const copy = vi.fn((command: string) => {
    expect(command).toBe("copy");
    const input = document.activeElement as HTMLTextAreaElement;
    expect(input.value).toBe("原始选区"); expect(input.selectionEnd - input.selectionStart).toBe(4);
    return true;
  });
  Object.defineProperty(document, "execCommand", { configurable: true, value: copy });
  try {
    const pending = writeMobileClipboard(document, "原始选区");
    expect(copy).toHaveBeenCalledOnce(); await pending;
    expect(document.activeElement).toBe(previous); expect(document.querySelectorAll("textarea")).toHaveLength(1);
    copy.mockReturnValue(false); await expect(writeMobileClipboard(document, "拒绝")).rejects.toThrow();
    expect(document.activeElement).toBe(previous); expect(document.querySelectorAll("textarea")).toHaveLength(1);
  } finally { previous.remove(); Reflect.deleteProperty(document, "execCommand"); }
});

it("reads in the explicit call stack and rejects unavailable or denied reads without a paste command", async () => {
  const readText = vi.fn(async () => "system text");
  vi.spyOn(navigator, "clipboard", "get").mockReturnValue({ readText } as unknown as Clipboard);
  const pending = readMobileClipboard(document);
  expect(readText).toHaveBeenCalledOnce(); await expect(pending).resolves.toBe("system text");
  readText.mockRejectedValue(new Error("denied"));
  await expect(readMobileClipboard(document)).rejects.toThrow("denied");
  vi.spyOn(navigator, "clipboard", "get").mockReturnValue(undefined as unknown as Clipboard);
  await expect(readMobileClipboard(document)).rejects.toThrow("clipboard-unavailable");
});
