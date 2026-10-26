import type { QuireLayoutBox } from "../engine/types";
import type { QuireSubLayoutProjection } from "../engine/sub-layout";
import { readQuireSubLayoutFragments } from "../engine/sub-layout/snapshot/fragments";
import {
  mergeQuireRetainedRegionProductSets,
  type QuireRetainedRegionProducts
} from "../region-products";

/**
 * 读取实际布局树保留的片段，供容器清单与校验使用同一事实。
 * @param layout - 当前 Provider 的布局树。
 * @returns 按布局顺序排列的子布局片段。
 */
export function collectQuireProviderChildFragments(
  layout: QuireLayoutBox
): readonly QuireSubLayoutProjection[] {
  const fragments = new Set<QuireSubLayoutProjection>();
  visitBoxes(layout, (box) => {
    for (const entry of readQuireSubLayoutFragments(box)) fragments.add(entry.subLayout);
  });
  return [...fragments];
}

/**
 * 保留框架子布局已经编译的产品，避免外层容器重新定义子区域身份。
 * @param layout - 含独立子区域的布局树。
 * @returns 子区域产品；没有子产品时不生成空集合。
 */
export function collectQuireProviderChildProducts(
  layout: QuireLayoutBox
): QuireRetainedRegionProducts | undefined {
  const products = new Set<QuireRetainedRegionProducts>();
  visitBoxes(layout, (box) => {
    // 外层主区域以本次声明为准；嵌套区域沿用已编译的几何和交互所有权。
    if (box !== layout && box.regionProducts !== undefined) products.add(box.regionProducts);
    for (const entry of readQuireSubLayoutFragments(box)) {
      const ownership = entry.subLayout.view.root.ownership;
      if (ownership.status === "resolved" && ownership.regionProducts !== undefined) {
        products.add(ownership.regionProducts);
      }
    }
  });
  return mergeQuireRetainedRegionProductSets([...products]);
}

/**
 * 在布局阶段遍历当前容器，保持子节点的文档顺序。
 * @param box - 当前布局节点。
 * @param visit - 接收当前节点的收集函数。
 */
function visitBoxes(box: QuireLayoutBox, visit: (box: QuireLayoutBox) => void): void {
  visit(box);
  if ("children" in box && Array.isArray(box.children)) {
    for (const child of box.children) visitBoxes(child, visit);
  }
}
