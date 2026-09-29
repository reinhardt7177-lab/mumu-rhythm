import { describe, expect, it } from "vitest";
import { judgeDelta } from "./judge";

describe("judgeDelta", () => {
  it("grades the elementary-friendly timing windows", () => {
    expect(judgeDelta(0)).toBe("PERFECT");
    expect(judgeDelta(0.079)).toBe("PERFECT");
    expect(judgeDelta(-0.081)).toBe("GREAT");
    expect(judgeDelta(0.149)).toBe("GREAT");
    expect(judgeDelta(-0.4)).toBe("GOOD");
    expect(judgeDelta(0.19)).toBe("GOOD");
  });

  it("does not accept notes far from the beat zone", () => {
    expect(judgeDelta(-1)).toBeNull();
    expect(judgeDelta(0.21)).toBeNull();
  });
});
