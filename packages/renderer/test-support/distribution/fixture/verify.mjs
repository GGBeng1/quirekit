import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import * as contract from "@quirekit/render-contract";
import { displayList, paint, svg } from "./dist/example.js";

// The independent consumer loads real packed entry points without a DOM or editor runtime.
assert.deepEqual(Object.keys(contract), []);
assert.equal(typeof document, "undefined");
assert.deepEqual(displayList.bounds, { x: 0, y: 0, width: 320, height: 100 });
assert.deepEqual(displayList.commands.map(({ kind }) => kind), ["fill-rect", "text", "text"]);

const calls = [];
paint({
  font: "", fillStyle: "",
  /** @param {...number} args - Clear rectangle coordinates. */
  clearRect(...args) { calls.push(["clear", ...args]); },
  /** @param {...number} args - Filled rectangle coordinates. */
  fillRect(...args) { calls.push(["fill", this.fillStyle, ...args]); },
  /** @param {...(string | number)} args - Text and baseline coordinates. */
  fillText(...args) { calls.push(["text", this.fillStyle, this.font, ...args]); }
});
assert.deepEqual(calls[0], ["clear", 0, 0, 320, 100]);
assert.deepEqual(calls[1], ["fill", "#eef2ff", 0, 0, 320, 100]);
assert.deepEqual(calls.slice(2).map((call) => call.slice(0, 4)), [
  ["text", "#172033", "600 20px sans-serif", "Quire Render"],
  ["text", "#475569", "14px sans-serif", "One scene, Canvas & SVG"]
]);
assert.ok(calls.slice(2).every((call) => call[4] === 16 && Number.isFinite(call[5])));
assert.match(svg, /viewBox="0 0 320 100"/u);
assert.match(svg, /fill="#eef2ff"/u);
assert.match(svg, />Quire Render<\/text>/u);
assert.match(svg, />One scene, Canvas &amp; SVG<\/text>/u);
writeFileSync("preview.svg", svg);
writeFileSync("canvas-calls.json", `${JSON.stringify(calls, null, 2)}\n`);
console.log("Packed contracts, legacy aliases, Canvas calls and SVG output verified without an editor.");
