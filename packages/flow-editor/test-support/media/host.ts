import { expect, type Page } from "@playwright/test";
import type { FlowchartDocument } from "@quirekit/flowchart";
import { chooseFlowTemplate } from "../toolbar";
import { expectFlowchartTask } from "../host-helpers";

/** @param page - Actual host with its shared authoring task open. @param label - Persistent accessible asset identity. @returns Completion of a public crop/fit workflow; the host owns final document confirmation. */
export async function authorHostCrop(page: Page, label: string): Promise<void> {
  const task = await expectFlowchartTask(page); await chooseFlowTemplate(page, "空白流程图", task);
  await task.getByRole("button", { name: "插入与结构", exact: true }).click(); await page.getByRole("menuitem", { name: "图片 / SVG…", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "插入图片与图标", exact: true });
  await dialog.getByLabel("选择图片文件", { exact: true }).setInputFiles({ name: "host-crop.svg", mimeType: "image/svg+xml", buffer: Buffer.from('<svg viewBox="0 0 300 180"><rect width="300" height="180" fill="#dbeafe"/><circle cx="150" cy="90" r="70" fill="#2563eb"/></svg>') });
  await dialog.getByRole("textbox", { name: "图片说明", exact: true }).fill(label); await dialog.getByText("填满图框", { exact: true }).click();
  await dialog.getByRole("button", { name: "裁剪图片…", exact: true }).click(); await expect(dialog.getByRole("button", { name: "完成裁剪", exact: true })).toBeEnabled();
  await dialog.getByRole("combobox", { name: "裁剪比例", exact: true }).click(); await page.getByRole("option", { name: "1:1", exact: true }).click();
  await dialog.getByRole("button", { name: "重置", exact: true }).click(); await dialog.getByRole("button", { name: "插入图片", exact: true }).click();
  await expect(task.locator('.x6-node image[aria-label]')).toHaveAttribute("aria-label", label);
}
/** @param source - Saved canonical host payload. @param label - Authored image identity. */
export function expectHostCrop(source: FlowchartDocument, label: string): void {
  const node = source.nodes.find(node => node.image?.alt === label); expect(node).toBeDefined();
  expect(node!.image).toMatchObject({ width: 300, height: 180, fit: "cover", lockAspectRatio: true });
  expect(node!.image!.crop!.left).toBeCloseTo(.2, 4); expect(node!.image!.crop!.right).toBeCloseTo(.2, 4);
  expect(node!.image!.dataUrl).toMatch(/^data:image\/svg\+xml/);
}
/** @param page - Reopened saved host task. Confirms the component restores retained source geometry without a new commit. */
export async function reopenHostCrop(page: Page): Promise<void> {
  const task = await expectFlowchartTask(page); await task.locator('.x6-node path').first().click();
  await task.getByRole("button", { name: "插入与结构", exact: true }).click(); await page.getByRole("menuitem", { name: "编辑图片…", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "编辑图片", exact: true }); await expect(dialog.getByRole("checkbox", { name: "锁定缩放比例", exact: true })).toBeChecked();
  await dialog.getByRole("button", { name: "裁剪图片…", exact: true }).click(); await expect(dialog.getByRole("button", { name: "完成裁剪", exact: true })).toBeEnabled();
  const selection = dialog.locator('.qk-image-cropper [data-part="selection"]'), bounds = (await selection.boundingBox())!; expect(bounds.width / bounds.height).toBeCloseTo(1, 2);
  await dialog.getByRole("button", { name: "取消", exact: true }).click(); await task.getByRole("button", { name: "取消", exact: true }).click();
}
