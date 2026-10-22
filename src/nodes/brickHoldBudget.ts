/**
 * The step budgets of packBricks' HOLD SEARCH (see `bricks.ts`).
 *
 * A step of the search is one placement scored, one stud of a placement
 * retired, or one catalogue entry tried at a cell while the placements are
 * listed; a step of `settle` is one word of a bit row built or XORed in
 * its parity proof, or one rectangle or cut asked by its cut tiling — work
 * counted, never time — so whether a region is solved is the same on every
 * machine and under any load. Measured over 40 000 generated houses up to a
 * 32 x 32 lot, the regions the greedy leaves a loose plate in were solved
 * in at most about 700 000 steps (a few milliseconds). Over the synthetic
 * slabs that run the search out, a parity proof took at most 1.6 million
 * steps and a cut tiling that found a packing at most 623 000. A region
 * past every budget is laid by the greedy as before, and the cook says so.
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
  /**
   * What `settle` may spend on one region's parity proof, in words of bit
   * rows XORed or built: some 10 ms at worst.
   */
  parity: 1 << 22,
  /** What `settle` may spend on one region's cut tiling, in rectangles and cuts asked. */
  cuts: 1 << 20,
  /** What `settle` may spend over one cook, both together. */
  settle: 1 << 24,
};

/**
 * Whether a course the search touched is laid again only from the first
 * cell of its new regions, reusing the last laying's choices where they
 * provably stand (see "relaying a course" in `bricks.ts`). Always on; the
 * suite turns it off to lay every such course again in full and check the
 * two agree brick for brick.
 */
export const holdRelay = { partial: true };
