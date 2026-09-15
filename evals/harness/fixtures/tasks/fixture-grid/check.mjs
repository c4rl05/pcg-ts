/**
 * Fixture checks for the stub scorer (evals/harness/fixtures/stub-score.mjs).
 * The real scorer defines its own check.mjs interface; this one only has to
 * satisfy the stub: given the `pcg cook --json` report of one seed, return
 * `{ [checkId]: { pass, value } }`.
 */
export function check({ report }) {
  const cloud = report?.outputs?.points?.[0]?.geometry;
  const count = cloud?.points ?? 0;
  const P = cloud?.domains?.find((d) => d.domain === "point")?.attrs?.find((a) => a.name === "P");
  const ex = P ? P.max[0] - P.min[0] : NaN;
  const ez = P ? P.max[2] - P.min[2] : NaN;
  return {
    count: { pass: count === 25, value: count },
    square: { pass: Number.isFinite(ex) && Math.abs(ex - ez) < 1e-6, value: [ex, ez] },
    "unit-spacing": { pass: Math.abs(ex - 4) < 1e-6 && Math.abs(ez - 4) < 1e-6, value: [ex, ez] },
  };
}
