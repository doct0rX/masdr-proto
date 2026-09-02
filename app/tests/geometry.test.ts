import { describe, it, expect } from "vitest";
import { deriveBucketHatPoms, defaultHatIntent, patternPiecesForBase, computeConsumption, COS_DROP } from "@/lib/geometry/bucket_hat";
import { bucketHatFlats } from "@/lib/flats/bucket_hat";
import { BUCKET_HAT_RULEBOOK as RB } from "@/lib/rulebook/bucket_hat";

describe("bucket hat geometry", () => {
  const g = deriveBucketHatPoms(defaultHatIntent());
  const v = (c: string, s: string) => g.poms.find((p) => p.code === c)!.values[s];

  it("grades inner circumference 57/59/61 with 2 cm steps", () => {
    expect([v("A", "S"), v("A", "M"), v("A", "L")]).toEqual([57, 59, 61]);
  });

  it("keeps tip diameter consistent with tip circumference", () => {
    for (const s of ["S", "M", "L"]) {
      expect(Math.abs(v("D", s) - v("H", s) / Math.PI)).toBeLessThan(0.1);
      expect(v("H", s)).toBeLessThan(v("A", s));
    }
    expect(v("D", "M")).toBeCloseTo(18.0, 0);
  });

  it("computes brim outer circumference for a 30° cone brim", () => {
    for (const s of ["S", "M", "L"]) expect(Math.abs(v("F", s) - (v("A", s) + 2 * Math.PI * v("C", s) * COS_DROP))).toBeLessThan(0.15);
    expect(v("F", "M")).toBeCloseTo(94.4, 0);
    expect(v("W", "M")).toBeCloseTo(30.0, 0);
  });

  it("grades monotonically for every POM", () => {
    for (const p of g.poms) expect(p.values.S <= p.values.M && p.values.M <= p.values.L).toBe(true);
  });

  it("produces plausible consumption per colour", () => {
    const pieces = patternPiecesForBase(g, "M");
    expect(pieces).toHaveLength(3);
    const c = computeConsumption(pieces, ["Khaki", "Jet Black"], { runQuantity: 300 });
    expect(c.per_unit).toHaveLength(2);
    expect(c.per_unit[0].metres_per_unit).toBeGreaterThan(0.15);
    expect(c.per_unit[0].metres_per_unit).toBeLessThan(0.3);
    expect(Math.abs(c.run_totals_m![0].metres - c.per_unit[0].metres_per_unit * 1.1 * 300)).toBeLessThan(2);
  });

  it("renders three flats with anchors for every claimed POM", () => {
    const flats = bucketHatFlats(g, "M");
    expect(flats).toHaveLength(3);
    for (const f of flats) for (const code of f.pom_codes) expect(f.svg).toContain(`id="pom-${code}"`);
    const all = new Set(flats.flatMap((f) => f.pom_codes));
    for (const p of g.poms) expect(all.has(p.code)).toBe(true);
  });

  it("rulebook operations are a complete reversible sequence", () => {
    expect(RB.operations.length).toBeGreaterThanOrEqual(12);
    expect(RB.operations.filter((o) => /topstitch/i.test(o.operation_en)).length).toBe(1);
    expect(RB.operations.some((o) => /turn/i.test(o.operation_en))).toBe(true);
    expect(RB.operations.some((o) => /topstitch/i.test(o.operation_en) && /0\.6 cm/.test(o.operation_en))).toBe(true);
    expect(RB.operations.every((o) => o.operation_ar.length > 5)).toBe(true);
  });
});
