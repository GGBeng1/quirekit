/** @param name - Source container name. @returns Its public Prose tone. */
export function containerTone(name: string): "neutral" | "info" | "success" | "warning" | "danger" {
  if (["warning", "caution"].includes(name)) return "warning";
  if (name === "danger") return "danger";
  if (name === "tip") return "success";
  return ["info", "note", "important", "decision"].includes(name) ? "info" : "neutral";
}
