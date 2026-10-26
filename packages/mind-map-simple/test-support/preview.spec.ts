import { expect, test } from "@playwright/test";
import { fileURLToPath } from "node:url";
import type {} from "./types";

test("opening the preview creates editable maps without a test driver", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator("#first .smm-node")).toHaveCount(21);
  await expect(page.locator("#second .smm-node")).toHaveCount(5);
  await expect(page.getByRole("status")).toContainText("可以开始编辑");

  await page.getByRole("button", { name: "新增子主题", exact: true }).click();
  await expect(page.locator("#first .smm-node")).toHaveCount(22);
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  await expect(page.locator("#first .smm-node")).toHaveCount(21);
  await page.getByRole("button", { name: "重做", exact: true }).click();
  await expect(page.locator("#first .smm-node")).toHaveCount(22);

  await page.locator("#first .smm-node").filter({ hasText: "时间管理" }).click();
  await page.getByRole("button", { name: "编辑文字", exact: true }).click();
  const input = page.locator('#first [contenteditable="true"]');
  await expect(input).toBeVisible();
  await input.fill("我的思维导图");
  await input.press("Enter");
  await expect(page.locator("#first .smm-node").filter({ hasText: "我的思维导图" })).toBeVisible();
  await page.locator("#outside").fill("这里不会新增节点");
  await page.keyboard.press("Enter");
  await expect(page.locator("#first .smm-node")).toHaveCount(22);
  await expect(page.locator("#second .smm-node")).toHaveCount(5);
  await page.screenshot({ path: info.outputPath("preview.png"), fullPage: true });
  expect(errors).toEqual([]);
});

test("opening the source file explains how to start the local preview", async ({ page }) => {
  await page.goto(`file://${fileURLToPath(new URL("./index.html", import.meta.url))}`);
  await expect(page.getByRole("alert")).toContainText("不能直接作为文件运行");
  await expect(page.getByRole("link", { name: "打开本地思维导图预览" })).toHaveAttribute("href", "http://127.0.0.1:8993/");
  await expect(page.locator(".workspace")).toBeHidden();
});
