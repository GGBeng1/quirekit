import type { ImgHTMLAttributes } from 'vue';
import type { QuireKitImagePreviewOptions } from '../image-preview/types';

/** 原生图片及可选单图预览的公开合同。 */
export interface QuireKitImageProps {
  /** 图片地址。 */ readonly src: string;
  /** 可访问替代文本；纯装饰图使用空字符串。 */ readonly alt: string;
  /** 原生响应式图片候选。 */ readonly srcset?: string;
  /** 原生响应式图片布局宽度。 */ readonly sizes?: string;
  /** 显示宽度；数字按 CSS 像素处理。 */ readonly width?: number | string;
  /** 显示高度；数字按 CSS 像素处理。 */ readonly height?: number | string;
  /** 预留比例，减少加载时的布局跳动。 */ readonly aspectRatio?: number | string;
  /** 图片适应容器的方式。 */ readonly fit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  /** 裁切或留白时的对齐位置，使用 CSS object-position，默认 center。 */ readonly position?: string;
  /** 原图失败后尝试的备用地址；备用图不启用原图预览。 */ readonly fallback?: string;
  /** 原生解码提示，默认 async。 */ readonly decoding?: ImgHTMLAttributes['decoding'];
  /** 原生请求优先级提示，默认 auto。 */ readonly fetchpriority?: ImgHTMLAttributes['fetchpriority'];
  /** 原生跨域请求方式。 */ readonly crossorigin?: ImgHTMLAttributes['crossorigin'];
  /** 原生图片请求的来源信息策略。 */ readonly referrerpolicy?: ImgHTMLAttributes['referrerpolicy'];
  /** 原生加载策略，默认 lazy。 */ readonly loading?: 'lazy' | 'eager';
  /** 是否启用点击与键盘单图预览，默认关闭。 */ readonly preview?: boolean;
  /** 是否显示悬停预览提示，默认 true；紧凑缩略图可关闭，预览按钮和名称仍保留。 */ readonly previewHint?: boolean;
  /** 单图预览的遮罩、工具栏与导航选项。 */ readonly previewOptions?: QuireKitImagePreviewOptions;
  /** 独立原图地址；省略时使用 src。 */ readonly previewSrc?: string;
  /** 可选的预览标题；省略或留空时不显示名称，不使用 alt 或地址代替。 */ readonly title?: string;
}
