import type { StaticShortcut } from "@unocss/core";
import { quireKitControlSizes } from "@quirekit/ui";

/**
 * 为组件投影共享的高度与排版；多行内容可以只继承排版或最小高度。
 * @param prefix - 尺寸类前缀，不包含 --size 后缀。
 * @param geometry - 固定高度、最小高度或由内容决定高度。
 * @returns 引用语义 token 的静态 shortcuts。
 */
export function controlSizeShortcuts(prefix: string, geometry: "height" | "min-height" | "content" = "height"): StaticShortcut[] {
  return Object.entries(quireKitControlSizes).map(([size, role]) => [
    `${prefix}--${size}`,
    [{
      "--qk-control-size-height": `var(--qk-control-${role.height})`,
      "--qk-control-size-line-height": `calc(var(--qk-type-${role.typography}-font-size) * var(--qk-type-${role.typography}-line-height))`,
      ...(geometry === "content" ? {} : { [geometry]: `var(--qk-control-${role.height})` }),
      "font-size": `var(--qk-type-${role.typography}-font-size)`,
      "line-height": `var(--qk-type-${role.typography}-line-height)`
    }],
    { layer: "qk-recipes" }
  ]);
}


/**
 * 紧凑标记略缩小，其余沿用标准图标盒；较大密度只增加操作行留白。
 * @param prefix - Checkbox 根或 RadioGroup 选项的尺寸类前缀。
 * @returns 行密度、标记比例与多行留白 shortcuts。
 */
export function choiceSizeShortcuts(prefix: string): StaticShortcut[] {
  const ratios = { xs: 0.875, sm: 1, md: 1, lg: 1, xl: 1 } as const;
  return controlSizeShortcuts(prefix, "min-height").map(([name, value, meta], index) => [
    name,
    [
      ...(Array.isArray(value) ? value : [value]),
      {
        "--qk-choice-size": `calc(var(--qk-control-icon) * ${Object.values(ratios)[index]})`,
        "padding-block": "max(0px, calc((var(--qk-control-size-height) - max(var(--qk-control-size-line-height), var(--qk-choice-size))) / 2))"
      }
    ],
    meta ?? { layer: "qk-recipes" }
  ]);
}

/**
 * Projects two list densities without inheriting the trigger height.
 * @param prefix - Content anatomy class.
 * @returns Typography and minimum option geometry from semantic tokens.
 */
export function listDensityShortcuts(prefix: string): StaticShortcut[] {
  return ([['compact', 'default', 'compact'], ['regular', 'regular', 'control']] as const).map(([density, height, type]) => [
    `${prefix}--${density}`,
    [{
      "--qk-control-size-height": `var(--qk-control-${height})`,
      "--qk-control-size-line-height": `calc(var(--qk-type-${type}-font-size) * var(--qk-type-${type}-line-height))`,
      "font-size": `var(--qk-type-${type}-font-size)`,
      "line-height": `var(--qk-type-${type}-line-height)`
    }], { layer: "qk-recipes" }
  ]);
}
