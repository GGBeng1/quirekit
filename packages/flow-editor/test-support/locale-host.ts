import { expect, type Page } from "@playwright/test";

/** @param page - Any of the three host products with its English task open. @returns Completion of one source-backed save through the shared workspace. */
export async function saveEnglishFlowchart(page: Page): Promise<void> {
  const task = page.getByRole("dialog", { name: "Edit diagram", exact: true });
  await expect(task.getByRole("application", { name: "Diagram editor" })).toBeVisible();
  await task.getByRole("button", { name: "Diagram", exact: true }).click();
  await page.getByRole("menuitem", { name: "Create from template…", exact: true }).click();
  const gallery = page.getByRole("dialog", { name: "Choose a diagram template", exact: true });
  await gallery.getByRole("button", { name: "System architecture", exact: true }).click();
  await gallery.getByRole("button", { name: "Use template", exact: true }).click();
  await expect(task.locator(".x6-node").filter({ hasText: "Access layer" })).toHaveCount(1);
  expect(await task.getByRole("toolbar", { name: "Diagram toolbar", exact: true }).innerText()).not.toMatch(/\p{Script=Han}/u);
  await task.getByRole("button", { name: "Insert and structure", exact: true }).click();
  await page.getByRole("menuitem", { name: "Diagram icons…", exact: true }).click();
  const media = page.getByRole("dialog", { name: "Insert images and icons", exact: true });
  await media.getByRole("button", { name: "Server", exact: true }).click();
  await media.getByRole("button", { name: "Insert image", exact: true }).click();
  await expect(task.locator('image[aria-label="Server"]')).toHaveCount(1);
  await task.locator(".x6-node").filter({ hasText: "User client" }).click();
  await task.getByRole("button", { name: "Text style", exact: true }).click();
  await page.getByRole("button", { name: "Partial text formatting…", exact: true }).click();
  const text = page.getByRole("dialog", { name: "Partial text formatting", exact: true }), input = text.getByRole("textbox", { name: "Node text", exact: true });
  await input.fill("User client"); await input.press("Home"); await input.press("Shift+ArrowRight"); await input.press("Shift+ArrowRight"); await input.press("Shift+ArrowRight"); await input.press("Shift+ArrowRight");
  await text.getByRole("button", { name: "Bold", exact: true }).click(); await text.getByRole("button", { name: "Apply text", exact: true }).click();
  await expect(task.locator('tspan[font-weight="600"]').filter({ hasText: "User" })).toHaveCount(1);
  await task.getByRole("button", { name: "Diagram", exact: true }).click();
  await page.getByRole("menuitem", { name: "Page setup and print…", exact: true }).click();
  const pages = page.getByRole("dialog", { name: "Page setup and print", exact: true });
  await pages.getByText("A3", { exact: true }).click(); await pages.getByText("Landscape", { exact: true }).click();
  await pages.getByRole("button", { name: "Save page settings", exact: true }).click();
  await task.getByRole("button", { name: "Save diagram", exact: true }).click();
  await expect(task).toHaveCount(0);
}

/** @param page - Reopened host task. @returns Verification of canonical page settings after the host save boundary. */
export async function expectEnglishFlowPages(page: Page): Promise<void> {
  const task = page.getByRole("dialog", { name: "Edit diagram", exact: true });
  await task.getByRole("button", { name: "Diagram", exact: true }).click(); await page.getByRole("menuitem", { name: "Page setup and print…", exact: true }).click();
  const pages = page.getByRole("dialog", { name: "Page setup and print", exact: true });
  await expect(pages.getByRole("radio", { name: "A3", exact: true })).toBeChecked(); await expect(pages.getByRole("radio", { name: "Landscape", exact: true })).toBeChecked();
  await expect(pages.getByRole("img", { name: "Print page preview", exact: true })).toBeVisible(); await pages.getByRole("contentinfo").getByRole("button", { name: "Close", exact: true }).click();
}
