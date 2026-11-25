import { describe, expect, it } from "vitest";
import { figureSlotId, splitAtFigureSlots } from "./figures";

describe("figure slots", () => {
  it("reads the id of a slot paragraph only", () => {
    expect(figureSlotId("FIGURE: fig-1-1")).toBe("fig-1-1");
    expect(figureSlotId("  FIGURE:fig-2-3 ")).toBe("fig-2-3");
    expect(figureSlotId("FIGURE: fig-1-1 and more")).toBeUndefined();
    expect(figureSlotId("See FIGURE: fig-1-1")).toBeUndefined();
  });

  it("splits HTML at the slots", () => {
    const html = '<p>a</p><div data-figure="fig-1-1"></div><p>b</p><div data-figure="fig-1-2"></div>';
    expect(splitAtFigureSlots(html)).toEqual([{ html: "<p>a</p>" }, { figure: "fig-1-1" }, { html: "<p>b</p>" }, { figure: "fig-1-2" }]);
    expect(splitAtFigureSlots("<p>x</p>")).toEqual([{ html: "<p>x</p>" }]);
  });
});
