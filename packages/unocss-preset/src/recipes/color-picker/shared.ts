/** 独立清除原生交互外观，不依赖宿主 reset 提供实线边框。 */
export const resetInteractive = {
  appearance: "none",
  "border-style": "solid",
  outline: "0",
  "box-shadow": "none"
} as const;
