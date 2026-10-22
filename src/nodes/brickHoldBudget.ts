/**
 * The step budgets of packBricks' HOLD SEARCH (see `bricks.ts`).
 *
 * A step is one placement scored, one stud of a placement retired, or one
 * catalogue entry tried at a cell while the placements are listed — work
 * counted, never time — so whether a region is solved is the same on every
 * machine and under any load. Measured over 40 000 generated houses up to a
 * 32 x 32 lot, the regions the greedy leaves a loose plate in were solved
 * in at most about 700 000 steps (a few milliseconds); a region past its
 * budget is laid by the greedy as before, and the cook says so.
 *
 * INTERNAL, and a module of its own for one reason: the suite lowers a
 * budget to reach that fallback and restores it after, which a constant
 * inside `bricks.ts` would not allow. It is deliberately not re-exported
 * from `src/nodes/index.ts`, so it is not part of the package.
 */
export const holdBudget = {
  /** What the search may spend on one region: about 30 ms at worst. */
  region: 1 << 21,
  /** What every region of one cook may spend together. */
  cook: 1 << 23,
  /**
   * Of a region's budget, what the search in scan order may spend before
   * the search fewest first takes over with the rest.
   */
  scan: 1 << 19,
};
