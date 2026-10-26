import { array, text } from "../model/validation";

/** @param value - Untrusted list. @param max - Record limit. @returns Plain dense values without overridden iteration or mapping behavior. */
export function playbackList(value: unknown, max: number): readonly unknown[] {
  const list = array(value, max);
  if (Object.getPrototypeOf(list) !== Array.prototype || Reflect.ownKeys(list).some(key => typeof key !== "string" || (key !== "length" && !/^(0|[1-9][0-9]*)$/u.test(key)))) throw new TypeError("演示列表只能包含普通数组值");
  return list;
}
/** @param value - Untrusted plain heading. @returns Valid nonempty heading without modifying host text. */
export function playbackTitle(value: unknown): string {
  const title = text(value); if (!title.trim()) throw new TypeError("演示标题不能为空"); return title;
}
