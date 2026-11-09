import { describe, expect, it } from "vitest";
import { judgeDelta, judgeInput } from "./judge";

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

describe("play modes", () => {
  it("uses a symmetric good window in challenge while retaining early explore selection", () => {
    expect(judgeInput(-.201, "challenge", 3.2)).toBeNull();
    expect(judgeInput(-.2, "challenge", 3.2)).toBe("GOOD");
    expect(judgeInput(.2, "challenge", 3.2)).toBe("GOOD");
    expect(judgeInput(-.3, "explore", 3.2)).toBe("GOOD");
  });

  it("never awards an explore hit for an invalid input timestamp", () => {
    expect(judgeInput(NaN, "explore", 3.2)).toBeNull();
  });
  it("allows a visible early note in explore mode but not in challenge mode", () => {
    expect(judgeInput(-2, "explore", 2.7)).toBe("GOOD");
    expect(judgeInput(-2, "challenge", 2.7)).toBeNull();
    expect(judgeInput(-2.71, "explore", 2.7)).toBeNull();
    expect(judgeInput(0.21, "explore", 2.7)).toBeNull();
    expect(judgeInput(0, "explore", 2.7)).toBe("PERFECT");
  });
});
