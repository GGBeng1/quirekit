import type { FlowchartMotionEffect, FlowchartPlaybackStep } from "@quirekit/flowchart";

/** @param id - Graph identity mapper. @param t - Localized literal. @returns Explicit illustrative parallel attention choreography. */
export function attentionSteps(id: (name: string) => string, t: (text: string) => string): readonly FlowchartPlaybackStep[] {
  /** @param name - Graph target. @param delay - Start offset. @param duration - Fade length. @returns Explicit reveal cue. */
  const appear = (name: string, delay = 0, duration = 700): FlowchartMotionEffect => ({ id: id(name), kind: "appear", delay, duration, easing: "ease-in-out" });
  return [
    { id: "tokens", title: t("词元变成向量"), description: t("三个词元沿着路径进入向量表示。数值用于说明数据变换，不是模型实测。"), duration: 3600, changes: [], effects: [
      ...[0, 1, 2].flatMap(i => [{ kind: "travel" as const, id: id(`embed-edge-${i}`), payload: "token" as const, label: ["The", "cat", "sat"][i]!, delay: i * 250, duration: 1800, easing: "ease-in-out" as const }, appear(`embed-${i}`, 1450 + i * 250), appear(`embed-edge-${i}`, 2150 + i * 250, 350)]),
    ] },
    { id: "qkv", title: t("并行生成 Q、K、V"), description: t("同一份向量通过不同投影，产生查询、键和值。三条通路并行运行，不依次轮流闪框。"), duration: 4800, changes: [], effects: [
      ...["q", "k", "v"].flatMap((channel, c) => [0, 1, 2].flatMap(i => [{ id: id(`${channel}-edge-${i}`), kind: "travel" as const, payload: "vector" as const, label: channel.toUpperCase(), delay: c * 220 + i * 200, duration: 2300, easing: "ease-in-out" as const }, appear(`${channel}-${i}`, 1900 + c * 220 + i * 200), appear(`${channel}-edge-${i}`, 2600 + c * 220 + i * 200, 350)])),
    ] },
    { id: "attention", title: t("查询与键计算关联"), description: t("Q 与 K 的信息到达注意力矩阵。每个格子逐步出现；未来位置被遮挡，行内权重归一化。"), duration: 4200, changes: [], effects: [
      { id: id("query-score"), kind: "travel", payload: "vector", label: "Q", duration: 1800, count: 2 },
      { id: id("key-score"), kind: "travel", payload: "vector", label: "K", duration: 1800, count: 2, tone: "reused", delay: 220 },
      ...[0, 1, 2].flatMap(r => [0, 1, 2].map(c => appear(`weight-${r}-${c}`, 1400 + r * 350 + c * 140, 650))),
      appear("query-score", 2050, 350), appear("key-score", 2400, 350),
    ] },
    { id: "weighted", title: t("权重作用于值向量"), description: t("注意力权重与 V 在同一时段流向加权求和，不同词元的信息在这里汇合。"), duration: 4200, changes: [], effects: [
      { id: id("score-output"), kind: "travel", payload: "token", label: "A", count: 3, duration: 2600, tone: "reused" },
      { id: id("value-output"), kind: "travel", payload: "vector", label: "V", count: 3, duration: 2600, tone: "completed", delay: 280 },
      ...[0, 1, 2].map(i => appear(`result-${i}`, 2400 + i * 220, 650)),
      appear("score-output", 3270, 350), appear("value-output", 3270, 350),
    ] },
    { id: "output", title: t("得到带上下文的表示"), description: t("汇合后的向量包含上下文信息，继续交给后续层。此处讲解一个自注意力头，省略残差、归一化和后续网络。"), duration: 3600, changes: [], effects: [
      ...[0, 1, 2].flatMap(i => [{ id: id(`result-edge-${i}`), kind: "travel" as const, payload: "vector" as const, label: ["The", "cat", "sat"][i]!, delay: i * 220, duration: 2100 }, appear(`out-${i}`, 1700 + i * 220), appear(`result-edge-${i}`, 2400 + i * 220, 350)]),
    ] },
    { id: "summary", title: t("回看完整数据通路"), description: t("词元转成向量，Q/K/V 分流，关联权重与值汇合，得到新的表示。点重播可再次观察并行过程。"), duration: 2400, changes: [], effects: [
      { id: id("result-1"), kind: "pulse", duration: 2000 },
    ] },
  ];
}
