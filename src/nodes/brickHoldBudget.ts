/**
 * The step budgets of packBricks' HOLD SEARCH (see `bricks.ts`).
 *
 * A step of the search is one placement scored, one stud of a placement
 * retired, or one catalogue entry tried at a cell while the placements are
 * listed; a step of `settle` is one word of a bit row built or XORed in
 * its parity proof, one rectangle compared with another by its probes, or
 * one rectangle or cut asked by its cut tiling — work
 * counted, never time — so whether a region is solved is the same on every
 * machine and under any load. The GROUND repair, which lays a build again
 * from a course where a piece of it floats, counts the lattice cells it lays
 * again; the searches it runs while it does spend the budgets above, which
 * are the cook's, so no repair can spend them twice. Measured over 40 000 generated houses up to a
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
  /**
   * What `settle`'s PROBES, asked after its parity proof, may spend on one
   * region and over one cook, in rectangles compared: some 10 ms a region at
   * worst. Over the synthetic slab families with no held packing, a probe
   * that found a proof took at most about 620 000 of them, and over random
   * floors on posts with baseplates about a million; one that finds none
   * spends its region's budget or its cells.
   */
  probe: 1 << 20,
  probeCook: 1 << 23,
  /** How many cells one region's probes may ask before they give up. */
  probeCells: 128,
  /**
   * What the GROUND repair may spend over one cook, in lattice cells laid
   * again: each course it asks of costs every cell from that course up.
   * Some ten relayings of a whole 32 x 32 lot's house.
   */
  ground: 1 << 20,
};

/**
 * Whether a course the search touched is laid again only from the first
 * cell of its new regions, reusing the last laying's choices where they
 * provably stand (see "relaying a course" in `bricks.ts`). Always on; the
 * suite turns it off to lay every such course again in full and check the
 * two agree brick for brick.
 */
export const holdRelay = { partial: true };
