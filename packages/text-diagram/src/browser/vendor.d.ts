declare module "@plantuml/core" {
  /** @param lines - PlantUML input. @param success - Complete SVG. @param failure - Engine diagnostic. */
  export function renderToString(lines: string[], success: (svg: string) => void, failure: (message: string) => void): void;
}
