import type { Locator, Page } from '@playwright/test';

/**
 * Chooses a visual template through the same category dropdown as an author.
 * @param page - Browser page containing portalled gallery contents.
 * @param panel - Authoring instance retaining the structural caret.
 * @param label - Accessible template name.
 * @param category - Accessible category disclosure name.
 * @returns Resolves once the visual choice has been activated.
 */
export async function insertFormulaTemplate(page: Page, panel: Locator, label: string, category = '分数、根式与角标'): Promise<void> {
  await panel.getByRole('toolbar', { name: '公式模板' }).getByRole('button', { name: category, exact: true }).click();
  await page.locator('.qk-math-gallery[data-state="open"]').getByRole('button', { name: label, exact: true }).click();
}
