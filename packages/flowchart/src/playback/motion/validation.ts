import { choice, identity, number, record, text } from "../../model/validation";
import { playbackList } from "../input";
import type { FlowchartMotionEffect } from "./types";

/** @param value - Untrusted effect list. @param hasTarget - Exact typed target authority. @param duration - Owning step duration. @returns Deeply detached bounded choreography. */
export function readMotionEffects(value: unknown, hasTarget: (id: string, kind?: "edge") => boolean, duration: number): readonly FlowchartMotionEffect[] {
  const appearances = new Set<string>(), flows = new Set<string>();
  return Object.freeze(playbackList(value, 64).map(raw => {
    const source = record(raw, ["kind", "id", "delay", "duration", "easing", "tone", "payload", "label", "count", "direction", "values", "halo", "style", "speed"], "motion.effect");
    const kind = choice(source.kind, ["flow", "travel", "pulse", "appear"], "motion.kind"), id = identity(source.id);
    if (!hasTarget(id, kind === "flow" || kind === "travel" ? "edge" : undefined)) throw new TypeError("动效目标不存在或类型不适用");
    const delay = source.delay === undefined ? 0 : number(source.delay, 0, duration - 100, "motion.delay");
    const length = source.duration === undefined ? duration - delay : number(source.duration, 100, duration - delay, "motion.duration");
    const timing = { id, delay, duration: length,
      ...(source.easing === undefined ? {} : { easing: choice(source.easing, ["linear", "ease-in-out"], "motion.easing") }),
      ...(source.tone === undefined ? {} : { tone: choice(source.tone, ["pending", "running", "completed", "reused", "invalid"], "motion.tone") }) };
    if (kind === "flow") {
      if (flows.has(id)) throw new TypeError("同一步骤不能重复设置同一连线的流动"); flows.add(id);
      if (["payload", "label", "count", "values", "halo"].some(key => Object.hasOwn(source, key))) throw new TypeError("连续流动不接受数据包或光环属性");
      return Object.freeze({ ...timing, kind,
        ...(source.style === undefined ? {} : { style: choice(source.style, ["dash", "beam", "dot"], "motion.style") }),
        ...(source.speed === undefined ? {} : { speed: number(source.speed, 12, 240, "motion.speed") }),
        ...(source.direction === undefined ? {} : { direction: choice(source.direction, ["forward", "reverse"], "motion.direction") }) });
    }
    if (["style", "speed"].some(key => Object.hasOwn(source, key))) throw new TypeError("此动效不接受连续流动属性");
    if (kind !== "travel") {
      if (Object.hasOwn(source, "halo") && (kind !== "pulse" || typeof source.halo !== "boolean")) throw new TypeError("光环仅接受脉冲动效的布尔属性");
      if (kind === "appear") { if (appearances.has(id)) throw new TypeError("同一步骤不能重复渐显同一目标"); appearances.add(id); }
      if (["payload", "label", "count", "direction", "values"].some(key => Object.hasOwn(source, key))) throw new TypeError("此动效不接受数据包属性");
      return Object.freeze({ ...timing, kind, ...(source.halo === undefined ? {} : { halo: source.halo as boolean }) });
    }
    if (Object.hasOwn(source, "halo")) throw new TypeError("沿线动效不接受光环属性");
    const count = source.count === undefined ? 1 : number(source.count, 1, 16, "motion.count"); if (!Number.isInteger(count)) throw new TypeError("数据包数量须为整数");
    const label = source.label === undefined ? undefined : text(source.label); if (label !== undefined && (label.length > 80 || /[\r\n]/u.test(label))) throw new TypeError("数据包说明过长或含换行");
    const values = source.values === undefined ? undefined : playbackList(source.values, 16).map(value => number(value, -1, 1, "motion.value"));
    if (values && values.length < 2) throw new TypeError("向量至少包含两个值");
    return Object.freeze({ ...timing, kind, count,
      ...(label === undefined ? {} : { label }), ...(values === undefined ? {} : { values: Object.freeze(values) }),
      ...(source.payload === undefined ? {} : { payload: choice(source.payload, ["dot", "beam", "token", "vector"], "motion.payload") }),
      ...(source.direction === undefined ? {} : { direction: choice(source.direction, ["forward", "reverse"], "motion.direction") }) });
  }));
}
