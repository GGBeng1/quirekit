import type { FlowchartNode, FlowchartTerminal } from "@quirekit/flowchart";
import { diagram, diagramEdge, diagramNode } from "../diagrams/build";

/** @returns A login sequence with owned activations and attached request/return messages. */
export function sequenceTemplate() {
  const nodes: FlowchartNode[] = [{ ...diagramNode("sequence", "container", "用户登录 · 时序图", 0, 0, 1080, 720), style: { bold: true, fontSize: 22, stroke: "#94a3b8" } }];
  (["用户", "客户端", "认证服务", "用户数据库"] as const).forEach((label, i) => {
    nodes.push({ ...diagramNode(`participant-${i}`, i === 0 ? "actor-lifeline" : "lifeline", label, 80 + i * 250, 100, 160, 540, i === 3 ? "green" : "blue", { bold: true, fontSize: 18 }), parent: "sequence" });
  });
  for (const [i, y, height] of [[1, 220, 310], [2, 280, 200], [3, 340, 90]]) {
    nodes.push({ ...diagramNode(`active-${i}`, "activation", "", 150 + i! * 250, y!, 20, height!, "purple"), parent: `participant-${i}` });
  }
  /** @param actor - Participant index. @param other - Opposite participant. @param y - Event height in world pixels. @returns Correct side of the activation or its lifeline. */
  function terminal(actor: number, other: number, y: number): FlowchartTerminal {
    const node = nodes.find(node => node.id === (actor ? `active-${actor}` : "participant-0"))!;
    return { node: node.id, anchor: { x: actor ? (other > actor ? 1 : 0) : 0.5, y: (y - node.y) / node.height } };
  }
  const messages = [[0, 1, 240, "输入账号与密码"], [1, 2, 300, "提交登录请求"], [2, 3, 360, "查询用户记录"],
    [3, 2, 408, "用户记录"], [2, 1, 456, "令牌与权限"], [1, 0, 504, "返回登录结果"]] as const;
  return diagram(nodes, messages.map(([from, to, y, label], i) => diagramEdge(`message-${i}`, terminal(from, to, y), terminal(to, from, y),
    { label, style: { stroke: i > 2 ? "#5c9f8a" : "#64748b", dashed: i > 2, targetArrow: i > 2 ? "open" : "block" } })));
}

/** @returns An asynchronous job sequence with a real actor, loop annotation, self-call and owned destruction marker. */
export function asyncSequenceTemplate() {
  const nodes: FlowchartNode[] = [{ ...diagramNode("async-sequence", "container", "异步任务 · 时序图", 0, 0, 1000, 980), style: { bold: true, fontSize: 22, stroke: "#94a3b8" } }];
  for (const [i, text] of ["用户", "任务服务", "工作进程"].entries()) {
    nodes.push({ ...diagramNode(`async-${i}`, i ? "lifeline" : "actor-lifeline", text, 90 + i * 300, 95, 150, i === 2 ? 725 : 790, i === 2 ? "green" : "blue", { bold: true, fontSize: 18 }), parent: "async-sequence" });
  }
  nodes.push({ ...diagramNode("async-loop", "sequence-loop", "loop", 640, 450, 310, 160), parent: "async-sequence", style: { stroke: "#9383bc" } });
  nodes.push({ ...diagramNode("async-guard", "text", "[队列中还有任务]", 650, 488, 180, 28), parent: "async-loop" });
  nodes.push({ ...diagramNode("async-destroy", "destruction", "", 753, 808, 24, 24), parent: "async-2" });
  /** @param actor - Participant index. @param y - World event position. @returns Persisted attachment on the participant timeline. */
  function at(actor: number, y: number): FlowchartTerminal {
    const node = nodes.find(node => node.id === `async-${actor}`)!;
    return { node: node.id, anchor: { x: 0.5, y: (y - node.y) / node.height } };
  }
  return diagram(nodes, [
    diagramEdge("async-submit", at(0, 265), at(1, 265), { label: "提交任务", style: { targetArrow: "block" } }),
    diagramEdge("async-dispatch", at(1, 340), at(2, 340), { label: "异步派发", style: { targetArrow: "open" } }),
    diagramEdge("async-ack", at(1, 410), at(0, 410), { label: "任务已接收", style: { targetArrow: "open", dashed: true } }),
    diagramEdge("async-self", at(2, 535), at(2, 575), { vertices: [{ x: 885, y: 535 }, { x: 885, y: 575 }], label: "执行任务", style: { targetArrow: "block" } }),
    diagramEdge("async-complete", at(2, 665), at(1, 665), { label: "异步通知完成", style: { targetArrow: "open" } }),
    diagramEdge("async-result", at(1, 745), at(0, 745), { label: "推送处理结果", style: { targetArrow: "open" } }),
  ]);
}
