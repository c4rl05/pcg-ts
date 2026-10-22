import{t as e}from"./rolldown-runtime-DK3Fl9T5.js";var t=e({default:()=>n}),n=`{
  "formatVersion": 1,
  "seed": 1889,
  "meta": {
    "title": "A brick house split on a stud lattice and built in bricks",
    "description": "A SHORT TERRACE OF HOUSES DERIVED BY A SPLIT GRAMMAR ON AN INTEGER LATTICE, THEN BUILT IN BRICKS. Every terminal of the grammar is an axis-aligned box whose corners are WHOLE NUMBERS -- x and z in studs, y in plates, a plate 0.4 of a stud -- carrying a string \`kind\` (wall, glass, door, trim, roof, floor, ground, chimney) and a palette colour; \`packBricks\` turns those boxes into catalogue bricks, and the house is drawn as three instance batches: bricks, the studs left showing, and the pots on its chimneys. THE GRAMMAR IS STAGED, NOT RECURSIVE. The derivation is lot -> blocks -> tiers -> storeys -> a floor slab and four walls -> bays -> the pieces round each opening, with a ceiling slab over each tier's top storey, a second branch from each block's top tier to the layers of its roof, and a third to its chimney. Every one of those rules has the SAME shape: decide on the parent, fan it out with \`repeatPoints\`, and rewrite each child's box from its copy index. THE FAN IS \`repeatPoints\` WITH THE CELL'S OWN COUNT: a block splits into \`1 + can\` children in each of three rounds (one when it is too small to leave two halves, and in the third round also when it is no longer than 16 studs), a block is one tier or two (two when it sets back), a tier stacks \`storeys\` storeys, a wall takes \`nb\` bays, a pitched roof takes \`ceil(short / 2)\` layers and a flat one a single layer, and each layer its pieces -- three on a gable, one on a hip, four on a flat roof -- and an opening takes seven pieces -- the wall under it, its sill, the opening itself, its lintel, the two jambs and the wall over it. Each cell is repeated exactly as many times as it needs, so no fan has a ceiling to outgrow, and nothing is made only to be filtered away but the pieces an opening does not have: a door's sill and the wall under it, the sill or lintel of a block that rolled none, and the wall over a lintel that fills the wall above its opening (every lintel at the default heights) come out with no height, and the packer skips a box that covers no cells, so one fan of seven serves every opening. The copies carry every attribute of the parent, so a child knows everything its parent decided, and each copy gets its own seed, so the children still differ in every random draw. The copy index lands in \`slot\` (in \`tier\` for the tiers, and in \`layer\` and \`part\` for the roof, two repeats in a row), and each corner of the child's box is a CHOICE by it: \`choose(slot, case0, case1, ...)\` picks one whole expression by the index, so a part's five corners and an opening's seven pieces are each one \`choose\`, and a roof piece's corner is a \`choose\` by the roof's style of a \`choose\` by the part -- exact, where the piecewise sum \`eq(slot, 0) * v0 + eq(slot, 1) * v1 + ...\` it replaces multiplied every case that did not fire by zero and added it in. The palette reads a block's colour the same way, \`choose(wallTint, [r, g, b], ...)\`, one row per entry. The stage decides what a cell is, so no rule dispatches on a string; the string dispatches are the palette, a \`byAttribute\` on \`kind\` that is the single table of colours, the per-brick tint after the packing, which touches only \`wall\`, and the studs filter, which drops the outer studs of \`trim\` (see THE FACADE TRIM). The three split graphs in this corpus spell a rule the same way -- decide on the parent, fan out with \`repeatPoints\`, and select each child's box by \`slot\` in one \`setBounds\` -- and differ in how often they apply one. \`examples-facade\` and \`examples-floorplan\` apply ONE rule recursively under \`repeatUntil\` until every cell is small enough; this house applies a DIFFERENT rule at each stage, each a bounded number of times, so its stages are written out rather than looped. THE CUT IS SNAPPED, AND DECIDED ON THE PARENT: \`floor(span * f + 0.5)\` clamped so neither half falls under \`minBlock\` studs, drawn before the fan, as the facade and floorplan draw theirs, so both halves carry the same value and meet at one integer coordinate -- drawn after the fan it would differ per child, because the children have different seeds. THE WORKING BOX IS THE STANDARD \`boundsMin\`/\`boundsMax\`, IN LATTICE UNITS, and every rewrite of it is ONE \`setBounds\`. That matters: \`setBounds\` resolves both corners against the box it was handed before writing either, so a rewrite that computes the new minimum from the old maximum, or the reverse, can never read a corner it has just replaced. The roof's pieces and the tiers, each a function of every component of the box they arrive with, are written that way with nothing carried aside. The last \`setBounds\` converts the lattice to world units and centres the lot, and that is the box \`packBricks\` reads. An expression that reads a corner's component more than once names it once in a \`let\` -- \`let({ x0: component(attribute(\\"boundsMin\\", 3), 0), z0: ... }, ...)\`, then bare \`x0\` wherever it is read -- and a name is bound only where reading it by reference makes a smaller tree than writing it out again, so a lone \`attribute\` read twice stays inline (the generator tries every split of up to twelve names, and past that climbs to a smaller tree one name at a time). A \`let\` is notation: the field is the same as the one written out. A WINDOW GOES ONLY WHERE A WALL IS EXPOSED, and exposure is computed rather than assumed. Blocks share party walls, and a tall block beside a low one has a wall that is covered at the bottom and open above. Each candidate opening places a probe half a stud outside its wall at the BOTTOM of where the opening would be -- for a window with a sill, one plate lower, in the course its sill stands out into -- and \`pathCoverage\` with \`near\` = \`far\` = 0 asks whether it lies inside any tier, roof layer or chimney's shadow (see below), the boxes read as points with their size from their corners. Bottom is enough because every occluder stacks, with nothing overhanging -- roof layers on tiers, an upper tier inside the footprint of the one under it, a chimney on a roof step or a parapet over solid roof -- all of it standing on the ground (a sill stands out of its wall, but it is no occluder: it stands only in cells its own probe found clear): if the bottom of the opening is free, everything above it in that column is free too. ACROSS the opening it takes one point PER STUD, because a neighbour ending mid-window or a roof layer stepping in can cover part of the width, and a box on the lattice that overlaps the opening at all contains one of its studs; the fan casts as many rays along the wall as the widest opening \`openingWidth\` allows has studs, four, the end rays a quarter stud inside the first and last stud, so no stud of any opening falls between two rays; \`rayCount\` takes no field, so the fan is sized for the param's maximum rather than read from it. The window-or-solid roll is drawn BEFORE the probe moves the point: a random draw hashes the point's identity, its position as well as its seed, so a roll drawn after the probe would change whenever the probe did. Doors go on the ground floor (the lower tier's first storey) of the first lot-edge wall -- south, then north, else west, else east -- in the middle bay, the edges read on the block while its box is still the block's. Every block has such a wall: a cut along one axis never moves a block off the lot edges of the other, so a block with neither a south nor a north edge was cut along z on both sides, which takes two of the three rounds, and the one left cannot cut it off both the west and the east edge; and with \`minBlock\` at least 5 that side wall is three studs or more between the south and north walls, wide enough for a door bay, so every block has a door. ROOFS, CHIMNEYS AND SETBACKS are decided per block by seeded rolls, each against its rate param. THE ROOF is one of three styles, drawn on the block: flat with \`flatRoofRate\`, else a hip with \`hipRoofRate\`, else a gable. A GABLE's layers step in one stud on the two long sides, its ridge along the long axis and the stud at each end of a layer its gable wall; a HIP's layers step in one stud on all four sides, so it closes to a ridge as long as the long side less the short, and two studs more (one for an odd short side); both rise \`roofStep\` plates a layer for \`ceil(short / 2)\` layers. A FLAT roof is the top tier's ceiling slab with a parapet on its edge, one stud thick and three plates tall, over the walls below. Every piece of every style is one \`setBounds\` whose corners are a \`choose\` by \`roofStyle\`. A CHIMNEY (\`chimneyRate\`) is a stack one stud by two, its long side along the ridge, rising four plates past the top of its roof, with a pot on each of its two top studs. On a pitched roof it stands on the exposed one-stud step of a layer in the upper half below the top, front or back by a roll: every layer above that one starts a stud further in, so the stack stands on the roof and overlaps no box, and along the ridge it keeps off a gable's end studs. On a flat roof it stands on the parapet's long side. For the exposure test a chimney counts as its SHADOW: the stack grown two studs every way across the roof, kept inside its tier, down to the ceiling and up past its pots, because a stack standing a stud or two off a taller neighbour's wall is still in front of that wall's windows, past the probe half a stud out; so no window opens with a chimney two studs or less in front of it, nor beside one that close at its height. The pots are found rather than placed: a pot goes on every showing stud of a chimney brick with nothing resting on it, so in a partial build it comes with the chimney's last course. A SETBACK (\`setbackRate\`) steps a block of two storeys or more in above a storey drawn from the first to the one under the top, by two studs on every side the block has on the lot edge -- one where two would leave a side of the upper storeys under four studs, none where one would too -- while a party wall stays flush with its neighbour; a block with no lot-edge side never sets back. The block becomes two TIERS, each with its own storeys and ceiling: the lower tier's ceiling is the terrace, and only the upper tier, whose footprint the roof follows, takes the roof and the chimney. THE FACADE TRIM is what keeps a big wall from reading flat up close: sills, lintels, a plinth, and bricks that are not all one colour. A SILL (\`sillRate\`) is a plate under a window, as wide as it, its top at \`sillHeight\`, standing one stud out from the wall face: a plate two studs deep, one row in the wall standing on the wall under it and one outside, so it is held through the wall and its outer row needs nothing under it. Its outer studs are not drawn -- a stud on a trim brick that nothing ever rests on is dropped from the studs batch -- so it reads as a smooth ledge, the way a tile has no studs; it is still a plate to the build, and nothing it holds needs those studs. A window that would have one is probed at the sill's course, so a sill only ever stands where nothing else is: it never meets a neighbour, a roof or a chimney. A LINTEL (\`lintelRate\`) is a block over each window and door, as wide as the opening and a brick tall, less where the wall over the opening is shorter. Both are the opening's width, not wider: a bay keeps a stud of jamb either side, often only one, and trim a stud wider than the window met the next window's and ran along the wall as a band. Sill and lintel are kind \`trim\`, its own material to the packer, in the TRIM colour, the block's wall colour darkened, so it stands out from the wall and from the pale glass alike and the two tie together. A PLINTH (\`plinthRate\`) lays every wall brick standing on the ground floor's slab, the bottom course all the way round every block, in dark grey. Sills and lintels are each rolled ONCE PER BLOCK, so every window of a block agrees and neighbouring blocks can differ; the plinth is rolled ONCE PER HOUSE, because it is laid on the packed bricks and a brick can run on across two blocks' walls of one colour, so a roll per block would spill a few studs of plinth into a neighbour that had none. And \`brickVariation\` is the share of wall bricks laid in an OFF-SHADE of their wall's colour, half darker and half lighter. The plinth and the off-shades are coloured on the BRICKS, after the packing, each brick drawing on its own identity: the packing read the boxes' colour, so neither moves a joint, and the variation is brick by brick rather than box by box. A stud takes the tint of the brick it stands on, gathered by \`transferByIndex\` through the \`brickId\` packBricks wrote on it, so a varied brick's studs match it. THE BUILD. \`packBricks\` reads the pieces' world corners, keeps \`kind\` and colour apart with \`groupBy\`, and lays every wall in full bricks with the joints staggered course to course; the catalogue is the default one with the BASEPLATES appended through \`extraBricks\` -- every size of 16, 24, 32 and 40 studs a side, either way round -- and the ground is exactly one of them, one piece under the whole lot rather than a margin of loose plates: on each axis the lot plus two studs either side, rounded up to a multiple of eight, so every lot from 8 to 32 studs keeps two to five studs of baseplate showing on every side. One catalogue serves every piece, so a baseplate is also just the largest plate that fits: a floor slab, which runs on across every block of its storey (the slabs share a kind and a colour), or a one-plate roof course sixteen studs or more each way takes one the way it takes any plate. Neighbouring blocks each build their own wall, so a party wall is two studs thick, and the stud at each gable end of a roof layer has kind \`wall\` (it is the gable, in the wall's colour), while a flat roof's parapet is \`roof\`, in the roof's colour, and a chimney is its own kind, one colour in every house. THE MESHES ARE THE GRAPH'S OWN: three outputs carry \`role: \\"asset\\"\`, so \`brick\` (a unit box centred on its point), \`stud\` (a twelve-sided \`meshPrimitive\` cylinder, 0.6 across and 1.7/3.2 of a plate tall, capped on top and open underneath where it stands on a brick) and \`pot\` (the same cylinder 0.8 across and 0.8 tall, standing over a stud and hiding it) are the meshes the three spawners' asset ids resolve to, in the editor and in \`pcg render\`, rather than placeholders. One box serves every brick because a brick point's \`scale\` is its own-frame size and its \`rot\` the quarter turn of a brick laid sideways. A hairline gap is taken off every brick's \`scale\` so the joints read; a brick is centred on its point, so that lowers its drawn top by half the gap, and the stud and pot meshes stand the same half-gap below their point so they sit on the brick as drawn. WHAT HOLDS TOGETHER is measured, not assumed. \`brickConnectivity\` numbers the pieces stud clutch alone holds together and gives every brick a build STEP: courses bottom up, a brick placed when it stands on the baseplate or grips one already placed, a plate hung under a floor placed with the floor. A floor or a roof's first course laid over an empty room is the hard case -- its plates touch nothing below, and the ones that reach no wall are held only by what is laid on them. Four things in the packer answer it. Plates up to 2x16 in the catalogue, so a floor's plates reach a wall. \`bond\`, which rewards a placement for every two pieces it joins, so the course above bridges the loose ones. And WHAT HOLDS, weighed before the score, for the floor that no course above can bridge: an upper storey's slab is ONE plate thick, over the empty room below and under the empty room above, with walls only at its edges, so each of its plates has to reach a wall by itself. A plate with nothing under it and nothing over it is loose in every build order, and a plate that would leave the cell beside it with no held plate left to cover it commits that cell to a loose plate too, so each placement is charged the loose plates it commits the build to and the fewest wins, before the score -- without the charge for the cell beside it, a plate could cut off the strip next to it in an occasional house. And the HOLD SEARCH, for the trap that looking one plate ahead cannot see: a plate laid early that takes the grip a cell two or more plates later needs. Where the greedy still lays a plate held by nothing, the packer lifts that course and solves the slab around it EXACTLY -- a search, bounded in steps rather than time so every machine gets the same house, for a packing in which every plate reaches a wall -- and lays it again; a course where nothing came out loose is never touched, so a house that was already in one piece is the same house byte for byte. A roof over an EMPTY ATTIC was beyond all four -- only its two outer strips stood on walls, and a roof that narrows as it rises has no course wide enough to tie the middle strips back to them -- and that was the grammar's to fix: a house has a ceiling, so each tier carries a one-plate ceiling slab over its top storey and the roof stands on it. A THIRD SPLIT ROUND is the grammar's too: two rounds leave a 32-stud lot blocks up to 21 studs square, and an upper storey's slab that size, or a flat roof, was past what the hold search always solves within its budget -- it left a plate loose in about one such house in a thousand, with every roof a gable and no setback -- so a block still longer than 16 studs is cut again across its longer side. Three more answers are the grammar's, all to one trap the packer's look cannot see: a plate laid on a plate over an empty room, each of the two looking held because the other is there, the pair held by nothing in a strip no wall reaches. So a FLAT roof is the tier's ceiling itself, with nothing laid on it but the parapet over its edge, which makes it an upper storey's slab by another name; a SETBACK's upper tier starts on the lower tier's ceiling plate, which is its first floor and the terrace round it in one slab, rather than on a slab of its own laid over it; and a chimney on a flat roof stands on the parapet, over the wall, rather than on the ceiling, where it would be held only by the plate under it. A two-plate floor slab would have answered the floor from the grammar too, bonding its second course across the first's joints, but at a plate on every storey and some seven per cent more bricks; the packer's rule costs neither, and changes nothing in a house that was already in one piece. A brick no order could attach would still get step -1, which says so: the whole build draws it, and every partial build leaves it out rather than show it hanging in air. THE \`buildStep\` PARAM shows the build as it stands after that step: bricks are kept while their step is at most it, and a stud shows once its brick is placed and until the brick resting on it is. The packer is asked for EVERY stud (\`studMode: all\`), each knowing the brick it stands on and the brick resting on it; the studs go through \`brickConnectivity\` alongside the bricks, which writes on each stud the step of both, so the rule is one filter on the studs with no join. The param's maximum, 138, is an upper bound on how tall a house can stand, in plates, taken from every param below at the top of its range: the ceiling over the most storeys at the tallest storey (a setback adds nothing, its upper tier starting on the lower one's ceiling), then the taller of a pitched roof -- the roof step times half a tier's short side rounded up, the short side at most the smaller lot maximum -- and a flat roof's parapet, then a chimney's rise over it -- a step is a distinct course bottom, so no house has more steps than that -- and so it is the whole build for every house; the exact range for one house is the \`stepCount\` detail \`brickConnectivity\` writes, steps 0 to stepCount - 1, which is what a host's build-step slider should run over. THE OTHER PARAMS are the grammar's own numbers, each READ by name with \`param(\\"...\\")\` in the field slots that use it and bound when the graph loads, so at its default every one cooks exactly what the literal it replaced did: \`storeyHeight\`, \`sillHeight\` and \`headHeight\` in plates, \`bayWidth\`, \`openingWidth\` and \`minBlock\` in studs, \`windowRate\` (the chance an exposed bay takes a window), \`minStoreys\` and \`maxStoreys\`, \`roofStep\` (the plates a pitched roof's layer rises), the four rates of the roofs, chimneys and setbacks and the four of the facade trim (above), and the lot's range, \`lotWidthMin\`/\`lotWidthMax\` and \`lotDepthMin\`/\`lotDepthMax\`. A value that must land on the lattice is rounded where it is read, \`floor(param(\\"storeyHeight\\") + 0.5)\`, and a lot side is rounded down to an even number so the lot centres on whole studs; a max below its min reads as the min. The ranges hold jointly, not one at a time: every sill is below every head, and every head two plates under the lowest storey, so no combination makes an opening or a lintel of no height. Some numbers stay literals by choice -- the palette, the trim's shade and the off-shades' two factors, a sill's one stud out and a lintel's brick of height, the cut's 0.35 + 0.3 spread, the probe's half-stud offset, the parapet's three plates, a chimney's footprint and its four plates of rise, the setback's inset, the baseplate's margin -- and some because no field reaches their slot, so no param can: the lattice pitch (\`packBricks\` and \`brickConnectivity\` \`pitch\`), the baseplate sizes (\`extraBricks\`), the stud and pot meshes (\`meshPrimitive\` \`size\` and \`center\`), the probe fan (\`rayCount\`) -- and so the brick gap, since a turned gap would leave every stud standing off its brick by the difference. THE LOT STOPS AT 32 x 32, which stands on the largest baseplate, 40 x 40, with four studs of it showing on every side. It stopped at 28 x 22 before the packer had its hold search, because an upper storey's slab is one plate between empty rooms and looking one plate ahead still left one of its plates reaching no wall in an occasional house -- one house in eleven at 28 x 32. With the search and the grammar's answers above, the first 2000 seeds at the default params came out in one piece with no loose brick, and so did 1000 seeds with every param at its minimum and at its maximum, 1000 seeds of each of some thirty combinations pushed together -- every param at its maximum and every one at its minimum, a 32 x 32 lot of four storeys under each roof style forced, with the facade trim forced on and off, chimneys and setbacks forced on lots from 8 x 8 to 32 x 32, the lowest sill under the highest head in the shortest storey -- and 500 seeds at every lot from 16 x 16 to 32 x 32 in steps of four studs; and in none of them did a sill or any other piece claim a lattice cell of another material.",
    "tags": [
      "examples",
      "structure",
      "topology"
    ]
  },
  "params": [
    {
      "name": "buildStep",
      "value": 138,
      "min": 0,
      "max": 138,
      "description": "Show the build as it stands after this many steps, counting from 0. A step is one course of the build placed bottom up, with anything hanging under a brick placed alongside it; the default and maximum, 138, is an upper bound on how tall a house can stand in plates, taken from every other param at the top of its range, so it is past every house's last step and shows the whole build -- including any brick no order can attach (step -1), which every smaller value hides rather than draw hanging in air. The exact range for one house is the stepCount detail brickConnectivity writes: steps 0 to stepCount - 1."
    },
    {
      "name": "storeyHeight",
      "value": 16,
      "min": 15,
      "max": 21,
      "description": "Plates from one storey's floor to the next, its one-plate floor slab included: 16 is the slab and five bricks of wall. Rounded to a whole plate."
    },
    {
      "name": "sillHeight",
      "value": 6,
      "min": 2,
      "max": 7,
      "description": "Plates from a storey's floor up to the bottom of every window, which is the top of its sill where it has one. Rounded to a whole plate; its range ends below headHeight's, so a window always has a height."
    },
    {
      "name": "headHeight",
      "value": 12,
      "min": 8,
      "max": 13,
      "description": "Plates from a storey's floor up to the top of every window and door. Rounded to a whole plate; its range ends two plates under the lowest storeyHeight, so a wall keeps at least one plate over its openings, the plate a lintel takes first."
    },
    {
      "name": "bayWidth",
      "value": 4,
      "min": 3,
      "max": 8,
      "description": "Target bay width in studs: a wall L studs long takes max(1, floor(L / bayWidth)) bays, and each bay holds at most one window or door."
    },
    {
      "name": "openingWidth",
      "value": 2,
      "min": 1,
      "max": 4,
      "description": "Widest window or door, in studs, rounded to a whole stud; a bay keeps at least a stud of wall either side, so a narrower bay takes a narrower opening."
    },
    {
      "name": "windowRate",
      "value": 0.8,
      "min": 0,
      "max": 1,
      "description": "Chance that a bay wide enough for an opening, and exposed, takes a window rather than staying solid wall. Doors do not roll."
    },
    {
      "name": "sillRate",
      "value": 0.75,
      "min": 0,
      "max": 1,
      "description": "Chance that a block's windows have SILLS: under each window a plate as wide as the window, its top at sillHeight, standing one stud out from the wall face, in the block's trim colour (its wall colour darkened). The studs on its outer row are not drawn, so it reads as a smooth ledge. A window with a sill opens only where the cells the sill stands out into are clear as well. Doors have none. Rolled per block, so every window of a block agrees."
    },
    {
      "name": "lintelRate",
      "value": 0.75,
      "min": 0,
      "max": 1,
      "description": "Chance that a block's windows and doors have LINTELS: over each opening a block of the trim colour as wide as the opening and a brick tall, less where the wall over the opening is shorter. Rolled per block."
    },
    {
      "name": "plinthRate",
      "value": 0.5,
      "min": 0,
      "max": 1,
      "description": "Chance that the house stands on a PLINTH: every wall brick whose bottom is the ground floor's bottom course, round every block, laid in dark grey. Rolled once for the whole house, not per block: it is laid on the packed bricks, and a brick can run on across the walls of two blocks of one colour, so a roll per block would spill into a neighbour that had none."
    },
    {
      "name": "brickVariation",
      "value": 0.15,
      "min": 0,
      "max": 1,
      "description": "Share of wall bricks laid in an OFF-SHADE of their wall's colour, drawn brick by brick: half of them darker (0.88 of the colour), half lighter (1.1 of it, each channel capped at 1). Applied to the packed bricks, so it never moves a joint, and a brick's studs take its shade. 0 lays every wall in one colour."
    },
    {
      "name": "minBlock",
      "value": 6,
      "min": 5,
      "max": 9,
      "description": "Smallest side, in studs, a split may leave: a block is cut in two only when both halves are at least this wide, in each of three rounds (the third only cuts a block longer than 16 studs). Rounded to a whole stud. It starts at 5 so that a block with no south or north lot edge, whose door goes on a side wall between them, has a wall at least three studs long for it."
    },
    {
      "name": "minStoreys",
      "value": 1,
      "min": 1,
      "max": 4,
      "description": "Fewest storeys a block draws. Rounded; a maxStoreys below it reads as this."
    },
    {
      "name": "maxStoreys",
      "value": 3,
      "min": 1,
      "max": 4,
      "description": "Most storeys a block draws: each block takes a whole number uniformly from minStoreys to this."
    },
    {
      "name": "roofStep",
      "value": 2,
      "min": 1,
      "max": 3,
      "description": "Plates each layer of a pitched roof rises while it steps in one stud: on both long sides for a gable, on all four for a hip. Rounded to a whole plate."
    },
    {
      "name": "flatRoofRate",
      "value": 0.25,
      "min": 0,
      "max": 1,
      "description": "Chance that a block's roof is flat: its ceiling slab, grey like every floor, with a parapet on the edge one stud thick and three plates tall, the parapet in the roof's colour. Drawn first; a block that does not take it has a pitched roof."
    },
    {
      "name": "hipRoofRate",
      "value": 0.4,
      "min": 0,
      "max": 1,
      "description": "Chance that a pitched roof is a hip, stepping in on all four sides, rather than a gable, stepping in on the two long sides between gable ends. 0 makes every pitched roof a gable."
    },
    {
      "name": "chimneyRate",
      "value": 0.5,
      "min": 0,
      "max": 1,
      "description": "Chance that a block's roof has a chimney: a stack one stud by two rising from a roof step (from the parapet on a flat roof) four plates past the roof's top, with a pot on each of its two top studs."
    },
    {
      "name": "setbackRate",
      "value": 0.35,
      "min": 0,
      "max": 1,
      "description": "Chance that a block of two storeys or more steps its upper storeys in from the storeys below, on the sides it has on the lot edge, leaving a terrace; the roof stands on the upper storeys. A block with no lot-edge side, or too small to step in and keep four studs a side, never does."
    },
    {
      "name": "lotWidthMin",
      "value": 14,
      "min": 8,
      "max": 32,
      "description": "Narrowest lot, along x, in studs, rounded down to an even number so the lot centres on whole studs. The baseplate grows with the lot, keeping at least two studs of it on every side."
    },
    {
      "name": "lotWidthMax",
      "value": 26,
      "min": 8,
      "max": 32,
      "description": "Widest lot, along x, in studs: the width is drawn in even steps from lotWidthMin to this, and a value below the min reads as the min."
    },
    {
      "name": "lotDepthMin",
      "value": 10,
      "min": 8,
      "max": 32,
      "description": "Shallowest lot, along z, in studs, rounded down to an even number."
    },
    {
      "name": "lotDepthMax",
      "value": 18,
      "min": 8,
      "max": 32,
      "description": "Deepest lot, along z, in studs: the depth is drawn in even steps from lotDepthMin to this, and a value below the min reads as the min."
    }
  ],
  "nodes": [
    {
      "id": "lotPt",
      "type": "pointLine",
      "params": {
        "mode": "endpoints",
        "count": 1,
        "start": [
          0,
          0,
          0
        ],
        "end": [
          0,
          0,
          0
        ],
        "includeEnd": true,
        "spacing": 1
      }
    },
    {
      "id": "lotSize",
      "type": "setAttribute",
      "params": {
        "name": "lot",
        "domain": "point",
        "type": "f32",
        "tupleSize": 3,
        "value": {
          "fn": "let",
          "bind": {
            "w0": {
              "fn": "mul",
              "args": [
                2,
                {
                  "fn": "floor",
                  "args": [
                    {
                      "fn": "div",
                      "args": [
                        {
                          "fn": "param",
                          "name": "lotWidthMin"
                        },
                        2
                      ]
                    }
                  ]
                }
              ]
            },
            "d0": {
              "fn": "mul",
              "args": [
                2,
                {
                  "fn": "floor",
                  "args": [
                    {
                      "fn": "div",
                      "args": [
                        {
                          "fn": "param",
                          "name": "lotDepthMin"
                        },
                        2
                      ]
                    }
                  ]
                }
              ]
            }
          },
          "args": [
            {
              "fn": "vec",
              "args": [
                {
                  "fn": "add",
                  "args": [
                    {
                      "fn": "var",
                      "name": "w0"
                    },
                    {
                      "fn": "mul",
                      "args": [
                        2,
                        {
                          "fn": "floor",
                          "args": [
                            {
                              "fn": "mul",
                              "args": [
                                {
                                  "fn": "randomField",
                                  "key": "w"
                                },
                                {
                                  "fn": "add",
                                  "args": [
                                    {
                                      "fn": "max",
                                      "args": [
                                        0,
                                        {
                                          "fn": "div",
                                          "args": [
                                            {
                                              "fn": "sub",
                                              "args": [
                                                {
                                                  "fn": "mul",
                                                  "args": [
                                                    2,
                                                    {
                                                      "fn": "floor",
                                                      "args": [
                                                        {
                                                          "fn": "div",
                                                          "args": [
                                                            {
                                                              "fn": "param",
                                                              "name": "lotWidthMax"
                                                            },
                                                            2
                                                          ]
                                                        }
                                                      ]
                                                    }
                                                  ]
                                                },
                                                {
                                                  "fn": "var",
                                                  "name": "w0"
                                                }
                                              ]
                                            },
                                            2
                                          ]
                                        }
                                      ]
                                    },
                                    0.999
                                  ]
                                }
                              ]
                            }
                          ]
                        }
                      ]
                    }
                  ]
                },
                0,
                {
                  "fn": "add",
                  "args": [
                    {
                      "fn": "var",
                      "name": "d0"
                    },
                    {
                      "fn": "mul",
                      "args": [
                        2,
                        {
                          "fn": "floor",
                          "args": [
                            {
                              "fn": "mul",
                              "args": [
                                {
                                  "fn": "randomField",
                                  "key": "d"
                                },
                                {
                                  "fn": "add",
                                  "args": [
                                    {
                                      "fn": "max",
                                      "args": [
                                        0,
                                        {
                                          "fn": "div",
                                          "args": [
                                            {
                                              "fn": "sub",
                                              "args": [
                                                {
                                                  "fn": "mul",
                                                  "args": [
                                                    2,
                                                    {
                                                      "fn": "floor",
                                                      "args": [
                                                        {
                                                          "fn": "div",
                                                          "args": [
                                                            {
                                                              "fn": "param",
                                                              "name": "lotDepthMax"
                                                            },
                                                            2
                                                          ]
                                                        }
                                                      ]
                                                    }
                                                  ]
                                                },
                                                {
                                                  "fn": "var",
                                                  "name": "d0"
                                                }
                                              ]
                                            },
                                            2
                                          ]
                                        }
                                      ]
                                    },
                                    0.999
                                  ]
                                }
                              ]
                            }
                          ]
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        },
        "select": 0,
        "values": [],
        "weights": [],
        "stringValue": "",
        "seed": 0
      }
    },
    {
      "id": "lotBox",
      "type": "setBounds",
      "params": {
        "boundsMin": {
          "fn": "vec",
          "args": [
            0,
            1,
            0
          ]
        },
        "boundsMax": {
          "fn": "vec",
          "args": [
            {
              "fn": "component",
              "args": [
                {
                  "fn": "attribute",
                  "name": "lot",
                  "tupleSize": 3
                }
              ],
              "index": 0
            },
            1,
            {
              "fn": "component",
              "args": [
                {
                  "fn": "attribute",
                  "name": "lot",
                  "tupleSize": 3
                }
              ],
              "index": 2
            }
          ]
        }
      }
    },
    {
      "id": "lotPlinth",
      "type": "setAttribute",
      "params": {
        "name": "plinth",
        "domain": "point",
        "type": "f32",
        "tupleSize": 1,
        "value": {
          "fn": "lt",
          "args": [
            {
              "fn": "randomField",
              "key": "plinth"
            },
            {
              "fn": "param",
              "name": "plinthRate"
            }
          ]
        },
        "select": 0,
        "values": [],
        "weights": [],
        "stringValue": "",
        "seed": 0
      }
    },
    {
      "id": "b1Ax",
      "type": "setAttribute",
      "params": {
        "name": "ax",
        "domain": "point",
        "type": "f32",
        "tupleSize": 1,
        "value": {
          "fn": "ge",
          "args": [
            {
              "fn": "sub",
              "args": [
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "boundsMax",
                      "tupleSize": 3
                    }
                  ],
                  "index": 0
                },
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "boundsMin",
                      "tupleSize": 3
                    }
                  ],
                  "index": 0
                }
              ]
            },
            {
              "fn": "sub",
              "args": [
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "boundsMax",
                      "tupleSize": 3
                    }
                  ],
                  "index": 2
                },
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "boundsMin",
                      "tupleSize": 3
                    }
                  ],
                  "index": 2
                }
              ]
            }
          ]
        },
        "select": 0,
        "values": [],
        "weights": [],
        "stringValue": "",
        "seed": 0
      }
    },
    {
      "id": "b1Can",
      "type": "setAttribute",
      "params": {
        "name": "can",
        "domain": "point",
        "type": "f32",
        "tupleSize": 1,
        "value": {
          "fn": "ge",
          "args": [
            {
              "fn": "max",
              "args": [
                {
                  "fn": "sub",
                  "args": [
                    {
                      "fn": "component",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "boundsMax",
                          "tupleSize": 3
                        }
                      ],
                      "index": 0
                    },
                    {
                      "fn": "component",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "boundsMin",
                          "tupleSize": 3
                        }
                      ],
                      "index": 0
                    }
                  ]
                },
                {
                  "fn": "sub",
                  "args": [
                    {
                      "fn": "component",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "boundsMax",
                          "tupleSize": 3
                        }
                      ],
                      "index": 2
                    },
                    {
                      "fn": "component",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "boundsMin",
                          "tupleSize": 3
                        }
                      ],
                      "index": 2
                    }
                  ]
                }
              ]
            },
            {
              "fn": "mul",
              "args": [
                2,
                {
                  "fn": "floor",
                  "args": [
                    {
                      "fn": "add",
                      "args": [
                        {
                          "fn": "param",
                          "name": "minBlock"
                        },
                        0.5
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        },
        "select": 0,
        "values": [],
        "weights": [],
        "stringValue": "",
        "seed": 0
      }
    },
    {
      "id": "b1Cut",
      "type": "setAttribute",
      "params": {
        "name": "cutAt",
        "domain": "point",
        "type": "f32",
        "tupleSize": 1,
        "value": {
          "fn": "let",
          "bind": {
            "x0": {
              "fn": "component",
              "args": [
                {
                  "fn": "attribute",
                  "name": "boundsMin",
                  "tupleSize": 3
                }
              ],
              "index": 0
            },
            "z0": {
              "fn": "component",
              "args": [
                {
                  "fn": "attribute",
                  "name": "boundsMin",
                  "tupleSize": 3
                }
              ],
              "index": 2
            },
            "span": {
              "fn": "max",
              "args": [
                {
                  "fn": "sub",
                  "args": [
                    {
                      "fn": "component",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "boundsMax",
                          "tupleSize": 3
                        }
                      ],
                      "index": 0
                    },
                    {
                      "fn": "var",
                      "name": "x0"
                    }
                  ]
                },
                {
                  "fn": "sub",
                  "args": [
                    {
                      "fn": "component",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "boundsMax",
                          "tupleSize": 3
                        }
                      ],
                      "index": 2
                    },
                    {
                      "fn": "var",
                      "name": "z0"
                    }
                  ]
                }
              ]
            },
            "mb": {
              "fn": "floor",
              "args": [
                {
                  "fn": "add",
                  "args": [
                    {
                      "fn": "param",
                      "name": "minBlock"
                    },
                    0.5
                  ]
                }
              ]
            }
          },
          "args": [
            {
              "fn": "add",
              "args": [
                {
                  "fn": "select",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "ax"
                    },
                    {
                      "fn": "var",
                      "name": "x0"
                    },
                    {
                      "fn": "var",
                      "name": "z0"
                    }
                  ]
                },
                {
                  "fn": "clamp",
                  "args": [
                    {
                      "fn": "floor",
                      "args": [
                        {
                          "fn": "add",
                          "args": [
                            {
                              "fn": "mul",
                              "args": [
                                {
                                  "fn": "var",
                                  "name": "span"
                                },
                                {
                                  "fn": "add",
                                  "args": [
                                    0.35,
                                    {
                                      "fn": "mul",
                                      "args": [
                                        0.3,
                                        {
                                          "fn": "randomField",
                                          "key": "cut1"
                                        }
                                      ]
                                    }
                                  ]
                                }
                              ]
                            },
                            0.5
                          ]
                        }
                      ]
                    },
                    {
                      "fn": "var",
                      "name": "mb"
                    },
                    {
                      "fn": "sub",
                      "args": [
                        {
                          "fn": "var",
                          "name": "span"
                        },
                        {
                          "fn": "var",
                          "name": "mb"
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        },
        "select": 0,
        "values": [],
        "weights": [],
        "stringValue": "",
        "seed": 0
      }
    },
    {
      "id": "b1Fan",
      "type": "repeatPoints",
      "params": {
        "count": {
          "fn": "add",
          "args": [
            1,
            {
              "fn": "attribute",
              "name": "can"
            }
          ]
        },
        "indexAttr": "slot",
        "countAttr": ""
      }
    },
    {
      "id": "b1Box",
      "type": "setBounds",
      "params": {
        "boundsMin": {
          "fn": "vec",
          "args": [
            {
              "fn": "select",
              "args": [
                {
                  "fn": "mul",
                  "args": [
                    {
                      "fn": "mul",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "ax"
                        },
                        {
                          "fn": "attribute",
                          "name": "can"
                        }
                      ]
                    },
                    {
                      "fn": "attribute",
                      "name": "slot"
                    }
                  ]
                },
                {
                  "fn": "attribute",
                  "name": "cutAt"
                },
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "boundsMin",
                      "tupleSize": 3
                    }
                  ],
                  "index": 0
                }
              ]
            },
            {
              "fn": "component",
              "args": [
                {
                  "fn": "attribute",
                  "name": "boundsMin",
                  "tupleSize": 3
                }
              ],
              "index": 1
            },
            {
              "fn": "select",
              "args": [
                {
                  "fn": "mul",
                  "args": [
                    {
                      "fn": "mul",
                      "args": [
                        {
                          "fn": "sub",
                          "args": [
                            1,
                            {
                              "fn": "attribute",
                              "name": "ax"
                            }
                          ]
                        },
                        {
                          "fn": "attribute",
                          "name": "can"
                        }
                      ]
                    },
                    {
                      "fn": "attribute",
                      "name": "slot"
                    }
                  ]
                },
                {
                  "fn": "attribute",
                  "name": "cutAt"
                },
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "boundsMin",
                      "tupleSize": 3
                    }
                  ],
                  "index": 2
                }
              ]
            }
          ]
        },
        "boundsMax": {
          "fn": "vec",
          "args": [
            {
              "fn": "select",
              "args": [
                {
                  "fn": "mul",
                  "args": [
                    {
                      "fn": "mul",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "ax"
                        },
                        {
                          "fn": "attribute",
                          "name": "can"
                        }
                      ]
                    },
                    {
                      "fn": "sub",
                      "args": [
                        1,
                        {
                          "fn": "attribute",
                          "name": "slot"
                        }
                      ]
                    }
                  ]
                },
                {
                  "fn": "attribute",
                  "name": "cutAt"
                },
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "boundsMax",
                      "tupleSize": 3
                    }
                  ],
                  "index": 0
                }
              ]
            },
            {
              "fn": "component",
              "args": [
                {
                  "fn": "attribute",
                  "name": "boundsMax",
                  "tupleSize": 3
                }
              ],
              "index": 1
            },
            {
              "fn": "select",
              "args": [
                {
                  "fn": "mul",
                  "args": [
                    {
                      "fn": "mul",
                      "args": [
                        {
                          "fn": "sub",
                          "args": [
                            1,
                            {
                              "fn": "attribute",
                              "name": "ax"
                            }
                          ]
                        },
                        {
                          "fn": "attribute",
                          "name": "can"
                        }
                      ]
                    },
                    {
                      "fn": "sub",
                      "args": [
                        1,
                        {
                          "fn": "attribute",
                          "name": "slot"
                        }
                      ]
                    }
                  ]
                },
                {
                  "fn": "attribute",
                  "name": "cutAt"
                },
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "boundsMax",
                      "tupleSize": 3
                    }
                  ],
                  "index": 2
                }
              ]
            }
          ]
        }
      }
    },
    {
      "id": "b2Ax",
      "type": "setAttribute",
      "params": {
        "name": "ax",
        "domain": "point",
        "type": "f32",
        "tupleSize": 1,
        "value": {
          "fn": "ge",
          "args": [
            {
              "fn": "sub",
              "args": [
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "boundsMax",
                      "tupleSize": 3
                    }
                  ],
                  "index": 0
                },
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "boundsMin",
                      "tupleSize": 3
                    }
                  ],
                  "index": 0
                }
              ]
            },
            {
              "fn": "sub",
              "args": [
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "boundsMax",
                      "tupleSize": 3
                    }
                  ],
                  "index": 2
                },
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "boundsMin",
                      "tupleSize": 3
                    }
                  ],
                  "index": 2
                }
              ]
            }
          ]
        },
        "select": 0,
        "values": [],
        "weights": [],
        "stringValue": "",
        "seed": 0
      }
    },
    {
      "id": "b2Can",
      "type": "setAttribute",
      "params": {
        "name": "can",
        "domain": "point",
        "type": "f32",
        "tupleSize": 1,
        "value": {
          "fn": "ge",
          "args": [
            {
              "fn": "max",
              "args": [
                {
                  "fn": "sub",
                  "args": [
                    {
                      "fn": "component",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "boundsMax",
                          "tupleSize": 3
                        }
                      ],
                      "index": 0
                    },
                    {
                      "fn": "component",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "boundsMin",
                          "tupleSize": 3
                        }
                      ],
                      "index": 0
                    }
                  ]
                },
                {
                  "fn": "sub",
                  "args": [
                    {
                      "fn": "component",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "boundsMax",
                          "tupleSize": 3
                        }
                      ],
                      "index": 2
                    },
                    {
                      "fn": "component",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "boundsMin",
                          "tupleSize": 3
                        }
                      ],
                      "index": 2
                    }
                  ]
                }
              ]
            },
            {
              "fn": "mul",
              "args": [
                2,
                {
                  "fn": "floor",
                  "args": [
                    {
                      "fn": "add",
                      "args": [
                        {
                          "fn": "param",
                          "name": "minBlock"
                        },
                        0.5
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        },
        "select": 0,
        "values": [],
        "weights": [],
        "stringValue": "",
        "seed": 0
      }
    },
    {
      "id": "b2Cut",
      "type": "setAttribute",
      "params": {
        "name": "cutAt",
        "domain": "point",
        "type": "f32",
        "tupleSize": 1,
        "value": {
          "fn": "let",
          "bind": {
            "x0": {
              "fn": "component",
              "args": [
                {
                  "fn": "attribute",
                  "name": "boundsMin",
                  "tupleSize": 3
                }
              ],
              "index": 0
            },
            "z0": {
              "fn": "component",
              "args": [
                {
                  "fn": "attribute",
                  "name": "boundsMin",
                  "tupleSize": 3
                }
              ],
              "index": 2
            },
            "span": {
              "fn": "max",
              "args": [
                {
                  "fn": "sub",
                  "args": [
                    {
                      "fn": "component",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "boundsMax",
                          "tupleSize": 3
                        }
                      ],
                      "index": 0
                    },
                    {
                      "fn": "var",
                      "name": "x0"
                    }
                  ]
                },
                {
                  "fn": "sub",
                  "args": [
                    {
                      "fn": "component",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "boundsMax",
                          "tupleSize": 3
                        }
                      ],
                      "index": 2
                    },
                    {
                      "fn": "var",
                      "name": "z0"
                    }
                  ]
                }
              ]
            },
            "mb": {
              "fn": "floor",
              "args": [
                {
                  "fn": "add",
                  "args": [
                    {
                      "fn": "param",
                      "name": "minBlock"
                    },
                    0.5
                  ]
                }
              ]
            }
          },
          "args": [
            {
              "fn": "add",
              "args": [
                {
                  "fn": "select",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "ax"
                    },
                    {
                      "fn": "var",
                      "name": "x0"
                    },
                    {
                      "fn": "var",
                      "name": "z0"
                    }
                  ]
                },
                {
                  "fn": "clamp",
                  "args": [
                    {
                      "fn": "floor",
                      "args": [
                        {
                          "fn": "add",
                          "args": [
                            {
                              "fn": "mul",
                              "args": [
                                {
                                  "fn": "var",
                                  "name": "span"
                                },
                                {
                                  "fn": "add",
                                  "args": [
                                    0.35,
                                    {
                                      "fn": "mul",
                                      "args": [
                                        0.3,
                                        {
                                          "fn": "randomField",
                                          "key": "cut2"
                                        }
                                      ]
                                    }
                                  ]
                                }
                              ]
                            },
                            0.5
                          ]
                        }
                      ]
                    },
                    {
                      "fn": "var",
                      "name": "mb"
                    },
                    {
                      "fn": "sub",
                      "args": [
                        {
                          "fn": "var",
                          "name": "span"
                        },
                        {
                          "fn": "var",
                          "name": "mb"
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        },
        "select": 0,
        "values": [],
        "weights": [],
        "stringValue": "",
        "seed": 0
      }
    },
    {
      "id": "b2Fan",
      "type": "repeatPoints",
      "params": {
        "count": {
          "fn": "add",
          "args": [
            1,
            {
              "fn": "attribute",
              "name": "can"
            }
          ]
        },
        "indexAttr": "slot",
        "countAttr": ""
      }
    },
    {
      "id": "b2Box",
      "type": "setBounds",
      "params": {
        "boundsMin": {
          "fn": "vec",
          "args": [
            {
              "fn": "select",
              "args": [
                {
                  "fn": "mul",
                  "args": [
                    {
                      "fn": "mul",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "ax"
                        },
                        {
                          "fn": "attribute",
                          "name": "can"
                        }
                      ]
                    },
                    {
                      "fn": "attribute",
                      "name": "slot"
                    }
                  ]
                },
                {
                  "fn": "attribute",
                  "name": "cutAt"
                },
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "boundsMin",
                      "tupleSize": 3
                    }
                  ],
                  "index": 0
                }
              ]
            },
            {
              "fn": "component",
              "args": [
                {
                  "fn": "attribute",
                  "name": "boundsMin",
                  "tupleSize": 3
                }
              ],
              "index": 1
            },
            {
              "fn": "select",
              "args": [
                {
                  "fn": "mul",
                  "args": [
                    {
                      "fn": "mul",
                      "args": [
                        {
                          "fn": "sub",
                          "args": [
                            1,
                            {
                              "fn": "attribute",
                              "name": "ax"
                            }
                          ]
                        },
                        {
                          "fn": "attribute",
                          "name": "can"
                        }
                      ]
                    },
                    {
                      "fn": "attribute",
                      "name": "slot"
                    }
                  ]
                },
                {
                  "fn": "attribute",
                  "name": "cutAt"
                },
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "boundsMin",
                      "tupleSize": 3
                    }
                  ],
                  "index": 2
                }
              ]
            }
          ]
        },
        "boundsMax": {
          "fn": "vec",
          "args": [
            {
              "fn": "select",
              "args": [
                {
                  "fn": "mul",
                  "args": [
                    {
                      "fn": "mul",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "ax"
                        },
                        {
                          "fn": "attribute",
                          "name": "can"
                        }
                      ]
                    },
                    {
                      "fn": "sub",
                      "args": [
                        1,
                        {
                          "fn": "attribute",
                          "name": "slot"
                        }
                      ]
                    }
                  ]
                },
                {
                  "fn": "attribute",
                  "name": "cutAt"
                },
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "boundsMax",
                      "tupleSize": 3
                    }
                  ],
                  "index": 0
                }
              ]
            },
            {
              "fn": "component",
              "args": [
                {
                  "fn": "attribute",
                  "name": "boundsMax",
                  "tupleSize": 3
                }
              ],
              "index": 1
            },
            {
              "fn": "select",
              "args": [
                {
                  "fn": "mul",
                  "args": [
                    {
                      "fn": "mul",
                      "args": [
                        {
                          "fn": "sub",
                          "args": [
                            1,
                            {
                              "fn": "attribute",
                              "name": "ax"
                            }
                          ]
                        },
                        {
                          "fn": "attribute",
                          "name": "can"
                        }
                      ]
                    },
                    {
                      "fn": "sub",
                      "args": [
                        1,
                        {
                          "fn": "attribute",
                          "name": "slot"
                        }
                      ]
                    }
                  ]
                },
                {
                  "fn": "attribute",
                  "name": "cutAt"
                },
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "boundsMax",
                      "tupleSize": 3
                    }
                  ],
                  "index": 2
                }
              ]
            }
          ]
        }
      }
    },
    {
      "id": "b3Ax",
      "type": "setAttribute",
      "params": {
        "name": "ax",
        "domain": "point",
        "type": "f32",
        "tupleSize": 1,
        "value": {
          "fn": "ge",
          "args": [
            {
              "fn": "sub",
              "args": [
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "boundsMax",
                      "tupleSize": 3
                    }
                  ],
                  "index": 0
                },
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "boundsMin",
                      "tupleSize": 3
                    }
                  ],
                  "index": 0
                }
              ]
            },
            {
              "fn": "sub",
              "args": [
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "boundsMax",
                      "tupleSize": 3
                    }
                  ],
                  "index": 2
                },
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "boundsMin",
                      "tupleSize": 3
                    }
                  ],
                  "index": 2
                }
              ]
            }
          ]
        },
        "select": 0,
        "values": [],
        "weights": [],
        "stringValue": "",
        "seed": 0
      }
    },
    {
      "id": "b3Can",
      "type": "setAttribute",
      "params": {
        "name": "can",
        "domain": "point",
        "type": "f32",
        "tupleSize": 1,
        "value": {
          "fn": "let",
          "bind": {
            "m": {
              "fn": "max",
              "args": [
                {
                  "fn": "sub",
                  "args": [
                    {
                      "fn": "component",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "boundsMax",
                          "tupleSize": 3
                        }
                      ],
                      "index": 0
                    },
                    {
                      "fn": "component",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "boundsMin",
                          "tupleSize": 3
                        }
                      ],
                      "index": 0
                    }
                  ]
                },
                {
                  "fn": "sub",
                  "args": [
                    {
                      "fn": "component",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "boundsMax",
                          "tupleSize": 3
                        }
                      ],
                      "index": 2
                    },
                    {
                      "fn": "component",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "boundsMin",
                          "tupleSize": 3
                        }
                      ],
                      "index": 2
                    }
                  ]
                }
              ]
            }
          },
          "args": [
            {
              "fn": "mul",
              "args": [
                {
                  "fn": "ge",
                  "args": [
                    {
                      "fn": "var",
                      "name": "m"
                    },
                    {
                      "fn": "mul",
                      "args": [
                        2,
                        {
                          "fn": "floor",
                          "args": [
                            {
                              "fn": "add",
                              "args": [
                                {
                                  "fn": "param",
                                  "name": "minBlock"
                                },
                                0.5
                              ]
                            }
                          ]
                        }
                      ]
                    }
                  ]
                },
                {
                  "fn": "gt",
                  "args": [
                    {
                      "fn": "var",
                      "name": "m"
                    },
                    16
                  ]
                }
              ]
            }
          ]
        },
        "select": 0,
        "values": [],
        "weights": [],
        "stringValue": "",
        "seed": 0
      }
    },
    {
      "id": "b3Cut",
      "type": "setAttribute",
      "params": {
        "name": "cutAt",
        "domain": "point",
        "type": "f32",
        "tupleSize": 1,
        "value": {
          "fn": "let",
          "bind": {
            "x0": {
              "fn": "component",
              "args": [
                {
                  "fn": "attribute",
                  "name": "boundsMin",
                  "tupleSize": 3
                }
              ],
              "index": 0
            },
            "z0": {
              "fn": "component",
              "args": [
                {
                  "fn": "attribute",
                  "name": "boundsMin",
                  "tupleSize": 3
                }
              ],
              "index": 2
            },
            "span": {
              "fn": "max",
              "args": [
                {
                  "fn": "sub",
                  "args": [
                    {
                      "fn": "component",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "boundsMax",
                          "tupleSize": 3
                        }
                      ],
                      "index": 0
                    },
                    {
                      "fn": "var",
                      "name": "x0"
                    }
                  ]
                },
                {
                  "fn": "sub",
                  "args": [
                    {
                      "fn": "component",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "boundsMax",
                          "tupleSize": 3
                        }
                      ],
                      "index": 2
                    },
                    {
                      "fn": "var",
                      "name": "z0"
                    }
                  ]
                }
              ]
            },
            "mb": {
              "fn": "floor",
              "args": [
                {
                  "fn": "add",
                  "args": [
                    {
                      "fn": "param",
                      "name": "minBlock"
                    },
                    0.5
                  ]
                }
              ]
            }
          },
          "args": [
            {
              "fn": "add",
              "args": [
                {
                  "fn": "select",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "ax"
                    },
                    {
                      "fn": "var",
                      "name": "x0"
                    },
                    {
                      "fn": "var",
                      "name": "z0"
                    }
                  ]
                },
                {
                  "fn": "clamp",
                  "args": [
                    {
                      "fn": "floor",
                      "args": [
                        {
                          "fn": "add",
                          "args": [
                            {
                              "fn": "mul",
                              "args": [
                                {
                                  "fn": "var",
                                  "name": "span"
                                },
                                {
                                  "fn": "add",
                                  "args": [
                                    0.35,
                                    {
                                      "fn": "mul",
                                      "args": [
                                        0.3,
                                        {
                                          "fn": "randomField",
                                          "key": "cut3"
                                        }
                                      ]
                                    }
                                  ]
                                }
                              ]
                            },
                            0.5
                          ]
                        }
                      ]
                    },
                    {
                      "fn": "var",
                      "name": "mb"
                    },
                    {
                      "fn": "sub",
                      "args": [
                        {
                          "fn": "var",
                          "name": "span"
                        },
                        {
                          "fn": "var",
                          "name": "mb"
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        },
        "select": 0,
        "values": [],
        "weights": [],
        "stringValue": "",
        "seed": 0
      }
    },
    {
      "id": "b3Fan",
      "type": "repeatPoints",
      "params": {
        "count": {
          "fn": "add",
          "args": [
            1,
            {
              "fn": "attribute",
              "name": "can"
            }
          ]
        },
        "indexAttr": "slot",
        "countAttr": ""
      }
    },
    {
      "id": "b3Box",
      "type": "setBounds",
      "params": {
        "boundsMin": {
          "fn": "vec",
          "args": [
            {
              "fn": "select",
              "args": [
                {
                  "fn": "mul",
                  "args": [
                    {
                      "fn": "mul",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "ax"
                        },
                        {
                          "fn": "attribute",
                          "name": "can"
                        }
                      ]
                    },
                    {
                      "fn": "attribute",
                      "name": "slot"
                    }
                  ]
                },
                {
                  "fn": "attribute",
                  "name": "cutAt"
                },
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "boundsMin",
                      "tupleSize": 3
                    }
                  ],
                  "index": 0
                }
              ]
            },
            {
              "fn": "component",
              "args": [
                {
                  "fn": "attribute",
                  "name": "boundsMin",
                  "tupleSize": 3
                }
              ],
              "index": 1
            },
            {
              "fn": "select",
              "args": [
                {
                  "fn": "mul",
                  "args": [
                    {
                      "fn": "mul",
                      "args": [
                        {
                          "fn": "sub",
                          "args": [
                            1,
                            {
                              "fn": "attribute",
                              "name": "ax"
                            }
                          ]
                        },
                        {
                          "fn": "attribute",
                          "name": "can"
                        }
                      ]
                    },
                    {
                      "fn": "attribute",
                      "name": "slot"
                    }
                  ]
                },
                {
                  "fn": "attribute",
                  "name": "cutAt"
                },
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "boundsMin",
                      "tupleSize": 3
                    }
                  ],
                  "index": 2
                }
              ]
            }
          ]
        },
        "boundsMax": {
          "fn": "vec",
          "args": [
            {
              "fn": "select",
              "args": [
                {
                  "fn": "mul",
                  "args": [
                    {
                      "fn": "mul",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "ax"
                        },
                        {
                          "fn": "attribute",
                          "name": "can"
                        }
                      ]
                    },
                    {
                      "fn": "sub",
                      "args": [
                        1,
                        {
                          "fn": "attribute",
                          "name": "slot"
                        }
                      ]
                    }
                  ]
                },
                {
                  "fn": "attribute",
                  "name": "cutAt"
                },
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "boundsMax",
                      "tupleSize": 3
                    }
                  ],
                  "index": 0
                }
              ]
            },
            {
              "fn": "component",
              "args": [
                {
                  "fn": "attribute",
                  "name": "boundsMax",
                  "tupleSize": 3
                }
              ],
              "index": 1
            },
            {
              "fn": "select",
              "args": [
                {
                  "fn": "mul",
                  "args": [
                    {
                      "fn": "mul",
                      "args": [
                        {
                          "fn": "sub",
                          "args": [
                            1,
                            {
                              "fn": "attribute",
                              "name": "ax"
                            }
                          ]
                        },
                        {
                          "fn": "attribute",
                          "name": "can"
                        }
                      ]
                    },
                    {
                      "fn": "sub",
                      "args": [
                        1,
                        {
                          "fn": "attribute",
                          "name": "slot"
                        }
                      ]
                    }
                  ]
                },
                {
                  "fn": "attribute",
                  "name": "cutAt"
                },
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "boundsMax",
                      "tupleSize": 3
                    }
                  ],
                  "index": 2
                }
              ]
            }
          ]
        }
      }
    },
    {
      "id": "blkStoreys",
      "type": "setAttribute",
      "params": {
        "name": "storeys",
        "domain": "point",
        "type": "f32",
        "tupleSize": 1,
        "value": {
          "fn": "add",
          "args": [
            {
              "fn": "floor",
              "args": [
                {
                  "fn": "add",
                  "args": [
                    {
                      "fn": "param",
                      "name": "minStoreys"
                    },
                    0.5
                  ]
                }
              ]
            },
            {
              "fn": "floor",
              "args": [
                {
                  "fn": "mul",
                  "args": [
                    {
                      "fn": "randomField",
                      "key": "storeys"
                    },
                    {
                      "fn": "add",
                      "args": [
                        {
                          "fn": "max",
                          "args": [
                            0,
                            {
                              "fn": "sub",
                              "args": [
                                {
                                  "fn": "floor",
                                  "args": [
                                    {
                                      "fn": "add",
                                      "args": [
                                        {
                                          "fn": "param",
                                          "name": "maxStoreys"
                                        },
                                        0.5
                                      ]
                                    }
                                  ]
                                },
                                {
                                  "fn": "floor",
                                  "args": [
                                    {
                                      "fn": "add",
                                      "args": [
                                        {
                                          "fn": "param",
                                          "name": "minStoreys"
                                        },
                                        0.5
                                      ]
                                    }
                                  ]
                                }
                              ]
                            }
                          ]
                        },
                        0.999
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        },
        "select": 0,
        "values": [],
        "weights": [],
        "stringValue": "",
        "seed": 0
      }
    },
    {
      "id": "blkWall",
      "type": "setAttribute",
      "params": {
        "name": "wallTint",
        "domain": "point",
        "type": "f32",
        "tupleSize": 1,
        "value": {
          "fn": "floor",
          "args": [
            {
              "fn": "mul",
              "args": [
                {
                  "fn": "randomField",
                  "key": "wallTint"
                },
                4.999
              ]
            }
          ]
        },
        "select": 0,
        "values": [],
        "weights": [],
        "stringValue": "",
        "seed": 0
      }
    },
    {
      "id": "blkRoof",
      "type": "setAttribute",
      "params": {
        "name": "roofTint",
        "domain": "point",
        "type": "f32",
        "tupleSize": 1,
        "value": {
          "fn": "floor",
          "args": [
            {
              "fn": "mul",
              "args": [
                {
                  "fn": "randomField",
                  "key": "roofTint"
                },
                2.999
              ]
            }
          ]
        },
        "select": 0,
        "values": [],
        "weights": [],
        "stringValue": "",
        "seed": 0
      }
    },
    {
      "id": "blkExt",
      "type": "setAttribute",
      "params": {
        "name": "ext",
        "domain": "point",
        "type": "f32",
        "tupleSize": 3,
        "value": {
          "fn": "let",
          "bind": {
            "s": {
              "fn": "eq",
              "args": [
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "boundsMin",
                      "tupleSize": 3
                    }
                  ],
                  "index": 2
                },
                0
              ]
            },
            "n": {
              "fn": "eq",
              "args": [
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "boundsMax",
                      "tupleSize": 3
                    }
                  ],
                  "index": 2
                },
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "lot",
                      "tupleSize": 3
                    }
                  ],
                  "index": 2
                }
              ]
            }
          },
          "args": [
            {
              "fn": "vec",
              "args": [
                {
                  "fn": "var",
                  "name": "s"
                },
                {
                  "fn": "var",
                  "name": "n"
                },
                {
                  "fn": "mul",
                  "args": [
                    {
                      "fn": "mul",
                      "args": [
                        {
                          "fn": "sub",
                          "args": [
                            1,
                            {
                              "fn": "var",
                              "name": "s"
                            }
                          ]
                        },
                        {
                          "fn": "sub",
                          "args": [
                            1,
                            {
                              "fn": "var",
                              "name": "n"
                            }
                          ]
                        }
                      ]
                    },
                    {
                      "fn": "select",
                      "args": [
                        {
                          "fn": "eq",
                          "args": [
                            {
                              "fn": "component",
                              "args": [
                                {
                                  "fn": "attribute",
                                  "name": "boundsMin",
                                  "tupleSize": 3
                                }
                              ],
                              "index": 0
                            },
                            0
                          ]
                        },
                        3,
                        {
                          "fn": "mul",
                          "args": [
                            4,
                            {
                              "fn": "eq",
                              "args": [
                                {
                                  "fn": "component",
                                  "args": [
                                    {
                                      "fn": "attribute",
                                      "name": "boundsMax",
                                      "tupleSize": 3
                                    }
                                  ],
                                  "index": 0
                                },
                                {
                                  "fn": "component",
                                  "args": [
                                    {
                                      "fn": "attribute",
                                      "name": "lot",
                                      "tupleSize": 3
                                    }
                                  ],
                                  "index": 0
                                }
                              ]
                            }
                          ]
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        },
        "select": 0,
        "values": [],
        "weights": [],
        "stringValue": "",
        "seed": 0
      }
    },
    {
      "id": "blkInset",
      "type": "setAttribute",
      "params": {
        "name": "inset",
        "domain": "point",
        "type": "f32",
        "tupleSize": 1,
        "value": {
          "fn": "let",
          "bind": {
            "x0": {
              "fn": "component",
              "args": [
                {
                  "fn": "attribute",
                  "name": "boundsMin",
                  "tupleSize": 3
                }
              ],
              "index": 0
            },
            "z0": {
              "fn": "component",
              "args": [
                {
                  "fn": "attribute",
                  "name": "boundsMin",
                  "tupleSize": 3
                }
              ],
              "index": 2
            },
            "x1": {
              "fn": "component",
              "args": [
                {
                  "fn": "attribute",
                  "name": "boundsMax",
                  "tupleSize": 3
                }
              ],
              "index": 0
            },
            "z1": {
              "fn": "component",
              "args": [
                {
                  "fn": "attribute",
                  "name": "boundsMax",
                  "tupleSize": 3
                }
              ],
              "index": 2
            },
            "sx": {
              "fn": "sub",
              "args": [
                {
                  "fn": "var",
                  "name": "x1"
                },
                {
                  "fn": "var",
                  "name": "x0"
                }
              ]
            },
            "sz": {
              "fn": "sub",
              "args": [
                {
                  "fn": "var",
                  "name": "z1"
                },
                {
                  "fn": "var",
                  "name": "z0"
                }
              ]
            },
            "w": {
              "fn": "eq",
              "args": [
                {
                  "fn": "var",
                  "name": "x0"
                },
                0
              ]
            },
            "e": {
              "fn": "eq",
              "args": [
                {
                  "fn": "var",
                  "name": "x1"
                },
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "lot",
                      "tupleSize": 3
                    }
                  ],
                  "index": 0
                }
              ]
            },
            "s": {
              "fn": "eq",
              "args": [
                {
                  "fn": "var",
                  "name": "z0"
                },
                0
              ]
            },
            "n": {
              "fn": "eq",
              "args": [
                {
                  "fn": "var",
                  "name": "z1"
                },
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "lot",
                      "tupleSize": 3
                    }
                  ],
                  "index": 2
                }
              ]
            }
          },
          "args": [
            {
              "fn": "mul",
              "args": [
                {
                  "fn": "gt",
                  "args": [
                    {
                      "fn": "add",
                      "args": [
                        {
                          "fn": "add",
                          "args": [
                            {
                              "fn": "add",
                              "args": [
                                {
                                  "fn": "var",
                                  "name": "w"
                                },
                                {
                                  "fn": "var",
                                  "name": "e"
                                }
                              ]
                            },
                            {
                              "fn": "var",
                              "name": "s"
                            }
                          ]
                        },
                        {
                          "fn": "var",
                          "name": "n"
                        }
                      ]
                    },
                    0
                  ]
                },
                {
                  "fn": "select",
                  "args": [
                    {
                      "fn": "mul",
                      "args": [
                        {
                          "fn": "ge",
                          "args": [
                            {
                              "fn": "sub",
                              "args": [
                                {
                                  "fn": "var",
                                  "name": "sx"
                                },
                                {
                                  "fn": "mul",
                                  "args": [
                                    2,
                                    {
                                      "fn": "add",
                                      "args": [
                                        {
                                          "fn": "var",
                                          "name": "w"
                                        },
                                        {
                                          "fn": "var",
                                          "name": "e"
                                        }
                                      ]
                                    }
                                  ]
                                }
                              ]
                            },
                            4
                          ]
                        },
                        {
                          "fn": "ge",
                          "args": [
                            {
                              "fn": "sub",
                              "args": [
                                {
                                  "fn": "var",
                                  "name": "sz"
                                },
                                {
                                  "fn": "mul",
                                  "args": [
                                    2,
                                    {
                                      "fn": "add",
                                      "args": [
                                        {
                                          "fn": "var",
                                          "name": "s"
                                        },
                                        {
                                          "fn": "var",
                                          "name": "n"
                                        }
                                      ]
                                    }
                                  ]
                                }
                              ]
                            },
                            4
                          ]
                        }
                      ]
                    },
                    2,
                    {
                      "fn": "mul",
                      "args": [
                        {
                          "fn": "ge",
                          "args": [
                            {
                              "fn": "sub",
                              "args": [
                                {
                                  "fn": "var",
                                  "name": "sx"
                                },
                                {
                                  "fn": "add",
                                  "args": [
                                    {
                                      "fn": "var",
                                      "name": "w"
                                    },
                                    {
                                      "fn": "var",
                                      "name": "e"
                                    }
                                  ]
                                }
                              ]
                            },
                            4
                          ]
                        },
                        {
                          "fn": "ge",
                          "args": [
                            {
                              "fn": "sub",
                              "args": [
                                {
                                  "fn": "var",
                                  "name": "sz"
                                },
                                {
                                  "fn": "add",
                                  "args": [
                                    {
                                      "fn": "var",
                                      "name": "s"
                                    },
                                    {
                                      "fn": "var",
                                      "name": "n"
                                    }
                                  ]
                                }
                              ]
                            },
                            4
                          ]
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        },
        "select": 0,
        "values": [],
        "weights": [],
        "stringValue": "",
        "seed": 0
      }
    },
    {
      "id": "blkLow",
      "type": "setAttribute",
      "params": {
        "name": "lowSt",
        "domain": "point",
        "type": "f32",
        "tupleSize": 1,
        "value": {
          "fn": "select",
          "args": [
            {
              "fn": "mul",
              "args": [
                {
                  "fn": "mul",
                  "args": [
                    {
                      "fn": "lt",
                      "args": [
                        {
                          "fn": "randomField",
                          "key": "setback"
                        },
                        {
                          "fn": "param",
                          "name": "setbackRate"
                        }
                      ]
                    },
                    {
                      "fn": "ge",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "storeys"
                        },
                        2
                      ]
                    }
                  ]
                },
                {
                  "fn": "gt",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "inset"
                    },
                    0
                  ]
                }
              ]
            },
            {
              "fn": "add",
              "args": [
                1,
                {
                  "fn": "floor",
                  "args": [
                    {
                      "fn": "mul",
                      "args": [
                        {
                          "fn": "randomField",
                          "key": "setbackAt"
                        },
                        {
                          "fn": "sub",
                          "args": [
                            {
                              "fn": "attribute",
                              "name": "storeys"
                            },
                            1
                          ]
                        }
                      ]
                    }
                  ]
                }
              ]
            },
            {
              "fn": "attribute",
              "name": "storeys"
            }
          ]
        },
        "select": 0,
        "values": [],
        "weights": [],
        "stringValue": "",
        "seed": 0
      }
    },
    {
      "id": "blkRoofStyle",
      "type": "setAttribute",
      "params": {
        "name": "roofStyle",
        "domain": "point",
        "type": "f32",
        "tupleSize": 1,
        "value": {
          "fn": "select",
          "args": [
            {
              "fn": "lt",
              "args": [
                {
                  "fn": "randomField",
                  "key": "flat"
                },
                {
                  "fn": "param",
                  "name": "flatRoofRate"
                }
              ]
            },
            2,
            {
              "fn": "lt",
              "args": [
                {
                  "fn": "randomField",
                  "key": "hip"
                },
                {
                  "fn": "param",
                  "name": "hipRoofRate"
                }
              ]
            }
          ]
        },
        "select": 0,
        "values": [],
        "weights": [],
        "stringValue": "",
        "seed": 0
      }
    },
    {
      "id": "blkTrim",
      "type": "setAttribute",
      "params": {
        "name": "trim",
        "domain": "point",
        "type": "f32",
        "tupleSize": 3,
        "value": {
          "fn": "vec",
          "args": [
            {
              "fn": "lt",
              "args": [
                {
                  "fn": "randomField",
                  "key": "sill"
                },
                {
                  "fn": "param",
                  "name": "sillRate"
                }
              ]
            },
            {
              "fn": "lt",
              "args": [
                {
                  "fn": "randomField",
                  "key": "lintel"
                },
                {
                  "fn": "param",
                  "name": "lintelRate"
                }
              ]
            },
            {
              "fn": "attribute",
              "name": "plinth"
            }
          ]
        },
        "select": 0,
        "values": [],
        "weights": [],
        "stringValue": "",
        "seed": 0
      }
    },
    {
      "id": "tierFan",
      "type": "repeatPoints",
      "params": {
        "count": {
          "fn": "add",
          "args": [
            1,
            {
              "fn": "lt",
              "args": [
                {
                  "fn": "attribute",
                  "name": "lowSt"
                },
                {
                  "fn": "attribute",
                  "name": "storeys"
                }
              ]
            }
          ]
        },
        "indexAttr": "tier",
        "countAttr": ""
      }
    },
    {
      "id": "tierTop",
      "type": "setAttribute",
      "params": {
        "name": "top",
        "domain": "point",
        "type": "f32",
        "tupleSize": 1,
        "value": {
          "fn": "eq",
          "args": [
            {
              "fn": "attribute",
              "name": "tier"
            },
            {
              "fn": "lt",
              "args": [
                {
                  "fn": "attribute",
                  "name": "lowSt"
                },
                {
                  "fn": "attribute",
                  "name": "storeys"
                }
              ]
            }
          ]
        },
        "select": 0,
        "values": [],
        "weights": [],
        "stringValue": "",
        "seed": 0
      }
    },
    {
      "id": "tierSt",
      "type": "setAttribute",
      "params": {
        "name": "storeys",
        "domain": "point",
        "type": "f32",
        "tupleSize": 1,
        "value": {
          "fn": "select",
          "args": [
            {
              "fn": "attribute",
              "name": "tier"
            },
            {
              "fn": "sub",
              "args": [
                {
                  "fn": "attribute",
                  "name": "storeys"
                },
                {
                  "fn": "attribute",
                  "name": "lowSt"
                }
              ]
            },
            {
              "fn": "attribute",
              "name": "lowSt"
            }
          ]
        },
        "select": 0,
        "values": [],
        "weights": [],
        "stringValue": "",
        "seed": 0
      }
    },
    {
      "id": "tierBox",
      "type": "setBounds",
      "params": {
        "boundsMin": {
          "fn": "vec",
          "args": [
            {
              "fn": "add",
              "args": [
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "boundsMin",
                      "tupleSize": 3
                    }
                  ],
                  "index": 0
                },
                {
                  "fn": "mul",
                  "args": [
                    {
                      "fn": "mul",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "tier"
                        },
                        {
                          "fn": "attribute",
                          "name": "inset"
                        }
                      ]
                    },
                    {
                      "fn": "eq",
                      "args": [
                        {
                          "fn": "component",
                          "args": [
                            {
                              "fn": "attribute",
                              "name": "boundsMin",
                              "tupleSize": 3
                            }
                          ],
                          "index": 0
                        },
                        0
                      ]
                    }
                  ]
                }
              ]
            },
            {
              "fn": "add",
              "args": [
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "boundsMin",
                      "tupleSize": 3
                    }
                  ],
                  "index": 1
                },
                {
                  "fn": "mul",
                  "args": [
                    {
                      "fn": "mul",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "tier"
                        },
                        {
                          "fn": "attribute",
                          "name": "lowSt"
                        }
                      ]
                    },
                    {
                      "fn": "floor",
                      "args": [
                        {
                          "fn": "add",
                          "args": [
                            {
                              "fn": "param",
                              "name": "storeyHeight"
                            },
                            0.5
                          ]
                        }
                      ]
                    }
                  ]
                }
              ]
            },
            {
              "fn": "add",
              "args": [
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "boundsMin",
                      "tupleSize": 3
                    }
                  ],
                  "index": 2
                },
                {
                  "fn": "mul",
                  "args": [
                    {
                      "fn": "mul",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "tier"
                        },
                        {
                          "fn": "attribute",
                          "name": "inset"
                        }
                      ]
                    },
                    {
                      "fn": "eq",
                      "args": [
                        {
                          "fn": "component",
                          "args": [
                            {
                              "fn": "attribute",
                              "name": "boundsMin",
                              "tupleSize": 3
                            }
                          ],
                          "index": 2
                        },
                        0
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        },
        "boundsMax": {
          "fn": "vec",
          "args": [
            {
              "fn": "sub",
              "args": [
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "boundsMax",
                      "tupleSize": 3
                    }
                  ],
                  "index": 0
                },
                {
                  "fn": "mul",
                  "args": [
                    {
                      "fn": "mul",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "tier"
                        },
                        {
                          "fn": "attribute",
                          "name": "inset"
                        }
                      ]
                    },
                    {
                      "fn": "eq",
                      "args": [
                        {
                          "fn": "component",
                          "args": [
                            {
                              "fn": "attribute",
                              "name": "boundsMax",
                              "tupleSize": 3
                            }
                          ],
                          "index": 0
                        },
                        {
                          "fn": "component",
                          "args": [
                            {
                              "fn": "attribute",
                              "name": "lot",
                              "tupleSize": 3
                            }
                          ],
                          "index": 0
                        }
                      ]
                    }
                  ]
                }
              ]
            },
            {
              "fn": "add",
              "args": [
                {
                  "fn": "add",
                  "args": [
                    {
                      "fn": "add",
                      "args": [
                        {
                          "fn": "component",
                          "args": [
                            {
                              "fn": "attribute",
                              "name": "boundsMin",
                              "tupleSize": 3
                            }
                          ],
                          "index": 1
                        },
                        {
                          "fn": "mul",
                          "args": [
                            {
                              "fn": "mul",
                              "args": [
                                {
                                  "fn": "attribute",
                                  "name": "tier"
                                },
                                {
                                  "fn": "attribute",
                                  "name": "lowSt"
                                }
                              ]
                            },
                            {
                              "fn": "floor",
                              "args": [
                                {
                                  "fn": "add",
                                  "args": [
                                    {
                                      "fn": "param",
                                      "name": "storeyHeight"
                                    },
                                    0.5
                                  ]
                                }
                              ]
                            }
                          ]
                        }
                      ]
                    },
                    1
                  ]
                },
                {
                  "fn": "mul",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "storeys"
                    },
                    {
                      "fn": "floor",
                      "args": [
                        {
                          "fn": "add",
                          "args": [
                            {
                              "fn": "param",
                              "name": "storeyHeight"
                            },
                            0.5
                          ]
                        }
                      ]
                    }
                  ]
                }
              ]
            },
            {
              "fn": "sub",
              "args": [
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "boundsMax",
                      "tupleSize": 3
                    }
                  ],
                  "index": 2
                },
                {
                  "fn": "mul",
                  "args": [
                    {
                      "fn": "mul",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "tier"
                        },
                        {
                          "fn": "attribute",
                          "name": "inset"
                        }
                      ]
                    },
                    {
                      "fn": "eq",
                      "args": [
                        {
                          "fn": "component",
                          "args": [
                            {
                              "fn": "attribute",
                              "name": "boundsMax",
                              "tupleSize": 3
                            }
                          ],
                          "index": 2
                        },
                        {
                          "fn": "component",
                          "args": [
                            {
                              "fn": "attribute",
                              "name": "lot",
                              "tupleSize": 3
                            }
                          ],
                          "index": 2
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      }
    },
    {
      "id": "stFan",
      "type": "repeatPoints",
      "params": {
        "count": {
          "fn": "attribute",
          "name": "storeys"
        },
        "indexAttr": "slot",
        "countAttr": ""
      }
    },
    {
      "id": "stLevel",
      "type": "setAttribute",
      "params": {
        "name": "level",
        "domain": "point",
        "type": "f32",
        "tupleSize": 1,
        "value": {
          "fn": "attribute",
          "name": "slot"
        },
        "select": 0,
        "values": [],
        "weights": [],
        "stringValue": "",
        "seed": 0
      }
    },
    {
      "id": "stBox",
      "type": "setBounds",
      "params": {
        "boundsMin": {
          "fn": "vec",
          "args": [
            {
              "fn": "component",
              "args": [
                {
                  "fn": "attribute",
                  "name": "boundsMin",
                  "tupleSize": 3
                }
              ],
              "index": 0
            },
            {
              "fn": "add",
              "args": [
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "boundsMin",
                      "tupleSize": 3
                    }
                  ],
                  "index": 1
                },
                {
                  "fn": "mul",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "slot"
                    },
                    {
                      "fn": "floor",
                      "args": [
                        {
                          "fn": "add",
                          "args": [
                            {
                              "fn": "param",
                              "name": "storeyHeight"
                            },
                            0.5
                          ]
                        }
                      ]
                    }
                  ]
                }
              ]
            },
            {
              "fn": "component",
              "args": [
                {
                  "fn": "attribute",
                  "name": "boundsMin",
                  "tupleSize": 3
                }
              ],
              "index": 2
            }
          ]
        },
        "boundsMax": {
          "fn": "vec",
          "args": [
            {
              "fn": "component",
              "args": [
                {
                  "fn": "attribute",
                  "name": "boundsMax",
                  "tupleSize": 3
                }
              ],
              "index": 0
            },
            {
              "fn": "add",
              "args": [
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "boundsMin",
                      "tupleSize": 3
                    }
                  ],
                  "index": 1
                },
                {
                  "fn": "mul",
                  "args": [
                    {
                      "fn": "add",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "slot"
                        },
                        1
                      ]
                    },
                    {
                      "fn": "floor",
                      "args": [
                        {
                          "fn": "add",
                          "args": [
                            {
                              "fn": "param",
                              "name": "storeyHeight"
                            },
                            0.5
                          ]
                        }
                      ]
                    }
                  ]
                }
              ]
            },
            {
              "fn": "component",
              "args": [
                {
                  "fn": "attribute",
                  "name": "boundsMax",
                  "tupleSize": 3
                }
              ],
              "index": 2
            }
          ]
        }
      }
    },
    {
      "id": "ptFan",
      "type": "repeatPoints",
      "params": {
        "count": 5,
        "indexAttr": "slot",
        "countAttr": ""
      }
    },
    {
      "id": "ptBox",
      "type": "setBounds",
      "params": {
        "boundsMin": {
          "fn": "let",
          "bind": {
            "x0": {
              "fn": "component",
              "args": [
                {
                  "fn": "attribute",
                  "name": "boundsMin",
                  "tupleSize": 3
                }
              ],
              "index": 0
            },
            "y0": {
              "fn": "component",
              "args": [
                {
                  "fn": "attribute",
                  "name": "boundsMin",
                  "tupleSize": 3
                }
              ],
              "index": 1
            },
            "z0": {
              "fn": "component",
              "args": [
                {
                  "fn": "attribute",
                  "name": "boundsMin",
                  "tupleSize": 3
                }
              ],
              "index": 2
            }
          },
          "args": [
            {
              "fn": "choose",
              "args": [
                {
                  "fn": "attribute",
                  "name": "slot"
                },
                {
                  "fn": "attribute",
                  "name": "boundsMin",
                  "tupleSize": 3
                },
                {
                  "fn": "add",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "boundsMin",
                      "tupleSize": 3
                    },
                    {
                      "fn": "vec",
                      "args": [
                        0,
                        1,
                        0
                      ]
                    }
                  ]
                },
                {
                  "fn": "vec",
                  "args": [
                    {
                      "fn": "var",
                      "name": "x0"
                    },
                    {
                      "fn": "add",
                      "args": [
                        {
                          "fn": "var",
                          "name": "y0"
                        },
                        1
                      ]
                    },
                    {
                      "fn": "sub",
                      "args": [
                        {
                          "fn": "component",
                          "args": [
                            {
                              "fn": "attribute",
                              "name": "boundsMax",
                              "tupleSize": 3
                            }
                          ],
                          "index": 2
                        },
                        1
                      ]
                    }
                  ]
                },
                {
                  "fn": "vec",
                  "args": [
                    {
                      "fn": "var",
                      "name": "x0"
                    },
                    {
                      "fn": "add",
                      "args": [
                        {
                          "fn": "var",
                          "name": "y0"
                        },
                        1
                      ]
                    },
                    {
                      "fn": "add",
                      "args": [
                        {
                          "fn": "var",
                          "name": "z0"
                        },
                        1
                      ]
                    }
                  ]
                },
                {
                  "fn": "vec",
                  "args": [
                    {
                      "fn": "sub",
                      "args": [
                        {
                          "fn": "component",
                          "args": [
                            {
                              "fn": "attribute",
                              "name": "boundsMax",
                              "tupleSize": 3
                            }
                          ],
                          "index": 0
                        },
                        1
                      ]
                    },
                    {
                      "fn": "add",
                      "args": [
                        {
                          "fn": "var",
                          "name": "y0"
                        },
                        1
                      ]
                    },
                    {
                      "fn": "add",
                      "args": [
                        {
                          "fn": "var",
                          "name": "z0"
                        },
                        1
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        },
        "boundsMax": {
          "fn": "let",
          "bind": {
            "x1": {
              "fn": "component",
              "args": [
                {
                  "fn": "attribute",
                  "name": "boundsMax",
                  "tupleSize": 3
                }
              ],
              "index": 0
            },
            "y1": {
              "fn": "component",
              "args": [
                {
                  "fn": "attribute",
                  "name": "boundsMax",
                  "tupleSize": 3
                }
              ],
              "index": 1
            },
            "z1": {
              "fn": "component",
              "args": [
                {
                  "fn": "attribute",
                  "name": "boundsMax",
                  "tupleSize": 3
                }
              ],
              "index": 2
            }
          },
          "args": [
            {
              "fn": "choose",
              "args": [
                {
                  "fn": "attribute",
                  "name": "slot"
                },
                {
                  "fn": "vec",
                  "args": [
                    {
                      "fn": "var",
                      "name": "x1"
                    },
                    {
                      "fn": "add",
                      "args": [
                        {
                          "fn": "component",
                          "args": [
                            {
                              "fn": "attribute",
                              "name": "boundsMin",
                              "tupleSize": 3
                            }
                          ],
                          "index": 1
                        },
                        1
                      ]
                    },
                    {
                      "fn": "var",
                      "name": "z1"
                    }
                  ]
                },
                {
                  "fn": "vec",
                  "args": [
                    {
                      "fn": "var",
                      "name": "x1"
                    },
                    {
                      "fn": "var",
                      "name": "y1"
                    },
                    {
                      "fn": "add",
                      "args": [
                        {
                          "fn": "component",
                          "args": [
                            {
                              "fn": "attribute",
                              "name": "boundsMin",
                              "tupleSize": 3
                            }
                          ],
                          "index": 2
                        },
                        1
                      ]
                    }
                  ]
                },
                {
                  "fn": "attribute",
                  "name": "boundsMax",
                  "tupleSize": 3
                },
                {
                  "fn": "vec",
                  "args": [
                    {
                      "fn": "add",
                      "args": [
                        {
                          "fn": "component",
                          "args": [
                            {
                              "fn": "attribute",
                              "name": "boundsMin",
                              "tupleSize": 3
                            }
                          ],
                          "index": 0
                        },
                        1
                      ]
                    },
                    {
                      "fn": "var",
                      "name": "y1"
                    },
                    {
                      "fn": "sub",
                      "args": [
                        {
                          "fn": "var",
                          "name": "z1"
                        },
                        1
                      ]
                    }
                  ]
                },
                {
                  "fn": "vec",
                  "args": [
                    {
                      "fn": "var",
                      "name": "x1"
                    },
                    {
                      "fn": "var",
                      "name": "y1"
                    },
                    {
                      "fn": "sub",
                      "args": [
                        {
                          "fn": "var",
                          "name": "z1"
                        },
                        1
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      }
    },
    {
      "id": "ptWall",
      "type": "setAttribute",
      "params": {
        "name": "wall",
        "domain": "point",
        "type": "f32",
        "tupleSize": 1,
        "value": {
          "fn": "attribute",
          "name": "slot"
        },
        "select": 0,
        "values": [],
        "weights": [],
        "stringValue": "",
        "seed": 0
      }
    },
    {
      "id": "ptDoorWall",
      "type": "setAttribute",
      "params": {
        "name": "doorWall",
        "domain": "point",
        "type": "f32",
        "tupleSize": 1,
        "value": {
          "fn": "select",
          "args": [
            {
              "fn": "component",
              "args": [
                {
                  "fn": "attribute",
                  "name": "ext",
                  "tupleSize": 3
                }
              ],
              "index": 0
            },
            1,
            {
              "fn": "select",
              "args": [
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "ext",
                      "tupleSize": 3
                    }
                  ],
                  "index": 1
                },
                2,
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "ext",
                      "tupleSize": 3
                    }
                  ],
                  "index": 2
                }
              ]
            }
          ]
        },
        "select": 0,
        "values": [],
        "weights": [],
        "stringValue": "",
        "seed": 0
      }
    },
    {
      "id": "slabKind",
      "type": "setAttribute",
      "params": {
        "name": "kind",
        "domain": "point",
        "type": "string",
        "tupleSize": 1,
        "value": 0,
        "select": 0,
        "values": [],
        "weights": [],
        "stringValue": "floor",
        "seed": 0
      }
    },
    {
      "id": "slabs",
      "type": "filterByExpression",
      "params": {
        "predicate": {
          "fn": "eq",
          "args": [
            {
              "fn": "attribute",
              "name": "wall"
            },
            0
          ]
        },
        "seed": 0,
        "topology": "drop"
      }
    },
    {
      "id": "walls",
      "type": "filterByExpression",
      "params": {
        "predicate": {
          "fn": "ge",
          "args": [
            {
              "fn": "attribute",
              "name": "wall"
            },
            1
          ]
        },
        "seed": 0,
        "topology": "drop"
      }
    },
    {
      "id": "ceilBox",
      "type": "setBounds",
      "params": {
        "boundsMin": {
          "fn": "vec",
          "args": [
            {
              "fn": "component",
              "args": [
                {
                  "fn": "attribute",
                  "name": "boundsMin",
                  "tupleSize": 3
                }
              ],
              "index": 0
            },
            {
              "fn": "sub",
              "args": [
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "boundsMax",
                      "tupleSize": 3
                    }
                  ],
                  "index": 1
                },
                1
              ]
            },
            {
              "fn": "component",
              "args": [
                {
                  "fn": "attribute",
                  "name": "boundsMin",
                  "tupleSize": 3
                }
              ],
              "index": 2
            }
          ]
        },
        "boundsMax": {
          "fn": "attribute",
          "name": "boundsMax",
          "tupleSize": 3
        }
      }
    },
    {
      "id": "ceilKind",
      "type": "setAttribute",
      "params": {
        "name": "kind",
        "domain": "point",
        "type": "string",
        "tupleSize": 1,
        "value": 0,
        "select": 0,
        "values": [],
        "weights": [],
        "stringValue": "floor",
        "seed": 0
      }
    },
    {
      "id": "wAlong",
      "type": "setAttribute",
      "params": {
        "name": "alongX",
        "domain": "point",
        "type": "f32",
        "tupleSize": 1,
        "value": {
          "fn": "le",
          "args": [
            {
              "fn": "attribute",
              "name": "wall"
            },
            2
          ]
        },
        "select": 0,
        "values": [],
        "weights": [],
        "stringValue": "",
        "seed": 0
      }
    },
    {
      "id": "wLen",
      "type": "setAttribute",
      "params": {
        "name": "len",
        "domain": "point",
        "type": "f32",
        "tupleSize": 1,
        "value": {
          "fn": "select",
          "args": [
            {
              "fn": "attribute",
              "name": "alongX"
            },
            {
              "fn": "sub",
              "args": [
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "boundsMax",
                      "tupleSize": 3
                    }
                  ],
                  "index": 0
                },
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "boundsMin",
                      "tupleSize": 3
                    }
                  ],
                  "index": 0
                }
              ]
            },
            {
              "fn": "sub",
              "args": [
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "boundsMax",
                      "tupleSize": 3
                    }
                  ],
                  "index": 2
                },
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "boundsMin",
                      "tupleSize": 3
                    }
                  ],
                  "index": 2
                }
              ]
            }
          ]
        },
        "select": 0,
        "values": [],
        "weights": [],
        "stringValue": "",
        "seed": 0
      }
    },
    {
      "id": "wBays",
      "type": "setAttribute",
      "params": {
        "name": "nb",
        "domain": "point",
        "type": "f32",
        "tupleSize": 1,
        "value": {
          "fn": "max",
          "args": [
            1,
            {
              "fn": "floor",
              "args": [
                {
                  "fn": "div",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "len"
                    },
                    {
                      "fn": "param",
                      "name": "bayWidth"
                    }
                  ]
                }
              ]
            }
          ]
        },
        "select": 0,
        "values": [],
        "weights": [],
        "stringValue": "",
        "seed": 0
      }
    },
    {
      "id": "wStart",
      "type": "setAttribute",
      "params": {
        "name": "u0",
        "domain": "point",
        "type": "f32",
        "tupleSize": 1,
        "value": {
          "fn": "select",
          "args": [
            {
              "fn": "attribute",
              "name": "alongX"
            },
            {
              "fn": "component",
              "args": [
                {
                  "fn": "attribute",
                  "name": "boundsMin",
                  "tupleSize": 3
                }
              ],
              "index": 0
            },
            {
              "fn": "component",
              "args": [
                {
                  "fn": "attribute",
                  "name": "boundsMin",
                  "tupleSize": 3
                }
              ],
              "index": 2
            }
          ]
        },
        "select": 0,
        "values": [],
        "weights": [],
        "stringValue": "",
        "seed": 0
      }
    },
    {
      "id": "bayFan",
      "type": "repeatPoints",
      "params": {
        "count": {
          "fn": "attribute",
          "name": "nb"
        },
        "indexAttr": "slot",
        "countAttr": ""
      }
    },
    {
      "id": "bayA",
      "type": "setAttribute",
      "params": {
        "name": "ua",
        "domain": "point",
        "type": "f32",
        "tupleSize": 1,
        "value": {
          "fn": "add",
          "args": [
            {
              "fn": "attribute",
              "name": "u0"
            },
            {
              "fn": "floor",
              "args": [
                {
                  "fn": "div",
                  "args": [
                    {
                      "fn": "mul",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "slot"
                        },
                        {
                          "fn": "attribute",
                          "name": "len"
                        }
                      ]
                    },
                    {
                      "fn": "attribute",
                      "name": "nb"
                    }
                  ]
                }
              ]
            }
          ]
        },
        "select": 0,
        "values": [],
        "weights": [],
        "stringValue": "",
        "seed": 0
      }
    },
    {
      "id": "bayB",
      "type": "setAttribute",
      "params": {
        "name": "ub",
        "domain": "point",
        "type": "f32",
        "tupleSize": 1,
        "value": {
          "fn": "add",
          "args": [
            {
              "fn": "attribute",
              "name": "u0"
            },
            {
              "fn": "floor",
              "args": [
                {
                  "fn": "div",
                  "args": [
                    {
                      "fn": "mul",
                      "args": [
                        {
                          "fn": "add",
                          "args": [
                            {
                              "fn": "attribute",
                              "name": "slot"
                            },
                            1
                          ]
                        },
                        {
                          "fn": "attribute",
                          "name": "len"
                        }
                      ]
                    },
                    {
                      "fn": "attribute",
                      "name": "nb"
                    }
                  ]
                }
              ]
            }
          ]
        },
        "select": 0,
        "values": [],
        "weights": [],
        "stringValue": "",
        "seed": 0
      }
    },
    {
      "id": "bayBox",
      "type": "setBounds",
      "params": {
        "boundsMin": {
          "fn": "vec",
          "args": [
            {
              "fn": "select",
              "args": [
                {
                  "fn": "attribute",
                  "name": "alongX"
                },
                {
                  "fn": "attribute",
                  "name": "ua"
                },
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "boundsMin",
                      "tupleSize": 3
                    }
                  ],
                  "index": 0
                }
              ]
            },
            {
              "fn": "component",
              "args": [
                {
                  "fn": "attribute",
                  "name": "boundsMin",
                  "tupleSize": 3
                }
              ],
              "index": 1
            },
            {
              "fn": "select",
              "args": [
                {
                  "fn": "attribute",
                  "name": "alongX"
                },
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "boundsMin",
                      "tupleSize": 3
                    }
                  ],
                  "index": 2
                },
                {
                  "fn": "attribute",
                  "name": "ua"
                }
              ]
            }
          ]
        },
        "boundsMax": {
          "fn": "vec",
          "args": [
            {
              "fn": "select",
              "args": [
                {
                  "fn": "attribute",
                  "name": "alongX"
                },
                {
                  "fn": "attribute",
                  "name": "ub"
                },
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "boundsMax",
                      "tupleSize": 3
                    }
                  ],
                  "index": 0
                }
              ]
            },
            {
              "fn": "component",
              "args": [
                {
                  "fn": "attribute",
                  "name": "boundsMax",
                  "tupleSize": 3
                }
              ],
              "index": 1
            },
            {
              "fn": "select",
              "args": [
                {
                  "fn": "attribute",
                  "name": "alongX"
                },
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "boundsMax",
                      "tupleSize": 3
                    }
                  ],
                  "index": 2
                },
                {
                  "fn": "attribute",
                  "name": "ub"
                }
              ]
            }
          ]
        }
      }
    },
    {
      "id": "bayDoor",
      "type": "setAttribute",
      "params": {
        "name": "door",
        "domain": "point",
        "type": "f32",
        "tupleSize": 1,
        "value": {
          "fn": "mul",
          "args": [
            {
              "fn": "mul",
              "args": [
                {
                  "fn": "mul",
                  "args": [
                    {
                      "fn": "eq",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "tier"
                        },
                        0
                      ]
                    },
                    {
                      "fn": "eq",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "level"
                        },
                        0
                      ]
                    }
                  ]
                },
                {
                  "fn": "eq",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "wall"
                    },
                    {
                      "fn": "attribute",
                      "name": "doorWall"
                    }
                  ]
                }
              ]
            },
            {
              "fn": "eq",
              "args": [
                {
                  "fn": "attribute",
                  "name": "slot"
                },
                {
                  "fn": "floor",
                  "args": [
                    {
                      "fn": "div",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "nb"
                        },
                        2
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        },
        "select": 0,
        "values": [],
        "weights": [],
        "stringValue": "",
        "seed": 0
      }
    },
    {
      "id": "opW",
      "type": "setAttribute",
      "params": {
        "name": "ow",
        "domain": "point",
        "type": "f32",
        "tupleSize": 1,
        "value": {
          "fn": "min",
          "args": [
            {
              "fn": "sub",
              "args": [
                {
                  "fn": "sub",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "ub"
                    },
                    {
                      "fn": "attribute",
                      "name": "ua"
                    }
                  ]
                },
                2
              ]
            },
            {
              "fn": "floor",
              "args": [
                {
                  "fn": "add",
                  "args": [
                    {
                      "fn": "param",
                      "name": "openingWidth"
                    },
                    0.5
                  ]
                }
              ]
            }
          ]
        },
        "select": 0,
        "values": [],
        "weights": [],
        "stringValue": "",
        "seed": 0
      }
    },
    {
      "id": "opA",
      "type": "setAttribute",
      "params": {
        "name": "oa",
        "domain": "point",
        "type": "f32",
        "tupleSize": 1,
        "value": {
          "fn": "add",
          "args": [
            {
              "fn": "attribute",
              "name": "ua"
            },
            {
              "fn": "floor",
              "args": [
                {
                  "fn": "div",
                  "args": [
                    {
                      "fn": "sub",
                      "args": [
                        {
                          "fn": "sub",
                          "args": [
                            {
                              "fn": "attribute",
                              "name": "ub"
                            },
                            {
                              "fn": "attribute",
                              "name": "ua"
                            }
                          ]
                        },
                        {
                          "fn": "attribute",
                          "name": "ow"
                        }
                      ]
                    },
                    2
                  ]
                }
              ]
            }
          ]
        },
        "select": 0,
        "values": [],
        "weights": [],
        "stringValue": "",
        "seed": 0
      }
    },
    {
      "id": "opB",
      "type": "setAttribute",
      "params": {
        "name": "ob",
        "domain": "point",
        "type": "f32",
        "tupleSize": 1,
        "value": {
          "fn": "add",
          "args": [
            {
              "fn": "attribute",
              "name": "oa"
            },
            {
              "fn": "attribute",
              "name": "ow"
            }
          ]
        },
        "select": 0,
        "values": [],
        "weights": [],
        "stringValue": "",
        "seed": 0
      }
    },
    {
      "id": "winRoll",
      "type": "setAttribute",
      "params": {
        "name": "winRoll",
        "domain": "point",
        "type": "f32",
        "tupleSize": 1,
        "value": {
          "fn": "randomField",
          "key": "win"
        },
        "select": 0,
        "values": [],
        "weights": [],
        "stringValue": "",
        "seed": 0
      }
    },
    {
      "id": "probe",
      "type": "setAttribute",
      "params": {
        "name": "P",
        "domain": "point",
        "type": "f32",
        "tupleSize": 3,
        "value": {
          "fn": "let",
          "bind": {
            "u": {
              "fn": "div",
              "args": [
                {
                  "fn": "add",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "oa"
                    },
                    {
                      "fn": "attribute",
                      "name": "ob"
                    }
                  ]
                },
                2
              ]
            }
          },
          "args": [
            {
              "fn": "vec",
              "args": [
                {
                  "fn": "choose",
                  "args": [
                    {
                      "fn": "sub",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "wall"
                        },
                        1
                      ]
                    },
                    {
                      "fn": "var",
                      "name": "u"
                    },
                    {
                      "fn": "var",
                      "name": "u"
                    },
                    {
                      "fn": "sub",
                      "args": [
                        {
                          "fn": "component",
                          "args": [
                            {
                              "fn": "attribute",
                              "name": "boundsMin",
                              "tupleSize": 3
                            }
                          ],
                          "index": 0
                        },
                        0.5
                      ]
                    },
                    {
                      "fn": "add",
                      "args": [
                        {
                          "fn": "component",
                          "args": [
                            {
                              "fn": "attribute",
                              "name": "boundsMax",
                              "tupleSize": 3
                            }
                          ],
                          "index": 0
                        },
                        0.5
                      ]
                    }
                  ]
                },
                {
                  "fn": "add",
                  "args": [
                    {
                      "fn": "sub",
                      "args": [
                        {
                          "fn": "add",
                          "args": [
                            {
                              "fn": "component",
                              "args": [
                                {
                                  "fn": "attribute",
                                  "name": "boundsMin",
                                  "tupleSize": 3
                                }
                              ],
                              "index": 1
                            },
                            {
                              "fn": "mul",
                              "args": [
                                {
                                  "fn": "sub",
                                  "args": [
                                    1,
                                    {
                                      "fn": "attribute",
                                      "name": "door"
                                    }
                                  ]
                                },
                                {
                                  "fn": "floor",
                                  "args": [
                                    {
                                      "fn": "add",
                                      "args": [
                                        {
                                          "fn": "param",
                                          "name": "sillHeight"
                                        },
                                        0.5
                                      ]
                                    }
                                  ]
                                }
                              ]
                            }
                          ]
                        },
                        {
                          "fn": "mul",
                          "args": [
                            {
                              "fn": "sub",
                              "args": [
                                1,
                                {
                                  "fn": "attribute",
                                  "name": "door"
                                }
                              ]
                            },
                            {
                              "fn": "component",
                              "args": [
                                {
                                  "fn": "attribute",
                                  "name": "trim",
                                  "tupleSize": 3
                                }
                              ],
                              "index": 0
                            }
                          ]
                        }
                      ]
                    },
                    0.5
                  ]
                },
                {
                  "fn": "choose",
                  "args": [
                    {
                      "fn": "sub",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "wall"
                        },
                        1
                      ]
                    },
                    {
                      "fn": "sub",
                      "args": [
                        {
                          "fn": "component",
                          "args": [
                            {
                              "fn": "attribute",
                              "name": "boundsMin",
                              "tupleSize": 3
                            }
                          ],
                          "index": 2
                        },
                        0.5
                      ]
                    },
                    {
                      "fn": "add",
                      "args": [
                        {
                          "fn": "component",
                          "args": [
                            {
                              "fn": "attribute",
                              "name": "boundsMax",
                              "tupleSize": 3
                            }
                          ],
                          "index": 2
                        },
                        0.5
                      ]
                    },
                    {
                      "fn": "var",
                      "name": "u"
                    },
                    {
                      "fn": "var",
                      "name": "u"
                    }
                  ]
                }
              ]
            }
          ]
        },
        "select": 0,
        "values": [],
        "weights": [],
        "stringValue": "",
        "seed": 0
      }
    },
    {
      "id": "probeAlong",
      "type": "setAttribute",
      "params": {
        "name": "along",
        "domain": "point",
        "type": "f32",
        "tupleSize": 3,
        "value": {
          "fn": "vec",
          "args": [
            {
              "fn": "attribute",
              "name": "alongX"
            },
            0,
            {
              "fn": "sub",
              "args": [
                1,
                {
                  "fn": "attribute",
                  "name": "alongX"
                }
              ]
            }
          ]
        },
        "select": 0,
        "values": [],
        "weights": [],
        "stringValue": "",
        "seed": 0
      }
    },
    {
      "id": "covered",
      "type": "pathCoverage",
      "params": {
        "direction": [
          0,
          1,
          0
        ],
        "near": 0,
        "far": 0,
        "rayCount": 4,
        "spread": {
          "fn": "max",
          "args": [
            0,
            {
              "fn": "sub",
              "args": [
                {
                  "fn": "div",
                  "args": [
                    {
                      "fn": "sub",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "ob"
                        },
                        {
                          "fn": "attribute",
                          "name": "oa"
                        }
                      ]
                    },
                    2
                  ]
                },
                0.25
              ]
            }
          ]
        },
        "minHits": 1,
        "acrossAttr": "along",
        "boxSize": {
          "fn": "sub",
          "args": [
            {
              "fn": "attribute",
              "name": "boundsMax",
              "tupleSize": 3
            },
            {
              "fn": "attribute",
              "name": "boundsMin",
              "tupleSize": 3
            }
          ]
        },
        "coveredAttr": "covered",
        "hitsAttr": ""
      }
    },
    {
      "id": "bayKind",
      "type": "setAttribute",
      "params": {
        "name": "bk",
        "domain": "point",
        "type": "f32",
        "tupleSize": 1,
        "value": {
          "fn": "mul",
          "args": [
            {
              "fn": "mul",
              "args": [
                {
                  "fn": "ge",
                  "args": [
                    {
                      "fn": "sub",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "ub"
                        },
                        {
                          "fn": "attribute",
                          "name": "ua"
                        }
                      ]
                    },
                    3
                  ]
                },
                {
                  "fn": "sub",
                  "args": [
                    1,
                    {
                      "fn": "attribute",
                      "name": "covered"
                    }
                  ]
                }
              ]
            },
            {
              "fn": "select",
              "args": [
                {
                  "fn": "attribute",
                  "name": "door"
                },
                2,
                {
                  "fn": "lt",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "winRoll"
                    },
                    {
                      "fn": "param",
                      "name": "windowRate"
                    }
                  ]
                }
              ]
            }
          ]
        },
        "select": 0,
        "values": [],
        "weights": [],
        "stringValue": "",
        "seed": 0
      }
    },
    {
      "id": "solidKind",
      "type": "setAttribute",
      "params": {
        "name": "kind",
        "domain": "point",
        "type": "string",
        "tupleSize": 1,
        "value": 0,
        "select": 0,
        "values": [],
        "weights": [],
        "stringValue": "wall",
        "seed": 0
      }
    },
    {
      "id": "solidBays",
      "type": "filterByExpression",
      "params": {
        "predicate": {
          "fn": "eq",
          "args": [
            {
              "fn": "attribute",
              "name": "bk"
            },
            0
          ]
        },
        "seed": 0,
        "topology": "drop"
      }
    },
    {
      "id": "openBays",
      "type": "filterByExpression",
      "params": {
        "predicate": {
          "fn": "ge",
          "args": [
            {
              "fn": "attribute",
              "name": "bk"
            },
            1
          ]
        },
        "seed": 0,
        "topology": "drop"
      }
    },
    {
      "id": "opFan",
      "type": "repeatPoints",
      "params": {
        "count": 7,
        "indexAttr": "slot",
        "countAttr": ""
      }
    },
    {
      "id": "opBox",
      "type": "setBounds",
      "params": {
        "boundsMin": {
          "fn": "let",
          "bind": {
            "y0": {
              "fn": "component",
              "args": [
                {
                  "fn": "attribute",
                  "name": "boundsMin",
                  "tupleSize": 3
                }
              ],
              "index": 1
            },
            "sill": {
              "fn": "add",
              "args": [
                {
                  "fn": "var",
                  "name": "y0"
                },
                {
                  "fn": "mul",
                  "args": [
                    {
                      "fn": "sub",
                      "args": [
                        1,
                        {
                          "fn": "eq",
                          "args": [
                            {
                              "fn": "attribute",
                              "name": "bk"
                            },
                            2
                          ]
                        }
                      ]
                    },
                    {
                      "fn": "floor",
                      "args": [
                        {
                          "fn": "add",
                          "args": [
                            {
                              "fn": "param",
                              "name": "sillHeight"
                            },
                            0.5
                          ]
                        }
                      ]
                    }
                  ]
                }
              ]
            },
            "sb": {
              "fn": "sub",
              "args": [
                {
                  "fn": "var",
                  "name": "sill"
                },
                {
                  "fn": "mul",
                  "args": [
                    {
                      "fn": "sub",
                      "args": [
                        1,
                        {
                          "fn": "eq",
                          "args": [
                            {
                              "fn": "attribute",
                              "name": "bk"
                            },
                            2
                          ]
                        }
                      ]
                    },
                    {
                      "fn": "component",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "trim",
                          "tupleSize": 3
                        }
                      ],
                      "index": 0
                    }
                  ]
                }
              ]
            },
            "head": {
              "fn": "add",
              "args": [
                {
                  "fn": "var",
                  "name": "y0"
                },
                {
                  "fn": "floor",
                  "args": [
                    {
                      "fn": "add",
                      "args": [
                        {
                          "fn": "param",
                          "name": "headHeight"
                        },
                        0.5
                      ]
                    }
                  ]
                }
              ]
            },
            "u0": {
              "fn": "choose",
              "args": [
                {
                  "fn": "attribute",
                  "name": "slot"
                },
                {
                  "fn": "attribute",
                  "name": "ua"
                },
                {
                  "fn": "attribute",
                  "name": "oa"
                },
                {
                  "fn": "attribute",
                  "name": "oa"
                },
                {
                  "fn": "attribute",
                  "name": "oa"
                },
                {
                  "fn": "attribute",
                  "name": "ua"
                },
                {
                  "fn": "attribute",
                  "name": "ob"
                },
                {
                  "fn": "attribute",
                  "name": "ua"
                }
              ]
            },
            "out": {
              "fn": "mul",
              "args": [
                {
                  "fn": "eq",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "slot"
                    },
                    1
                  ]
                },
                1
              ]
            }
          },
          "args": [
            {
              "fn": "vec",
              "args": [
                {
                  "fn": "select",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "alongX"
                    },
                    {
                      "fn": "var",
                      "name": "u0"
                    },
                    {
                      "fn": "sub",
                      "args": [
                        {
                          "fn": "component",
                          "args": [
                            {
                              "fn": "attribute",
                              "name": "boundsMin",
                              "tupleSize": 3
                            }
                          ],
                          "index": 0
                        },
                        {
                          "fn": "mul",
                          "args": [
                            {
                              "fn": "var",
                              "name": "out"
                            },
                            {
                              "fn": "eq",
                              "args": [
                                {
                                  "fn": "attribute",
                                  "name": "wall"
                                },
                                3
                              ]
                            }
                          ]
                        }
                      ]
                    }
                  ]
                },
                {
                  "fn": "choose",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "slot"
                    },
                    {
                      "fn": "var",
                      "name": "y0"
                    },
                    {
                      "fn": "var",
                      "name": "sb"
                    },
                    {
                      "fn": "var",
                      "name": "sill"
                    },
                    {
                      "fn": "var",
                      "name": "head"
                    },
                    {
                      "fn": "var",
                      "name": "sb"
                    },
                    {
                      "fn": "var",
                      "name": "sb"
                    },
                    {
                      "fn": "add",
                      "args": [
                        {
                          "fn": "var",
                          "name": "head"
                        },
                        {
                          "fn": "mul",
                          "args": [
                            {
                              "fn": "component",
                              "args": [
                                {
                                  "fn": "attribute",
                                  "name": "trim",
                                  "tupleSize": 3
                                }
                              ],
                              "index": 1
                            },
                            {
                              "fn": "min",
                              "args": [
                                3,
                                {
                                  "fn": "sub",
                                  "args": [
                                    {
                                      "fn": "component",
                                      "args": [
                                        {
                                          "fn": "attribute",
                                          "name": "boundsMax",
                                          "tupleSize": 3
                                        }
                                      ],
                                      "index": 1
                                    },
                                    {
                                      "fn": "var",
                                      "name": "head"
                                    }
                                  ]
                                }
                              ]
                            }
                          ]
                        }
                      ]
                    }
                  ]
                },
                {
                  "fn": "select",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "alongX"
                    },
                    {
                      "fn": "sub",
                      "args": [
                        {
                          "fn": "component",
                          "args": [
                            {
                              "fn": "attribute",
                              "name": "boundsMin",
                              "tupleSize": 3
                            }
                          ],
                          "index": 2
                        },
                        {
                          "fn": "mul",
                          "args": [
                            {
                              "fn": "var",
                              "name": "out"
                            },
                            {
                              "fn": "eq",
                              "args": [
                                {
                                  "fn": "attribute",
                                  "name": "wall"
                                },
                                1
                              ]
                            }
                          ]
                        }
                      ]
                    },
                    {
                      "fn": "var",
                      "name": "u0"
                    }
                  ]
                }
              ]
            }
          ]
        },
        "boundsMax": {
          "fn": "let",
          "bind": {
            "y0": {
              "fn": "component",
              "args": [
                {
                  "fn": "attribute",
                  "name": "boundsMin",
                  "tupleSize": 3
                }
              ],
              "index": 1
            },
            "y1": {
              "fn": "component",
              "args": [
                {
                  "fn": "attribute",
                  "name": "boundsMax",
                  "tupleSize": 3
                }
              ],
              "index": 1
            },
            "sill": {
              "fn": "add",
              "args": [
                {
                  "fn": "var",
                  "name": "y0"
                },
                {
                  "fn": "mul",
                  "args": [
                    {
                      "fn": "sub",
                      "args": [
                        1,
                        {
                          "fn": "eq",
                          "args": [
                            {
                              "fn": "attribute",
                              "name": "bk"
                            },
                            2
                          ]
                        }
                      ]
                    },
                    {
                      "fn": "floor",
                      "args": [
                        {
                          "fn": "add",
                          "args": [
                            {
                              "fn": "param",
                              "name": "sillHeight"
                            },
                            0.5
                          ]
                        }
                      ]
                    }
                  ]
                }
              ]
            },
            "head": {
              "fn": "add",
              "args": [
                {
                  "fn": "var",
                  "name": "y0"
                },
                {
                  "fn": "floor",
                  "args": [
                    {
                      "fn": "add",
                      "args": [
                        {
                          "fn": "param",
                          "name": "headHeight"
                        },
                        0.5
                      ]
                    }
                  ]
                }
              ]
            },
            "hl": {
              "fn": "add",
              "args": [
                {
                  "fn": "var",
                  "name": "head"
                },
                {
                  "fn": "mul",
                  "args": [
                    {
                      "fn": "component",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "trim",
                          "tupleSize": 3
                        }
                      ],
                      "index": 1
                    },
                    {
                      "fn": "min",
                      "args": [
                        3,
                        {
                          "fn": "sub",
                          "args": [
                            {
                              "fn": "var",
                              "name": "y1"
                            },
                            {
                              "fn": "var",
                              "name": "head"
                            }
                          ]
                        }
                      ]
                    }
                  ]
                }
              ]
            },
            "u1": {
              "fn": "choose",
              "args": [
                {
                  "fn": "attribute",
                  "name": "slot"
                },
                {
                  "fn": "attribute",
                  "name": "ub"
                },
                {
                  "fn": "attribute",
                  "name": "ob"
                },
                {
                  "fn": "attribute",
                  "name": "ob"
                },
                {
                  "fn": "attribute",
                  "name": "ob"
                },
                {
                  "fn": "attribute",
                  "name": "oa"
                },
                {
                  "fn": "attribute",
                  "name": "ub"
                },
                {
                  "fn": "attribute",
                  "name": "ub"
                }
              ]
            },
            "out": {
              "fn": "mul",
              "args": [
                {
                  "fn": "eq",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "slot"
                    },
                    1
                  ]
                },
                1
              ]
            }
          },
          "args": [
            {
              "fn": "vec",
              "args": [
                {
                  "fn": "select",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "alongX"
                    },
                    {
                      "fn": "var",
                      "name": "u1"
                    },
                    {
                      "fn": "add",
                      "args": [
                        {
                          "fn": "component",
                          "args": [
                            {
                              "fn": "attribute",
                              "name": "boundsMax",
                              "tupleSize": 3
                            }
                          ],
                          "index": 0
                        },
                        {
                          "fn": "mul",
                          "args": [
                            {
                              "fn": "var",
                              "name": "out"
                            },
                            {
                              "fn": "eq",
                              "args": [
                                {
                                  "fn": "attribute",
                                  "name": "wall"
                                },
                                4
                              ]
                            }
                          ]
                        }
                      ]
                    }
                  ]
                },
                {
                  "fn": "choose",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "slot"
                    },
                    {
                      "fn": "sub",
                      "args": [
                        {
                          "fn": "var",
                          "name": "sill"
                        },
                        {
                          "fn": "mul",
                          "args": [
                            {
                              "fn": "sub",
                              "args": [
                                1,
                                {
                                  "fn": "eq",
                                  "args": [
                                    {
                                      "fn": "attribute",
                                      "name": "bk"
                                    },
                                    2
                                  ]
                                }
                              ]
                            },
                            {
                              "fn": "component",
                              "args": [
                                {
                                  "fn": "attribute",
                                  "name": "trim",
                                  "tupleSize": 3
                                }
                              ],
                              "index": 0
                            }
                          ]
                        }
                      ]
                    },
                    {
                      "fn": "var",
                      "name": "sill"
                    },
                    {
                      "fn": "var",
                      "name": "head"
                    },
                    {
                      "fn": "var",
                      "name": "hl"
                    },
                    {
                      "fn": "var",
                      "name": "hl"
                    },
                    {
                      "fn": "var",
                      "name": "hl"
                    },
                    {
                      "fn": "var",
                      "name": "y1"
                    }
                  ]
                },
                {
                  "fn": "select",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "alongX"
                    },
                    {
                      "fn": "add",
                      "args": [
                        {
                          "fn": "component",
                          "args": [
                            {
                              "fn": "attribute",
                              "name": "boundsMax",
                              "tupleSize": 3
                            }
                          ],
                          "index": 2
                        },
                        {
                          "fn": "mul",
                          "args": [
                            {
                              "fn": "var",
                              "name": "out"
                            },
                            {
                              "fn": "eq",
                              "args": [
                                {
                                  "fn": "attribute",
                                  "name": "wall"
                                },
                                2
                              ]
                            }
                          ]
                        }
                      ]
                    },
                    {
                      "fn": "var",
                      "name": "u1"
                    }
                  ]
                }
              ]
            }
          ]
        }
      }
    },
    {
      "id": "opKind",
      "type": "setAttribute",
      "params": {
        "name": "kind",
        "domain": "point",
        "type": "string",
        "tupleSize": 1,
        "value": {
          "fn": "select",
          "args": [
            {
              "fn": "eq",
              "args": [
                {
                  "fn": "attribute",
                  "name": "slot"
                },
                2
              ]
            },
            {
              "fn": "attribute",
              "name": "bk"
            },
            {
              "fn": "mul",
              "args": [
                3,
                {
                  "fn": "max",
                  "args": [
                    {
                      "fn": "eq",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "slot"
                        },
                        1
                      ]
                    },
                    {
                      "fn": "eq",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "slot"
                        },
                        3
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        },
        "select": 0,
        "values": [
          "wall",
          "glass",
          "door",
          "trim"
        ],
        "weights": [],
        "stringValue": "",
        "seed": 0
      }
    },
    {
      "id": "rfTop",
      "type": "filterByExpression",
      "params": {
        "predicate": {
          "fn": "attribute",
          "name": "top"
        },
        "seed": 0,
        "topology": "drop"
      }
    },
    {
      "id": "rfRidgeX",
      "type": "setAttribute",
      "params": {
        "name": "ridgeX",
        "domain": "point",
        "type": "f32",
        "tupleSize": 1,
        "value": {
          "fn": "ge",
          "args": [
            {
              "fn": "sub",
              "args": [
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "boundsMax",
                      "tupleSize": 3
                    }
                  ],
                  "index": 0
                },
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "boundsMin",
                      "tupleSize": 3
                    }
                  ],
                  "index": 0
                }
              ]
            },
            {
              "fn": "sub",
              "args": [
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "boundsMax",
                      "tupleSize": 3
                    }
                  ],
                  "index": 2
                },
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "boundsMin",
                      "tupleSize": 3
                    }
                  ],
                  "index": 2
                }
              ]
            }
          ]
        },
        "select": 0,
        "values": [],
        "weights": [],
        "stringValue": "",
        "seed": 0
      }
    },
    {
      "id": "rfLayerCount",
      "type": "setAttribute",
      "params": {
        "name": "nl",
        "domain": "point",
        "type": "f32",
        "tupleSize": 1,
        "value": {
          "fn": "select",
          "args": [
            {
              "fn": "eq",
              "args": [
                {
                  "fn": "attribute",
                  "name": "roofStyle"
                },
                2
              ]
            },
            1,
            {
              "fn": "floor",
              "args": [
                {
                  "fn": "div",
                  "args": [
                    {
                      "fn": "add",
                      "args": [
                        {
                          "fn": "min",
                          "args": [
                            {
                              "fn": "sub",
                              "args": [
                                {
                                  "fn": "component",
                                  "args": [
                                    {
                                      "fn": "attribute",
                                      "name": "boundsMax",
                                      "tupleSize": 3
                                    }
                                  ],
                                  "index": 0
                                },
                                {
                                  "fn": "component",
                                  "args": [
                                    {
                                      "fn": "attribute",
                                      "name": "boundsMin",
                                      "tupleSize": 3
                                    }
                                  ],
                                  "index": 0
                                }
                              ]
                            },
                            {
                              "fn": "sub",
                              "args": [
                                {
                                  "fn": "component",
                                  "args": [
                                    {
                                      "fn": "attribute",
                                      "name": "boundsMax",
                                      "tupleSize": 3
                                    }
                                  ],
                                  "index": 2
                                },
                                {
                                  "fn": "component",
                                  "args": [
                                    {
                                      "fn": "attribute",
                                      "name": "boundsMin",
                                      "tupleSize": 3
                                    }
                                  ],
                                  "index": 2
                                }
                              ]
                            }
                          ]
                        },
                        1
                      ]
                    },
                    2
                  ]
                }
              ]
            }
          ]
        },
        "select": 0,
        "values": [],
        "weights": [],
        "stringValue": "",
        "seed": 0
      }
    },
    {
      "id": "rfLayers",
      "type": "repeatPoints",
      "params": {
        "count": {
          "fn": "attribute",
          "name": "nl"
        },
        "indexAttr": "layer",
        "countAttr": ""
      }
    },
    {
      "id": "rfParts",
      "type": "repeatPoints",
      "params": {
        "count": {
          "fn": "choose",
          "args": [
            {
              "fn": "attribute",
              "name": "roofStyle"
            },
            3,
            1,
            4
          ]
        },
        "indexAttr": "part",
        "countAttr": ""
      }
    },
    {
      "id": "rfBox",
      "type": "setBounds",
      "params": {
        "boundsMin": {
          "fn": "let",
          "bind": {
            "x0": {
              "fn": "component",
              "args": [
                {
                  "fn": "attribute",
                  "name": "boundsMin",
                  "tupleSize": 3
                }
              ],
              "index": 0
            },
            "z0": {
              "fn": "component",
              "args": [
                {
                  "fn": "attribute",
                  "name": "boundsMin",
                  "tupleSize": 3
                }
              ],
              "index": 2
            },
            "x1": {
              "fn": "component",
              "args": [
                {
                  "fn": "attribute",
                  "name": "boundsMax",
                  "tupleSize": 3
                }
              ],
              "index": 0
            },
            "y1": {
              "fn": "component",
              "args": [
                {
                  "fn": "attribute",
                  "name": "boundsMax",
                  "tupleSize": 3
                }
              ],
              "index": 1
            },
            "z1": {
              "fn": "component",
              "args": [
                {
                  "fn": "attribute",
                  "name": "boundsMax",
                  "tupleSize": 3
                }
              ],
              "index": 2
            },
            "yb": {
              "fn": "add",
              "args": [
                {
                  "fn": "var",
                  "name": "y1"
                },
                {
                  "fn": "mul",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "layer"
                    },
                    {
                      "fn": "floor",
                      "args": [
                        {
                          "fn": "add",
                          "args": [
                            {
                              "fn": "param",
                              "name": "roofStep"
                            },
                            0.5
                          ]
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          },
          "args": [
            {
              "fn": "choose",
              "args": [
                {
                  "fn": "attribute",
                  "name": "roofStyle"
                },
                {
                  "fn": "vec",
                  "args": [
                    {
                      "fn": "select",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "ridgeX"
                        },
                        {
                          "fn": "choose",
                          "args": [
                            {
                              "fn": "attribute",
                              "name": "part"
                            },
                            {
                              "fn": "var",
                              "name": "x0"
                            },
                            {
                              "fn": "add",
                              "args": [
                                {
                                  "fn": "var",
                                  "name": "x0"
                                },
                                1
                              ]
                            },
                            {
                              "fn": "sub",
                              "args": [
                                {
                                  "fn": "var",
                                  "name": "x1"
                                },
                                1
                              ]
                            }
                          ]
                        },
                        {
                          "fn": "add",
                          "args": [
                            {
                              "fn": "var",
                              "name": "x0"
                            },
                            {
                              "fn": "attribute",
                              "name": "layer"
                            }
                          ]
                        }
                      ]
                    },
                    {
                      "fn": "var",
                      "name": "yb"
                    },
                    {
                      "fn": "select",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "ridgeX"
                        },
                        {
                          "fn": "add",
                          "args": [
                            {
                              "fn": "var",
                              "name": "z0"
                            },
                            {
                              "fn": "attribute",
                              "name": "layer"
                            }
                          ]
                        },
                        {
                          "fn": "choose",
                          "args": [
                            {
                              "fn": "attribute",
                              "name": "part"
                            },
                            {
                              "fn": "var",
                              "name": "z0"
                            },
                            {
                              "fn": "add",
                              "args": [
                                {
                                  "fn": "var",
                                  "name": "z0"
                                },
                                1
                              ]
                            },
                            {
                              "fn": "sub",
                              "args": [
                                {
                                  "fn": "var",
                                  "name": "z1"
                                },
                                1
                              ]
                            }
                          ]
                        }
                      ]
                    }
                  ]
                },
                {
                  "fn": "vec",
                  "args": [
                    {
                      "fn": "add",
                      "args": [
                        {
                          "fn": "var",
                          "name": "x0"
                        },
                        {
                          "fn": "attribute",
                          "name": "layer"
                        }
                      ]
                    },
                    {
                      "fn": "var",
                      "name": "yb"
                    },
                    {
                      "fn": "add",
                      "args": [
                        {
                          "fn": "var",
                          "name": "z0"
                        },
                        {
                          "fn": "attribute",
                          "name": "layer"
                        }
                      ]
                    }
                  ]
                },
                {
                  "fn": "choose",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "part"
                    },
                    {
                      "fn": "vec",
                      "args": [
                        {
                          "fn": "var",
                          "name": "x0"
                        },
                        {
                          "fn": "var",
                          "name": "y1"
                        },
                        {
                          "fn": "var",
                          "name": "z0"
                        }
                      ]
                    },
                    {
                      "fn": "vec",
                      "args": [
                        {
                          "fn": "var",
                          "name": "x0"
                        },
                        {
                          "fn": "var",
                          "name": "y1"
                        },
                        {
                          "fn": "sub",
                          "args": [
                            {
                              "fn": "var",
                              "name": "z1"
                            },
                            1
                          ]
                        }
                      ]
                    },
                    {
                      "fn": "vec",
                      "args": [
                        {
                          "fn": "var",
                          "name": "x0"
                        },
                        {
                          "fn": "var",
                          "name": "y1"
                        },
                        {
                          "fn": "add",
                          "args": [
                            {
                              "fn": "var",
                              "name": "z0"
                            },
                            1
                          ]
                        }
                      ]
                    },
                    {
                      "fn": "vec",
                      "args": [
                        {
                          "fn": "sub",
                          "args": [
                            {
                              "fn": "var",
                              "name": "x1"
                            },
                            1
                          ]
                        },
                        {
                          "fn": "var",
                          "name": "y1"
                        },
                        {
                          "fn": "add",
                          "args": [
                            {
                              "fn": "var",
                              "name": "z0"
                            },
                            1
                          ]
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        },
        "boundsMax": {
          "fn": "let",
          "bind": {
            "x0": {
              "fn": "component",
              "args": [
                {
                  "fn": "attribute",
                  "name": "boundsMin",
                  "tupleSize": 3
                }
              ],
              "index": 0
            },
            "z0": {
              "fn": "component",
              "args": [
                {
                  "fn": "attribute",
                  "name": "boundsMin",
                  "tupleSize": 3
                }
              ],
              "index": 2
            },
            "x1": {
              "fn": "component",
              "args": [
                {
                  "fn": "attribute",
                  "name": "boundsMax",
                  "tupleSize": 3
                }
              ],
              "index": 0
            },
            "y1": {
              "fn": "component",
              "args": [
                {
                  "fn": "attribute",
                  "name": "boundsMax",
                  "tupleSize": 3
                }
              ],
              "index": 1
            },
            "z1": {
              "fn": "component",
              "args": [
                {
                  "fn": "attribute",
                  "name": "boundsMax",
                  "tupleSize": 3
                }
              ],
              "index": 2
            },
            "st": {
              "fn": "floor",
              "args": [
                {
                  "fn": "add",
                  "args": [
                    {
                      "fn": "param",
                      "name": "roofStep"
                    },
                    0.5
                  ]
                }
              ]
            },
            "yb": {
              "fn": "add",
              "args": [
                {
                  "fn": "var",
                  "name": "y1"
                },
                {
                  "fn": "mul",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "layer"
                    },
                    {
                      "fn": "var",
                      "name": "st"
                    }
                  ]
                }
              ]
            },
            "yp": {
              "fn": "add",
              "args": [
                {
                  "fn": "var",
                  "name": "y1"
                },
                3
              ]
            }
          },
          "args": [
            {
              "fn": "choose",
              "args": [
                {
                  "fn": "attribute",
                  "name": "roofStyle"
                },
                {
                  "fn": "vec",
                  "args": [
                    {
                      "fn": "select",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "ridgeX"
                        },
                        {
                          "fn": "choose",
                          "args": [
                            {
                              "fn": "attribute",
                              "name": "part"
                            },
                            {
                              "fn": "add",
                              "args": [
                                {
                                  "fn": "var",
                                  "name": "x0"
                                },
                                1
                              ]
                            },
                            {
                              "fn": "sub",
                              "args": [
                                {
                                  "fn": "var",
                                  "name": "x1"
                                },
                                1
                              ]
                            },
                            {
                              "fn": "var",
                              "name": "x1"
                            }
                          ]
                        },
                        {
                          "fn": "sub",
                          "args": [
                            {
                              "fn": "var",
                              "name": "x1"
                            },
                            {
                              "fn": "attribute",
                              "name": "layer"
                            }
                          ]
                        }
                      ]
                    },
                    {
                      "fn": "add",
                      "args": [
                        {
                          "fn": "var",
                          "name": "yb"
                        },
                        {
                          "fn": "var",
                          "name": "st"
                        }
                      ]
                    },
                    {
                      "fn": "select",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "ridgeX"
                        },
                        {
                          "fn": "sub",
                          "args": [
                            {
                              "fn": "var",
                              "name": "z1"
                            },
                            {
                              "fn": "attribute",
                              "name": "layer"
                            }
                          ]
                        },
                        {
                          "fn": "choose",
                          "args": [
                            {
                              "fn": "attribute",
                              "name": "part"
                            },
                            {
                              "fn": "add",
                              "args": [
                                {
                                  "fn": "var",
                                  "name": "z0"
                                },
                                1
                              ]
                            },
                            {
                              "fn": "sub",
                              "args": [
                                {
                                  "fn": "var",
                                  "name": "z1"
                                },
                                1
                              ]
                            },
                            {
                              "fn": "var",
                              "name": "z1"
                            }
                          ]
                        }
                      ]
                    }
                  ]
                },
                {
                  "fn": "vec",
                  "args": [
                    {
                      "fn": "sub",
                      "args": [
                        {
                          "fn": "var",
                          "name": "x1"
                        },
                        {
                          "fn": "attribute",
                          "name": "layer"
                        }
                      ]
                    },
                    {
                      "fn": "add",
                      "args": [
                        {
                          "fn": "var",
                          "name": "yb"
                        },
                        {
                          "fn": "var",
                          "name": "st"
                        }
                      ]
                    },
                    {
                      "fn": "sub",
                      "args": [
                        {
                          "fn": "var",
                          "name": "z1"
                        },
                        {
                          "fn": "attribute",
                          "name": "layer"
                        }
                      ]
                    }
                  ]
                },
                {
                  "fn": "choose",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "part"
                    },
                    {
                      "fn": "vec",
                      "args": [
                        {
                          "fn": "var",
                          "name": "x1"
                        },
                        {
                          "fn": "var",
                          "name": "yp"
                        },
                        {
                          "fn": "add",
                          "args": [
                            {
                              "fn": "var",
                              "name": "z0"
                            },
                            1
                          ]
                        }
                      ]
                    },
                    {
                      "fn": "vec",
                      "args": [
                        {
                          "fn": "var",
                          "name": "x1"
                        },
                        {
                          "fn": "var",
                          "name": "yp"
                        },
                        {
                          "fn": "var",
                          "name": "z1"
                        }
                      ]
                    },
                    {
                      "fn": "vec",
                      "args": [
                        {
                          "fn": "add",
                          "args": [
                            {
                              "fn": "var",
                              "name": "x0"
                            },
                            1
                          ]
                        },
                        {
                          "fn": "var",
                          "name": "yp"
                        },
                        {
                          "fn": "sub",
                          "args": [
                            {
                              "fn": "var",
                              "name": "z1"
                            },
                            1
                          ]
                        }
                      ]
                    },
                    {
                      "fn": "vec",
                      "args": [
                        {
                          "fn": "var",
                          "name": "x1"
                        },
                        {
                          "fn": "var",
                          "name": "yp"
                        },
                        {
                          "fn": "sub",
                          "args": [
                            {
                              "fn": "var",
                              "name": "z1"
                            },
                            1
                          ]
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      }
    },
    {
      "id": "rfKind",
      "type": "setAttribute",
      "params": {
        "name": "kind",
        "domain": "point",
        "type": "string",
        "tupleSize": 1,
        "value": {
          "fn": "choose",
          "args": [
            {
              "fn": "attribute",
              "name": "roofStyle"
            },
            {
              "fn": "eq",
              "args": [
                {
                  "fn": "attribute",
                  "name": "part"
                },
                1
              ]
            },
            1,
            1
          ]
        },
        "select": 0,
        "values": [
          "wall",
          "roof"
        ],
        "weights": [],
        "stringValue": "",
        "seed": 0
      }
    },
    {
      "id": "chimRoll",
      "type": "filterByExpression",
      "params": {
        "predicate": {
          "fn": "lt",
          "args": [
            {
              "fn": "randomField",
              "key": "chimney"
            },
            {
              "fn": "param",
              "name": "chimneyRate"
            }
          ]
        },
        "seed": 0,
        "topology": "drop"
      }
    },
    {
      "id": "chimPick",
      "type": "setAttribute",
      "params": {
        "name": "chimAt",
        "domain": "point",
        "type": "f32",
        "tupleSize": 3,
        "value": {
          "fn": "let",
          "bind": {
            "kl": {
              "fn": "floor",
              "args": [
                {
                  "fn": "div",
                  "args": [
                    {
                      "fn": "sub",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "nl"
                        },
                        1
                      ]
                    },
                    2
                  ]
                }
              ]
            },
            "k": {
              "fn": "select",
              "args": [
                {
                  "fn": "eq",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "roofStyle"
                    },
                    2
                  ]
                },
                0,
                {
                  "fn": "max",
                  "args": [
                    0,
                    {
                      "fn": "add",
                      "args": [
                        {
                          "fn": "var",
                          "name": "kl"
                        },
                        {
                          "fn": "floor",
                          "args": [
                            {
                              "fn": "mul",
                              "args": [
                                {
                                  "fn": "randomField",
                                  "key": "chimAt"
                                },
                                {
                                  "fn": "sub",
                                  "args": [
                                    {
                                      "fn": "sub",
                                      "args": [
                                        {
                                          "fn": "attribute",
                                          "name": "nl"
                                        },
                                        1
                                      ]
                                    },
                                    {
                                      "fn": "var",
                                      "name": "kl"
                                    }
                                  ]
                                }
                              ]
                            }
                          ]
                        }
                      ]
                    }
                  ]
                }
              ]
            },
            "a0": {
              "fn": "select",
              "args": [
                {
                  "fn": "attribute",
                  "name": "ridgeX"
                },
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "boundsMin",
                      "tupleSize": 3
                    }
                  ],
                  "index": 0
                },
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "boundsMin",
                      "tupleSize": 3
                    }
                  ],
                  "index": 2
                }
              ]
            },
            "e": {
              "fn": "select",
              "args": [
                {
                  "fn": "eq",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "roofStyle"
                    },
                    1
                  ]
                },
                {
                  "fn": "var",
                  "name": "k"
                },
                1
              ]
            }
          },
          "args": [
            {
              "fn": "vec",
              "args": [
                {
                  "fn": "var",
                  "name": "k"
                },
                {
                  "fn": "add",
                  "args": [
                    {
                      "fn": "add",
                      "args": [
                        {
                          "fn": "var",
                          "name": "a0"
                        },
                        {
                          "fn": "var",
                          "name": "e"
                        }
                      ]
                    },
                    {
                      "fn": "floor",
                      "args": [
                        {
                          "fn": "mul",
                          "args": [
                            {
                              "fn": "randomField",
                              "key": "chimU"
                            },
                            {
                              "fn": "add",
                              "args": [
                                {
                                  "fn": "sub",
                                  "args": [
                                    {
                                      "fn": "sub",
                                      "args": [
                                        {
                                          "fn": "sub",
                                          "args": [
                                            {
                                              "fn": "select",
                                              "args": [
                                                {
                                                  "fn": "attribute",
                                                  "name": "ridgeX"
                                                },
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "boundsMax",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 0
                                                },
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "boundsMax",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 2
                                                }
                                              ]
                                            },
                                            {
                                              "fn": "var",
                                              "name": "a0"
                                            }
                                          ]
                                        },
                                        {
                                          "fn": "mul",
                                          "args": [
                                            2,
                                            {
                                              "fn": "var",
                                              "name": "e"
                                            }
                                          ]
                                        }
                                      ]
                                    },
                                    2
                                  ]
                                },
                                0.999
                              ]
                            }
                          ]
                        }
                      ]
                    }
                  ]
                },
                {
                  "fn": "lt",
                  "args": [
                    {
                      "fn": "randomField",
                      "key": "chimSide"
                    },
                    0.5
                  ]
                }
              ]
            }
          ]
        },
        "select": 0,
        "values": [],
        "weights": [],
        "stringValue": "",
        "seed": 0
      }
    },
    {
      "id": "chimBox",
      "type": "setBounds",
      "params": {
        "boundsMin": {
          "fn": "let",
          "bind": {
            "k": {
              "fn": "component",
              "args": [
                {
                  "fn": "attribute",
                  "name": "chimAt",
                  "tupleSize": 3
                }
              ],
              "index": 0
            },
            "u": {
              "fn": "component",
              "args": [
                {
                  "fn": "attribute",
                  "name": "chimAt",
                  "tupleSize": 3
                }
              ],
              "index": 1
            },
            "c": {
              "fn": "select",
              "args": [
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "chimAt",
                      "tupleSize": 3
                    }
                  ],
                  "index": 2
                },
                {
                  "fn": "sub",
                  "args": [
                    {
                      "fn": "sub",
                      "args": [
                        {
                          "fn": "select",
                          "args": [
                            {
                              "fn": "attribute",
                              "name": "ridgeX"
                            },
                            {
                              "fn": "component",
                              "args": [
                                {
                                  "fn": "attribute",
                                  "name": "boundsMax",
                                  "tupleSize": 3
                                }
                              ],
                              "index": 2
                            },
                            {
                              "fn": "component",
                              "args": [
                                {
                                  "fn": "attribute",
                                  "name": "boundsMax",
                                  "tupleSize": 3
                                }
                              ],
                              "index": 0
                            }
                          ]
                        },
                        {
                          "fn": "var",
                          "name": "k"
                        }
                      ]
                    },
                    1
                  ]
                },
                {
                  "fn": "add",
                  "args": [
                    {
                      "fn": "select",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "ridgeX"
                        },
                        {
                          "fn": "component",
                          "args": [
                            {
                              "fn": "attribute",
                              "name": "boundsMin",
                              "tupleSize": 3
                            }
                          ],
                          "index": 2
                        },
                        {
                          "fn": "component",
                          "args": [
                            {
                              "fn": "attribute",
                              "name": "boundsMin",
                              "tupleSize": 3
                            }
                          ],
                          "index": 0
                        }
                      ]
                    },
                    {
                      "fn": "var",
                      "name": "k"
                    }
                  ]
                }
              ]
            }
          },
          "args": [
            {
              "fn": "vec",
              "args": [
                {
                  "fn": "select",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "ridgeX"
                    },
                    {
                      "fn": "var",
                      "name": "u"
                    },
                    {
                      "fn": "var",
                      "name": "c"
                    }
                  ]
                },
                {
                  "fn": "add",
                  "args": [
                    {
                      "fn": "component",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "boundsMax",
                          "tupleSize": 3
                        }
                      ],
                      "index": 1
                    },
                    {
                      "fn": "select",
                      "args": [
                        {
                          "fn": "eq",
                          "args": [
                            {
                              "fn": "attribute",
                              "name": "roofStyle"
                            },
                            2
                          ]
                        },
                        3,
                        {
                          "fn": "mul",
                          "args": [
                            {
                              "fn": "add",
                              "args": [
                                {
                                  "fn": "var",
                                  "name": "k"
                                },
                                1
                              ]
                            },
                            {
                              "fn": "floor",
                              "args": [
                                {
                                  "fn": "add",
                                  "args": [
                                    {
                                      "fn": "param",
                                      "name": "roofStep"
                                    },
                                    0.5
                                  ]
                                }
                              ]
                            }
                          ]
                        }
                      ]
                    }
                  ]
                },
                {
                  "fn": "select",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "ridgeX"
                    },
                    {
                      "fn": "var",
                      "name": "c"
                    },
                    {
                      "fn": "var",
                      "name": "u"
                    }
                  ]
                }
              ]
            }
          ]
        },
        "boundsMax": {
          "fn": "let",
          "bind": {
            "k": {
              "fn": "component",
              "args": [
                {
                  "fn": "attribute",
                  "name": "chimAt",
                  "tupleSize": 3
                }
              ],
              "index": 0
            },
            "u": {
              "fn": "component",
              "args": [
                {
                  "fn": "attribute",
                  "name": "chimAt",
                  "tupleSize": 3
                }
              ],
              "index": 1
            },
            "c": {
              "fn": "select",
              "args": [
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "chimAt",
                      "tupleSize": 3
                    }
                  ],
                  "index": 2
                },
                {
                  "fn": "sub",
                  "args": [
                    {
                      "fn": "sub",
                      "args": [
                        {
                          "fn": "select",
                          "args": [
                            {
                              "fn": "attribute",
                              "name": "ridgeX"
                            },
                            {
                              "fn": "component",
                              "args": [
                                {
                                  "fn": "attribute",
                                  "name": "boundsMax",
                                  "tupleSize": 3
                                }
                              ],
                              "index": 2
                            },
                            {
                              "fn": "component",
                              "args": [
                                {
                                  "fn": "attribute",
                                  "name": "boundsMax",
                                  "tupleSize": 3
                                }
                              ],
                              "index": 0
                            }
                          ]
                        },
                        {
                          "fn": "var",
                          "name": "k"
                        }
                      ]
                    },
                    1
                  ]
                },
                {
                  "fn": "add",
                  "args": [
                    {
                      "fn": "select",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "ridgeX"
                        },
                        {
                          "fn": "component",
                          "args": [
                            {
                              "fn": "attribute",
                              "name": "boundsMin",
                              "tupleSize": 3
                            }
                          ],
                          "index": 2
                        },
                        {
                          "fn": "component",
                          "args": [
                            {
                              "fn": "attribute",
                              "name": "boundsMin",
                              "tupleSize": 3
                            }
                          ],
                          "index": 0
                        }
                      ]
                    },
                    {
                      "fn": "var",
                      "name": "k"
                    }
                  ]
                }
              ]
            }
          },
          "args": [
            {
              "fn": "vec",
              "args": [
                {
                  "fn": "select",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "ridgeX"
                    },
                    {
                      "fn": "add",
                      "args": [
                        {
                          "fn": "var",
                          "name": "u"
                        },
                        2
                      ]
                    },
                    {
                      "fn": "add",
                      "args": [
                        {
                          "fn": "var",
                          "name": "c"
                        },
                        1
                      ]
                    }
                  ]
                },
                {
                  "fn": "add",
                  "args": [
                    {
                      "fn": "add",
                      "args": [
                        {
                          "fn": "component",
                          "args": [
                            {
                              "fn": "attribute",
                              "name": "boundsMax",
                              "tupleSize": 3
                            }
                          ],
                          "index": 1
                        },
                        {
                          "fn": "select",
                          "args": [
                            {
                              "fn": "eq",
                              "args": [
                                {
                                  "fn": "attribute",
                                  "name": "roofStyle"
                                },
                                2
                              ]
                            },
                            3,
                            {
                              "fn": "mul",
                              "args": [
                                {
                                  "fn": "attribute",
                                  "name": "nl"
                                },
                                {
                                  "fn": "floor",
                                  "args": [
                                    {
                                      "fn": "add",
                                      "args": [
                                        {
                                          "fn": "param",
                                          "name": "roofStep"
                                        },
                                        0.5
                                      ]
                                    }
                                  ]
                                }
                              ]
                            }
                          ]
                        }
                      ]
                    },
                    4
                  ]
                },
                {
                  "fn": "select",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "ridgeX"
                    },
                    {
                      "fn": "add",
                      "args": [
                        {
                          "fn": "var",
                          "name": "c"
                        },
                        1
                      ]
                    },
                    {
                      "fn": "add",
                      "args": [
                        {
                          "fn": "var",
                          "name": "u"
                        },
                        2
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      }
    },
    {
      "id": "chimShadow",
      "type": "setBounds",
      "params": {
        "boundsMin": {
          "fn": "let",
          "bind": {
            "x0": {
              "fn": "component",
              "args": [
                {
                  "fn": "attribute",
                  "name": "boundsMin",
                  "tupleSize": 3
                }
              ],
              "index": 0
            },
            "z0": {
              "fn": "component",
              "args": [
                {
                  "fn": "attribute",
                  "name": "boundsMin",
                  "tupleSize": 3
                }
              ],
              "index": 2
            },
            "k": {
              "fn": "component",
              "args": [
                {
                  "fn": "attribute",
                  "name": "chimAt",
                  "tupleSize": 3
                }
              ],
              "index": 0
            },
            "u": {
              "fn": "component",
              "args": [
                {
                  "fn": "attribute",
                  "name": "chimAt",
                  "tupleSize": 3
                }
              ],
              "index": 1
            },
            "c": {
              "fn": "select",
              "args": [
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "chimAt",
                      "tupleSize": 3
                    }
                  ],
                  "index": 2
                },
                {
                  "fn": "sub",
                  "args": [
                    {
                      "fn": "sub",
                      "args": [
                        {
                          "fn": "select",
                          "args": [
                            {
                              "fn": "attribute",
                              "name": "ridgeX"
                            },
                            {
                              "fn": "component",
                              "args": [
                                {
                                  "fn": "attribute",
                                  "name": "boundsMax",
                                  "tupleSize": 3
                                }
                              ],
                              "index": 2
                            },
                            {
                              "fn": "component",
                              "args": [
                                {
                                  "fn": "attribute",
                                  "name": "boundsMax",
                                  "tupleSize": 3
                                }
                              ],
                              "index": 0
                            }
                          ]
                        },
                        {
                          "fn": "var",
                          "name": "k"
                        }
                      ]
                    },
                    1
                  ]
                },
                {
                  "fn": "add",
                  "args": [
                    {
                      "fn": "select",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "ridgeX"
                        },
                        {
                          "fn": "var",
                          "name": "z0"
                        },
                        {
                          "fn": "var",
                          "name": "x0"
                        }
                      ]
                    },
                    {
                      "fn": "var",
                      "name": "k"
                    }
                  ]
                }
              ]
            }
          },
          "args": [
            {
              "fn": "vec",
              "args": [
                {
                  "fn": "max",
                  "args": [
                    {
                      "fn": "var",
                      "name": "x0"
                    },
                    {
                      "fn": "sub",
                      "args": [
                        {
                          "fn": "select",
                          "args": [
                            {
                              "fn": "attribute",
                              "name": "ridgeX"
                            },
                            {
                              "fn": "var",
                              "name": "u"
                            },
                            {
                              "fn": "var",
                              "name": "c"
                            }
                          ]
                        },
                        2
                      ]
                    }
                  ]
                },
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "boundsMax",
                      "tupleSize": 3
                    }
                  ],
                  "index": 1
                },
                {
                  "fn": "max",
                  "args": [
                    {
                      "fn": "var",
                      "name": "z0"
                    },
                    {
                      "fn": "sub",
                      "args": [
                        {
                          "fn": "select",
                          "args": [
                            {
                              "fn": "attribute",
                              "name": "ridgeX"
                            },
                            {
                              "fn": "var",
                              "name": "c"
                            },
                            {
                              "fn": "var",
                              "name": "u"
                            }
                          ]
                        },
                        2
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        },
        "boundsMax": {
          "fn": "let",
          "bind": {
            "x1": {
              "fn": "component",
              "args": [
                {
                  "fn": "attribute",
                  "name": "boundsMax",
                  "tupleSize": 3
                }
              ],
              "index": 0
            },
            "z1": {
              "fn": "component",
              "args": [
                {
                  "fn": "attribute",
                  "name": "boundsMax",
                  "tupleSize": 3
                }
              ],
              "index": 2
            },
            "k": {
              "fn": "component",
              "args": [
                {
                  "fn": "attribute",
                  "name": "chimAt",
                  "tupleSize": 3
                }
              ],
              "index": 0
            },
            "u": {
              "fn": "component",
              "args": [
                {
                  "fn": "attribute",
                  "name": "chimAt",
                  "tupleSize": 3
                }
              ],
              "index": 1
            },
            "c": {
              "fn": "select",
              "args": [
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "chimAt",
                      "tupleSize": 3
                    }
                  ],
                  "index": 2
                },
                {
                  "fn": "sub",
                  "args": [
                    {
                      "fn": "sub",
                      "args": [
                        {
                          "fn": "select",
                          "args": [
                            {
                              "fn": "attribute",
                              "name": "ridgeX"
                            },
                            {
                              "fn": "var",
                              "name": "z1"
                            },
                            {
                              "fn": "var",
                              "name": "x1"
                            }
                          ]
                        },
                        {
                          "fn": "var",
                          "name": "k"
                        }
                      ]
                    },
                    1
                  ]
                },
                {
                  "fn": "add",
                  "args": [
                    {
                      "fn": "select",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "ridgeX"
                        },
                        {
                          "fn": "component",
                          "args": [
                            {
                              "fn": "attribute",
                              "name": "boundsMin",
                              "tupleSize": 3
                            }
                          ],
                          "index": 2
                        },
                        {
                          "fn": "component",
                          "args": [
                            {
                              "fn": "attribute",
                              "name": "boundsMin",
                              "tupleSize": 3
                            }
                          ],
                          "index": 0
                        }
                      ]
                    },
                    {
                      "fn": "var",
                      "name": "k"
                    }
                  ]
                }
              ]
            }
          },
          "args": [
            {
              "fn": "vec",
              "args": [
                {
                  "fn": "min",
                  "args": [
                    {
                      "fn": "var",
                      "name": "x1"
                    },
                    {
                      "fn": "add",
                      "args": [
                        {
                          "fn": "select",
                          "args": [
                            {
                              "fn": "attribute",
                              "name": "ridgeX"
                            },
                            {
                              "fn": "add",
                              "args": [
                                {
                                  "fn": "var",
                                  "name": "u"
                                },
                                2
                              ]
                            },
                            {
                              "fn": "add",
                              "args": [
                                {
                                  "fn": "var",
                                  "name": "c"
                                },
                                1
                              ]
                            }
                          ]
                        },
                        2
                      ]
                    }
                  ]
                },
                {
                  "fn": "add",
                  "args": [
                    {
                      "fn": "add",
                      "args": [
                        {
                          "fn": "add",
                          "args": [
                            {
                              "fn": "component",
                              "args": [
                                {
                                  "fn": "attribute",
                                  "name": "boundsMax",
                                  "tupleSize": 3
                                }
                              ],
                              "index": 1
                            },
                            {
                              "fn": "select",
                              "args": [
                                {
                                  "fn": "eq",
                                  "args": [
                                    {
                                      "fn": "attribute",
                                      "name": "roofStyle"
                                    },
                                    2
                                  ]
                                },
                                3,
                                {
                                  "fn": "mul",
                                  "args": [
                                    {
                                      "fn": "attribute",
                                      "name": "nl"
                                    },
                                    {
                                      "fn": "floor",
                                      "args": [
                                        {
                                          "fn": "add",
                                          "args": [
                                            {
                                              "fn": "param",
                                              "name": "roofStep"
                                            },
                                            0.5
                                          ]
                                        }
                                      ]
                                    }
                                  ]
                                }
                              ]
                            }
                          ]
                        },
                        4
                      ]
                    },
                    2
                  ]
                },
                {
                  "fn": "min",
                  "args": [
                    {
                      "fn": "var",
                      "name": "z1"
                    },
                    {
                      "fn": "add",
                      "args": [
                        {
                          "fn": "select",
                          "args": [
                            {
                              "fn": "attribute",
                              "name": "ridgeX"
                            },
                            {
                              "fn": "add",
                              "args": [
                                {
                                  "fn": "var",
                                  "name": "c"
                                },
                                1
                              ]
                            },
                            {
                              "fn": "add",
                              "args": [
                                {
                                  "fn": "var",
                                  "name": "u"
                                },
                                2
                              ]
                            }
                          ]
                        },
                        2
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      }
    },
    {
      "id": "chimKind",
      "type": "setAttribute",
      "params": {
        "name": "kind",
        "domain": "point",
        "type": "string",
        "tupleSize": 1,
        "value": 0,
        "select": 0,
        "values": [],
        "weights": [],
        "stringValue": "chimney",
        "seed": 0
      }
    },
    {
      "id": "chimFlag",
      "type": "setAttribute",
      "params": {
        "name": "chim",
        "domain": "point",
        "type": "f32",
        "tupleSize": 1,
        "value": 1,
        "select": 0,
        "values": [],
        "weights": [],
        "stringValue": "",
        "seed": 0
      }
    },
    {
      "id": "occPieces",
      "type": "mergePoints",
      "params": {}
    },
    {
      "id": "occluder",
      "type": "setAttribute",
      "params": {
        "name": "P",
        "domain": "point",
        "type": "f32",
        "tupleSize": 3,
        "value": {
          "fn": "mul",
          "args": [
            0.5,
            {
              "fn": "add",
              "args": [
                {
                  "fn": "attribute",
                  "name": "boundsMin",
                  "tupleSize": 3
                },
                {
                  "fn": "attribute",
                  "name": "boundsMax",
                  "tupleSize": 3
                }
              ]
            }
          ]
        },
        "select": 0,
        "values": [],
        "weights": [],
        "stringValue": "",
        "seed": 0
      }
    },
    {
      "id": "gBox",
      "type": "setBounds",
      "params": {
        "boundsMin": {
          "fn": "vec",
          "args": [
            {
              "fn": "sub",
              "args": [
                {
                  "fn": "div",
                  "args": [
                    {
                      "fn": "component",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "lot",
                          "tupleSize": 3
                        }
                      ],
                      "index": 0
                    },
                    2
                  ]
                },
                {
                  "fn": "mul",
                  "args": [
                    4,
                    {
                      "fn": "floor",
                      "args": [
                        {
                          "fn": "div",
                          "args": [
                            {
                              "fn": "add",
                              "args": [
                                {
                                  "fn": "component",
                                  "args": [
                                    {
                                      "fn": "attribute",
                                      "name": "lot",
                                      "tupleSize": 3
                                    }
                                  ],
                                  "index": 0
                                },
                                11
                              ]
                            },
                            8
                          ]
                        }
                      ]
                    }
                  ]
                }
              ]
            },
            0,
            {
              "fn": "sub",
              "args": [
                {
                  "fn": "div",
                  "args": [
                    {
                      "fn": "component",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "lot",
                          "tupleSize": 3
                        }
                      ],
                      "index": 2
                    },
                    2
                  ]
                },
                {
                  "fn": "mul",
                  "args": [
                    4,
                    {
                      "fn": "floor",
                      "args": [
                        {
                          "fn": "div",
                          "args": [
                            {
                              "fn": "add",
                              "args": [
                                {
                                  "fn": "component",
                                  "args": [
                                    {
                                      "fn": "attribute",
                                      "name": "lot",
                                      "tupleSize": 3
                                    }
                                  ],
                                  "index": 2
                                },
                                11
                              ]
                            },
                            8
                          ]
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        },
        "boundsMax": {
          "fn": "vec",
          "args": [
            {
              "fn": "add",
              "args": [
                {
                  "fn": "div",
                  "args": [
                    {
                      "fn": "component",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "lot",
                          "tupleSize": 3
                        }
                      ],
                      "index": 0
                    },
                    2
                  ]
                },
                {
                  "fn": "mul",
                  "args": [
                    4,
                    {
                      "fn": "floor",
                      "args": [
                        {
                          "fn": "div",
                          "args": [
                            {
                              "fn": "add",
                              "args": [
                                {
                                  "fn": "component",
                                  "args": [
                                    {
                                      "fn": "attribute",
                                      "name": "lot",
                                      "tupleSize": 3
                                    }
                                  ],
                                  "index": 0
                                },
                                11
                              ]
                            },
                            8
                          ]
                        }
                      ]
                    }
                  ]
                }
              ]
            },
            1,
            {
              "fn": "add",
              "args": [
                {
                  "fn": "div",
                  "args": [
                    {
                      "fn": "component",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "lot",
                          "tupleSize": 3
                        }
                      ],
                      "index": 2
                    },
                    2
                  ]
                },
                {
                  "fn": "mul",
                  "args": [
                    4,
                    {
                      "fn": "floor",
                      "args": [
                        {
                          "fn": "div",
                          "args": [
                            {
                              "fn": "add",
                              "args": [
                                {
                                  "fn": "component",
                                  "args": [
                                    {
                                      "fn": "attribute",
                                      "name": "lot",
                                      "tupleSize": 3
                                    }
                                  ],
                                  "index": 2
                                },
                                11
                              ]
                            },
                            8
                          ]
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      }
    },
    {
      "id": "gKind",
      "type": "setAttribute",
      "params": {
        "name": "kind",
        "domain": "point",
        "type": "string",
        "tupleSize": 1,
        "value": 0,
        "select": 0,
        "values": [],
        "weights": [],
        "stringValue": "ground",
        "seed": 0
      }
    },
    {
      "id": "pieces",
      "type": "mergePoints",
      "params": {}
    },
    {
      "id": "tint",
      "type": "setAttribute",
      "params": {
        "name": "tint",
        "domain": "point",
        "type": "f32",
        "tupleSize": 3,
        "value": {
          "fn": "byAttribute",
          "name": "kind",
          "cases": {
            "wall": {
              "fn": "choose",
              "args": [
                {
                  "fn": "attribute",
                  "name": "wallTint"
                },
                [
                  0.93,
                  0.92,
                  0.88
                ],
                [
                  0.85,
                  0.75,
                  0.55
                ],
                [
                  0.7,
                  0.16,
                  0.12
                ],
                [
                  0.95,
                  0.76,
                  0.16
                ],
                [
                  0.6,
                  0.63,
                  0.64
                ]
              ]
            },
            "trim": {
              "fn": "choose",
              "args": [
                {
                  "fn": "attribute",
                  "name": "wallTint"
                },
                [
                  0.651,
                  0.644,
                  0.616
                ],
                [
                  0.595,
                  0.525,
                  0.385
                ],
                [
                  0.49,
                  0.112,
                  0.084
                ],
                [
                  0.665,
                  0.532,
                  0.112
                ],
                [
                  0.42,
                  0.441,
                  0.448
                ]
              ]
            },
            "roof": {
              "fn": "choose",
              "args": [
                {
                  "fn": "attribute",
                  "name": "roofTint"
                },
                [
                  0.42,
                  0.1,
                  0.08
                ],
                [
                  0.3,
                  0.33,
                  0.36
                ],
                [
                  0.2,
                  0.32,
                  0.18
                ]
              ]
            },
            "chimney": [
              0.42,
              0.2,
              0.16
            ],
            "glass": [
              0.55,
              0.8,
              0.95
            ],
            "door": [
              0.42,
              0.25,
              0.12
            ],
            "floor": [
              0.62,
              0.62,
              0.6
            ],
            "ground": [
              0.3,
              0.6,
              0.25
            ]
          },
          "default": [
            1,
            0,
            1
          ]
        },
        "select": 0,
        "values": [],
        "weights": [],
        "stringValue": "",
        "seed": 0
      }
    },
    {
      "id": "bounds",
      "type": "setBounds",
      "params": {
        "boundsMin": {
          "fn": "vec",
          "args": [
            {
              "fn": "sub",
              "args": [
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "boundsMin",
                      "tupleSize": 3
                    }
                  ],
                  "index": 0
                },
                {
                  "fn": "div",
                  "args": [
                    {
                      "fn": "component",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "lot",
                          "tupleSize": 3
                        }
                      ],
                      "index": 0
                    },
                    2
                  ]
                }
              ]
            },
            {
              "fn": "mul",
              "args": [
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "boundsMin",
                      "tupleSize": 3
                    }
                  ],
                  "index": 1
                },
                0.4
              ]
            },
            {
              "fn": "sub",
              "args": [
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "boundsMin",
                      "tupleSize": 3
                    }
                  ],
                  "index": 2
                },
                {
                  "fn": "div",
                  "args": [
                    {
                      "fn": "component",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "lot",
                          "tupleSize": 3
                        }
                      ],
                      "index": 2
                    },
                    2
                  ]
                }
              ]
            }
          ]
        },
        "boundsMax": {
          "fn": "vec",
          "args": [
            {
              "fn": "sub",
              "args": [
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "boundsMax",
                      "tupleSize": 3
                    }
                  ],
                  "index": 0
                },
                {
                  "fn": "div",
                  "args": [
                    {
                      "fn": "component",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "lot",
                          "tupleSize": 3
                        }
                      ],
                      "index": 0
                    },
                    2
                  ]
                }
              ]
            },
            {
              "fn": "mul",
              "args": [
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "boundsMax",
                      "tupleSize": 3
                    }
                  ],
                  "index": 1
                },
                0.4
              ]
            },
            {
              "fn": "sub",
              "args": [
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "boundsMax",
                      "tupleSize": 3
                    }
                  ],
                  "index": 2
                },
                {
                  "fn": "div",
                  "args": [
                    {
                      "fn": "component",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "lot",
                          "tupleSize": 3
                        }
                      ],
                      "index": 2
                    },
                    2
                  ]
                }
              ]
            }
          ]
        }
      }
    },
    {
      "id": "pack",
      "type": "packBricks",
      "params": {
        "minAttr": "boundsMin",
        "maxAttr": "boundsMax",
        "pitch": [
          1,
          0.4,
          1
        ],
        "origin": [
          0,
          0,
          0
        ],
        "bricks": [
          2,
          8,
          3,
          2,
          6,
          3,
          2,
          4,
          3,
          2,
          3,
          3,
          2,
          2,
          3,
          1,
          8,
          3,
          1,
          6,
          3,
          1,
          4,
          3,
          1,
          3,
          3,
          1,
          2,
          3,
          1,
          1,
          3,
          2,
          16,
          1,
          2,
          12,
          1,
          2,
          10,
          1,
          2,
          8,
          1,
          2,
          6,
          1,
          2,
          4,
          1,
          2,
          3,
          1,
          2,
          2,
          1,
          1,
          12,
          1,
          1,
          10,
          1,
          1,
          8,
          1,
          1,
          6,
          1,
          1,
          4,
          1,
          1,
          3,
          1,
          1,
          2,
          1,
          1,
          1,
          1
        ],
        "extraBricks": [
          16,
          16,
          1,
          16,
          24,
          1,
          16,
          32,
          1,
          16,
          40,
          1,
          24,
          24,
          1,
          24,
          32,
          1,
          24,
          40,
          1,
          32,
          32,
          1,
          32,
          40,
          1,
          40,
          40,
          1
        ],
        "groupBy": [
          "kind",
          "tint"
        ],
        "stagger": 3,
        "bond": 16,
        "studMode": "all",
        "islandsAttr": "islands"
      }
    },
    {
      "id": "connect",
      "type": "brickConnectivity",
      "params": {
        "minAttr": "boundsMin",
        "maxAttr": "boundsMax",
        "pitch": [
          1,
          0.4,
          1
        ],
        "origin": [
          0,
          0,
          0
        ],
        "islandAttr": "island",
        "stepAttr": "step",
        "stepAboveAttr": "stepAbove",
        "stepCountAttr": "stepCount",
        "islandsAttr": "islands"
      }
    },
    {
      "id": "vary",
      "type": "setAttribute",
      "params": {
        "name": "tint",
        "domain": "point",
        "type": "f32",
        "tupleSize": 3,
        "value": {
          "fn": "byAttribute",
          "name": "kind",
          "cases": {
            "wall": {
              "fn": "select",
              "args": [
                {
                  "fn": "mul",
                  "args": [
                    {
                      "fn": "component",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "trim",
                          "tupleSize": 3
                        }
                      ],
                      "index": 2
                    },
                    {
                      "fn": "lt",
                      "args": [
                        {
                          "fn": "abs",
                          "args": [
                            {
                              "fn": "sub",
                              "args": [
                                {
                                  "fn": "component",
                                  "args": [
                                    {
                                      "fn": "attribute",
                                      "name": "boundsMin",
                                      "tupleSize": 3
                                    }
                                  ],
                                  "index": 1
                                },
                                0.8
                              ]
                            }
                          ]
                        },
                        0.1
                      ]
                    }
                  ]
                },
                [
                  0.27,
                  0.28,
                  0.3
                ],
                {
                  "fn": "select",
                  "args": [
                    {
                      "fn": "lt",
                      "args": [
                        {
                          "fn": "randomField",
                          "key": "vary"
                        },
                        {
                          "fn": "param",
                          "name": "brickVariation"
                        }
                      ]
                    },
                    {
                      "fn": "select",
                      "args": [
                        {
                          "fn": "lt",
                          "args": [
                            {
                              "fn": "randomField",
                              "key": "vary"
                            },
                            {
                              "fn": "mul",
                              "args": [
                                0.5,
                                {
                                  "fn": "param",
                                  "name": "brickVariation"
                                }
                              ]
                            }
                          ]
                        },
                        {
                          "fn": "mul",
                          "args": [
                            0.88,
                            {
                              "fn": "attribute",
                              "name": "tint",
                              "tupleSize": 3
                            }
                          ]
                        },
                        {
                          "fn": "min",
                          "args": [
                            {
                              "fn": "mul",
                              "args": [
                                1.1,
                                {
                                  "fn": "attribute",
                                  "name": "tint",
                                  "tupleSize": 3
                                }
                              ]
                            },
                            1
                          ]
                        }
                      ]
                    },
                    {
                      "fn": "attribute",
                      "name": "tint",
                      "tupleSize": 3
                    }
                  ]
                }
              ]
            }
          },
          "default": {
            "fn": "attribute",
            "name": "tint",
            "tupleSize": 3
          }
        },
        "select": 0,
        "values": [],
        "weights": [],
        "stringValue": "",
        "seed": 0
      }
    },
    {
      "id": "shownAt",
      "type": "setAttribute",
      "params": {
        "name": "shownAt",
        "domain": "point",
        "type": "f32",
        "tupleSize": 1,
        "value": {
          "fn": "select",
          "args": [
            {
              "fn": "lt",
              "args": [
                {
                  "fn": "attribute",
                  "name": "step"
                },
                0
              ]
            },
            138,
            {
              "fn": "attribute",
              "name": "step"
            }
          ]
        },
        "select": 0,
        "values": [],
        "weights": [],
        "stringValue": "",
        "seed": 0
      }
    },
    {
      "id": "built",
      "type": "filterByExpression",
      "params": {
        "predicate": {
          "fn": "le",
          "args": [
            {
              "fn": "attribute",
              "name": "shownAt"
            },
            {
              "fn": "param",
              "name": "buildStep"
            }
          ]
        },
        "seed": 0,
        "topology": "drop"
      }
    },
    {
      "id": "gap",
      "type": "setAttribute",
      "params": {
        "name": "scale",
        "domain": "point",
        "type": "f32",
        "tupleSize": 3,
        "value": {
          "fn": "sub",
          "args": [
            {
              "fn": "attribute",
              "name": "scale",
              "tupleSize": 3
            },
            0.04
          ]
        },
        "select": 0,
        "values": [],
        "weights": [],
        "stringValue": "",
        "seed": 0
      }
    },
    {
      "id": "bricks",
      "type": "spawnInstances",
      "params": {
        "assetId": "brick",
        "assetAttr": "",
        "colorAttr": "tint",
        "instanceAttrs": []
      }
    },
    {
      "id": "showing",
      "type": "filterByExpression",
      "params": {
        "predicate": {
          "fn": "mul",
          "args": [
            {
              "fn": "mul",
              "args": [
                {
                  "fn": "le",
                  "args": [
                    {
                      "fn": "select",
                      "args": [
                        {
                          "fn": "lt",
                          "args": [
                            {
                              "fn": "attribute",
                              "name": "step"
                            },
                            0
                          ]
                        },
                        138,
                        {
                          "fn": "attribute",
                          "name": "step"
                        }
                      ]
                    },
                    {
                      "fn": "param",
                      "name": "buildStep"
                    }
                  ]
                },
                {
                  "fn": "max",
                  "args": [
                    {
                      "fn": "lt",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "brickAbove"
                        },
                        0
                      ]
                    },
                    {
                      "fn": "gt",
                      "args": [
                        {
                          "fn": "select",
                          "args": [
                            {
                              "fn": "lt",
                              "args": [
                                {
                                  "fn": "attribute",
                                  "name": "stepAbove"
                                },
                                0
                              ]
                            },
                            138,
                            {
                              "fn": "attribute",
                              "name": "stepAbove"
                            }
                          ]
                        },
                        {
                          "fn": "param",
                          "name": "buildStep"
                        }
                      ]
                    }
                  ]
                }
              ]
            },
            {
              "fn": "sub",
              "args": [
                1,
                {
                  "fn": "mul",
                  "args": [
                    {
                      "fn": "attributeIs",
                      "name": "kind",
                      "value": "trim"
                    },
                    {
                      "fn": "lt",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "brickAbove"
                        },
                        0
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        },
        "seed": 0,
        "topology": "drop"
      }
    },
    {
      "id": "studTint",
      "type": "transferByIndex",
      "params": {
        "index": {
          "fn": "attribute",
          "name": "brickId"
        },
        "attributes": [
          "tint"
        ],
        "outNames": [],
        "outOfRange": "clamp",
        "hitAttr": "",
        "missCountAttr": ""
      }
    },
    {
      "id": "studs",
      "type": "spawnInstances",
      "params": {
        "assetId": "stud",
        "assetAttr": "",
        "colorAttr": "tint",
        "instanceAttrs": []
      }
    },
    {
      "id": "potStuds",
      "type": "filterByExpression",
      "params": {
        "predicate": {
          "fn": "mul",
          "args": [
            {
              "fn": "attribute",
              "name": "chim"
            },
            {
              "fn": "lt",
              "args": [
                {
                  "fn": "attribute",
                  "name": "brickAbove"
                },
                0
              ]
            }
          ]
        },
        "seed": 0,
        "topology": "drop"
      }
    },
    {
      "id": "potTint",
      "type": "setAttribute",
      "params": {
        "name": "tint",
        "domain": "point",
        "type": "f32",
        "tupleSize": 3,
        "value": {
          "fn": "vec",
          "args": [
            0.85,
            0.52,
            0.3
          ]
        },
        "select": 0,
        "values": [],
        "weights": [],
        "stringValue": "",
        "seed": 0
      }
    },
    {
      "id": "pots",
      "type": "spawnInstances",
      "params": {
        "assetId": "pot",
        "assetAttr": "",
        "colorAttr": "tint",
        "instanceAttrs": []
      }
    },
    {
      "id": "brickMesh",
      "type": "meshPrimitive",
      "params": {
        "shape": "box",
        "size": [
          1,
          1,
          1
        ],
        "center": [
          0,
          0,
          0
        ],
        "orientation": "xz",
        "subdivisions": [
          1,
          1,
          1
        ],
        "sides": 16,
        "caps": "both",
        "flip": false,
        "normals": false
      }
    },
    {
      "id": "studMesh",
      "type": "meshPrimitive",
      "params": {
        "shape": "cylinder",
        "size": [
          0.6,
          0.2125,
          0.6
        ],
        "center": [
          0,
          0.08625,
          0
        ],
        "orientation": "xz",
        "subdivisions": [
          1,
          1,
          1
        ],
        "sides": 12,
        "caps": "top",
        "flip": false,
        "normals": true
      }
    },
    {
      "id": "potMesh",
      "type": "meshPrimitive",
      "params": {
        "shape": "cylinder",
        "size": [
          0.8,
          0.8,
          0.8
        ],
        "center": [
          0,
          0.38,
          0
        ],
        "orientation": "xz",
        "subdivisions": [
          1,
          1,
          1
        ],
        "sides": 12,
        "caps": "top",
        "flip": false,
        "normals": true
      }
    }
  ],
  "connections": [
    {
      "from": [
        "lotPt",
        "out"
      ],
      "to": [
        "lotSize",
        "in"
      ]
    },
    {
      "from": [
        "lotSize",
        "out"
      ],
      "to": [
        "lotBox",
        "in"
      ]
    },
    {
      "from": [
        "lotBox",
        "out"
      ],
      "to": [
        "lotPlinth",
        "in"
      ]
    },
    {
      "from": [
        "lotPlinth",
        "out"
      ],
      "to": [
        "b1Ax",
        "in"
      ]
    },
    {
      "from": [
        "b1Ax",
        "out"
      ],
      "to": [
        "b1Can",
        "in"
      ]
    },
    {
      "from": [
        "b1Can",
        "out"
      ],
      "to": [
        "b1Cut",
        "in"
      ]
    },
    {
      "from": [
        "b1Cut",
        "out"
      ],
      "to": [
        "b1Fan",
        "in"
      ]
    },
    {
      "from": [
        "b1Fan",
        "out"
      ],
      "to": [
        "b1Box",
        "in"
      ]
    },
    {
      "from": [
        "b1Box",
        "out"
      ],
      "to": [
        "b2Ax",
        "in"
      ]
    },
    {
      "from": [
        "b2Ax",
        "out"
      ],
      "to": [
        "b2Can",
        "in"
      ]
    },
    {
      "from": [
        "b2Can",
        "out"
      ],
      "to": [
        "b2Cut",
        "in"
      ]
    },
    {
      "from": [
        "b2Cut",
        "out"
      ],
      "to": [
        "b2Fan",
        "in"
      ]
    },
    {
      "from": [
        "b2Fan",
        "out"
      ],
      "to": [
        "b2Box",
        "in"
      ]
    },
    {
      "from": [
        "b2Box",
        "out"
      ],
      "to": [
        "b3Ax",
        "in"
      ]
    },
    {
      "from": [
        "b3Ax",
        "out"
      ],
      "to": [
        "b3Can",
        "in"
      ]
    },
    {
      "from": [
        "b3Can",
        "out"
      ],
      "to": [
        "b3Cut",
        "in"
      ]
    },
    {
      "from": [
        "b3Cut",
        "out"
      ],
      "to": [
        "b3Fan",
        "in"
      ]
    },
    {
      "from": [
        "b3Fan",
        "out"
      ],
      "to": [
        "b3Box",
        "in"
      ]
    },
    {
      "from": [
        "b3Box",
        "out"
      ],
      "to": [
        "blkStoreys",
        "in"
      ]
    },
    {
      "from": [
        "blkStoreys",
        "out"
      ],
      "to": [
        "blkWall",
        "in"
      ]
    },
    {
      "from": [
        "blkWall",
        "out"
      ],
      "to": [
        "blkRoof",
        "in"
      ]
    },
    {
      "from": [
        "blkRoof",
        "out"
      ],
      "to": [
        "blkExt",
        "in"
      ]
    },
    {
      "from": [
        "blkExt",
        "out"
      ],
      "to": [
        "blkInset",
        "in"
      ]
    },
    {
      "from": [
        "blkInset",
        "out"
      ],
      "to": [
        "blkLow",
        "in"
      ]
    },
    {
      "from": [
        "blkLow",
        "out"
      ],
      "to": [
        "blkRoofStyle",
        "in"
      ]
    },
    {
      "from": [
        "blkRoofStyle",
        "out"
      ],
      "to": [
        "blkTrim",
        "in"
      ]
    },
    {
      "from": [
        "blkTrim",
        "out"
      ],
      "to": [
        "tierFan",
        "in"
      ]
    },
    {
      "from": [
        "tierFan",
        "out"
      ],
      "to": [
        "tierTop",
        "in"
      ]
    },
    {
      "from": [
        "tierTop",
        "out"
      ],
      "to": [
        "tierSt",
        "in"
      ]
    },
    {
      "from": [
        "tierSt",
        "out"
      ],
      "to": [
        "tierBox",
        "in"
      ]
    },
    {
      "from": [
        "tierBox",
        "out"
      ],
      "to": [
        "stFan",
        "in"
      ]
    },
    {
      "from": [
        "stFan",
        "out"
      ],
      "to": [
        "stLevel",
        "in"
      ]
    },
    {
      "from": [
        "stLevel",
        "out"
      ],
      "to": [
        "stBox",
        "in"
      ]
    },
    {
      "from": [
        "stBox",
        "out"
      ],
      "to": [
        "ptFan",
        "in"
      ]
    },
    {
      "from": [
        "ptFan",
        "out"
      ],
      "to": [
        "ptBox",
        "in"
      ]
    },
    {
      "from": [
        "ptBox",
        "out"
      ],
      "to": [
        "ptWall",
        "in"
      ]
    },
    {
      "from": [
        "ptWall",
        "out"
      ],
      "to": [
        "ptDoorWall",
        "in"
      ]
    },
    {
      "from": [
        "ptDoorWall",
        "out"
      ],
      "to": [
        "slabs",
        "in"
      ]
    },
    {
      "from": [
        "slabs",
        "out"
      ],
      "to": [
        "slabKind",
        "in"
      ]
    },
    {
      "from": [
        "ptDoorWall",
        "out"
      ],
      "to": [
        "walls",
        "in"
      ]
    },
    {
      "from": [
        "tierBox",
        "out"
      ],
      "to": [
        "ceilBox",
        "in"
      ]
    },
    {
      "from": [
        "ceilBox",
        "out"
      ],
      "to": [
        "ceilKind",
        "in"
      ]
    },
    {
      "from": [
        "walls",
        "out"
      ],
      "to": [
        "wAlong",
        "in"
      ]
    },
    {
      "from": [
        "wAlong",
        "out"
      ],
      "to": [
        "wLen",
        "in"
      ]
    },
    {
      "from": [
        "wLen",
        "out"
      ],
      "to": [
        "wBays",
        "in"
      ]
    },
    {
      "from": [
        "wBays",
        "out"
      ],
      "to": [
        "wStart",
        "in"
      ]
    },
    {
      "from": [
        "wStart",
        "out"
      ],
      "to": [
        "bayFan",
        "in"
      ]
    },
    {
      "from": [
        "probe",
        "out"
      ],
      "to": [
        "probeAlong",
        "in"
      ]
    },
    {
      "from": [
        "probeAlong",
        "out"
      ],
      "to": [
        "covered",
        "path"
      ]
    },
    {
      "from": [
        "occluder",
        "out"
      ],
      "to": [
        "covered",
        "boxes"
      ]
    },
    {
      "from": [
        "bayFan",
        "out"
      ],
      "to": [
        "bayA",
        "in"
      ]
    },
    {
      "from": [
        "bayA",
        "out"
      ],
      "to": [
        "bayB",
        "in"
      ]
    },
    {
      "from": [
        "bayB",
        "out"
      ],
      "to": [
        "bayBox",
        "in"
      ]
    },
    {
      "from": [
        "bayBox",
        "out"
      ],
      "to": [
        "bayDoor",
        "in"
      ]
    },
    {
      "from": [
        "bayDoor",
        "out"
      ],
      "to": [
        "opW",
        "in"
      ]
    },
    {
      "from": [
        "opW",
        "out"
      ],
      "to": [
        "opA",
        "in"
      ]
    },
    {
      "from": [
        "opA",
        "out"
      ],
      "to": [
        "opB",
        "in"
      ]
    },
    {
      "from": [
        "opB",
        "out"
      ],
      "to": [
        "winRoll",
        "in"
      ]
    },
    {
      "from": [
        "winRoll",
        "out"
      ],
      "to": [
        "probe",
        "in"
      ]
    },
    {
      "from": [
        "covered",
        "out"
      ],
      "to": [
        "bayKind",
        "in"
      ]
    },
    {
      "from": [
        "bayKind",
        "out"
      ],
      "to": [
        "solidBays",
        "in"
      ]
    },
    {
      "from": [
        "solidBays",
        "out"
      ],
      "to": [
        "solidKind",
        "in"
      ]
    },
    {
      "from": [
        "bayKind",
        "out"
      ],
      "to": [
        "openBays",
        "in"
      ]
    },
    {
      "from": [
        "openBays",
        "out"
      ],
      "to": [
        "opFan",
        "in"
      ]
    },
    {
      "from": [
        "opFan",
        "out"
      ],
      "to": [
        "opBox",
        "in"
      ]
    },
    {
      "from": [
        "opBox",
        "out"
      ],
      "to": [
        "opKind",
        "in"
      ]
    },
    {
      "from": [
        "tierBox",
        "out"
      ],
      "to": [
        "rfTop",
        "in"
      ]
    },
    {
      "from": [
        "rfTop",
        "out"
      ],
      "to": [
        "rfRidgeX",
        "in"
      ]
    },
    {
      "from": [
        "rfRidgeX",
        "out"
      ],
      "to": [
        "rfLayerCount",
        "in"
      ]
    },
    {
      "from": [
        "rfLayerCount",
        "out"
      ],
      "to": [
        "rfLayers",
        "in"
      ]
    },
    {
      "from": [
        "rfLayers",
        "out"
      ],
      "to": [
        "rfParts",
        "in"
      ]
    },
    {
      "from": [
        "rfParts",
        "out"
      ],
      "to": [
        "rfBox",
        "in"
      ]
    },
    {
      "from": [
        "rfBox",
        "out"
      ],
      "to": [
        "rfKind",
        "in"
      ]
    },
    {
      "from": [
        "rfLayerCount",
        "out"
      ],
      "to": [
        "chimRoll",
        "in"
      ]
    },
    {
      "from": [
        "chimRoll",
        "out"
      ],
      "to": [
        "chimPick",
        "in"
      ]
    },
    {
      "from": [
        "chimPick",
        "out"
      ],
      "to": [
        "chimShadow",
        "in"
      ]
    },
    {
      "from": [
        "chimPick",
        "out"
      ],
      "to": [
        "chimBox",
        "in"
      ]
    },
    {
      "from": [
        "chimBox",
        "out"
      ],
      "to": [
        "chimKind",
        "in"
      ]
    },
    {
      "from": [
        "chimKind",
        "out"
      ],
      "to": [
        "chimFlag",
        "in"
      ]
    },
    {
      "from": [
        "tierBox",
        "out"
      ],
      "to": [
        "occPieces",
        "in"
      ]
    },
    {
      "from": [
        "rfKind",
        "out"
      ],
      "to": [
        "occPieces",
        "in"
      ]
    },
    {
      "from": [
        "chimShadow",
        "out"
      ],
      "to": [
        "occPieces",
        "in"
      ]
    },
    {
      "from": [
        "occPieces",
        "out"
      ],
      "to": [
        "occluder",
        "in"
      ]
    },
    {
      "from": [
        "lotBox",
        "out"
      ],
      "to": [
        "gBox",
        "in"
      ]
    },
    {
      "from": [
        "gBox",
        "out"
      ],
      "to": [
        "gKind",
        "in"
      ]
    },
    {
      "from": [
        "gKind",
        "out"
      ],
      "to": [
        "pieces",
        "in"
      ]
    },
    {
      "from": [
        "slabKind",
        "out"
      ],
      "to": [
        "pieces",
        "in"
      ]
    },
    {
      "from": [
        "ceilKind",
        "out"
      ],
      "to": [
        "pieces",
        "in"
      ]
    },
    {
      "from": [
        "solidKind",
        "out"
      ],
      "to": [
        "pieces",
        "in"
      ]
    },
    {
      "from": [
        "opKind",
        "out"
      ],
      "to": [
        "pieces",
        "in"
      ]
    },
    {
      "from": [
        "rfKind",
        "out"
      ],
      "to": [
        "pieces",
        "in"
      ]
    },
    {
      "from": [
        "chimFlag",
        "out"
      ],
      "to": [
        "pieces",
        "in"
      ]
    },
    {
      "from": [
        "pieces",
        "out"
      ],
      "to": [
        "tint",
        "in"
      ]
    },
    {
      "from": [
        "tint",
        "out"
      ],
      "to": [
        "bounds",
        "in"
      ]
    },
    {
      "from": [
        "bounds",
        "out"
      ],
      "to": [
        "pack",
        "in"
      ]
    },
    {
      "from": [
        "pack",
        "out"
      ],
      "to": [
        "connect",
        "in"
      ]
    },
    {
      "from": [
        "pack",
        "studs"
      ],
      "to": [
        "connect",
        "studs"
      ]
    },
    {
      "from": [
        "connect",
        "out"
      ],
      "to": [
        "vary",
        "in"
      ]
    },
    {
      "from": [
        "vary",
        "out"
      ],
      "to": [
        "shownAt",
        "in"
      ]
    },
    {
      "from": [
        "shownAt",
        "out"
      ],
      "to": [
        "built",
        "in"
      ]
    },
    {
      "from": [
        "built",
        "out"
      ],
      "to": [
        "gap",
        "in"
      ]
    },
    {
      "from": [
        "gap",
        "out"
      ],
      "to": [
        "bricks",
        "in"
      ]
    },
    {
      "from": [
        "connect",
        "studs"
      ],
      "to": [
        "studTint",
        "in"
      ]
    },
    {
      "from": [
        "vary",
        "out"
      ],
      "to": [
        "studTint",
        "source"
      ]
    },
    {
      "from": [
        "studTint",
        "out"
      ],
      "to": [
        "showing",
        "in"
      ]
    },
    {
      "from": [
        "showing",
        "out"
      ],
      "to": [
        "studs",
        "in"
      ]
    },
    {
      "from": [
        "showing",
        "out"
      ],
      "to": [
        "potStuds",
        "in"
      ]
    },
    {
      "from": [
        "potStuds",
        "out"
      ],
      "to": [
        "potTint",
        "in"
      ]
    },
    {
      "from": [
        "potTint",
        "out"
      ],
      "to": [
        "pots",
        "in"
      ]
    }
  ],
  "outputs": [
    {
      "id": "bricks",
      "pin": "instances",
      "name": "bricks"
    },
    {
      "id": "studs",
      "pin": "instances",
      "name": "studs"
    },
    {
      "id": "brickMesh",
      "pin": "out",
      "name": "brick",
      "role": "asset"
    },
    {
      "id": "studMesh",
      "pin": "out",
      "name": "stud",
      "role": "asset"
    },
    {
      "id": "pots",
      "pin": "instances",
      "name": "pots"
    },
    {
      "id": "potMesh",
      "pin": "out",
      "name": "pot",
      "role": "asset"
    }
  ]
}
`;export{t as n,n as t};