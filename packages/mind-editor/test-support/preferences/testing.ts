import type { Page } from "@playwright/test";

/** @param page - Isolated product fixture. @returns Completion of choosing the opposite concrete theme. */
export async function toggleMindPreviewTheme(page: Page): Promise<void> {
  await page.getByRole("button", { name: "外观", exact: true }).click();
  const dark = page.getByRole("menuitemradio", { name: "深色", exact: true });
  const next = await dark.getAttribute("aria-checked") === "true" ? "浅色" : "深色";
  await page.getByRole("menuitemradio", { name: next, exact: true }).click();
}
