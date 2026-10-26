import { expect, it } from "vitest";
import { findHeadingAtReadingLine, sortOutlineAnchors } from "./active-heading";

it("picks the last heading whose top has reached the reading line with logarithmic geometry queries", () => {
  const anchors = sortOutlineAnchors(new Map([["c", 300], ["a", 10], ["b", 120]]));
  expect(anchors.map(anchor => anchor.id)).toEqual(["a", "b", "c"]);
  // Heading tops in viewport pixels, already scrolled so that "a" is above the line.
  const tops = new Map([[10, -400], [120, 60], [300, 900]]);
  let queries = 0;
  const topOf = (position: number) => { queries += 1; return tops.get(position)!; };
  expect(findHeadingAtReadingLine(anchors, topOf, 48)).toBe("a");
  expect(findHeadingAtReadingLine(anchors, topOf, 60)).toBe("b");
  expect(findHeadingAtReadingLine(anchors, topOf, 2000)).toBe("c");
  // Before the first heading reaches the line, the first heading stays current.
  expect(findHeadingAtReadingLine(anchors, () => 500, 48)).toBe("a");
  expect(findHeadingAtReadingLine([], topOf, 48)).toBeUndefined();
  expect(queries).toBeLessThanOrEqual(3 * 2);
});
