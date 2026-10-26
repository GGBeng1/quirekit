import {
  createToaster,
  type CreateToasterProps,
  type CreateToasterReturn,
  type ToastPromiseOptions
} from "@ark-ui/vue/toast";

/** QuireKit Toast 接受的标题和说明内容。 */
export type QuireKitToastContent = string;

/** 复用 Ark/Zag 队列和生命周期的 Toast store。 */
export type QuireKitToaster = CreateToasterReturn<QuireKitToastContent>;

/** 单条 Toast 创建参数，由 Ark/Zag 的 store 合同推导。 */
export type QuireKitToastOptions = Parameters<QuireKitToaster["create"]>[0];

/** Promise Toast 的状态参数，由 Ark/Zag 的 store 合同推导。 */
export type QuireKitToastPromiseOptions<T> = ToastPromiseOptions<T, QuireKitToastContent>;

/**
 * 创建一个由 Ark/Zag 唯一管理队列、计时器和 Promise 生命周期的 Toast store。
 *
 * @param props - 固定位置、数量、重叠、时长与安全区偏移。
 * @returns 可在业务逻辑与 QuireToaster 之间共享的 store。
 */
export function createQuireKitToaster(props: CreateToasterProps): QuireKitToaster {
  return createToaster<QuireKitToastContent>(props);
}

export type { CreateToasterProps as QuireKitCreateToasterProps };
