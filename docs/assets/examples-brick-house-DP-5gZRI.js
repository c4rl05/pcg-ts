import{t as e}from"./rolldown-runtime-DK3Fl9T5.js";var t=e({default:()=>n}),n=`{\r
  "formatVersion": 1,\r
  "seed": 1889,\r
  "meta": {\r
    "title": "A brick house split on a stud lattice and built in bricks",\r
    "description": "A SHORT TERRACE OF HOUSES DERIVED BY A SPLIT GRAMMAR ON AN INTEGER LATTICE, THEN BUILT IN BRICKS. Every terminal of the grammar is an axis-aligned box whose corners are WHOLE NUMBERS -- x and z in studs, y in plates, a plate 0.4 of a stud -- carrying a string \`kind\` (wall, glass, door, trim, roof, floor, ground, chimney) and a palette colour; \`packBricks\` turns those boxes into catalogue bricks, and the house is drawn as three instance batches: bricks, the studs left showing, and the pots on its chimneys. THE GRAMMAR IS TWO RULE TABLES, each an \`applyRules\`. A rule is a pin pair in the wrapper's body named after the label it rewrites, the label is \`kind\`, and a label no rule claims is TERMINAL -- so a piece's label is the material it is built in, and nothing relabels it into a kind afterwards. MASSING runs from the lot: \`block\` (cut in two along its longer floor axis while both halves keep \`minBlock\` studs, three rounds deep, the third only for a block still longer than 16 studs; a block not cut becomes a \`mass\`), \`mass\` (draws the block's storeys, colours, door wall, setback and trim, then cuts the air over its footprint into its ground slab, its lower tier and the rest, \`upper\`), \`upper\` (steps in by the setback and cuts into the upper tier and the roof space over the top tier), \`roofSpace\` (a declared draw: flat, else hip, else gable), and one rule for each roof style. FACADE runs from the tiers: \`tier\` (cut into storeys, each broken into its shell), \`face\` (a wall cut into bays), \`bay\` (a declared draw: an opening, or wall), \`opening\` (the pieces round a window or a door) and \`sill\`. Each rule is a chain of one to eight nodes, most of them two or three, and reading the body top to bottom is reading the grammar. Every rule application costs a round, and the wrapper's \`ruleDepth\` is the round, which is how the block rule keeps to three rounds of cutting. THE GRAMMAR CUTS. \`splitBox\` cuts a box along one axis into labelled pieces -- \`absolute\` lengths, \`relative\` shares of the rest, or a \`repeat\` of equal pieces about one module long -- every attribute riding onto every piece, and its sizes are a field resolved on the PARENT, so a decision both halves share is made once: a block's cut, \`clamp(floor(span * (0.35 + 0.3 * ruleRoll) + 0.5), minBlock, span - minBlock)\` studs from its min side, puts both halves on one integer coordinate. A label of \`\\"\\"\` is a GAP that takes its space and emits nothing, which is how a setback steps in (a gap on each lot-edge side of the upper tier) and how each layer of a pitched roof steps in (a gap of \`layer\` studs either side). A piece of no size is DROPPED, which is how one opening rule serves every opening: a door's sill and the wall under it, the sill of a block that rolled none, and a lintel that rolled none come out with no height and are not emitted, with no branch. Because a cut can only divide what is there, the lot is a column of AIR as tall as any house can stand, and a mass's storeys and roof are cut from it, the air over the roof a gap. THE PER-BLOCK DECISIONS are made in the \`mass\` rule, on the block, before it is cut, so every piece of it carries them: \`storeys\`, \`wallTint\`, \`roofTint\`, \`doorWall\`, \`inset\`, \`lowSt\` and \`trim\` (the sill and lintel rolls, and the house's plinth roll). The roof style is a DECLARED DRAW: the \`roofSpace\` rule is a string \`setAttribute\` whose \`values\` are gable, hip and flat and whose index is \`select(lt(ruleRoll, flatRoofRate), 2, lt(ruleRoll, flatRoofRate + (1 - flatRoofRate) * hipRoofRate))\`, one roll against both rates; the bay rule's opening-or-wall is the same shape, on \`windowRate\`. \`ruleRoll\` is the wrapper's own roll for each rule application. TIERS AND STOREYS. A mass is its ground slab, then the lower tier, then the upper part. A tier is a whole number of storeys, each \`storeyHeight\` plates: \`shellSplit\` breaks a storey into the CEILING slab over it, a plate over the full footprint that is the next storey's floor (or the tier's ceiling over the top storey), and the four walls under it, south and north full length and west and east between them. A SETBACK (\`setbackRate\`) steps a block of two storeys or more in above a storey drawn from the first to the one under the top, by \`inset\` studs on every side the block has on the lot edge (two where that keeps four studs a side, else one, else none and no setback), a party wall staying flush with its neighbour; the upper tier stands on the lower tier's top ceiling, which is its first floor and the terrace round it in one slab, held by the walls below and the walls above alike. Only the top tier is roofed: the roof space is cut from the upper part over the upper tier, or over the whole mass when there is no setback. ROOFS. A GABLE's layers step in one stud on the two long sides, its ridge along the long axis and the stud at each end of a layer its gable wall, in the wall's colour; a HIP's layers step in one stud on all four sides, so it closes to a ridge as long as the long side less the short, and two studs more (one for an odd short side); both rise \`roofStep\` plates a layer for \`ceil(short / 2)\` layers, cut from the roof space as a \`repeat\` of \`roofStep\` with the air over them a gap, each layer told its index in \`layer\`. A FLAT roof is the top tier's ceiling slab with a parapet on its edge, one stud thick and three plates tall, over the walls below: a \`shellSplit\` of the four walls alone. The ceiling under every roof is what lets a roof stand on a floor rather than over an empty attic. THE WALLS CARRY THEIR OWN FRAME. \`shellSplit\` writes on every wall the axis it runs along and the sign that makes it run LEFT TO RIGHT AS SEEN FROM OUTSIDE (\`alongAxis\`, \`alongSign\`), its outward normal (\`outward\`) and its face code (\`face\`: 1 south, 2 north, 3 west, 4 east), so the facade rules are written ONCE for every wall: the bay split is \`splitBox\` with axis \`perCell\` on \`alongAxis\` and \`direction\` \`alongSign\`, \`max(1, floor(len / bayWidth))\` bays snapped to whole studs, slot 0 the leftmost seen from outside; the opening is set in its bay from the left, as nearly centred as whole studs allow, \`openingWidth\` studs at most with a stud of jamb either side; and a sill stands out by adding \`outward\` to its box. The DOOR goes on the ground floor -- the storey whose walls start on the slab over the baseplate, \`box(\\"y0\\")\` = 2 -- of the first lot-edge wall, south, then north, else west, else east, in the middle bay. Every block has such a wall: a cut along one axis never moves a block off the lot edges of the other, so a block with neither a south nor a north edge was cut along z on both sides, which takes two of the three rounds, and the one left cannot cut it off both the west and the east edge; with \`minBlock\` at least 5 that side wall is three studs or more between the south and north walls, wide enough for a door bay. BOX NAMES. A field reads the box of the cell it is evaluated on by name -- \`box(\\"x0\\")\`, \`box(\\"sz\\")\`, \`box(\\"center\\")\`, \`box(\\"lo\\")\` and the rest -- so a size, an axis or a margin is written in the cell's own terms with nothing carried aside, and a split's sizes read the PARENT's box. A \`let\` names a value one field reads more than once (a wall's length, the opening it takes); like a box name, it is notation for the field written out. A WINDOW GOES ONLY WHERE A WALL IS EXPOSED, and exposure is a query, not an assumption. Blocks share party walls, and a tall block beside a low one has a wall that is covered at the bottom and open above. The \`bay\` rule asks \`boxContact\` whether a PROBE overlaps anything the massing made -- every slab, tier and roof piece, and every chimney's shadow (below), merged and fed to the facade stage as a BROADCAST input. The probe is the bay's own box carved by the node's \`marginMin\` and \`marginMax\`, fields of the bay's box names and frame: along the wall the opening's width less a quarter stud at each end, so it crosses every stud of the opening and no stud beside it; up the wall the one course where the opening starts -- for a window with a sill, the sill's course, the cells the sill stands out into; through the wall a sheet half a stud OUTSIDE its face. Bottom is enough because everything the massing makes stacks on the ground with nothing overhanging, so if the bottom of the opening is free, every course above it is. This is why the grammar is two stages: a query reads an EARLIER stage, never the frontier still being rewritten. A CHIMNEY (\`chimneyRate\`) is a stack one stud by two, its long side along the ridge, rising four plates past the top of its roof, with a pot on each of its two top studs. It is PLACED rather than cut -- it stands in the air beside the upper layers of a roof, a box no split of the roof space makes -- so it is read from the massing's \`trail\`, the cells each rule rewrote: every roof space the style rule took, its box the top tier's footprint from the tier's top up, is rolled, and one \`placeBox\` places the stack in it -- its size, the side it hangs from and its offset said once per axis. On a pitched roof it stands on the exposed one-stud step of a layer in the upper half below the top, front or back by a roll: every layer above that one starts a stud further in, so the stack stands on the roof and overlaps no piece, and along the ridge it keeps off a gable's end studs. On a flat roof it stands on the parapet's long side, over the wall below, which holds it. For the window query a chimney counts as its SHADOW, a second \`placeBox\` reading the same draws: the stack grown two studs every way across the roof, kept inside its tier (\`fit\` \\"clip\\"), from the tier's top up past its pots, because a stack standing a stud or two off a taller neighbour's wall is still in front of that wall's windows, past the probe half a stud out. The pots are found rather than placed: a pot goes on every showing stud of a chimney brick with nothing resting on it, so in a partial build it comes with the chimney's last course. THE FACADE TRIM is what keeps a big wall from reading flat up close: sills, lintels, a plinth, and bricks that are not all one colour. A SILL (\`sillRate\`) is a plate under a window, as wide as it, its top at \`sillHeight\`, standing one stud out from the wall face: a plate two studs deep, one row in the wall standing on the wall under it and one outside, held through the wall. Its outer studs are not drawn -- a stud on a trim brick that nothing ever rests on is dropped from the studs batch -- so it reads as a smooth ledge. A LINTEL (\`lintelRate\`) is a block over each window and door, as wide as the opening and a brick tall, less where the wall over the opening is shorter. Both are the opening's width, not wider: a bay keeps a stud of jamb either side, often only one, and trim a stud wider met the next window's and ran along the wall as a band. Sill and lintel are kind \`trim\`, in the TRIM colour: on a wall with a hue its colour darkened, and on a white or grey wall a warm sandstone, because a neutral trim on the pale glass reads as more of the pane. A PLINTH (\`plinthRate\`) lays every wall brick standing on the ground floor's slab in dark grey. Sills and lintels are rolled ONCE PER BLOCK, so every window of a block agrees; the plinth ONCE PER HOUSE, because it is laid on the packed bricks and a brick can run on across two blocks' walls of one colour. And \`brickVariation\` is the share of wall bricks laid in an OFF-SHADE of their wall's colour, half darker and half lighter. The plinth and the off-shades are coloured on the BRICKS, after the packing, each brick drawing on its own identity, so neither moves a joint; a stud takes the tint of the brick it stands on, gathered by \`transferByIndex\` through the \`brickId\` packBricks wrote on it. THE BUILD. \`packBricks\` reads the pieces' world corners -- the last \`transformBox\` scales the lattice to world units (a plate is 0.4 of a stud) and centres the lot -- keeps \`kind\` and colour apart with \`groupBy\`, and lays every wall in full bricks with the joints staggered course to course; the catalogue is the default one with the BASEPLATES appended through \`extraBricks\` -- every size of 16, 24, 32 and 40 studs a side, either way round -- and the ground is exactly one of them, one piece under the whole lot: on each axis the lot plus two studs either side, rounded up to a multiple of eight. A floor slab runs on across every block of its storey (the slabs share a kind and a colour), and neighbouring blocks each build their own wall, so a party wall is two studs thick. THE MESHES ARE THE GRAPH'S OWN: three outputs carry \`role: \\"asset\\"\`, so \`brick\` (a unit box), \`stud\` (a twelve-sided \`meshPrimitive\` cylinder, capped on top and open underneath) and \`pot\` are the meshes the three spawners' asset ids resolve to. One box serves every brick because a brick point's \`scale\` is its own-frame size and its \`rot\` the quarter turn of a brick laid sideways; a hairline gap is taken off every \`scale\` so the joints read, and the stud and pot meshes stand half that gap low so they sit on the brick as drawn. WHAT HOLDS TOGETHER is measured, not assumed. \`brickConnectivity\` numbers the pieces stud clutch alone holds together and gives every brick a build STEP: courses bottom up, a brick placed when it stands on the baseplate or grips one already placed, a plate hung under a floor placed with the floor. An upper storey's slab is ONE plate between empty rooms with walls only at its edges, so each of its plates has to reach a wall by itself; the packer answers it with plates up to 2x16, a \`bond\` reward for joining pieces, a charge for every loose plate a placement commits the build to, weighed before the score, and a HOLD SEARCH that lifts a course with a loose plate and solves the slab exactly, bounded in steps rather than time so every machine gets the same house. The grammar answers the rest: a house has a ceiling under its roof; a third split round cuts a block still longer than 16 studs, because a one-plate slab that size, an upper floor or a flat roof, was past what the hold search always solves within its budget; a flat roof is the ceiling itself with only the parapet on it; a setback's upper tier starts on the lower tier's ceiling plate rather than on a slab of its own; and a chimney on a flat roof stands on the parapet, over the wall. A brick no order could attach would get step -1, which says so: the whole build draws it, and every partial build leaves it out rather than show it hanging in air. THE \`buildStep\` PARAM shows the build as it stands after that step: bricks are kept while their step is at most it, and a stud shows once its brick is placed and until the brick resting on it is. The packer is asked for EVERY stud (\`studMode: all\`), and the studs go through \`brickConnectivity\` alongside the bricks, which writes on each stud the step of both. The param's maximum, 138, is an upper bound on how tall a house can stand, in plates, taken from every param below at the top of its range -- the ceiling over the most storeys at the tallest storey, the taller of a pitched roof and a parapet, and a chimney's rise -- and so it is the whole build for every house; the exact range for one house is the \`stepCount\` detail \`brickConnectivity\` writes. It is also the height of the lot's air column. THE OTHER PARAMS are the grammar's own numbers, each READ by name with \`param(\\"...\\")\` in the field slots that use it -- the two rule stages declare the ones their bodies read and are fed the graph's own -- so at its default every one cooks exactly what the literal it replaced did: \`storeyHeight\`, \`sillHeight\` and \`headHeight\` in plates, \`bayWidth\`, \`openingWidth\` and \`minBlock\` in studs, \`windowRate\`, \`minStoreys\` and \`maxStoreys\`, \`roofStep\`, the four rates of the roofs, chimneys and setbacks and the four of the facade trim, and the lot's range, \`lotWidthMin\`/\`lotWidthMax\` and \`lotDepthMin\`/\`lotDepthMax\`. A value that must land on the lattice is rounded where it is read, \`floor(param(\\"storeyHeight\\") + 0.5)\`, and a lot side is rounded down to an even number so the lot centres on whole studs; a max below its min reads as the min. The ranges hold jointly: every sill is below every head, and every head two plates under the lowest storey, so no combination makes an opening or a lintel of no height. Some numbers stay literals by choice -- the palette, the trim's shade and sandstone, the off-shades' two factors, a sill's one stud out and a lintel's brick of height, the cut's 0.35 + 0.3 spread, the probe's half stud, the parapet's three plates, a chimney's footprint, rise and shadow, the setback's inset, the baseplate's margin -- and some because no field reaches their slot: the lattice pitch, the baseplate sizes (\`extraBricks\`) and the stud and pot meshes, and so the brick gap. THE LOT STOPS AT 32 x 32, which stands on the largest baseplate, 40 x 40, with four studs of it showing on every side. Measured on this grammar, not assumed from the one before it: the first 2000 seeds at the default params came out in one piece, with no brick step -1 and no piece claiming a lattice cell of another material, and so did 200 seeds with every param at its maximum and 200 at its minimum, 150 on a 32 x 32 lot of four storeys, 200 on that lot under each roof style forced, and 300 each with the trim, chimneys and setbacks forced on, with them forced off and every bay a window, on an 8 x 8 lot of four storeys with chimneys and setbacks forced, and with the lowest sill under the highest head in the shortest storey.",\r
    "tags": [\r
      "examples",\r
      "structure",\r
      "topology"\r
    ]\r
  },\r
  "params": [\r
    {\r
      "name": "buildStep",\r
      "value": 138,\r
      "min": 0,\r
      "max": 138,\r
      "description": "Show the build as it stands after this many steps, counting from 0. A step is one course of the build placed bottom up, with anything hanging under a brick placed alongside it; the default and maximum, 138, is an upper bound on how tall a house can stand in plates, taken from every other param at the top of its range, so it is past every house's last step and shows the whole build -- including any brick no order can attach (step -1), which every smaller value hides rather than draw hanging in air. The exact range for one house is the stepCount detail brickConnectivity writes: steps 0 to stepCount - 1."\r
    },\r
    {\r
      "name": "storeyHeight",\r
      "value": 16,\r
      "min": 15,\r
      "max": 21,\r
      "description": "Plates from one storey's floor to the next, its one-plate floor slab included: 16 is the slab and five bricks of wall. Rounded to a whole plate."\r
    },\r
    {\r
      "name": "sillHeight",\r
      "value": 6,\r
      "min": 2,\r
      "max": 7,\r
      "description": "Plates from a storey's floor up to the bottom of every window, which is the top of its sill where it has one. Rounded to a whole plate; its range ends below headHeight's, so a window always has a height."\r
    },\r
    {\r
      "name": "headHeight",\r
      "value": 12,\r
      "min": 8,\r
      "max": 13,\r
      "description": "Plates from a storey's floor up to the top of every window and door. Rounded to a whole plate; its range ends two plates under the lowest storeyHeight, so a wall keeps at least one plate over its openings, the plate a lintel takes first."\r
    },\r
    {\r
      "name": "bayWidth",\r
      "value": 4,\r
      "min": 3,\r
      "max": 8,\r
      "description": "Target bay width in studs: a wall L studs long takes max(1, floor(L / bayWidth)) bays, cut on whole studs, and each bay holds at most one window or door."\r
    },\r
    {\r
      "name": "openingWidth",\r
      "value": 2,\r
      "min": 1,\r
      "max": 4,\r
      "description": "Widest window or door, in studs, rounded to a whole stud; a bay keeps at least a stud of wall either side, so a narrower bay takes a narrower opening."\r
    },\r
    {\r
      "name": "windowRate",\r
      "value": 0.8,\r
      "min": 0,\r
      "max": 1,\r
      "description": "Chance that a bay wide enough for an opening, and exposed, takes a window rather than staying solid wall. Doors do not roll."\r
    },\r
    {\r
      "name": "sillRate",\r
      "value": 0.75,\r
      "min": 0,\r
      "max": 1,\r
      "description": "Chance that a block's windows have SILLS: under each window a plate as wide as the window, its top at sillHeight, standing one stud out from the wall face, in the block's trim colour (its wall colour darkened, or a warm sandstone on a white or grey wall). The studs on its outer row are not drawn, so it reads as a smooth ledge. A window with a sill opens only where the cells the sill stands out into are clear as well. Doors have none. Rolled per block, so every window of a block agrees."\r
    },\r
    {\r
      "name": "lintelRate",\r
      "value": 0.75,\r
      "min": 0,\r
      "max": 1,\r
      "description": "Chance that a block's windows and doors have LINTELS: over each opening a block of the trim colour as wide as the opening and a brick tall, less where the wall over the opening is shorter. Rolled per block."\r
    },\r
    {\r
      "name": "plinthRate",\r
      "value": 0.5,\r
      "min": 0,\r
      "max": 1,\r
      "description": "Chance that the house stands on a PLINTH: every wall brick whose bottom is the ground floor's bottom course, round every block, laid in dark grey. Rolled once for the whole house, not per block: it is laid on the packed bricks, and a brick can run on across the walls of two blocks of one colour, so a roll per block would spill into a neighbour that had none."\r
    },\r
    {\r
      "name": "brickVariation",\r
      "value": 0.15,\r
      "min": 0,\r
      "max": 1,\r
      "description": "Share of wall bricks laid in an OFF-SHADE of their wall's colour, drawn brick by brick: half of them darker (0.88 of the colour), half lighter (1.1 of it, each channel capped at 1). Applied to the packed bricks, so it never moves a joint, and a brick's studs take its shade. 0 lays every wall in one colour."\r
    },\r
    {\r
      "name": "minBlock",\r
      "value": 6,\r
      "min": 5,\r
      "max": 9,\r
      "description": "Smallest side, in studs, a split may leave: a block is cut in two only when both halves are at least this wide, in each of three rounds (the third only cuts a block longer than 16 studs). Rounded to a whole stud. It starts at 5 so that a block with no south or north lot edge, whose door goes on a side wall between them, has a wall at least three studs long for it."\r
    },\r
    {\r
      "name": "minStoreys",\r
      "value": 1,\r
      "min": 1,\r
      "max": 4,\r
      "description": "Fewest storeys a block draws. Rounded; a maxStoreys below it reads as this."\r
    },\r
    {\r
      "name": "maxStoreys",\r
      "value": 3,\r
      "min": 1,\r
      "max": 4,\r
      "description": "Most storeys a block draws: each block takes a whole number uniformly from minStoreys to this."\r
    },\r
    {\r
      "name": "roofStep",\r
      "value": 2,\r
      "min": 1,\r
      "max": 3,\r
      "description": "Plates each layer of a pitched roof rises while it steps in one stud: on both long sides for a gable, on all four for a hip. Rounded to a whole plate."\r
    },\r
    {\r
      "name": "flatRoofRate",\r
      "value": 0.25,\r
      "min": 0,\r
      "max": 1,\r
      "description": "Chance that a block's roof is flat: its ceiling slab, grey like every floor, with a parapet on the edge one stud thick and three plates tall, the parapet in the roof's colour. Drawn first; a block that does not take it has a pitched roof."\r
    },\r
    {\r
      "name": "hipRoofRate",\r
      "value": 0.4,\r
      "min": 0,\r
      "max": 1,\r
      "description": "Chance that a pitched roof is a hip, stepping in on all four sides, rather than a gable, stepping in on the two long sides between gable ends. 0 makes every pitched roof a gable."\r
    },\r
    {\r
      "name": "chimneyRate",\r
      "value": 0.5,\r
      "min": 0,\r
      "max": 1,\r
      "description": "Chance that a block's roof has a chimney: a stack one stud by two rising from a roof step (from the parapet on a flat roof) four plates past the roof's top, with a pot on each of its two top studs."\r
    },\r
    {\r
      "name": "setbackRate",\r
      "value": 0.35,\r
      "min": 0,\r
      "max": 1,\r
      "description": "Chance that a block of two storeys or more steps its upper storeys in from the storeys below, on the sides it has on the lot edge, leaving a terrace; the roof stands on the upper storeys. A block with no lot-edge side, or too small to step in and keep four studs a side, never does."\r
    },\r
    {\r
      "name": "lotWidthMin",\r
      "value": 14,\r
      "min": 8,\r
      "max": 32,\r
      "description": "Narrowest lot, along x, in studs, rounded down to an even number so the lot centres on whole studs. The baseplate grows with the lot, keeping at least two studs of it on every side."\r
    },\r
    {\r
      "name": "lotWidthMax",\r
      "value": 26,\r
      "min": 8,\r
      "max": 32,\r
      "description": "Widest lot, along x, in studs: the width is drawn in even steps from lotWidthMin to this, and a value below the min reads as the min."\r
    },\r
    {\r
      "name": "lotDepthMin",\r
      "value": 10,\r
      "min": 8,\r
      "max": 32,\r
      "description": "Shallowest lot, along z, in studs, rounded down to an even number."\r
    },\r
    {\r
      "name": "lotDepthMax",\r
      "value": 18,\r
      "min": 8,\r
      "max": 32,\r
      "description": "Deepest lot, along z, in studs: the depth is drawn in even steps from lotDepthMin to this, and a value below the min reads as the min."\r
    }\r
  ],\r
  "nodes": [\r
    {\r
      "id": "lotPt",\r
      "type": "pointLine",\r
      "params": {\r
        "mode": "endpoints",\r
        "count": 1,\r
        "start": [\r
          0,\r
          0,\r
          0\r
        ],\r
        "end": [\r
          0,\r
          0,\r
          0\r
        ],\r
        "includeEnd": true,\r
        "spacing": 1\r
      }\r
    },\r
    {\r
      "id": "lotSize",\r
      "type": "setAttribute",\r
      "params": {\r
        "name": "lot",\r
        "domain": "point",\r
        "type": "f32",\r
        "tupleSize": 3,\r
        "value": {\r
          "fn": "let",\r
          "bind": {\r
            "w0": {\r
              "fn": "mul",\r
              "args": [\r
                2,\r
                {\r
                  "fn": "floor",\r
                  "args": [\r
                    {\r
                      "fn": "div",\r
                      "args": [\r
                        {\r
                          "fn": "param",\r
                          "name": "lotWidthMin"\r
                        },\r
                        2\r
                      ]\r
                    }\r
                  ]\r
                }\r
              ]\r
            },\r
            "w1": {\r
              "fn": "mul",\r
              "args": [\r
                2,\r
                {\r
                  "fn": "floor",\r
                  "args": [\r
                    {\r
                      "fn": "div",\r
                      "args": [\r
                        {\r
                          "fn": "param",\r
                          "name": "lotWidthMax"\r
                        },\r
                        2\r
                      ]\r
                    }\r
                  ]\r
                }\r
              ]\r
            },\r
            "d0": {\r
              "fn": "mul",\r
              "args": [\r
                2,\r
                {\r
                  "fn": "floor",\r
                  "args": [\r
                    {\r
                      "fn": "div",\r
                      "args": [\r
                        {\r
                          "fn": "param",\r
                          "name": "lotDepthMin"\r
                        },\r
                        2\r
                      ]\r
                    }\r
                  ]\r
                }\r
              ]\r
            },\r
            "d1": {\r
              "fn": "mul",\r
              "args": [\r
                2,\r
                {\r
                  "fn": "floor",\r
                  "args": [\r
                    {\r
                      "fn": "div",\r
                      "args": [\r
                        {\r
                          "fn": "param",\r
                          "name": "lotDepthMax"\r
                        },\r
                        2\r
                      ]\r
                    }\r
                  ]\r
                }\r
              ]\r
            }\r
          },\r
          "args": [\r
            {\r
              "fn": "vec",\r
              "args": [\r
                {\r
                  "fn": "add",\r
                  "args": [\r
                    {\r
                      "fn": "var",\r
                      "name": "w0"\r
                    },\r
                    {\r
                      "fn": "mul",\r
                      "args": [\r
                        2,\r
                        {\r
                          "fn": "floor",\r
                          "args": [\r
                            {\r
                              "fn": "mul",\r
                              "args": [\r
                                {\r
                                  "fn": "randomField",\r
                                  "key": "w"\r
                                },\r
                                {\r
                                  "fn": "add",\r
                                  "args": [\r
                                    {\r
                                      "fn": "max",\r
                                      "args": [\r
                                        0,\r
                                        {\r
                                          "fn": "div",\r
                                          "args": [\r
                                            {\r
                                              "fn": "sub",\r
                                              "args": [\r
                                                {\r
                                                  "fn": "var",\r
                                                  "name": "w1"\r
                                                },\r
                                                {\r
                                                  "fn": "var",\r
                                                  "name": "w0"\r
                                                }\r
                                              ]\r
                                            },\r
                                            2\r
                                          ]\r
                                        }\r
                                      ]\r
                                    },\r
                                    0.999\r
                                  ]\r
                                }\r
                              ]\r
                            }\r
                          ]\r
                        }\r
                      ]\r
                    }\r
                  ]\r
                },\r
                0,\r
                {\r
                  "fn": "add",\r
                  "args": [\r
                    {\r
                      "fn": "var",\r
                      "name": "d0"\r
                    },\r
                    {\r
                      "fn": "mul",\r
                      "args": [\r
                        2,\r
                        {\r
                          "fn": "floor",\r
                          "args": [\r
                            {\r
                              "fn": "mul",\r
                              "args": [\r
                                {\r
                                  "fn": "randomField",\r
                                  "key": "d"\r
                                },\r
                                {\r
                                  "fn": "add",\r
                                  "args": [\r
                                    {\r
                                      "fn": "max",\r
                                      "args": [\r
                                        0,\r
                                        {\r
                                          "fn": "div",\r
                                          "args": [\r
                                            {\r
                                              "fn": "sub",\r
                                              "args": [\r
                                                {\r
                                                  "fn": "var",\r
                                                  "name": "d1"\r
                                                },\r
                                                {\r
                                                  "fn": "var",\r
                                                  "name": "d0"\r
                                                }\r
                                              ]\r
                                            },\r
                                            2\r
                                          ]\r
                                        }\r
                                      ]\r
                                    },\r
                                    0.999\r
                                  ]\r
                                }\r
                              ]\r
                            }\r
                          ]\r
                        }\r
                      ]\r
                    }\r
                  ]\r
                }\r
              ]\r
            }\r
          ]\r
        },\r
        "select": 0,\r
        "values": [],\r
        "weights": [],\r
        "stringValue": "",\r
        "seed": 0\r
      }\r
    },\r
    {\r
      "id": "lotBox",\r
      "type": "offsetBox",\r
      "params": {\r
        "margin": [\r
          0,\r
          0,\r
          0\r
        ],\r
        "marginMin": [\r
          0,\r
          -1,\r
          0\r
        ],\r
        "marginMax": {\r
          "fn": "add",\r
          "args": [\r
            {\r
              "fn": "attribute",\r
              "name": "lot",\r
              "tupleSize": 3\r
            },\r
            [\r
              0,\r
              139,\r
              0\r
            ]\r
          ]\r
        },\r
        "frame": "world",\r
        "alongAxisAttr": "alongAxis",\r
        "alongSignAttr": "alongSign",\r
        "outwardAttr": "outward",\r
        "snap": [\r
          0,\r
          0,\r
          0\r
        ],\r
        "snapTo": "lattice",\r
        "snapMode": "round",\r
        "fit": "error",\r
        "where": 1\r
      }\r
    },\r
    {\r
      "id": "lotPlinth",\r
      "type": "setAttribute",\r
      "params": {\r
        "name": "plinth",\r
        "domain": "point",\r
        "type": "f32",\r
        "tupleSize": 1,\r
        "value": {\r
          "fn": "lt",\r
          "args": [\r
            {\r
              "fn": "randomField",\r
              "key": "plinth"\r
            },\r
            {\r
              "fn": "param",\r
              "name": "plinthRate"\r
            }\r
          ]\r
        },\r
        "select": 0,\r
        "values": [],\r
        "weights": [],\r
        "stringValue": "",\r
        "seed": 0\r
      }\r
    },\r
    {\r
      "id": "lotKind",\r
      "type": "setAttribute",\r
      "params": {\r
        "name": "kind",\r
        "domain": "point",\r
        "type": "string",\r
        "tupleSize": 1,\r
        "value": 0,\r
        "select": 0,\r
        "values": [],\r
        "weights": [],\r
        "stringValue": "block",\r
        "seed": 0\r
      }\r
    },\r
    {\r
      "id": "massing",\r
      "type": "applyRules",\r
      "params": {\r
        "storeyHeight": {\r
          "fn": "param",\r
          "name": "storeyHeight"\r
        },\r
        "sillRate": {\r
          "fn": "param",\r
          "name": "sillRate"\r
        },\r
        "lintelRate": {\r
          "fn": "param",\r
          "name": "lintelRate"\r
        },\r
        "minBlock": {\r
          "fn": "param",\r
          "name": "minBlock"\r
        },\r
        "minStoreys": {\r
          "fn": "param",\r
          "name": "minStoreys"\r
        },\r
        "maxStoreys": {\r
          "fn": "param",\r
          "name": "maxStoreys"\r
        },\r
        "roofStep": {\r
          "fn": "param",\r
          "name": "roofStep"\r
        },\r
        "flatRoofRate": {\r
          "fn": "param",\r
          "name": "flatRoofRate"\r
        },\r
        "hipRoofRate": {\r
          "fn": "param",\r
          "name": "hipRoofRate"\r
        },\r
        "setbackRate": {\r
          "fn": "param",\r
          "name": "setbackRate"\r
        },\r
        "maxDepth": 32,\r
        "labelAttr": "kind",\r
        "depthAttr": "ruleDepth",\r
        "rollAttr": "ruleRoll",\r
        "parentAttr": "ruleParent",\r
        "scoped": [],\r
        "scopeOf": []\r
      },\r
      "subgraph": {\r
        "graph": {\r
          "formatVersion": 1,\r
          "seed": 0,\r
          "nodes": [\r
            {\r
              "id": "canSplit",\r
              "type": "setAttribute",\r
              "params": {\r
                "name": "kind",\r
                "domain": "point",\r
                "type": "string",\r
                "tupleSize": 1,\r
                "value": {\r
                  "fn": "let",\r
                  "bind": {\r
                    "span": {\r
                      "fn": "max",\r
                      "args": [\r
                        {\r
                          "fn": "box",\r
                          "name": "sx"\r
                        },\r
                        {\r
                          "fn": "box",\r
                          "name": "sz"\r
                        }\r
                      ]\r
                    },\r
                    "mb": {\r
                      "fn": "floor",\r
                      "args": [\r
                        {\r
                          "fn": "add",\r
                          "args": [\r
                            {\r
                              "fn": "param",\r
                              "name": "minBlock"\r
                            },\r
                            0.5\r
                          ]\r
                        }\r
                      ]\r
                    },\r
                    "d": {\r
                      "fn": "attribute",\r
                      "name": "ruleDepth"\r
                    }\r
                  },\r
                  "args": [\r
                    {\r
                      "fn": "mul",\r
                      "args": [\r
                        {\r
                          "fn": "mul",\r
                          "args": [\r
                            {\r
                              "fn": "ge",\r
                              "args": [\r
                                {\r
                                  "fn": "var",\r
                                  "name": "span"\r
                                },\r
                                {\r
                                  "fn": "mul",\r
                                  "args": [\r
                                    2,\r
                                    {\r
                                      "fn": "var",\r
                                      "name": "mb"\r
                                    }\r
                                  ]\r
                                }\r
                              ]\r
                            },\r
                            {\r
                              "fn": "lt",\r
                              "args": [\r
                                {\r
                                  "fn": "var",\r
                                  "name": "d"\r
                                },\r
                                3\r
                              ]\r
                            }\r
                          ]\r
                        },\r
                        {\r
                          "fn": "max",\r
                          "args": [\r
                            {\r
                              "fn": "lt",\r
                              "args": [\r
                                {\r
                                  "fn": "var",\r
                                  "name": "d"\r
                                },\r
                                2\r
                              ]\r
                            },\r
                            {\r
                              "fn": "gt",\r
                              "args": [\r
                                {\r
                                  "fn": "var",\r
                                  "name": "span"\r
                                },\r
                                16\r
                              ]\r
                            }\r
                          ]\r
                        }\r
                      ]\r
                    }\r
                  ]\r
                },\r
                "select": 0,\r
                "values": [\r
                  "mass",\r
                  "block"\r
                ],\r
                "weights": [],\r
                "stringValue": "",\r
                "seed": 0\r
              }\r
            },\r
            {\r
              "id": "halve",\r
              "type": "splitBox",\r
              "params": {\r
                "axis": "perCell",\r
                "axisIndex": {\r
                  "fn": "select",\r
                  "args": [\r
                    {\r
                      "fn": "ge",\r
                      "args": [\r
                        {\r
                          "fn": "box",\r
                          "name": "sx"\r
                        },\r
                        {\r
                          "fn": "box",\r
                          "name": "sz"\r
                        }\r
                      ]\r
                    },\r
                    0,\r
                    2\r
                  ]\r
                },\r
                "labels": [\r
                  "block",\r
                  "block"\r
                ],\r
                "sizes": {\r
                  "fn": "let",\r
                  "bind": {\r
                    "span": {\r
                      "fn": "max",\r
                      "args": [\r
                        {\r
                          "fn": "box",\r
                          "name": "sx"\r
                        },\r
                        {\r
                          "fn": "box",\r
                          "name": "sz"\r
                        }\r
                      ]\r
                    },\r
                    "mb": {\r
                      "fn": "floor",\r
                      "args": [\r
                        {\r
                          "fn": "add",\r
                          "args": [\r
                            {\r
                              "fn": "param",\r
                              "name": "minBlock"\r
                            },\r
                            0.5\r
                          ]\r
                        }\r
                      ]\r
                    }\r
                  },\r
                  "args": [\r
                    {\r
                      "fn": "vec",\r
                      "args": [\r
                        {\r
                          "fn": "clamp",\r
                          "args": [\r
                            {\r
                              "fn": "floor",\r
                              "args": [\r
                                {\r
                                  "fn": "add",\r
                                  "args": [\r
                                    {\r
                                      "fn": "mul",\r
                                      "args": [\r
                                        {\r
                                          "fn": "var",\r
                                          "name": "span"\r
                                        },\r
                                        {\r
                                          "fn": "add",\r
                                          "args": [\r
                                            0.35,\r
                                            {\r
                                              "fn": "mul",\r
                                              "args": [\r
                                                0.3,\r
                                                {\r
                                                  "fn": "attribute",\r
                                                  "name": "ruleRoll"\r
                                                }\r
                                              ]\r
                                            }\r
                                          ]\r
                                        }\r
                                      ]\r
                                    },\r
                                    0.5\r
                                  ]\r
                                }\r
                              ]\r
                            },\r
                            {\r
                              "fn": "var",\r
                              "name": "mb"\r
                            },\r
                            {\r
                              "fn": "sub",\r
                              "args": [\r
                                {\r
                                  "fn": "var",\r
                                  "name": "span"\r
                                },\r
                                {\r
                                  "fn": "var",\r
                                  "name": "mb"\r
                                }\r
                              ]\r
                            }\r
                          ]\r
                        },\r
                        1\r
                      ]\r
                    }\r
                  ]\r
                },\r
                "units": [\r
                  "absolute",\r
                  "relative"\r
                ],\r
                "repeatRound": "floor",\r
                "snap": [\r
                  0,\r
                  0,\r
                  0\r
                ],\r
                "snapMode": "round",\r
                "fit": "error",\r
                "direction": 1,\r
                "where": {\r
                  "fn": "attributeIs",\r
                  "name": "kind",\r
                  "value": "block"\r
                },\r
                "labelAttr": "kind",\r
                "indexAttr": "",\r
                "countAttr": ""\r
              }\r
            },\r
            {\r
              "id": "storeys",\r
              "type": "setAttribute",\r
              "params": {\r
                "name": "storeys",\r
                "domain": "point",\r
                "type": "f32",\r
                "tupleSize": 1,\r
                "value": {\r
                  "fn": "let",\r
                  "bind": {\r
                    "s0": {\r
                      "fn": "floor",\r
                      "args": [\r
                        {\r
                          "fn": "add",\r
                          "args": [\r
                            {\r
                              "fn": "param",\r
                              "name": "minStoreys"\r
                            },\r
                            0.5\r
                          ]\r
                        }\r
                      ]\r
                    }\r
                  },\r
                  "args": [\r
                    {\r
                      "fn": "add",\r
                      "args": [\r
                        {\r
                          "fn": "var",\r
                          "name": "s0"\r
                        },\r
                        {\r
                          "fn": "floor",\r
                          "args": [\r
                            {\r
                              "fn": "mul",\r
                              "args": [\r
                                {\r
                                  "fn": "randomField",\r
                                  "key": "storeys"\r
                                },\r
                                {\r
                                  "fn": "add",\r
                                  "args": [\r
                                    {\r
                                      "fn": "max",\r
                                      "args": [\r
                                        0,\r
                                        {\r
                                          "fn": "sub",\r
                                          "args": [\r
                                            {\r
                                              "fn": "floor",\r
                                              "args": [\r
                                                {\r
                                                  "fn": "add",\r
                                                  "args": [\r
                                                    {\r
                                                      "fn": "param",\r
                                                      "name": "maxStoreys"\r
                                                    },\r
                                                    0.5\r
                                                  ]\r
                                                }\r
                                              ]\r
                                            },\r
                                            {\r
                                              "fn": "var",\r
                                              "name": "s0"\r
                                            }\r
                                          ]\r
                                        }\r
                                      ]\r
                                    },\r
                                    0.999\r
                                  ]\r
                                }\r
                              ]\r
                            }\r
                          ]\r
                        }\r
                      ]\r
                    }\r
                  ]\r
                },\r
                "select": 0,\r
                "values": [],\r
                "weights": [],\r
                "stringValue": "",\r
                "seed": 0\r
              }\r
            },\r
            {\r
              "id": "wallTint",\r
              "type": "setAttribute",\r
              "params": {\r
                "name": "wallTint",\r
                "domain": "point",\r
                "type": "f32",\r
                "tupleSize": 1,\r
                "value": {\r
                  "fn": "floor",\r
                  "args": [\r
                    {\r
                      "fn": "mul",\r
                      "args": [\r
                        {\r
                          "fn": "randomField",\r
                          "key": "wallTint"\r
                        },\r
                        4.999\r
                      ]\r
                    }\r
                  ]\r
                },\r
                "select": 0,\r
                "values": [],\r
                "weights": [],\r
                "stringValue": "",\r
                "seed": 0\r
              }\r
            },\r
            {\r
              "id": "roofTint",\r
              "type": "setAttribute",\r
              "params": {\r
                "name": "roofTint",\r
                "domain": "point",\r
                "type": "f32",\r
                "tupleSize": 1,\r
                "value": {\r
                  "fn": "floor",\r
                  "args": [\r
                    {\r
                      "fn": "mul",\r
                      "args": [\r
                        {\r
                          "fn": "randomField",\r
                          "key": "roofTint"\r
                        },\r
                        2.999\r
                      ]\r
                    }\r
                  ]\r
                },\r
                "select": 0,\r
                "values": [],\r
                "weights": [],\r
                "stringValue": "",\r
                "seed": 0\r
              }\r
            },\r
            {\r
              "id": "doorWall",\r
              "type": "setAttribute",\r
              "params": {\r
                "name": "doorWall",\r
                "domain": "point",\r
                "type": "f32",\r
                "tupleSize": 1,\r
                "value": {\r
                  "fn": "let",\r
                  "bind": {\r
                    "w": {\r
                      "fn": "eq",\r
                      "args": [\r
                        {\r
                          "fn": "box",\r
                          "name": "x0"\r
                        },\r
                        0\r
                      ]\r
                    },\r
                    "e": {\r
                      "fn": "eq",\r
                      "args": [\r
                        {\r
                          "fn": "box",\r
                          "name": "x1"\r
                        },\r
                        {\r
                          "fn": "component",\r
                          "args": [\r
                            {\r
                              "fn": "attribute",\r
                              "name": "lot",\r
                              "tupleSize": 3\r
                            }\r
                          ],\r
                          "index": 0\r
                        }\r
                      ]\r
                    },\r
                    "s": {\r
                      "fn": "eq",\r
                      "args": [\r
                        {\r
                          "fn": "box",\r
                          "name": "z0"\r
                        },\r
                        0\r
                      ]\r
                    },\r
                    "n": {\r
                      "fn": "eq",\r
                      "args": [\r
                        {\r
                          "fn": "box",\r
                          "name": "z1"\r
                        },\r
                        {\r
                          "fn": "component",\r
                          "args": [\r
                            {\r
                              "fn": "attribute",\r
                              "name": "lot",\r
                              "tupleSize": 3\r
                            }\r
                          ],\r
                          "index": 2\r
                        }\r
                      ]\r
                    }\r
                  },\r
                  "args": [\r
                    {\r
                      "fn": "select",\r
                      "args": [\r
                        {\r
                          "fn": "var",\r
                          "name": "s"\r
                        },\r
                        1,\r
                        {\r
                          "fn": "select",\r
                          "args": [\r
                            {\r
                              "fn": "var",\r
                              "name": "n"\r
                            },\r
                            2,\r
                            {\r
                              "fn": "select",\r
                              "args": [\r
                                {\r
                                  "fn": "var",\r
                                  "name": "w"\r
                                },\r
                                3,\r
                                {\r
                                  "fn": "mul",\r
                                  "args": [\r
                                    4,\r
                                    {\r
                                      "fn": "var",\r
                                      "name": "e"\r
                                    }\r
                                  ]\r
                                }\r
                              ]\r
                            }\r
                          ]\r
                        }\r
                      ]\r
                    }\r
                  ]\r
                },\r
                "select": 0,\r
                "values": [],\r
                "weights": [],\r
                "stringValue": "",\r
                "seed": 0\r
              }\r
            },\r
            {\r
              "id": "inset",\r
              "type": "setAttribute",\r
              "params": {\r
                "name": "inset",\r
                "domain": "point",\r
                "type": "f32",\r
                "tupleSize": 1,\r
                "value": {\r
                  "fn": "let",\r
                  "bind": {\r
                    "w": {\r
                      "fn": "eq",\r
                      "args": [\r
                        {\r
                          "fn": "box",\r
                          "name": "x0"\r
                        },\r
                        0\r
                      ]\r
                    },\r
                    "e": {\r
                      "fn": "eq",\r
                      "args": [\r
                        {\r
                          "fn": "box",\r
                          "name": "x1"\r
                        },\r
                        {\r
                          "fn": "component",\r
                          "args": [\r
                            {\r
                              "fn": "attribute",\r
                              "name": "lot",\r
                              "tupleSize": 3\r
                            }\r
                          ],\r
                          "index": 0\r
                        }\r
                      ]\r
                    },\r
                    "s": {\r
                      "fn": "eq",\r
                      "args": [\r
                        {\r
                          "fn": "box",\r
                          "name": "z0"\r
                        },\r
                        0\r
                      ]\r
                    },\r
                    "n": {\r
                      "fn": "eq",\r
                      "args": [\r
                        {\r
                          "fn": "box",\r
                          "name": "z1"\r
                        },\r
                        {\r
                          "fn": "component",\r
                          "args": [\r
                            {\r
                              "fn": "attribute",\r
                              "name": "lot",\r
                              "tupleSize": 3\r
                            }\r
                          ],\r
                          "index": 2\r
                        }\r
                      ]\r
                    }\r
                  },\r
                  "args": [\r
                    {\r
                      "fn": "mul",\r
                      "args": [\r
                        {\r
                          "fn": "gt",\r
                          "args": [\r
                            {\r
                              "fn": "add",\r
                              "args": [\r
                                {\r
                                  "fn": "add",\r
                                  "args": [\r
                                    {\r
                                      "fn": "add",\r
                                      "args": [\r
                                        {\r
                                          "fn": "var",\r
                                          "name": "w"\r
                                        },\r
                                        {\r
                                          "fn": "var",\r
                                          "name": "e"\r
                                        }\r
                                      ]\r
                                    },\r
                                    {\r
                                      "fn": "var",\r
                                      "name": "s"\r
                                    }\r
                                  ]\r
                                },\r
                                {\r
                                  "fn": "var",\r
                                  "name": "n"\r
                                }\r
                              ]\r
                            },\r
                            0\r
                          ]\r
                        },\r
                        {\r
                          "fn": "select",\r
                          "args": [\r
                            {\r
                              "fn": "mul",\r
                              "args": [\r
                                {\r
                                  "fn": "ge",\r
                                  "args": [\r
                                    {\r
                                      "fn": "sub",\r
                                      "args": [\r
                                        {\r
                                          "fn": "box",\r
                                          "name": "sx"\r
                                        },\r
                                        {\r
                                          "fn": "mul",\r
                                          "args": [\r
                                            2,\r
                                            {\r
                                              "fn": "add",\r
                                              "args": [\r
                                                {\r
                                                  "fn": "var",\r
                                                  "name": "w"\r
                                                },\r
                                                {\r
                                                  "fn": "var",\r
                                                  "name": "e"\r
                                                }\r
                                              ]\r
                                            }\r
                                          ]\r
                                        }\r
                                      ]\r
                                    },\r
                                    4\r
                                  ]\r
                                },\r
                                {\r
                                  "fn": "ge",\r
                                  "args": [\r
                                    {\r
                                      "fn": "sub",\r
                                      "args": [\r
                                        {\r
                                          "fn": "box",\r
                                          "name": "sz"\r
                                        },\r
                                        {\r
                                          "fn": "mul",\r
                                          "args": [\r
                                            2,\r
                                            {\r
                                              "fn": "add",\r
                                              "args": [\r
                                                {\r
                                                  "fn": "var",\r
                                                  "name": "s"\r
                                                },\r
                                                {\r
                                                  "fn": "var",\r
                                                  "name": "n"\r
                                                }\r
                                              ]\r
                                            }\r
                                          ]\r
                                        }\r
                                      ]\r
                                    },\r
                                    4\r
                                  ]\r
                                }\r
                              ]\r
                            },\r
                            2,\r
                            {\r
                              "fn": "mul",\r
                              "args": [\r
                                {\r
                                  "fn": "ge",\r
                                  "args": [\r
                                    {\r
                                      "fn": "sub",\r
                                      "args": [\r
                                        {\r
                                          "fn": "box",\r
                                          "name": "sx"\r
                                        },\r
                                        {\r
                                          "fn": "add",\r
                                          "args": [\r
                                            {\r
                                              "fn": "var",\r
                                              "name": "w"\r
                                            },\r
                                            {\r
                                              "fn": "var",\r
                                              "name": "e"\r
                                            }\r
                                          ]\r
                                        }\r
                                      ]\r
                                    },\r
                                    4\r
                                  ]\r
                                },\r
                                {\r
                                  "fn": "ge",\r
                                  "args": [\r
                                    {\r
                                      "fn": "sub",\r
                                      "args": [\r
                                        {\r
                                          "fn": "box",\r
                                          "name": "sz"\r
                                        },\r
                                        {\r
                                          "fn": "add",\r
                                          "args": [\r
                                            {\r
                                              "fn": "var",\r
                                              "name": "s"\r
                                            },\r
                                            {\r
                                              "fn": "var",\r
                                              "name": "n"\r
                                            }\r
                                          ]\r
                                        }\r
                                      ]\r
                                    },\r
                                    4\r
                                  ]\r
                                }\r
                              ]\r
                            }\r
                          ]\r
                        }\r
                      ]\r
                    }\r
                  ]\r
                },\r
                "select": 0,\r
                "values": [],\r
                "weights": [],\r
                "stringValue": "",\r
                "seed": 0\r
              }\r
            },\r
            {\r
              "id": "lowSt",\r
              "type": "setAttribute",\r
              "params": {\r
                "name": "lowSt",\r
                "domain": "point",\r
                "type": "f32",\r
                "tupleSize": 1,\r
                "value": {\r
                  "fn": "let",\r
                  "bind": {\r
                    "s": {\r
                      "fn": "attribute",\r
                      "name": "storeys"\r
                    }\r
                  },\r
                  "args": [\r
                    {\r
                      "fn": "select",\r
                      "args": [\r
                        {\r
                          "fn": "mul",\r
                          "args": [\r
                            {\r
                              "fn": "mul",\r
                              "args": [\r
                                {\r
                                  "fn": "lt",\r
                                  "args": [\r
                                    {\r
                                      "fn": "randomField",\r
                                      "key": "setback"\r
                                    },\r
                                    {\r
                                      "fn": "param",\r
                                      "name": "setbackRate"\r
                                    }\r
                                  ]\r
                                },\r
                                {\r
                                  "fn": "ge",\r
                                  "args": [\r
                                    {\r
                                      "fn": "var",\r
                                      "name": "s"\r
                                    },\r
                                    2\r
                                  ]\r
                                }\r
                              ]\r
                            },\r
                            {\r
                              "fn": "gt",\r
                              "args": [\r
                                {\r
                                  "fn": "attribute",\r
                                  "name": "inset"\r
                                },\r
                                0\r
                              ]\r
                            }\r
                          ]\r
                        },\r
                        {\r
                          "fn": "add",\r
                          "args": [\r
                            1,\r
                            {\r
                              "fn": "floor",\r
                              "args": [\r
                                {\r
                                  "fn": "mul",\r
                                  "args": [\r
                                    {\r
                                      "fn": "randomField",\r
                                      "key": "setbackAt"\r
                                    },\r
                                    {\r
                                      "fn": "sub",\r
                                      "args": [\r
                                        {\r
                                          "fn": "var",\r
                                          "name": "s"\r
                                        },\r
                                        1\r
                                      ]\r
                                    }\r
                                  ]\r
                                }\r
                              ]\r
                            }\r
                          ]\r
                        },\r
                        {\r
                          "fn": "var",\r
                          "name": "s"\r
                        }\r
                      ]\r
                    }\r
                  ]\r
                },\r
                "select": 0,\r
                "values": [],\r
                "weights": [],\r
                "stringValue": "",\r
                "seed": 0\r
              }\r
            },\r
            {\r
              "id": "trim",\r
              "type": "setAttribute",\r
              "params": {\r
                "name": "trim",\r
                "domain": "point",\r
                "type": "f32",\r
                "tupleSize": 3,\r
                "value": {\r
                  "fn": "vec",\r
                  "args": [\r
                    {\r
                      "fn": "lt",\r
                      "args": [\r
                        {\r
                          "fn": "randomField",\r
                          "key": "sill"\r
                        },\r
                        {\r
                          "fn": "param",\r
                          "name": "sillRate"\r
                        }\r
                      ]\r
                    },\r
                    {\r
                      "fn": "lt",\r
                      "args": [\r
                        {\r
                          "fn": "randomField",\r
                          "key": "lintel"\r
                        },\r
                        {\r
                          "fn": "param",\r
                          "name": "lintelRate"\r
                        }\r
                      ]\r
                    },\r
                    {\r
                      "fn": "attribute",\r
                      "name": "plinth"\r
                    }\r
                  ]\r
                },\r
                "select": 0,\r
                "values": [],\r
                "weights": [],\r
                "stringValue": "",\r
                "seed": 0\r
              }\r
            },\r
            {\r
              "id": "massUp",\r
              "type": "splitBox",\r
              "params": {\r
                "axis": "y",\r
                "axisIndex": 0,\r
                "labels": [\r
                  "floor",\r
                  "tier",\r
                  "upper"\r
                ],\r
                "sizes": {\r
                  "fn": "vec",\r
                  "args": [\r
                    1,\r
                    {\r
                      "fn": "mul",\r
                      "args": [\r
                        {\r
                          "fn": "attribute",\r
                          "name": "lowSt"\r
                        },\r
                        {\r
                          "fn": "floor",\r
                          "args": [\r
                            {\r
                              "fn": "add",\r
                              "args": [\r
                                {\r
                                  "fn": "param",\r
                                  "name": "storeyHeight"\r
                                },\r
                                0.5\r
                              ]\r
                            }\r
                          ]\r
                        }\r
                      ]\r
                    },\r
                    1\r
                  ]\r
                },\r
                "units": [\r
                  "absolute",\r
                  "absolute",\r
                  "relative"\r
                ],\r
                "repeatRound": "floor",\r
                "snap": [\r
                  0,\r
                  0,\r
                  0\r
                ],\r
                "snapMode": "round",\r
                "fit": "error",\r
                "direction": 1,\r
                "where": 1,\r
                "labelAttr": "kind",\r
                "indexAttr": "",\r
                "countAttr": ""\r
              }\r
            },\r
            {\r
              "id": "stepX",\r
              "type": "splitBox",\r
              "params": {\r
                "axis": "x",\r
                "axisIndex": 0,\r
                "labels": [\r
                  "",\r
                  "upper",\r
                  ""\r
                ],\r
                "sizes": {\r
                  "fn": "vec",\r
                  "args": [\r
                    {\r
                      "fn": "mul",\r
                      "args": [\r
                        {\r
                          "fn": "mul",\r
                          "args": [\r
                            {\r
                              "fn": "attribute",\r
                              "name": "inset"\r
                            },\r
                            {\r
                              "fn": "lt",\r
                              "args": [\r
                                {\r
                                  "fn": "attribute",\r
                                  "name": "lowSt"\r
                                },\r
                                {\r
                                  "fn": "attribute",\r
                                  "name": "storeys"\r
                                }\r
                              ]\r
                            }\r
                          ]\r
                        },\r
                        {\r
                          "fn": "eq",\r
                          "args": [\r
                            {\r
                              "fn": "box",\r
                              "name": "x0"\r
                            },\r
                            0\r
                          ]\r
                        }\r
                      ]\r
                    },\r
                    1,\r
                    {\r
                      "fn": "mul",\r
                      "args": [\r
                        {\r
                          "fn": "mul",\r
                          "args": [\r
                            {\r
                              "fn": "attribute",\r
                              "name": "inset"\r
                            },\r
                            {\r
                              "fn": "lt",\r
                              "args": [\r
                                {\r
                                  "fn": "attribute",\r
                                  "name": "lowSt"\r
                                },\r
                                {\r
                                  "fn": "attribute",\r
                                  "name": "storeys"\r
                                }\r
                              ]\r
                            }\r
                          ]\r
                        },\r
                        {\r
                          "fn": "eq",\r
                          "args": [\r
                            {\r
                              "fn": "box",\r
                              "name": "x1"\r
                            },\r
                            {\r
                              "fn": "component",\r
                              "args": [\r
                                {\r
                                  "fn": "attribute",\r
                                  "name": "lot",\r
                                  "tupleSize": 3\r
                                }\r
                              ],\r
                              "index": 0\r
                            }\r
                          ]\r
                        }\r
                      ]\r
                    }\r
                  ]\r
                },\r
                "units": [\r
                  "absolute",\r
                  "relative",\r
                  "absolute"\r
                ],\r
                "repeatRound": "floor",\r
                "snap": [\r
                  0,\r
                  0,\r
                  0\r
                ],\r
                "snapMode": "round",\r
                "fit": "error",\r
                "direction": 1,\r
                "where": 1,\r
                "labelAttr": "kind",\r
                "indexAttr": "",\r
                "countAttr": ""\r
              }\r
            },\r
            {\r
              "id": "stepZ",\r
              "type": "splitBox",\r
              "params": {\r
                "axis": "z",\r
                "axisIndex": 0,\r
                "labels": [\r
                  "",\r
                  "upper",\r
                  ""\r
                ],\r
                "sizes": {\r
                  "fn": "vec",\r
                  "args": [\r
                    {\r
                      "fn": "mul",\r
                      "args": [\r
                        {\r
                          "fn": "mul",\r
                          "args": [\r
                            {\r
                              "fn": "attribute",\r
                              "name": "inset"\r
                            },\r
                            {\r
                              "fn": "lt",\r
                              "args": [\r
                                {\r
                                  "fn": "attribute",\r
                                  "name": "lowSt"\r
                                },\r
                                {\r
                                  "fn": "attribute",\r
                                  "name": "storeys"\r
                                }\r
                              ]\r
                            }\r
                          ]\r
                        },\r
                        {\r
                          "fn": "eq",\r
                          "args": [\r
                            {\r
                              "fn": "box",\r
                              "name": "z0"\r
                            },\r
                            0\r
                          ]\r
                        }\r
                      ]\r
                    },\r
                    1,\r
                    {\r
                      "fn": "mul",\r
                      "args": [\r
                        {\r
                          "fn": "mul",\r
                          "args": [\r
                            {\r
                              "fn": "attribute",\r
                              "name": "inset"\r
                            },\r
                            {\r
                              "fn": "lt",\r
                              "args": [\r
                                {\r
                                  "fn": "attribute",\r
                                  "name": "lowSt"\r
                                },\r
                                {\r
                                  "fn": "attribute",\r
                                  "name": "storeys"\r
                                }\r
                              ]\r
                            }\r
                          ]\r
                        },\r
                        {\r
                          "fn": "eq",\r
                          "args": [\r
                            {\r
                              "fn": "box",\r
                              "name": "z1"\r
                            },\r
                            {\r
                              "fn": "component",\r
                              "args": [\r
                                {\r
                                  "fn": "attribute",\r
                                  "name": "lot",\r
                                  "tupleSize": 3\r
                                }\r
                              ],\r
                              "index": 2\r
                            }\r
                          ]\r
                        }\r
                      ]\r
                    }\r
                  ]\r
                },\r
                "units": [\r
                  "absolute",\r
                  "relative",\r
                  "absolute"\r
                ],\r
                "repeatRound": "floor",\r
                "snap": [\r
                  0,\r
                  0,\r
                  0\r
                ],\r
                "snapMode": "round",\r
                "fit": "error",\r
                "direction": 1,\r
                "where": 1,\r
                "labelAttr": "kind",\r
                "indexAttr": "",\r
                "countAttr": ""\r
              }\r
            },\r
            {\r
              "id": "upperUp",\r
              "type": "splitBox",\r
              "params": {\r
                "axis": "y",\r
                "axisIndex": 0,\r
                "labels": [\r
                  "tier",\r
                  "roofSpace"\r
                ],\r
                "sizes": {\r
                  "fn": "vec",\r
                  "args": [\r
                    {\r
                      "fn": "mul",\r
                      "args": [\r
                        {\r
                          "fn": "sub",\r
                          "args": [\r
                            {\r
                              "fn": "attribute",\r
                              "name": "storeys"\r
                            },\r
                            {\r
                              "fn": "attribute",\r
                              "name": "lowSt"\r
                            }\r
                          ]\r
                        },\r
                        {\r
                          "fn": "floor",\r
                          "args": [\r
                            {\r
                              "fn": "add",\r
                              "args": [\r
                                {\r
                                  "fn": "param",\r
                                  "name": "storeyHeight"\r
                                },\r
                                0.5\r
                              ]\r
                            }\r
                          ]\r
                        }\r
                      ]\r
                    },\r
                    1\r
                  ]\r
                },\r
                "units": [\r
                  "absolute",\r
                  "relative"\r
                ],\r
                "repeatRound": "floor",\r
                "snap": [\r
                  0,\r
                  0,\r
                  0\r
                ],\r
                "snapMode": "round",\r
                "fit": "error",\r
                "direction": 1,\r
                "where": 1,\r
                "labelAttr": "kind",\r
                "indexAttr": "",\r
                "countAttr": ""\r
              }\r
            },\r
            {\r
              "id": "roofStyle",\r
              "type": "setAttribute",\r
              "params": {\r
                "name": "kind",\r
                "domain": "point",\r
                "type": "string",\r
                "tupleSize": 1,\r
                "value": {\r
                  "fn": "let",\r
                  "bind": {\r
                    "r": {\r
                      "fn": "attribute",\r
                      "name": "ruleRoll"\r
                    },\r
                    "f": {\r
                      "fn": "param",\r
                      "name": "flatRoofRate"\r
                    }\r
                  },\r
                  "args": [\r
                    {\r
                      "fn": "select",\r
                      "args": [\r
                        {\r
                          "fn": "lt",\r
                          "args": [\r
                            {\r
                              "fn": "var",\r
                              "name": "r"\r
                            },\r
                            {\r
                              "fn": "var",\r
                              "name": "f"\r
                            }\r
                          ]\r
                        },\r
                        2,\r
                        {\r
                          "fn": "lt",\r
                          "args": [\r
                            {\r
                              "fn": "var",\r
                              "name": "r"\r
                            },\r
                            {\r
                              "fn": "add",\r
                              "args": [\r
                                {\r
                                  "fn": "var",\r
                                  "name": "f"\r
                                },\r
                                {\r
                                  "fn": "mul",\r
                                  "args": [\r
                                    {\r
                                      "fn": "sub",\r
                                      "args": [\r
                                        1,\r
                                        {\r
                                          "fn": "var",\r
                                          "name": "f"\r
                                        }\r
                                      ]\r
                                    },\r
                                    {\r
                                      "fn": "param",\r
                                      "name": "hipRoofRate"\r
                                    }\r
                                  ]\r
                                }\r
                              ]\r
                            }\r
                          ]\r
                        }\r
                      ]\r
                    }\r
                  ]\r
                },\r
                "select": 0,\r
                "values": [\r
                  "gable",\r
                  "hip",\r
                  "flat"\r
                ],\r
                "weights": [],\r
                "stringValue": "",\r
                "seed": 0\r
              }\r
            },\r
            {\r
              "id": "gableLayers",\r
              "type": "splitBox",\r
              "params": {\r
                "axis": "y",\r
                "axisIndex": 0,\r
                "labels": [\r
                  "layer",\r
                  ""\r
                ],\r
                "sizes": {\r
                  "fn": "let",\r
                  "bind": {\r
                    "st": {\r
                      "fn": "floor",\r
                      "args": [\r
                        {\r
                          "fn": "add",\r
                          "args": [\r
                            {\r
                              "fn": "param",\r
                              "name": "roofStep"\r
                            },\r
                            0.5\r
                          ]\r
                        }\r
                      ]\r
                    },\r
                    "nl": {\r
                      "fn": "floor",\r
                      "args": [\r
                        {\r
                          "fn": "div",\r
                          "args": [\r
                            {\r
                              "fn": "add",\r
                              "args": [\r
                                {\r
                                  "fn": "min",\r
                                  "args": [\r
                                    {\r
                                      "fn": "box",\r
                                      "name": "sx"\r
                                    },\r
                                    {\r
                                      "fn": "box",\r
                                      "name": "sz"\r
                                    }\r
                                  ]\r
                                },\r
                                1\r
                              ]\r
                            },\r
                            2\r
                          ]\r
                        }\r
                      ]\r
                    }\r
                  },\r
                  "args": [\r
                    {\r
                      "fn": "vec",\r
                      "args": [\r
                        {\r
                          "fn": "var",\r
                          "name": "st"\r
                        },\r
                        {\r
                          "fn": "sub",\r
                          "args": [\r
                            {\r
                              "fn": "box",\r
                              "name": "sy"\r
                            },\r
                            {\r
                              "fn": "mul",\r
                              "args": [\r
                                {\r
                                  "fn": "var",\r
                                  "name": "nl"\r
                                },\r
                                {\r
                                  "fn": "var",\r
                                  "name": "st"\r
                                }\r
                              ]\r
                            }\r
                          ]\r
                        }\r
                      ]\r
                    }\r
                  ]\r
                },\r
                "units": [\r
                  "repeat",\r
                  "absolute"\r
                ],\r
                "repeatRound": "floor",\r
                "snap": [\r
                  0,\r
                  0,\r
                  0\r
                ],\r
                "snapMode": "round",\r
                "fit": "error",\r
                "direction": 1,\r
                "where": 1,\r
                "labelAttr": "kind",\r
                "indexAttr": "layer",\r
                "countAttr": ""\r
              }\r
            },\r
            {\r
              "id": "gableSlope",\r
              "type": "splitBox",\r
              "params": {\r
                "axis": "perCell",\r
                "axisIndex": {\r
                  "fn": "select",\r
                  "args": [\r
                    {\r
                      "fn": "ge",\r
                      "args": [\r
                        {\r
                          "fn": "box",\r
                          "name": "sx"\r
                        },\r
                        {\r
                          "fn": "box",\r
                          "name": "sz"\r
                        }\r
                      ]\r
                    },\r
                    2,\r
                    0\r
                  ]\r
                },\r
                "labels": [\r
                  "",\r
                  "slope",\r
                  ""\r
                ],\r
                "sizes": {\r
                  "fn": "vec",\r
                  "args": [\r
                    {\r
                      "fn": "attribute",\r
                      "name": "layer"\r
                    },\r
                    1,\r
                    {\r
                      "fn": "attribute",\r
                      "name": "layer"\r
                    }\r
                  ]\r
                },\r
                "units": [\r
                  "absolute",\r
                  "relative",\r
                  "absolute"\r
                ],\r
                "repeatRound": "floor",\r
                "snap": [\r
                  0,\r
                  0,\r
                  0\r
                ],\r
                "snapMode": "round",\r
                "fit": "error",\r
                "direction": 1,\r
                "where": 1,\r
                "labelAttr": "kind",\r
                "indexAttr": "",\r
                "countAttr": ""\r
              }\r
            },\r
            {\r
              "id": "gableEnds",\r
              "type": "splitBox",\r
              "params": {\r
                "axis": "perCell",\r
                "axisIndex": {\r
                  "fn": "select",\r
                  "args": [\r
                    {\r
                      "fn": "ge",\r
                      "args": [\r
                        {\r
                          "fn": "box",\r
                          "name": "sx"\r
                        },\r
                        {\r
                          "fn": "box",\r
                          "name": "sz"\r
                        }\r
                      ]\r
                    },\r
                    0,\r
                    2\r
                  ]\r
                },\r
                "labels": [\r
                  "wall",\r
                  "roof",\r
                  "wall"\r
                ],\r
                "sizes": [\r
                  1,\r
                  1,\r
                  1\r
                ],\r
                "units": [\r
                  "absolute",\r
                  "relative",\r
                  "absolute"\r
                ],\r
                "repeatRound": "floor",\r
                "snap": [\r
                  0,\r
                  0,\r
                  0\r
                ],\r
                "snapMode": "round",\r
                "fit": "error",\r
                "direction": 1,\r
                "where": 1,\r
                "labelAttr": "kind",\r
                "indexAttr": "",\r
                "countAttr": ""\r
              }\r
            },\r
            {\r
              "id": "hipLayers",\r
              "type": "splitBox",\r
              "params": {\r
                "axis": "y",\r
                "axisIndex": 0,\r
                "labels": [\r
                  "layer",\r
                  ""\r
                ],\r
                "sizes": {\r
                  "fn": "let",\r
                  "bind": {\r
                    "st": {\r
                      "fn": "floor",\r
                      "args": [\r
                        {\r
                          "fn": "add",\r
                          "args": [\r
                            {\r
                              "fn": "param",\r
                              "name": "roofStep"\r
                            },\r
                            0.5\r
                          ]\r
                        }\r
                      ]\r
                    },\r
                    "nl": {\r
                      "fn": "floor",\r
                      "args": [\r
                        {\r
                          "fn": "div",\r
                          "args": [\r
                            {\r
                              "fn": "add",\r
                              "args": [\r
                                {\r
                                  "fn": "min",\r
                                  "args": [\r
                                    {\r
                                      "fn": "box",\r
                                      "name": "sx"\r
                                    },\r
                                    {\r
                                      "fn": "box",\r
                                      "name": "sz"\r
                                    }\r
                                  ]\r
                                },\r
                                1\r
                              ]\r
                            },\r
                            2\r
                          ]\r
                        }\r
                      ]\r
                    }\r
                  },\r
                  "args": [\r
                    {\r
                      "fn": "vec",\r
                      "args": [\r
                        {\r
                          "fn": "var",\r
                          "name": "st"\r
                        },\r
                        {\r
                          "fn": "sub",\r
                          "args": [\r
                            {\r
                              "fn": "box",\r
                              "name": "sy"\r
                            },\r
                            {\r
                              "fn": "mul",\r
                              "args": [\r
                                {\r
                                  "fn": "var",\r
                                  "name": "nl"\r
                                },\r
                                {\r
                                  "fn": "var",\r
                                  "name": "st"\r
                                }\r
                              ]\r
                            }\r
                          ]\r
                        }\r
                      ]\r
                    }\r
                  ]\r
                },\r
                "units": [\r
                  "repeat",\r
                  "absolute"\r
                ],\r
                "repeatRound": "floor",\r
                "snap": [\r
                  0,\r
                  0,\r
                  0\r
                ],\r
                "snapMode": "round",\r
                "fit": "error",\r
                "direction": 1,\r
                "where": 1,\r
                "labelAttr": "kind",\r
                "indexAttr": "layer",\r
                "countAttr": ""\r
              }\r
            },\r
            {\r
              "id": "hipX",\r
              "type": "splitBox",\r
              "params": {\r
                "axis": "x",\r
                "axisIndex": 0,\r
                "labels": [\r
                  "",\r
                  "roof",\r
                  ""\r
                ],\r
                "sizes": {\r
                  "fn": "vec",\r
                  "args": [\r
                    {\r
                      "fn": "attribute",\r
                      "name": "layer"\r
                    },\r
                    1,\r
                    {\r
                      "fn": "attribute",\r
                      "name": "layer"\r
                    }\r
                  ]\r
                },\r
                "units": [\r
                  "absolute",\r
                  "relative",\r
                  "absolute"\r
                ],\r
                "repeatRound": "floor",\r
                "snap": [\r
                  0,\r
                  0,\r
                  0\r
                ],\r
                "snapMode": "round",\r
                "fit": "error",\r
                "direction": 1,\r
                "where": 1,\r
                "labelAttr": "kind",\r
                "indexAttr": "",\r
                "countAttr": ""\r
              }\r
            },\r
            {\r
              "id": "hipZ",\r
              "type": "splitBox",\r
              "params": {\r
                "axis": "z",\r
                "axisIndex": 0,\r
                "labels": [\r
                  "",\r
                  "roof",\r
                  ""\r
                ],\r
                "sizes": {\r
                  "fn": "vec",\r
                  "args": [\r
                    {\r
                      "fn": "attribute",\r
                      "name": "layer"\r
                    },\r
                    1,\r
                    {\r
                      "fn": "attribute",\r
                      "name": "layer"\r
                    }\r
                  ]\r
                },\r
                "units": [\r
                  "absolute",\r
                  "relative",\r
                  "absolute"\r
                ],\r
                "repeatRound": "floor",\r
                "snap": [\r
                  0,\r
                  0,\r
                  0\r
                ],\r
                "snapMode": "round",\r
                "fit": "error",\r
                "direction": 1,\r
                "where": 1,\r
                "labelAttr": "kind",\r
                "indexAttr": "",\r
                "countAttr": ""\r
              }\r
            },\r
            {\r
              "id": "parapetCourse",\r
              "type": "splitBox",\r
              "params": {\r
                "axis": "y",\r
                "axisIndex": 0,\r
                "labels": [\r
                  "parapet",\r
                  ""\r
                ],\r
                "sizes": {\r
                  "fn": "vec",\r
                  "args": [\r
                    3,\r
                    1\r
                  ]\r
                },\r
                "units": [\r
                  "absolute",\r
                  "relative"\r
                ],\r
                "repeatRound": "floor",\r
                "snap": [\r
                  0,\r
                  0,\r
                  0\r
                ],\r
                "snapMode": "round",\r
                "fit": "error",\r
                "direction": 1,\r
                "where": 1,\r
                "labelAttr": "kind",\r
                "indexAttr": "",\r
                "countAttr": ""\r
              }\r
            },\r
            {\r
              "id": "parapet",\r
              "type": "shellSplit",\r
              "params": {\r
                "faces": [\r
                  "south",\r
                  "north",\r
                  "west",\r
                  "east"\r
                ],\r
                "labels": [\r
                  "roof",\r
                  "roof",\r
                  "roof",\r
                  "roof"\r
                ],\r
                "thickness": [\r
                  1\r
                ],\r
                "interiorLabel": "",\r
                "fit": "error",\r
                "where": 1,\r
                "labelAttr": "kind",\r
                "faceAttr": "",\r
                "alongAxisAttr": "",\r
                "alongSignAttr": "",\r
                "upAxisAttr": "",\r
                "upSignAttr": "",\r
                "outAxisAttr": "",\r
                "outwardAttr": ""\r
              }\r
            }\r
          ],\r
          "connections": [\r
            {\r
              "from": [\r
                "canSplit",\r
                "out"\r
              ],\r
              "to": [\r
                "halve",\r
                "in"\r
              ]\r
            },\r
            {\r
              "from": [\r
                "storeys",\r
                "out"\r
              ],\r
              "to": [\r
                "wallTint",\r
                "in"\r
              ]\r
            },\r
            {\r
              "from": [\r
                "wallTint",\r
                "out"\r
              ],\r
              "to": [\r
                "roofTint",\r
                "in"\r
              ]\r
            },\r
            {\r
              "from": [\r
                "roofTint",\r
                "out"\r
              ],\r
              "to": [\r
                "doorWall",\r
                "in"\r
              ]\r
            },\r
            {\r
              "from": [\r
                "doorWall",\r
                "out"\r
              ],\r
              "to": [\r
                "inset",\r
                "in"\r
              ]\r
            },\r
            {\r
              "from": [\r
                "inset",\r
                "out"\r
              ],\r
              "to": [\r
                "lowSt",\r
                "in"\r
              ]\r
            },\r
            {\r
              "from": [\r
                "lowSt",\r
                "out"\r
              ],\r
              "to": [\r
                "trim",\r
                "in"\r
              ]\r
            },\r
            {\r
              "from": [\r
                "trim",\r
                "out"\r
              ],\r
              "to": [\r
                "massUp",\r
                "in"\r
              ]\r
            },\r
            {\r
              "from": [\r
                "stepX",\r
                "out"\r
              ],\r
              "to": [\r
                "stepZ",\r
                "in"\r
              ]\r
            },\r
            {\r
              "from": [\r
                "stepZ",\r
                "out"\r
              ],\r
              "to": [\r
                "upperUp",\r
                "in"\r
              ]\r
            },\r
            {\r
              "from": [\r
                "gableLayers",\r
                "out"\r
              ],\r
              "to": [\r
                "gableSlope",\r
                "in"\r
              ]\r
            },\r
            {\r
              "from": [\r
                "gableSlope",\r
                "out"\r
              ],\r
              "to": [\r
                "gableEnds",\r
                "in"\r
              ]\r
            },\r
            {\r
              "from": [\r
                "hipLayers",\r
                "out"\r
              ],\r
              "to": [\r
                "hipX",\r
                "in"\r
              ]\r
            },\r
            {\r
              "from": [\r
                "hipX",\r
                "out"\r
              ],\r
              "to": [\r
                "hipZ",\r
                "in"\r
              ]\r
            },\r
            {\r
              "from": [\r
                "parapetCourse",\r
                "out"\r
              ],\r
              "to": [\r
                "parapet",\r
                "in"\r
              ]\r
            }\r
          ],\r
          "outputs": []\r
        },\r
        "inputs": [\r
          {\r
            "name": "block",\r
            "node": "canSplit",\r
            "pin": "in"\r
          },\r
          {\r
            "name": "mass",\r
            "node": "storeys",\r
            "pin": "in"\r
          },\r
          {\r
            "name": "upper",\r
            "node": "stepX",\r
            "pin": "in"\r
          },\r
          {\r
            "name": "roofSpace",\r
            "node": "roofStyle",\r
            "pin": "in"\r
          },\r
          {\r
            "name": "gable",\r
            "node": "gableLayers",\r
            "pin": "in"\r
          },\r
          {\r
            "name": "hip",\r
            "node": "hipLayers",\r
            "pin": "in"\r
          },\r
          {\r
            "name": "flat",\r
            "node": "parapetCourse",\r
            "pin": "in"\r
          }\r
        ],\r
        "outputs": [\r
          {\r
            "name": "block",\r
            "node": "halve",\r
            "pin": "out"\r
          },\r
          {\r
            "name": "mass",\r
            "node": "massUp",\r
            "pin": "out"\r
          },\r
          {\r
            "name": "upper",\r
            "node": "upperUp",\r
            "pin": "out"\r
          },\r
          {\r
            "name": "roofSpace",\r
            "node": "roofStyle",\r
            "pin": "out"\r
          },\r
          {\r
            "name": "gable",\r
            "node": "gableEnds",\r
            "pin": "out"\r
          },\r
          {\r
            "name": "hip",\r
            "node": "hipZ",\r
            "pin": "out"\r
          },\r
          {\r
            "name": "flat",\r
            "node": "parapet",\r
            "pin": "out"\r
          }\r
        ],\r
        "params": [\r
          {\r
            "name": "storeyHeight",\r
            "targets": [],\r
            "description": "The graph param storeyHeight, read by name in the rules.",\r
            "default": 16,\r
            "min": 15,\r
            "max": 21\r
          },\r
          {\r
            "name": "sillRate",\r
            "targets": [],\r
            "description": "The graph param sillRate, read by name in the rules.",\r
            "default": 0.75,\r
            "min": 0,\r
            "max": 1\r
          },\r
          {\r
            "name": "lintelRate",\r
            "targets": [],\r
            "description": "The graph param lintelRate, read by name in the rules.",\r
            "default": 0.75,\r
            "min": 0,\r
            "max": 1\r
          },\r
          {\r
            "name": "minBlock",\r
            "targets": [],\r
            "description": "The graph param minBlock, read by name in the rules.",\r
            "default": 6,\r
            "min": 5,\r
            "max": 9\r
          },\r
          {\r
            "name": "minStoreys",\r
            "targets": [],\r
            "description": "The graph param minStoreys, read by name in the rules.",\r
            "default": 1,\r
            "min": 1,\r
            "max": 4\r
          },\r
          {\r
            "name": "maxStoreys",\r
            "targets": [],\r
            "description": "The graph param maxStoreys, read by name in the rules.",\r
            "default": 3,\r
            "min": 1,\r
            "max": 4\r
          },\r
          {\r
            "name": "roofStep",\r
            "targets": [],\r
            "description": "The graph param roofStep, read by name in the rules.",\r
            "default": 2,\r
            "min": 1,\r
            "max": 3\r
          },\r
          {\r
            "name": "flatRoofRate",\r
            "targets": [],\r
            "description": "The graph param flatRoofRate, read by name in the rules.",\r
            "default": 0.25,\r
            "min": 0,\r
            "max": 1\r
          },\r
          {\r
            "name": "hipRoofRate",\r
            "targets": [],\r
            "description": "The graph param hipRoofRate, read by name in the rules.",\r
            "default": 0.4,\r
            "min": 0,\r
            "max": 1\r
          },\r
          {\r
            "name": "setbackRate",\r
            "targets": [],\r
            "description": "The graph param setbackRate, read by name in the rules.",\r
            "default": 0.35,\r
            "min": 0,\r
            "max": 1\r
          }\r
        ]\r
      }\r
    },\r
    {\r
      "id": "tiers",\r
      "type": "filterByExpression",\r
      "params": {\r
        "predicate": {\r
          "fn": "attributeIs",\r
          "name": "kind",\r
          "value": "tier"\r
        },\r
        "seed": 0,\r
        "topology": "drop"\r
      }\r
    },\r
    {\r
      "id": "chimRoll",\r
      "type": "filterByExpression",\r
      "params": {\r
        "predicate": {\r
          "fn": "mul",\r
          "args": [\r
            {\r
              "fn": "add",\r
              "args": [\r
                {\r
                  "fn": "add",\r
                  "args": [\r
                    {\r
                      "fn": "attributeIs",\r
                      "name": "kind",\r
                      "value": "gable"\r
                    },\r
                    {\r
                      "fn": "attributeIs",\r
                      "name": "kind",\r
                      "value": "hip"\r
                    }\r
                  ]\r
                },\r
                {\r
                  "fn": "attributeIs",\r
                  "name": "kind",\r
                  "value": "flat"\r
                }\r
              ]\r
            },\r
            {\r
              "fn": "lt",\r
              "args": [\r
                {\r
                  "fn": "randomField",\r
                  "key": "chimney"\r
                },\r
                {\r
                  "fn": "param",\r
                  "name": "chimneyRate"\r
                }\r
              ]\r
            }\r
          ]\r
        },\r
        "seed": 0,\r
        "topology": "drop"\r
      }\r
    },\r
    {\r
      "id": "chimPick",\r
      "type": "setAttribute",\r
      "params": {\r
        "name": "chimAt",\r
        "domain": "point",\r
        "type": "f32",\r
        "tupleSize": 3,\r
        "value": {\r
          "fn": "let",\r
          "bind": {\r
            "rx": {\r
              "fn": "ge",\r
              "args": [\r
                {\r
                  "fn": "box",\r
                  "name": "sx"\r
                },\r
                {\r
                  "fn": "box",\r
                  "name": "sz"\r
                }\r
              ]\r
            },\r
            "fl": {\r
              "fn": "attributeIs",\r
              "name": "kind",\r
              "value": "flat"\r
            },\r
            "nl": {\r
              "fn": "floor",\r
              "args": [\r
                {\r
                  "fn": "div",\r
                  "args": [\r
                    {\r
                      "fn": "add",\r
                      "args": [\r
                        {\r
                          "fn": "min",\r
                          "args": [\r
                            {\r
                              "fn": "box",\r
                              "name": "sx"\r
                            },\r
                            {\r
                              "fn": "box",\r
                              "name": "sz"\r
                            }\r
                          ]\r
                        },\r
                        1\r
                      ]\r
                    },\r
                    2\r
                  ]\r
                }\r
              ]\r
            },\r
            "kl": {\r
              "fn": "floor",\r
              "args": [\r
                {\r
                  "fn": "div",\r
                  "args": [\r
                    {\r
                      "fn": "sub",\r
                      "args": [\r
                        {\r
                          "fn": "var",\r
                          "name": "nl"\r
                        },\r
                        1\r
                      ]\r
                    },\r
                    2\r
                  ]\r
                }\r
              ]\r
            },\r
            "k": {\r
              "fn": "select",\r
              "args": [\r
                {\r
                  "fn": "var",\r
                  "name": "fl"\r
                },\r
                0,\r
                {\r
                  "fn": "max",\r
                  "args": [\r
                    0,\r
                    {\r
                      "fn": "add",\r
                      "args": [\r
                        {\r
                          "fn": "var",\r
                          "name": "kl"\r
                        },\r
                        {\r
                          "fn": "floor",\r
                          "args": [\r
                            {\r
                              "fn": "mul",\r
                              "args": [\r
                                {\r
                                  "fn": "randomField",\r
                                  "key": "chimAt"\r
                                },\r
                                {\r
                                  "fn": "sub",\r
                                  "args": [\r
                                    {\r
                                      "fn": "sub",\r
                                      "args": [\r
                                        {\r
                                          "fn": "var",\r
                                          "name": "nl"\r
                                        },\r
                                        1\r
                                      ]\r
                                    },\r
                                    {\r
                                      "fn": "var",\r
                                      "name": "kl"\r
                                    }\r
                                  ]\r
                                }\r
                              ]\r
                            }\r
                          ]\r
                        }\r
                      ]\r
                    }\r
                  ]\r
                }\r
              ]\r
            },\r
            "a0": {\r
              "fn": "select",\r
              "args": [\r
                {\r
                  "fn": "var",\r
                  "name": "rx"\r
                },\r
                {\r
                  "fn": "box",\r
                  "name": "x0"\r
                },\r
                {\r
                  "fn": "box",\r
                  "name": "z0"\r
                }\r
              ]\r
            },\r
            "e": {\r
              "fn": "select",\r
              "args": [\r
                {\r
                  "fn": "attributeIs",\r
                  "name": "kind",\r
                  "value": "hip"\r
                },\r
                {\r
                  "fn": "var",\r
                  "name": "k"\r
                },\r
                1\r
              ]\r
            }\r
          },\r
          "args": [\r
            {\r
              "fn": "vec",\r
              "args": [\r
                {\r
                  "fn": "var",\r
                  "name": "k"\r
                },\r
                {\r
                  "fn": "add",\r
                  "args": [\r
                    {\r
                      "fn": "add",\r
                      "args": [\r
                        {\r
                          "fn": "var",\r
                          "name": "a0"\r
                        },\r
                        {\r
                          "fn": "var",\r
                          "name": "e"\r
                        }\r
                      ]\r
                    },\r
                    {\r
                      "fn": "floor",\r
                      "args": [\r
                        {\r
                          "fn": "mul",\r
                          "args": [\r
                            {\r
                              "fn": "randomField",\r
                              "key": "chimU"\r
                            },\r
                            {\r
                              "fn": "add",\r
                              "args": [\r
                                {\r
                                  "fn": "sub",\r
                                  "args": [\r
                                    {\r
                                      "fn": "sub",\r
                                      "args": [\r
                                        {\r
                                          "fn": "sub",\r
                                          "args": [\r
                                            {\r
                                              "fn": "select",\r
                                              "args": [\r
                                                {\r
                                                  "fn": "var",\r
                                                  "name": "rx"\r
                                                },\r
                                                {\r
                                                  "fn": "box",\r
                                                  "name": "x1"\r
                                                },\r
                                                {\r
                                                  "fn": "box",\r
                                                  "name": "z1"\r
                                                }\r
                                              ]\r
                                            },\r
                                            {\r
                                              "fn": "var",\r
                                              "name": "a0"\r
                                            }\r
                                          ]\r
                                        },\r
                                        {\r
                                          "fn": "mul",\r
                                          "args": [\r
                                            2,\r
                                            {\r
                                              "fn": "var",\r
                                              "name": "e"\r
                                            }\r
                                          ]\r
                                        }\r
                                      ]\r
                                    },\r
                                    2\r
                                  ]\r
                                },\r
                                0.999\r
                              ]\r
                            }\r
                          ]\r
                        }\r
                      ]\r
                    }\r
                  ]\r
                },\r
                {\r
                  "fn": "lt",\r
                  "args": [\r
                    {\r
                      "fn": "randomField",\r
                      "key": "chimSide"\r
                    },\r
                    0.5\r
                  ]\r
                }\r
              ]\r
            }\r
          ]\r
        },\r
        "select": 0,\r
        "values": [],\r
        "weights": [],\r
        "stringValue": "",\r
        "seed": 0\r
      }\r
    },\r
    {\r
      "id": "chimBox",\r
      "type": "placeBox",\r
      "params": {\r
        "frame": "world",\r
        "alongAxisAttr": "alongAxis",\r
        "alongSignAttr": "alongSign",\r
        "outwardAttr": "outward",\r
        "size": {\r
          "fn": "let",\r
          "bind": {\r
            "rx": {\r
              "fn": "ge",\r
              "args": [\r
                {\r
                  "fn": "box",\r
                  "name": "sx"\r
                },\r
                {\r
                  "fn": "box",\r
                  "name": "sz"\r
                }\r
              ]\r
            },\r
            "fl": {\r
              "fn": "attributeIs",\r
              "name": "kind",\r
              "value": "flat"\r
            },\r
            "st": {\r
              "fn": "floor",\r
              "args": [\r
                {\r
                  "fn": "add",\r
                  "args": [\r
                    {\r
                      "fn": "param",\r
                      "name": "roofStep"\r
                    },\r
                    0.5\r
                  ]\r
                }\r
              ]\r
            },\r
            "nl": {\r
              "fn": "floor",\r
              "args": [\r
                {\r
                  "fn": "div",\r
                  "args": [\r
                    {\r
                      "fn": "add",\r
                      "args": [\r
                        {\r
                          "fn": "min",\r
                          "args": [\r
                            {\r
                              "fn": "box",\r
                              "name": "sx"\r
                            },\r
                            {\r
                              "fn": "box",\r
                              "name": "sz"\r
                            }\r
                          ]\r
                        },\r
                        1\r
                      ]\r
                    },\r
                    2\r
                  ]\r
                }\r
              ]\r
            },\r
            "k": {\r
              "fn": "component",\r
              "args": [\r
                {\r
                  "fn": "attribute",\r
                  "name": "chimAt",\r
                  "tupleSize": 3\r
                }\r
              ],\r
              "index": 0\r
            }\r
          },\r
          "args": [\r
            {\r
              "fn": "select",\r
              "args": [\r
                {\r
                  "fn": "var",\r
                  "name": "rx"\r
                },\r
                {\r
                  "fn": "vec",\r
                  "args": [\r
                    2,\r
                    {\r
                      "fn": "sub",\r
                      "args": [\r
                        {\r
                          "fn": "add",\r
                          "args": [\r
                            {\r
                              "fn": "select",\r
                              "args": [\r
                                {\r
                                  "fn": "var",\r
                                  "name": "fl"\r
                                },\r
                                3,\r
                                {\r
                                  "fn": "mul",\r
                                  "args": [\r
                                    {\r
                                      "fn": "var",\r
                                      "name": "nl"\r
                                    },\r
                                    {\r
                                      "fn": "var",\r
                                      "name": "st"\r
                                    }\r
                                  ]\r
                                }\r
                              ]\r
                            },\r
                            4\r
                          ]\r
                        },\r
                        {\r
                          "fn": "select",\r
                          "args": [\r
                            {\r
                              "fn": "var",\r
                              "name": "fl"\r
                            },\r
                            3,\r
                            {\r
                              "fn": "mul",\r
                              "args": [\r
                                {\r
                                  "fn": "add",\r
                                  "args": [\r
                                    {\r
                                      "fn": "var",\r
                                      "name": "k"\r
                                    },\r
                                    1\r
                                  ]\r
                                },\r
                                {\r
                                  "fn": "var",\r
                                  "name": "st"\r
                                }\r
                              ]\r
                            }\r
                          ]\r
                        }\r
                      ]\r
                    },\r
                    1\r
                  ]\r
                },\r
                {\r
                  "fn": "vec",\r
                  "args": [\r
                    1,\r
                    {\r
                      "fn": "sub",\r
                      "args": [\r
                        {\r
                          "fn": "add",\r
                          "args": [\r
                            {\r
                              "fn": "select",\r
                              "args": [\r
                                {\r
                                  "fn": "var",\r
                                  "name": "fl"\r
                                },\r
                                3,\r
                                {\r
                                  "fn": "mul",\r
                                  "args": [\r
                                    {\r
                                      "fn": "var",\r
                                      "name": "nl"\r
                                    },\r
                                    {\r
                                      "fn": "var",\r
                                      "name": "st"\r
                                    }\r
                                  ]\r
                                }\r
                              ]\r
                            },\r
                            4\r
                          ]\r
                        },\r
                        {\r
                          "fn": "select",\r
                          "args": [\r
                            {\r
                              "fn": "var",\r
                              "name": "fl"\r
                            },\r
                            3,\r
                            {\r
                              "fn": "mul",\r
                              "args": [\r
                                {\r
                                  "fn": "add",\r
                                  "args": [\r
                                    {\r
                                      "fn": "var",\r
                                      "name": "k"\r
                                    },\r
                                    1\r
                                  ]\r
                                },\r
                                {\r
                                  "fn": "var",\r
                                  "name": "st"\r
                                }\r
                              ]\r
                            }\r
                          ]\r
                        }\r
                      ]\r
                    },\r
                    2\r
                  ]\r
                }\r
              ]\r
            }\r
          ]\r
        },\r
        "units": [\r
          "absolute"\r
        ],\r
        "anchor": {\r
          "fn": "let",\r
          "bind": {\r
            "rx": {\r
              "fn": "ge",\r
              "args": [\r
                {\r
                  "fn": "box",\r
                  "name": "sx"\r
                },\r
                {\r
                  "fn": "box",\r
                  "name": "sz"\r
                }\r
              ]\r
            },\r
            "b": {\r
              "fn": "component",\r
              "args": [\r
                {\r
                  "fn": "attribute",\r
                  "name": "chimAt",\r
                  "tupleSize": 3\r
                }\r
              ],\r
              "index": 2\r
            }\r
          },\r
          "args": [\r
            {\r
              "fn": "select",\r
              "args": [\r
                {\r
                  "fn": "var",\r
                  "name": "rx"\r
                },\r
                {\r
                  "fn": "vec",\r
                  "args": [\r
                    0,\r
                    0,\r
                    {\r
                      "fn": "var",\r
                      "name": "b"\r
                    }\r
                  ]\r
                },\r
                {\r
                  "fn": "vec",\r
                  "args": [\r
                    {\r
                      "fn": "var",\r
                      "name": "b"\r
                    },\r
                    0,\r
                    0\r
                  ]\r
                }\r
              ]\r
            }\r
          ]\r
        },\r
        "offset": {\r
          "fn": "let",\r
          "bind": {\r
            "rx": {\r
              "fn": "ge",\r
              "args": [\r
                {\r
                  "fn": "box",\r
                  "name": "sx"\r
                },\r
                {\r
                  "fn": "box",\r
                  "name": "sz"\r
                }\r
              ]\r
            },\r
            "fl": {\r
              "fn": "attributeIs",\r
              "name": "kind",\r
              "value": "flat"\r
            },\r
            "st": {\r
              "fn": "floor",\r
              "args": [\r
                {\r
                  "fn": "add",\r
                  "args": [\r
                    {\r
                      "fn": "param",\r
                      "name": "roofStep"\r
                    },\r
                    0.5\r
                  ]\r
                }\r
              ]\r
            },\r
            "k": {\r
              "fn": "component",\r
              "args": [\r
                {\r
                  "fn": "attribute",\r
                  "name": "chimAt",\r
                  "tupleSize": 3\r
                }\r
              ],\r
              "index": 0\r
            },\r
            "b": {\r
              "fn": "component",\r
              "args": [\r
                {\r
                  "fn": "attribute",\r
                  "name": "chimAt",\r
                  "tupleSize": 3\r
                }\r
              ],\r
              "index": 2\r
            },\r
            "r": {\r
              "fn": "sub",\r
              "args": [\r
                {\r
                  "fn": "component",\r
                  "args": [\r
                    {\r
                      "fn": "attribute",\r
                      "name": "chimAt",\r
                      "tupleSize": 3\r
                    }\r
                  ],\r
                  "index": 1\r
                },\r
                {\r
                  "fn": "select",\r
                  "args": [\r
                    {\r
                      "fn": "var",\r
                      "name": "rx"\r
                    },\r
                    {\r
                      "fn": "box",\r
                      "name": "x0"\r
                    },\r
                    {\r
                      "fn": "box",\r
                      "name": "z0"\r
                    }\r
                  ]\r
                }\r
              ]\r
            }\r
          },\r
          "args": [\r
            {\r
              "fn": "select",\r
              "args": [\r
                {\r
                  "fn": "var",\r
                  "name": "rx"\r
                },\r
                {\r
                  "fn": "vec",\r
                  "args": [\r
                    {\r
                      "fn": "var",\r
                      "name": "r"\r
                    },\r
                    {\r
                      "fn": "select",\r
                      "args": [\r
                        {\r
                          "fn": "var",\r
                          "name": "fl"\r
                        },\r
                        3,\r
                        {\r
                          "fn": "mul",\r
                          "args": [\r
                            {\r
                              "fn": "add",\r
                              "args": [\r
                                {\r
                                  "fn": "var",\r
                                  "name": "k"\r
                                },\r
                                1\r
                              ]\r
                            },\r
                            {\r
                              "fn": "var",\r
                              "name": "st"\r
                            }\r
                          ]\r
                        }\r
                      ]\r
                    },\r
                    {\r
                      "fn": "select",\r
                      "args": [\r
                        {\r
                          "fn": "var",\r
                          "name": "b"\r
                        },\r
                        {\r
                          "fn": "sub",\r
                          "args": [\r
                            0,\r
                            {\r
                              "fn": "var",\r
                              "name": "k"\r
                            }\r
                          ]\r
                        },\r
                        {\r
                          "fn": "var",\r
                          "name": "k"\r
                        }\r
                      ]\r
                    }\r
                  ]\r
                },\r
                {\r
                  "fn": "vec",\r
                  "args": [\r
                    {\r
                      "fn": "select",\r
                      "args": [\r
                        {\r
                          "fn": "var",\r
                          "name": "b"\r
                        },\r
                        {\r
                          "fn": "sub",\r
                          "args": [\r
                            0,\r
                            {\r
                              "fn": "var",\r
                              "name": "k"\r
                            }\r
                          ]\r
                        },\r
                        {\r
                          "fn": "var",\r
                          "name": "k"\r
                        }\r
                      ]\r
                    },\r
                    {\r
                      "fn": "select",\r
                      "args": [\r
                        {\r
                          "fn": "var",\r
                          "name": "fl"\r
                        },\r
                        3,\r
                        {\r
                          "fn": "mul",\r
                          "args": [\r
                            {\r
                              "fn": "add",\r
                              "args": [\r
                                {\r
                                  "fn": "var",\r
                                  "name": "k"\r
                                },\r
                                1\r
                              ]\r
                            },\r
                            {\r
                              "fn": "var",\r
                              "name": "st"\r
                            }\r
                          ]\r
                        }\r
                      ]\r
                    },\r
                    {\r
                      "fn": "var",\r
                      "name": "r"\r
                    }\r
                  ]\r
                }\r
              ]\r
            }\r
          ]\r
        },\r
        "offsetUnits": [\r
          "absolute"\r
        ],\r
        "fit": "error",\r
        "snap": [\r
          0,\r
          0,\r
          0\r
        ],\r
        "snapTo": "lattice",\r
        "snapMode": "round",\r
        "where": 1,\r
        "labelAttr": "kind",\r
        "label": "chimney"\r
      }\r
    },\r
    {\r
      "id": "chimShadow",\r
      "type": "placeBox",\r
      "params": {\r
        "frame": "world",\r
        "alongAxisAttr": "alongAxis",\r
        "alongSignAttr": "alongSign",\r
        "outwardAttr": "outward",\r
        "size": {\r
          "fn": "let",\r
          "bind": {\r
            "rx": {\r
              "fn": "ge",\r
              "args": [\r
                {\r
                  "fn": "box",\r
                  "name": "sx"\r
                },\r
                {\r
                  "fn": "box",\r
                  "name": "sz"\r
                }\r
              ]\r
            },\r
            "fl": {\r
              "fn": "attributeIs",\r
              "name": "kind",\r
              "value": "flat"\r
            },\r
            "st": {\r
              "fn": "floor",\r
              "args": [\r
                {\r
                  "fn": "add",\r
                  "args": [\r
                    {\r
                      "fn": "param",\r
                      "name": "roofStep"\r
                    },\r
                    0.5\r
                  ]\r
                }\r
              ]\r
            },\r
            "nl": {\r
              "fn": "floor",\r
              "args": [\r
                {\r
                  "fn": "div",\r
                  "args": [\r
                    {\r
                      "fn": "add",\r
                      "args": [\r
                        {\r
                          "fn": "min",\r
                          "args": [\r
                            {\r
                              "fn": "box",\r
                              "name": "sx"\r
                            },\r
                            {\r
                              "fn": "box",\r
                              "name": "sz"\r
                            }\r
                          ]\r
                        },\r
                        1\r
                      ]\r
                    },\r
                    2\r
                  ]\r
                }\r
              ]\r
            }\r
          },\r
          "args": [\r
            {\r
              "fn": "select",\r
              "args": [\r
                {\r
                  "fn": "var",\r
                  "name": "rx"\r
                },\r
                {\r
                  "fn": "vec",\r
                  "args": [\r
                    6,\r
                    {\r
                      "fn": "add",\r
                      "args": [\r
                        {\r
                          "fn": "add",\r
                          "args": [\r
                            {\r
                              "fn": "select",\r
                              "args": [\r
                                {\r
                                  "fn": "var",\r
                                  "name": "fl"\r
                                },\r
                                3,\r
                                {\r
                                  "fn": "mul",\r
                                  "args": [\r
                                    {\r
                                      "fn": "var",\r
                                      "name": "nl"\r
                                    },\r
                                    {\r
                                      "fn": "var",\r
                                      "name": "st"\r
                                    }\r
                                  ]\r
                                }\r
                              ]\r
                            },\r
                            4\r
                          ]\r
                        },\r
                        2\r
                      ]\r
                    },\r
                    5\r
                  ]\r
                },\r
                {\r
                  "fn": "vec",\r
                  "args": [\r
                    5,\r
                    {\r
                      "fn": "add",\r
                      "args": [\r
                        {\r
                          "fn": "add",\r
                          "args": [\r
                            {\r
                              "fn": "select",\r
                              "args": [\r
                                {\r
                                  "fn": "var",\r
                                  "name": "fl"\r
                                },\r
                                3,\r
                                {\r
                                  "fn": "mul",\r
                                  "args": [\r
                                    {\r
                                      "fn": "var",\r
                                      "name": "nl"\r
                                    },\r
                                    {\r
                                      "fn": "var",\r
                                      "name": "st"\r
                                    }\r
                                  ]\r
                                }\r
                              ]\r
                            },\r
                            4\r
                          ]\r
                        },\r
                        2\r
                      ]\r
                    },\r
                    6\r
                  ]\r
                }\r
              ]\r
            }\r
          ]\r
        },\r
        "units": [\r
          "absolute"\r
        ],\r
        "anchor": {\r
          "fn": "let",\r
          "bind": {\r
            "rx": {\r
              "fn": "ge",\r
              "args": [\r
                {\r
                  "fn": "box",\r
                  "name": "sx"\r
                },\r
                {\r
                  "fn": "box",\r
                  "name": "sz"\r
                }\r
              ]\r
            },\r
            "b": {\r
              "fn": "component",\r
              "args": [\r
                {\r
                  "fn": "attribute",\r
                  "name": "chimAt",\r
                  "tupleSize": 3\r
                }\r
              ],\r
              "index": 2\r
            }\r
          },\r
          "args": [\r
            {\r
              "fn": "select",\r
              "args": [\r
                {\r
                  "fn": "var",\r
                  "name": "rx"\r
                },\r
                {\r
                  "fn": "vec",\r
                  "args": [\r
                    0,\r
                    0,\r
                    {\r
                      "fn": "var",\r
                      "name": "b"\r
                    }\r
                  ]\r
                },\r
                {\r
                  "fn": "vec",\r
                  "args": [\r
                    {\r
                      "fn": "var",\r
                      "name": "b"\r
                    },\r
                    0,\r
                    0\r
                  ]\r
                }\r
              ]\r
            }\r
          ]\r
        },\r
        "offset": {\r
          "fn": "let",\r
          "bind": {\r
            "rx": {\r
              "fn": "ge",\r
              "args": [\r
                {\r
                  "fn": "box",\r
                  "name": "sx"\r
                },\r
                {\r
                  "fn": "box",\r
                  "name": "sz"\r
                }\r
              ]\r
            },\r
            "k": {\r
              "fn": "component",\r
              "args": [\r
                {\r
                  "fn": "attribute",\r
                  "name": "chimAt",\r
                  "tupleSize": 3\r
                }\r
              ],\r
              "index": 0\r
            },\r
            "b": {\r
              "fn": "component",\r
              "args": [\r
                {\r
                  "fn": "attribute",\r
                  "name": "chimAt",\r
                  "tupleSize": 3\r
                }\r
              ],\r
              "index": 2\r
            },\r
            "r": {\r
              "fn": "sub",\r
              "args": [\r
                {\r
                  "fn": "component",\r
                  "args": [\r
                    {\r
                      "fn": "attribute",\r
                      "name": "chimAt",\r
                      "tupleSize": 3\r
                    }\r
                  ],\r
                  "index": 1\r
                },\r
                {\r
                  "fn": "select",\r
                  "args": [\r
                    {\r
                      "fn": "var",\r
                      "name": "rx"\r
                    },\r
                    {\r
                      "fn": "box",\r
                      "name": "x0"\r
                    },\r
                    {\r
                      "fn": "box",\r
                      "name": "z0"\r
                    }\r
                  ]\r
                }\r
              ]\r
            }\r
          },\r
          "args": [\r
            {\r
              "fn": "select",\r
              "args": [\r
                {\r
                  "fn": "var",\r
                  "name": "rx"\r
                },\r
                {\r
                  "fn": "vec",\r
                  "args": [\r
                    {\r
                      "fn": "sub",\r
                      "args": [\r
                        {\r
                          "fn": "var",\r
                          "name": "r"\r
                        },\r
                        2\r
                      ]\r
                    },\r
                    0,\r
                    {\r
                      "fn": "select",\r
                      "args": [\r
                        {\r
                          "fn": "var",\r
                          "name": "b"\r
                        },\r
                        {\r
                          "fn": "sub",\r
                          "args": [\r
                            2,\r
                            {\r
                              "fn": "var",\r
                              "name": "k"\r
                            }\r
                          ]\r
                        },\r
                        {\r
                          "fn": "sub",\r
                          "args": [\r
                            {\r
                              "fn": "var",\r
                              "name": "k"\r
                            },\r
                            2\r
                          ]\r
                        }\r
                      ]\r
                    }\r
                  ]\r
                },\r
                {\r
                  "fn": "vec",\r
                  "args": [\r
                    {\r
                      "fn": "select",\r
                      "args": [\r
                        {\r
                          "fn": "var",\r
                          "name": "b"\r
                        },\r
                        {\r
                          "fn": "sub",\r
                          "args": [\r
                            2,\r
                            {\r
                              "fn": "var",\r
                              "name": "k"\r
                            }\r
                          ]\r
                        },\r
                        {\r
                          "fn": "sub",\r
                          "args": [\r
                            {\r
                              "fn": "var",\r
                              "name": "k"\r
                            },\r
                            2\r
                          ]\r
                        }\r
                      ]\r
                    },\r
                    0,\r
                    {\r
                      "fn": "sub",\r
                      "args": [\r
                        {\r
                          "fn": "var",\r
                          "name": "r"\r
                        },\r
                        2\r
                      ]\r
                    }\r
                  ]\r
                }\r
              ]\r
            }\r
          ]\r
        },\r
        "offsetUnits": [\r
          "absolute"\r
        ],\r
        "fit": "clip",\r
        "snap": [\r
          0,\r
          0,\r
          0\r
        ],\r
        "snapTo": "lattice",\r
        "snapMode": "round",\r
        "where": 1,\r
        "labelAttr": "",\r
        "label": ""\r
      }\r
    },\r
    {\r
      "id": "occluder",\r
      "type": "mergePoints",\r
      "params": {}\r
    },\r
    {\r
      "id": "facade",\r
      "type": "applyRules",\r
      "params": {\r
        "storeyHeight": {\r
          "fn": "param",\r
          "name": "storeyHeight"\r
        },\r
        "sillHeight": {\r
          "fn": "param",\r
          "name": "sillHeight"\r
        },\r
        "headHeight": {\r
          "fn": "param",\r
          "name": "headHeight"\r
        },\r
        "bayWidth": {\r
          "fn": "param",\r
          "name": "bayWidth"\r
        },\r
        "openingWidth": {\r
          "fn": "param",\r
          "name": "openingWidth"\r
        },\r
        "windowRate": {\r
          "fn": "param",\r
          "name": "windowRate"\r
        },\r
        "maxDepth": 32,\r
        "labelAttr": "kind",\r
        "depthAttr": "ruleDepth",\r
        "rollAttr": "ruleRoll",\r
        "parentAttr": "ruleParent",\r
        "scoped": [],\r
        "scopeOf": []\r
      },\r
      "subgraph": {\r
        "graph": {\r
          "formatVersion": 1,\r
          "seed": 0,\r
          "nodes": [\r
            {\r
              "id": "storeys",\r
              "type": "splitBox",\r
              "params": {\r
                "axis": "y",\r
                "axisIndex": 0,\r
                "labels": [\r
                  "storey"\r
                ],\r
                "sizes": {\r
                  "fn": "floor",\r
                  "args": [\r
                    {\r
                      "fn": "add",\r
                      "args": [\r
                        {\r
                          "fn": "param",\r
                          "name": "storeyHeight"\r
                        },\r
                        0.5\r
                      ]\r
                    }\r
                  ]\r
                },\r
                "units": [\r
                  "repeat"\r
                ],\r
                "repeatRound": "floor",\r
                "snap": [\r
                  0,\r
                  0,\r
                  0\r
                ],\r
                "snapMode": "round",\r
                "fit": "error",\r
                "direction": 1,\r
                "where": 1,\r
                "labelAttr": "kind",\r
                "indexAttr": "",\r
                "countAttr": ""\r
              }\r
            },\r
            {\r
              "id": "shell",\r
              "type": "shellSplit",\r
              "params": {\r
                "faces": [\r
                  "ceiling",\r
                  "south",\r
                  "north",\r
                  "west",\r
                  "east"\r
                ],\r
                "labels": [\r
                  "floor",\r
                  "face",\r
                  "face",\r
                  "face",\r
                  "face"\r
                ],\r
                "thickness": [\r
                  1\r
                ],\r
                "interiorLabel": "",\r
                "fit": "error",\r
                "where": 1,\r
                "labelAttr": "kind",\r
                "faceAttr": "face",\r
                "alongAxisAttr": "alongAxis",\r
                "alongSignAttr": "alongSign",\r
                "upAxisAttr": "",\r
                "upSignAttr": "",\r
                "outAxisAttr": "",\r
                "outwardAttr": "outward"\r
              }\r
            },\r
            {\r
              "id": "bays",\r
              "type": "splitBox",\r
              "params": {\r
                "axis": "perCell",\r
                "axisIndex": {\r
                  "fn": "attribute",\r
                  "name": "alongAxis"\r
                },\r
                "labels": [\r
                  "bay"\r
                ],\r
                "sizes": {\r
                  "fn": "param",\r
                  "name": "bayWidth"\r
                },\r
                "units": [\r
                  "repeat"\r
                ],\r
                "repeatRound": "floor",\r
                "snap": [\r
                  1,\r
                  1,\r
                  1\r
                ],\r
                "snapMode": "floor",\r
                "fit": "error",\r
                "direction": {\r
                  "fn": "attribute",\r
                  "name": "alongSign"\r
                },\r
                "where": 1,\r
                "labelAttr": "kind",\r
                "indexAttr": "bay",\r
                "countAttr": "nb"\r
              }\r
            },\r
            {\r
              "id": "door",\r
              "type": "setAttribute",\r
              "params": {\r
                "name": "door",\r
                "domain": "point",\r
                "type": "f32",\r
                "tupleSize": 1,\r
                "value": {\r
                  "fn": "mul",\r
                  "args": [\r
                    {\r
                      "fn": "mul",\r
                      "args": [\r
                        {\r
                          "fn": "eq",\r
                          "args": [\r
                            {\r
                              "fn": "box",\r
                              "name": "y0"\r
                            },\r
                            2\r
                          ]\r
                        },\r
                        {\r
                          "fn": "eq",\r
                          "args": [\r
                            {\r
                              "fn": "attribute",\r
                              "name": "face"\r
                            },\r
                            {\r
                              "fn": "attribute",\r
                              "name": "doorWall"\r
                            }\r
                          ]\r
                        }\r
                      ]\r
                    },\r
                    {\r
                      "fn": "eq",\r
                      "args": [\r
                        {\r
                          "fn": "attribute",\r
                          "name": "bay"\r
                        },\r
                        {\r
                          "fn": "floor",\r
                          "args": [\r
                            {\r
                              "fn": "div",\r
                              "args": [\r
                                {\r
                                  "fn": "attribute",\r
                                  "name": "nb"\r
                                },\r
                                2\r
                              ]\r
                            }\r
                          ]\r
                        }\r
                      ]\r
                    }\r
                  ]\r
                },\r
                "select": 0,\r
                "values": [],\r
                "weights": [],\r
                "stringValue": "",\r
                "seed": 0\r
              }\r
            },\r
            {\r
              "id": "exposed",\r
              "type": "boxContact",\r
              "params": {\r
                "mode": "overlap",\r
                "margin": [\r
                  0,\r
                  0,\r
                  0\r
                ],\r
                "marginMin": {\r
                  "fn": "let",\r
                  "bind": {\r
                    "len": {\r
                      "fn": "select",\r
                      "args": [\r
                        {\r
                          "fn": "eq",\r
                          "args": [\r
                            {\r
                              "fn": "attribute",\r
                              "name": "alongAxis"\r
                            },\r
                            0\r
                          ]\r
                        },\r
                        {\r
                          "fn": "box",\r
                          "name": "sx"\r
                        },\r
                        {\r
                          "fn": "box",\r
                          "name": "sz"\r
                        }\r
                      ]\r
                    },\r
                    "ow": {\r
                      "fn": "min",\r
                      "args": [\r
                        {\r
                          "fn": "sub",\r
                          "args": [\r
                            {\r
                              "fn": "var",\r
                              "name": "len"\r
                            },\r
                            2\r
                          ]\r
                        },\r
                        {\r
                          "fn": "floor",\r
                          "args": [\r
                            {\r
                              "fn": "add",\r
                              "args": [\r
                                {\r
                                  "fn": "param",\r
                                  "name": "openingWidth"\r
                                },\r
                                0.5\r
                              ]\r
                            }\r
                          ]\r
                        }\r
                      ]\r
                    },\r
                    "left": {\r
                      "fn": "floor",\r
                      "args": [\r
                        {\r
                          "fn": "div",\r
                          "args": [\r
                            {\r
                              "fn": "sub",\r
                              "args": [\r
                                {\r
                                  "fn": "var",\r
                                  "name": "len"\r
                                },\r
                                {\r
                                  "fn": "var",\r
                                  "name": "ow"\r
                                }\r
                              ]\r
                            },\r
                            2\r
                          ]\r
                        }\r
                      ]\r
                    },\r
                    "o": {\r
                      "fn": "attribute",\r
                      "name": "outward",\r
                      "tupleSize": 3\r
                    },\r
                    "a": {\r
                      "fn": "select",\r
                      "args": [\r
                        {\r
                          "fn": "eq",\r
                          "args": [\r
                            {\r
                              "fn": "attribute",\r
                              "name": "alongAxis"\r
                            },\r
                            0\r
                          ]\r
                        },\r
                        {\r
                          "fn": "vec",\r
                          "args": [\r
                            1,\r
                            0,\r
                            0\r
                          ]\r
                        },\r
                        {\r
                          "fn": "vec",\r
                          "args": [\r
                            0,\r
                            0,\r
                            1\r
                          ]\r
                        }\r
                      ]\r
                    },\r
                    "up": {\r
                      "fn": "add",\r
                      "args": [\r
                        {\r
                          "fn": "mul",\r
                          "args": [\r
                            {\r
                              "fn": "sub",\r
                              "args": [\r
                                1,\r
                                {\r
                                  "fn": "attribute",\r
                                  "name": "door"\r
                                }\r
                              ]\r
                            },\r
                            {\r
                              "fn": "sub",\r
                              "args": [\r
                                {\r
                                  "fn": "floor",\r
                                  "args": [\r
                                    {\r
                                      "fn": "add",\r
                                      "args": [\r
                                        {\r
                                          "fn": "param",\r
                                          "name": "sillHeight"\r
                                        },\r
                                        0.5\r
                                      ]\r
                                    }\r
                                  ]\r
                                },\r
                                {\r
                                  "fn": "component",\r
                                  "args": [\r
                                    {\r
                                      "fn": "attribute",\r
                                      "name": "trim",\r
                                      "tupleSize": 3\r
                                    }\r
                                  ],\r
                                  "index": 0\r
                                }\r
                              ]\r
                            }\r
                          ]\r
                        },\r
                        0.5\r
                      ]\r
                    },\r
                    "p": {\r
                      "fn": "add",\r
                      "args": [\r
                        {\r
                          "fn": "add",\r
                          "args": [\r
                            {\r
                              "fn": "add",\r
                              "args": [\r
                                {\r
                                  "fn": "box",\r
                                  "name": "center"\r
                                },\r
                                {\r
                                  "fn": "mul",\r
                                  "args": [\r
                                    {\r
                                      "fn": "var",\r
                                      "name": "o"\r
                                    },\r
                                    {\r
                                      "fn": "add",\r
                                      "args": [\r
                                        {\r
                                          "fn": "mul",\r
                                          "args": [\r
                                            {\r
                                              "fn": "box",\r
                                              "name": "size"\r
                                            },\r
                                            0.5\r
                                          ]\r
                                        },\r
                                        0.5\r
                                      ]\r
                                    }\r
                                  ]\r
                                }\r
                              ]\r
                            },\r
                            {\r
                              "fn": "mul",\r
                              "args": [\r
                                {\r
                                  "fn": "mul",\r
                                  "args": [\r
                                    {\r
                                      "fn": "var",\r
                                      "name": "a"\r
                                    },\r
                                    {\r
                                      "fn": "attribute",\r
                                      "name": "alongSign"\r
                                    }\r
                                  ]\r
                                },\r
                                {\r
                                  "fn": "sub",\r
                                  "args": [\r
                                    {\r
                                      "fn": "add",\r
                                      "args": [\r
                                        {\r
                                          "fn": "var",\r
                                          "name": "left"\r
                                        },\r
                                        {\r
                                          "fn": "mul",\r
                                          "args": [\r
                                            {\r
                                              "fn": "var",\r
                                              "name": "ow"\r
                                            },\r
                                            0.5\r
                                          ]\r
                                        }\r
                                      ]\r
                                    },\r
                                    {\r
                                      "fn": "mul",\r
                                      "args": [\r
                                        {\r
                                          "fn": "var",\r
                                          "name": "len"\r
                                        },\r
                                        0.5\r
                                      ]\r
                                    }\r
                                  ]\r
                                }\r
                              ]\r
                            }\r
                          ]\r
                        },\r
                        {\r
                          "fn": "vec",\r
                          "args": [\r
                            0,\r
                            {\r
                              "fn": "sub",\r
                              "args": [\r
                                {\r
                                  "fn": "add",\r
                                  "args": [\r
                                    {\r
                                      "fn": "box",\r
                                      "name": "y0"\r
                                    },\r
                                    {\r
                                      "fn": "var",\r
                                      "name": "up"\r
                                    }\r
                                  ]\r
                                },\r
                                {\r
                                  "fn": "box",\r
                                  "name": "cy"\r
                                }\r
                              ]\r
                            },\r
                            0\r
                          ]\r
                        }\r
                      ]\r
                    },\r
                    "half": {\r
                      "fn": "mul",\r
                      "args": [\r
                        {\r
                          "fn": "var",\r
                          "name": "a"\r
                        },\r
                        {\r
                          "fn": "max",\r
                          "args": [\r
                            0,\r
                            {\r
                              "fn": "sub",\r
                              "args": [\r
                                {\r
                                  "fn": "mul",\r
                                  "args": [\r
                                    {\r
                                      "fn": "var",\r
                                      "name": "ow"\r
                                    },\r
                                    0.5\r
                                  ]\r
                                },\r
                                0.25\r
                              ]\r
                            }\r
                          ]\r
                        }\r
                      ]\r
                    }\r
                  },\r
                  "args": [\r
                    {\r
                      "fn": "sub",\r
                      "args": [\r
                        {\r
                          "fn": "box",\r
                          "name": "lo"\r
                        },\r
                        {\r
                          "fn": "sub",\r
                          "args": [\r
                            {\r
                              "fn": "var",\r
                              "name": "p"\r
                            },\r
                            {\r
                              "fn": "var",\r
                              "name": "half"\r
                            }\r
                          ]\r
                        }\r
                      ]\r
                    }\r
                  ]\r
                },\r
                "marginMax": {\r
                  "fn": "let",\r
                  "bind": {\r
                    "len": {\r
                      "fn": "select",\r
                      "args": [\r
                        {\r
                          "fn": "eq",\r
                          "args": [\r
                            {\r
                              "fn": "attribute",\r
                              "name": "alongAxis"\r
                            },\r
                            0\r
                          ]\r
                        },\r
                        {\r
                          "fn": "box",\r
                          "name": "sx"\r
                        },\r
                        {\r
                          "fn": "box",\r
                          "name": "sz"\r
                        }\r
                      ]\r
                    },\r
                    "ow": {\r
                      "fn": "min",\r
                      "args": [\r
                        {\r
                          "fn": "sub",\r
                          "args": [\r
                            {\r
                              "fn": "var",\r
                              "name": "len"\r
                            },\r
                            2\r
                          ]\r
                        },\r
                        {\r
                          "fn": "floor",\r
                          "args": [\r
                            {\r
                              "fn": "add",\r
                              "args": [\r
                                {\r
                                  "fn": "param",\r
                                  "name": "openingWidth"\r
                                },\r
                                0.5\r
                              ]\r
                            }\r
                          ]\r
                        }\r
                      ]\r
                    },\r
                    "left": {\r
                      "fn": "floor",\r
                      "args": [\r
                        {\r
                          "fn": "div",\r
                          "args": [\r
                            {\r
                              "fn": "sub",\r
                              "args": [\r
                                {\r
                                  "fn": "var",\r
                                  "name": "len"\r
                                },\r
                                {\r
                                  "fn": "var",\r
                                  "name": "ow"\r
                                }\r
                              ]\r
                            },\r
                            2\r
                          ]\r
                        }\r
                      ]\r
                    },\r
                    "o": {\r
                      "fn": "attribute",\r
                      "name": "outward",\r
                      "tupleSize": 3\r
                    },\r
                    "a": {\r
                      "fn": "select",\r
                      "args": [\r
                        {\r
                          "fn": "eq",\r
                          "args": [\r
                            {\r
                              "fn": "attribute",\r
                              "name": "alongAxis"\r
                            },\r
                            0\r
                          ]\r
                        },\r
                        {\r
                          "fn": "vec",\r
                          "args": [\r
                            1,\r
                            0,\r
                            0\r
                          ]\r
                        },\r
                        {\r
                          "fn": "vec",\r
                          "args": [\r
                            0,\r
                            0,\r
                            1\r
                          ]\r
                        }\r
                      ]\r
                    },\r
                    "up": {\r
                      "fn": "add",\r
                      "args": [\r
                        {\r
                          "fn": "mul",\r
                          "args": [\r
                            {\r
                              "fn": "sub",\r
                              "args": [\r
                                1,\r
                                {\r
                                  "fn": "attribute",\r
                                  "name": "door"\r
                                }\r
                              ]\r
                            },\r
                            {\r
                              "fn": "sub",\r
                              "args": [\r
                                {\r
                                  "fn": "floor",\r
                                  "args": [\r
                                    {\r
                                      "fn": "add",\r
                                      "args": [\r
                                        {\r
                                          "fn": "param",\r
                                          "name": "sillHeight"\r
                                        },\r
                                        0.5\r
                                      ]\r
                                    }\r
                                  ]\r
                                },\r
                                {\r
                                  "fn": "component",\r
                                  "args": [\r
                                    {\r
                                      "fn": "attribute",\r
                                      "name": "trim",\r
                                      "tupleSize": 3\r
                                    }\r
                                  ],\r
                                  "index": 0\r
                                }\r
                              ]\r
                            }\r
                          ]\r
                        },\r
                        0.5\r
                      ]\r
                    },\r
                    "p": {\r
                      "fn": "add",\r
                      "args": [\r
                        {\r
                          "fn": "add",\r
                          "args": [\r
                            {\r
                              "fn": "add",\r
                              "args": [\r
                                {\r
                                  "fn": "box",\r
                                  "name": "center"\r
                                },\r
                                {\r
                                  "fn": "mul",\r
                                  "args": [\r
                                    {\r
                                      "fn": "var",\r
                                      "name": "o"\r
                                    },\r
                                    {\r
                                      "fn": "add",\r
                                      "args": [\r
                                        {\r
                                          "fn": "mul",\r
                                          "args": [\r
                                            {\r
                                              "fn": "box",\r
                                              "name": "size"\r
                                            },\r
                                            0.5\r
                                          ]\r
                                        },\r
                                        0.5\r
                                      ]\r
                                    }\r
                                  ]\r
                                }\r
                              ]\r
                            },\r
                            {\r
                              "fn": "mul",\r
                              "args": [\r
                                {\r
                                  "fn": "mul",\r
                                  "args": [\r
                                    {\r
                                      "fn": "var",\r
                                      "name": "a"\r
                                    },\r
                                    {\r
                                      "fn": "attribute",\r
                                      "name": "alongSign"\r
                                    }\r
                                  ]\r
                                },\r
                                {\r
                                  "fn": "sub",\r
                                  "args": [\r
                                    {\r
                                      "fn": "add",\r
                                      "args": [\r
                                        {\r
                                          "fn": "var",\r
                                          "name": "left"\r
                                        },\r
                                        {\r
                                          "fn": "mul",\r
                                          "args": [\r
                                            {\r
                                              "fn": "var",\r
                                              "name": "ow"\r
                                            },\r
                                            0.5\r
                                          ]\r
                                        }\r
                                      ]\r
                                    },\r
                                    {\r
                                      "fn": "mul",\r
                                      "args": [\r
                                        {\r
                                          "fn": "var",\r
                                          "name": "len"\r
                                        },\r
                                        0.5\r
                                      ]\r
                                    }\r
                                  ]\r
                                }\r
                              ]\r
                            }\r
                          ]\r
                        },\r
                        {\r
                          "fn": "vec",\r
                          "args": [\r
                            0,\r
                            {\r
                              "fn": "sub",\r
                              "args": [\r
                                {\r
                                  "fn": "add",\r
                                  "args": [\r
                                    {\r
                                      "fn": "box",\r
                                      "name": "y0"\r
                                    },\r
                                    {\r
                                      "fn": "var",\r
                                      "name": "up"\r
                                    }\r
                                  ]\r
                                },\r
                                {\r
                                  "fn": "box",\r
                                  "name": "cy"\r
                                }\r
                              ]\r
                            },\r
                            0\r
                          ]\r
                        }\r
                      ]\r
                    },\r
                    "half": {\r
                      "fn": "mul",\r
                      "args": [\r
                        {\r
                          "fn": "var",\r
                          "name": "a"\r
                        },\r
                        {\r
                          "fn": "max",\r
                          "args": [\r
                            0,\r
                            {\r
                              "fn": "sub",\r
                              "args": [\r
                                {\r
                                  "fn": "mul",\r
                                  "args": [\r
                                    {\r
                                      "fn": "var",\r
                                      "name": "ow"\r
                                    },\r
                                    0.5\r
                                  ]\r
                                },\r
                                0.25\r
                              ]\r
                            }\r
                          ]\r
                        }\r
                      ]\r
                    }\r
                  },\r
                  "args": [\r
                    {\r
                      "fn": "sub",\r
                      "args": [\r
                        {\r
                          "fn": "add",\r
                          "args": [\r
                            {\r
                              "fn": "var",\r
                              "name": "p"\r
                            },\r
                            {\r
                              "fn": "var",\r
                              "name": "half"\r
                            }\r
                          ]\r
                        },\r
                        {\r
                          "fn": "box",\r
                          "name": "hi"\r
                        }\r
                      ]\r
                    }\r
                  ]\r
                },\r
                "queryFrame": "world",\r
                "targetFrame": "world",\r
                "excludeAttr": "",\r
                "excludeSelf": false,\r
                "hitAttr": "covered",\r
                "countAttr": "",\r
                "targetAttr": ""\r
              }\r
            },\r
            {\r
              "id": "bayKind",\r
              "type": "setAttribute",\r
              "params": {\r
                "name": "kind",\r
                "domain": "point",\r
                "type": "string",\r
                "tupleSize": 1,\r
                "value": {\r
                  "fn": "let",\r
                  "bind": {\r
                    "len": {\r
                      "fn": "select",\r
                      "args": [\r
                        {\r
                          "fn": "eq",\r
                          "args": [\r
                            {\r
                              "fn": "attribute",\r
                              "name": "alongAxis"\r
                            },\r
                            0\r
                          ]\r
                        },\r
                        {\r
                          "fn": "box",\r
                          "name": "sx"\r
                        },\r
                        {\r
                          "fn": "box",\r
                          "name": "sz"\r
                        }\r
                      ]\r
                    }\r
                  },\r
                  "args": [\r
                    {\r
                      "fn": "mul",\r
                      "args": [\r
                        {\r
                          "fn": "mul",\r
                          "args": [\r
                            {\r
                              "fn": "ge",\r
                              "args": [\r
                                {\r
                                  "fn": "var",\r
                                  "name": "len"\r
                                },\r
                                3\r
                              ]\r
                            },\r
                            {\r
                              "fn": "sub",\r
                              "args": [\r
                                1,\r
                                {\r
                                  "fn": "attribute",\r
                                  "name": "covered"\r
                                }\r
                              ]\r
                            }\r
                          ]\r
                        },\r
                        {\r
                          "fn": "max",\r
                          "args": [\r
                            {\r
                              "fn": "attribute",\r
                              "name": "door"\r
                            },\r
                            {\r
                              "fn": "lt",\r
                              "args": [\r
                                {\r
                                  "fn": "attribute",\r
                                  "name": "ruleRoll"\r
                                },\r
                                {\r
                                  "fn": "param",\r
                                  "name": "windowRate"\r
                                }\r
                              ]\r
                            }\r
                          ]\r
                        }\r
                      ]\r
                    }\r
                  ]\r
                },\r
                "select": 0,\r
                "values": [\r
                  "wall",\r
                  "opening"\r
                ],\r
                "weights": [],\r
                "stringValue": "",\r
                "seed": 0\r
              }\r
            },\r
            {\r
              "id": "jambs",\r
              "type": "splitBox",\r
              "params": {\r
                "axis": "perCell",\r
                "axisIndex": {\r
                  "fn": "attribute",\r
                  "name": "alongAxis"\r
                },\r
                "labels": [\r
                  "wall",\r
                  "opening",\r
                  "wall"\r
                ],\r
                "sizes": {\r
                  "fn": "let",\r
                  "bind": {\r
                    "len": {\r
                      "fn": "select",\r
                      "args": [\r
                        {\r
                          "fn": "eq",\r
                          "args": [\r
                            {\r
                              "fn": "attribute",\r
                              "name": "alongAxis"\r
                            },\r
                            0\r
                          ]\r
                        },\r
                        {\r
                          "fn": "box",\r
                          "name": "sx"\r
                        },\r
                        {\r
                          "fn": "box",\r
                          "name": "sz"\r
                        }\r
                      ]\r
                    },\r
                    "ow": {\r
                      "fn": "min",\r
                      "args": [\r
                        {\r
                          "fn": "sub",\r
                          "args": [\r
                            {\r
                              "fn": "var",\r
                              "name": "len"\r
                            },\r
                            2\r
                          ]\r
                        },\r
                        {\r
                          "fn": "floor",\r
                          "args": [\r
                            {\r
                              "fn": "add",\r
                              "args": [\r
                                {\r
                                  "fn": "param",\r
                                  "name": "openingWidth"\r
                                },\r
                                0.5\r
                              ]\r
                            }\r
                          ]\r
                        }\r
                      ]\r
                    },\r
                    "left": {\r
                      "fn": "floor",\r
                      "args": [\r
                        {\r
                          "fn": "div",\r
                          "args": [\r
                            {\r
                              "fn": "sub",\r
                              "args": [\r
                                {\r
                                  "fn": "var",\r
                                  "name": "len"\r
                                },\r
                                {\r
                                  "fn": "var",\r
                                  "name": "ow"\r
                                }\r
                              ]\r
                            },\r
                            2\r
                          ]\r
                        }\r
                      ]\r
                    }\r
                  },\r
                  "args": [\r
                    {\r
                      "fn": "vec",\r
                      "args": [\r
                        {\r
                          "fn": "var",\r
                          "name": "left"\r
                        },\r
                        {\r
                          "fn": "var",\r
                          "name": "ow"\r
                        },\r
                        1\r
                      ]\r
                    }\r
                  ]\r
                },\r
                "units": [\r
                  "absolute",\r
                  "absolute",\r
                  "relative"\r
                ],\r
                "repeatRound": "floor",\r
                "snap": [\r
                  0,\r
                  0,\r
                  0\r
                ],\r
                "snapMode": "round",\r
                "fit": "error",\r
                "direction": {\r
                  "fn": "attribute",\r
                  "name": "alongSign"\r
                },\r
                "where": 1,\r
                "labelAttr": "kind",\r
                "indexAttr": "",\r
                "countAttr": ""\r
              }\r
            },\r
            {\r
              "id": "courses",\r
              "type": "splitBox",\r
              "params": {\r
                "axis": "y",\r
                "axisIndex": 0,\r
                "labels": [\r
                  "wall",\r
                  "sill",\r
                  "glass",\r
                  "door",\r
                  "trim",\r
                  "wall"\r
                ],\r
                "sizes": {\r
                  "fn": "let",\r
                  "bind": {\r
                    "d": {\r
                      "fn": "attribute",\r
                      "name": "door"\r
                    },\r
                    "sh": {\r
                      "fn": "floor",\r
                      "args": [\r
                        {\r
                          "fn": "add",\r
                          "args": [\r
                            {\r
                              "fn": "param",\r
                              "name": "sillHeight"\r
                            },\r
                            0.5\r
                          ]\r
                        }\r
                      ]\r
                    },\r
                    "hh": {\r
                      "fn": "floor",\r
                      "args": [\r
                        {\r
                          "fn": "add",\r
                          "args": [\r
                            {\r
                              "fn": "param",\r
                              "name": "headHeight"\r
                            },\r
                            0.5\r
                          ]\r
                        }\r
                      ]\r
                    },\r
                    "hs": {\r
                      "fn": "mul",\r
                      "args": [\r
                        {\r
                          "fn": "sub",\r
                          "args": [\r
                            1,\r
                            {\r
                              "fn": "var",\r
                              "name": "d"\r
                            }\r
                          ]\r
                        },\r
                        {\r
                          "fn": "component",\r
                          "args": [\r
                            {\r
                              "fn": "attribute",\r
                              "name": "trim",\r
                              "tupleSize": 3\r
                            }\r
                          ],\r
                          "index": 0\r
                        }\r
                      ]\r
                    }\r
                  },\r
                  "args": [\r
                    {\r
                      "fn": "vec",\r
                      "args": [\r
                        {\r
                          "fn": "sub",\r
                          "args": [\r
                            {\r
                              "fn": "mul",\r
                              "args": [\r
                                {\r
                                  "fn": "sub",\r
                                  "args": [\r
                                    1,\r
                                    {\r
                                      "fn": "var",\r
                                      "name": "d"\r
                                    }\r
                                  ]\r
                                },\r
                                {\r
                                  "fn": "var",\r
                                  "name": "sh"\r
                                }\r
                              ]\r
                            },\r
                            {\r
                              "fn": "var",\r
                              "name": "hs"\r
                            }\r
                          ]\r
                        },\r
                        {\r
                          "fn": "var",\r
                          "name": "hs"\r
                        },\r
                        {\r
                          "fn": "mul",\r
                          "args": [\r
                            {\r
                              "fn": "sub",\r
                              "args": [\r
                                1,\r
                                {\r
                                  "fn": "var",\r
                                  "name": "d"\r
                                }\r
                              ]\r
                            },\r
                            {\r
                              "fn": "sub",\r
                              "args": [\r
                                {\r
                                  "fn": "var",\r
                                  "name": "hh"\r
                                },\r
                                {\r
                                  "fn": "var",\r
                                  "name": "sh"\r
                                }\r
                              ]\r
                            }\r
                          ]\r
                        },\r
                        {\r
                          "fn": "mul",\r
                          "args": [\r
                            {\r
                              "fn": "var",\r
                              "name": "d"\r
                            },\r
                            {\r
                              "fn": "var",\r
                              "name": "hh"\r
                            }\r
                          ]\r
                        },\r
                        {\r
                          "fn": "mul",\r
                          "args": [\r
                            {\r
                              "fn": "component",\r
                              "args": [\r
                                {\r
                                  "fn": "attribute",\r
                                  "name": "trim",\r
                                  "tupleSize": 3\r
                                }\r
                              ],\r
                              "index": 1\r
                            },\r
                            {\r
                              "fn": "min",\r
                              "args": [\r
                                3,\r
                                {\r
                                  "fn": "sub",\r
                                  "args": [\r
                                    {\r
                                      "fn": "box",\r
                                      "name": "sy"\r
                                    },\r
                                    {\r
                                      "fn": "var",\r
                                      "name": "hh"\r
                                    }\r
                                  ]\r
                                }\r
                              ]\r
                            }\r
                          ]\r
                        },\r
                        1\r
                      ]\r
                    }\r
                  ]\r
                },\r
                "units": [\r
                  "absolute",\r
                  "absolute",\r
                  "absolute",\r
                  "absolute",\r
                  "absolute",\r
                  "relative"\r
                ],\r
                "repeatRound": "floor",\r
                "snap": [\r
                  0,\r
                  0,\r
                  0\r
                ],\r
                "snapMode": "round",\r
                "fit": "error",\r
                "direction": 1,\r
                "where": {\r
                  "fn": "attributeIs",\r
                  "name": "kind",\r
                  "value": "opening"\r
                },\r
                "labelAttr": "kind",\r
                "indexAttr": "",\r
                "countAttr": ""\r
              }\r
            },\r
            {\r
              "id": "sillOut",\r
              "type": "offsetBox",\r
              "params": {\r
                "margin": [\r
                  0,\r
                  0,\r
                  0\r
                ],\r
                "marginMin": [\r
                  0,\r
                  0,\r
                  0\r
                ],\r
                "marginMax": [\r
                  0,\r
                  0,\r
                  1\r
                ],\r
                "frame": "face",\r
                "alongAxisAttr": "alongAxis",\r
                "alongSignAttr": "alongSign",\r
                "outwardAttr": "outward",\r
                "snap": [\r
                  0,\r
                  0,\r
                  0\r
                ],\r
                "snapTo": "lattice",\r
                "snapMode": "round",\r
                "fit": "error",\r
                "where": 1\r
              }\r
            },\r
            {\r
              "id": "sillTrim",\r
              "type": "setAttribute",\r
              "params": {\r
                "name": "kind",\r
                "domain": "point",\r
                "type": "string",\r
                "tupleSize": 1,\r
                "value": 0,\r
                "select": 0,\r
                "values": [],\r
                "weights": [],\r
                "stringValue": "trim",\r
                "seed": 0\r
              }\r
            }\r
          ],\r
          "connections": [\r
            {\r
              "from": [\r
                "storeys",\r
                "out"\r
              ],\r
              "to": [\r
                "shell",\r
                "in"\r
              ]\r
            },\r
            {\r
              "from": [\r
                "door",\r
                "out"\r
              ],\r
              "to": [\r
                "exposed",\r
                "in"\r
              ]\r
            },\r
            {\r
              "from": [\r
                "exposed",\r
                "out"\r
              ],\r
              "to": [\r
                "bayKind",\r
                "in"\r
              ]\r
            },\r
            {\r
              "from": [\r
                "jambs",\r
                "out"\r
              ],\r
              "to": [\r
                "courses",\r
                "in"\r
              ]\r
            },\r
            {\r
              "from": [\r
                "sillOut",\r
                "out"\r
              ],\r
              "to": [\r
                "sillTrim",\r
                "in"\r
              ]\r
            }\r
          ],\r
          "outputs": []\r
        },\r
        "inputs": [\r
          {\r
            "name": "tier",\r
            "node": "storeys",\r
            "pin": "in"\r
          },\r
          {\r
            "name": "face",\r
            "node": "bays",\r
            "pin": "in"\r
          },\r
          {\r
            "name": "bay",\r
            "node": "door",\r
            "pin": "in"\r
          },\r
          {\r
            "name": "opening",\r
            "node": "jambs",\r
            "pin": "in"\r
          },\r
          {\r
            "name": "sill",\r
            "node": "sillOut",\r
            "pin": "in"\r
          },\r
          {\r
            "name": "occluder",\r
            "node": "exposed",\r
            "pin": "targets"\r
          }\r
        ],\r
        "outputs": [\r
          {\r
            "name": "tier",\r
            "node": "shell",\r
            "pin": "out"\r
          },\r
          {\r
            "name": "face",\r
            "node": "bays",\r
            "pin": "out"\r
          },\r
          {\r
            "name": "bay",\r
            "node": "bayKind",\r
            "pin": "out"\r
          },\r
          {\r
            "name": "opening",\r
            "node": "courses",\r
            "pin": "out"\r
          },\r
          {\r
            "name": "sill",\r
            "node": "sillTrim",\r
            "pin": "out"\r
          }\r
        ],\r
        "params": [\r
          {\r
            "name": "storeyHeight",\r
            "targets": [],\r
            "description": "The graph param storeyHeight, read by name in the rules.",\r
            "default": 16,\r
            "min": 15,\r
            "max": 21\r
          },\r
          {\r
            "name": "sillHeight",\r
            "targets": [],\r
            "description": "The graph param sillHeight, read by name in the rules.",\r
            "default": 6,\r
            "min": 2,\r
            "max": 7\r
          },\r
          {\r
            "name": "headHeight",\r
            "targets": [],\r
            "description": "The graph param headHeight, read by name in the rules.",\r
            "default": 12,\r
            "min": 8,\r
            "max": 13\r
          },\r
          {\r
            "name": "bayWidth",\r
            "targets": [],\r
            "description": "The graph param bayWidth, read by name in the rules.",\r
            "default": 4,\r
            "min": 3,\r
            "max": 8\r
          },\r
          {\r
            "name": "openingWidth",\r
            "targets": [],\r
            "description": "The graph param openingWidth, read by name in the rules.",\r
            "default": 2,\r
            "min": 1,\r
            "max": 4\r
          },\r
          {\r
            "name": "windowRate",\r
            "targets": [],\r
            "description": "The graph param windowRate, read by name in the rules.",\r
            "default": 0.8,\r
            "min": 0,\r
            "max": 1\r
          }\r
        ]\r
      }\r
    },\r
    {\r
      "id": "gBox",\r
      "type": "offsetBox",\r
      "params": {\r
        "margin": [\r
          2,\r
          0,\r
          2\r
        ],\r
        "marginMin": [\r
          0,\r
          1,\r
          0\r
        ],\r
        "marginMax": {\r
          "fn": "vec",\r
          "args": [\r
            0,\r
            {\r
              "fn": "sub",\r
              "args": [\r
                1,\r
                {\r
                  "fn": "box",\r
                  "name": "y1"\r
                }\r
              ]\r
            },\r
            0\r
          ]\r
        },\r
        "frame": "world",\r
        "alongAxisAttr": "alongAxis",\r
        "alongSignAttr": "alongSign",\r
        "outwardAttr": "outward",\r
        "snap": [\r
          8,\r
          0,\r
          8\r
        ],\r
        "snapTo": "size",\r
        "snapMode": "out",\r
        "fit": "error",\r
        "where": 1\r
      }\r
    },\r
    {\r
      "id": "gKind",\r
      "type": "setAttribute",\r
      "params": {\r
        "name": "kind",\r
        "domain": "point",\r
        "type": "string",\r
        "tupleSize": 1,\r
        "value": 0,\r
        "select": 0,\r
        "values": [],\r
        "weights": [],\r
        "stringValue": "ground",\r
        "seed": 0\r
      }\r
    },\r
    {\r
      "id": "pieces",\r
      "type": "mergePoints",\r
      "params": {}\r
    },\r
    {\r
      "id": "tint",\r
      "type": "setAttribute",\r
      "params": {\r
        "name": "tint",\r
        "domain": "point",\r
        "type": "f32",\r
        "tupleSize": 3,\r
        "value": {\r
          "fn": "byAttribute",\r
          "name": "kind",\r
          "cases": {\r
            "wall": {\r
              "fn": "choose",\r
              "args": [\r
                {\r
                  "fn": "attribute",\r
                  "name": "wallTint"\r
                },\r
                [\r
                  0.93,\r
                  0.92,\r
                  0.88\r
                ],\r
                [\r
                  0.85,\r
                  0.75,\r
                  0.55\r
                ],\r
                [\r
                  0.7,\r
                  0.16,\r
                  0.12\r
                ],\r
                [\r
                  0.95,\r
                  0.76,\r
                  0.16\r
                ],\r
                [\r
                  0.6,\r
                  0.63,\r
                  0.64\r
                ]\r
              ]\r
            },\r
            "trim": {\r
              "fn": "choose",\r
              "args": [\r
                {\r
                  "fn": "attribute",\r
                  "name": "wallTint"\r
                },\r
                [\r
                  0.787,\r
                  0.665,\r
                  0.505\r
                ],\r
                [\r
                  0.595,\r
                  0.525,\r
                  0.385\r
                ],\r
                [\r
                  0.49,\r
                  0.112,\r
                  0.084\r
                ],\r
                [\r
                  0.665,\r
                  0.532,\r
                  0.112\r
                ],\r
                [\r
                  0.705,\r
                  0.593,\r
                  0.445\r
                ]\r
              ]\r
            },\r
            "roof": {\r
              "fn": "choose",\r
              "args": [\r
                {\r
                  "fn": "attribute",\r
                  "name": "roofTint"\r
                },\r
                [\r
                  0.42,\r
                  0.1,\r
                  0.08\r
                ],\r
                [\r
                  0.3,\r
                  0.33,\r
                  0.36\r
                ],\r
                [\r
                  0.2,\r
                  0.32,\r
                  0.18\r
                ]\r
              ]\r
            },\r
            "chimney": [\r
              0.42,\r
              0.2,\r
              0.16\r
            ],\r
            "glass": [\r
              0.55,\r
              0.8,\r
              0.95\r
            ],\r
            "door": [\r
              0.42,\r
              0.25,\r
              0.12\r
            ],\r
            "floor": [\r
              0.62,\r
              0.62,\r
              0.6\r
            ],\r
            "ground": [\r
              0.3,\r
              0.6,\r
              0.25\r
            ]\r
          },\r
          "default": [\r
            1,\r
            0,\r
            1\r
          ]\r
        },\r
        "select": 0,\r
        "values": [],\r
        "weights": [],\r
        "stringValue": "",\r
        "seed": 0\r
      }\r
    },\r
    {\r
      "id": "bounds",\r
      "type": "transformBox",\r
      "params": {\r
        "scale": [\r
          1,\r
          0.4,\r
          1\r
        ],\r
        "pivot": [\r
          0,\r
          0,\r
          0\r
        ],\r
        "pivotIn": "world",\r
        "translate": {\r
          "fn": "mul",\r
          "args": [\r
            {\r
              "fn": "attribute",\r
              "name": "lot",\r
              "tupleSize": 3\r
            },\r
            [\r
              -0.5,\r
              0,\r
              -0.5\r
            ]\r
          ]\r
        },\r
        "where": 1\r
      }\r
    },\r
    {\r
      "id": "pack",\r
      "type": "packBricks",\r
      "params": {\r
        "minAttr": "boundsMin",\r
        "maxAttr": "boundsMax",\r
        "pitch": [\r
          1,\r
          0.4,\r
          1\r
        ],\r
        "origin": [\r
          0,\r
          0,\r
          0\r
        ],\r
        "bricks": [\r
          2,\r
          8,\r
          3,\r
          2,\r
          6,\r
          3,\r
          2,\r
          4,\r
          3,\r
          2,\r
          3,\r
          3,\r
          2,\r
          2,\r
          3,\r
          1,\r
          8,\r
          3,\r
          1,\r
          6,\r
          3,\r
          1,\r
          4,\r
          3,\r
          1,\r
          3,\r
          3,\r
          1,\r
          2,\r
          3,\r
          1,\r
          1,\r
          3,\r
          2,\r
          16,\r
          1,\r
          2,\r
          12,\r
          1,\r
          2,\r
          10,\r
          1,\r
          2,\r
          8,\r
          1,\r
          2,\r
          6,\r
          1,\r
          2,\r
          4,\r
          1,\r
          2,\r
          3,\r
          1,\r
          2,\r
          2,\r
          1,\r
          1,\r
          12,\r
          1,\r
          1,\r
          10,\r
          1,\r
          1,\r
          8,\r
          1,\r
          1,\r
          6,\r
          1,\r
          1,\r
          4,\r
          1,\r
          1,\r
          3,\r
          1,\r
          1,\r
          2,\r
          1,\r
          1,\r
          1,\r
          1\r
        ],\r
        "extraBricks": [\r
          16,\r
          16,\r
          1,\r
          16,\r
          24,\r
          1,\r
          16,\r
          32,\r
          1,\r
          16,\r
          40,\r
          1,\r
          24,\r
          24,\r
          1,\r
          24,\r
          32,\r
          1,\r
          24,\r
          40,\r
          1,\r
          32,\r
          32,\r
          1,\r
          32,\r
          40,\r
          1,\r
          40,\r
          40,\r
          1\r
        ],\r
        "groupBy": [\r
          "kind",\r
          "tint"\r
        ],\r
        "stagger": 3,\r
        "bond": 16,\r
        "studMode": "all",\r
        "islandsAttr": "islands"\r
      }\r
    },\r
    {\r
      "id": "connect",\r
      "type": "brickConnectivity",\r
      "params": {\r
        "minAttr": "boundsMin",\r
        "maxAttr": "boundsMax",\r
        "pitch": [\r
          1,\r
          0.4,\r
          1\r
        ],\r
        "origin": [\r
          0,\r
          0,\r
          0\r
        ],\r
        "islandAttr": "island",\r
        "stepAttr": "step",\r
        "stepAboveAttr": "stepAbove",\r
        "stepCountAttr": "stepCount",\r
        "islandsAttr": "islands"\r
      }\r
    },\r
    {\r
      "id": "vary",\r
      "type": "setAttribute",\r
      "params": {\r
        "name": "tint",\r
        "domain": "point",\r
        "type": "f32",\r
        "tupleSize": 3,\r
        "value": {\r
          "fn": "let",\r
          "bind": {\r
            "c": {\r
              "fn": "attribute",\r
              "name": "tint",\r
              "tupleSize": 3\r
            },\r
            "r": {\r
              "fn": "randomField",\r
              "key": "vary"\r
            },\r
            "v": {\r
              "fn": "param",\r
              "name": "brickVariation"\r
            },\r
            "pl": {\r
              "fn": "mul",\r
              "args": [\r
                {\r
                  "fn": "component",\r
                  "args": [\r
                    {\r
                      "fn": "attribute",\r
                      "name": "trim",\r
                      "tupleSize": 3\r
                    }\r
                  ],\r
                  "index": 2\r
                },\r
                {\r
                  "fn": "lt",\r
                  "args": [\r
                    {\r
                      "fn": "abs",\r
                      "args": [\r
                        {\r
                          "fn": "sub",\r
                          "args": [\r
                            {\r
                              "fn": "box",\r
                              "name": "y0"\r
                            },\r
                            0.8\r
                          ]\r
                        }\r
                      ]\r
                    },\r
                    0.1\r
                  ]\r
                }\r
              ]\r
            }\r
          },\r
          "args": [\r
            {\r
              "fn": "byAttribute",\r
              "name": "kind",\r
              "cases": {\r
                "wall": {\r
                  "fn": "select",\r
                  "args": [\r
                    {\r
                      "fn": "var",\r
                      "name": "pl"\r
                    },\r
                    [\r
                      0.27,\r
                      0.28,\r
                      0.3\r
                    ],\r
                    {\r
                      "fn": "select",\r
                      "args": [\r
                        {\r
                          "fn": "lt",\r
                          "args": [\r
                            {\r
                              "fn": "var",\r
                              "name": "r"\r
                            },\r
                            {\r
                              "fn": "var",\r
                              "name": "v"\r
                            }\r
                          ]\r
                        },\r
                        {\r
                          "fn": "select",\r
                          "args": [\r
                            {\r
                              "fn": "lt",\r
                              "args": [\r
                                {\r
                                  "fn": "var",\r
                                  "name": "r"\r
                                },\r
                                {\r
                                  "fn": "mul",\r
                                  "args": [\r
                                    0.5,\r
                                    {\r
                                      "fn": "var",\r
                                      "name": "v"\r
                                    }\r
                                  ]\r
                                }\r
                              ]\r
                            },\r
                            {\r
                              "fn": "mul",\r
                              "args": [\r
                                0.88,\r
                                {\r
                                  "fn": "var",\r
                                  "name": "c"\r
                                }\r
                              ]\r
                            },\r
                            {\r
                              "fn": "min",\r
                              "args": [\r
                                {\r
                                  "fn": "mul",\r
                                  "args": [\r
                                    1.1,\r
                                    {\r
                                      "fn": "var",\r
                                      "name": "c"\r
                                    }\r
                                  ]\r
                                },\r
                                1\r
                              ]\r
                            }\r
                          ]\r
                        },\r
                        {\r
                          "fn": "var",\r
                          "name": "c"\r
                        }\r
                      ]\r
                    }\r
                  ]\r
                }\r
              },\r
              "default": {\r
                "fn": "var",\r
                "name": "c"\r
              }\r
            }\r
          ]\r
        },\r
        "select": 0,\r
        "values": [],\r
        "weights": [],\r
        "stringValue": "",\r
        "seed": 0\r
      }\r
    },\r
    {\r
      "id": "shownAt",\r
      "type": "setAttribute",\r
      "params": {\r
        "name": "shownAt",\r
        "domain": "point",\r
        "type": "f32",\r
        "tupleSize": 1,\r
        "value": {\r
          "fn": "select",\r
          "args": [\r
            {\r
              "fn": "lt",\r
              "args": [\r
                {\r
                  "fn": "attribute",\r
                  "name": "step"\r
                },\r
                0\r
              ]\r
            },\r
            138,\r
            {\r
              "fn": "attribute",\r
              "name": "step"\r
            }\r
          ]\r
        },\r
        "select": 0,\r
        "values": [],\r
        "weights": [],\r
        "stringValue": "",\r
        "seed": 0\r
      }\r
    },\r
    {\r
      "id": "built",\r
      "type": "filterByExpression",\r
      "params": {\r
        "predicate": {\r
          "fn": "le",\r
          "args": [\r
            {\r
              "fn": "attribute",\r
              "name": "shownAt"\r
            },\r
            {\r
              "fn": "param",\r
              "name": "buildStep"\r
            }\r
          ]\r
        },\r
        "seed": 0,\r
        "topology": "drop"\r
      }\r
    },\r
    {\r
      "id": "gap",\r
      "type": "setAttribute",\r
      "params": {\r
        "name": "scale",\r
        "domain": "point",\r
        "type": "f32",\r
        "tupleSize": 3,\r
        "value": {\r
          "fn": "sub",\r
          "args": [\r
            {\r
              "fn": "attribute",\r
              "name": "scale",\r
              "tupleSize": 3\r
            },\r
            0.04\r
          ]\r
        },\r
        "select": 0,\r
        "values": [],\r
        "weights": [],\r
        "stringValue": "",\r
        "seed": 0\r
      }\r
    },\r
    {\r
      "id": "bricks",\r
      "type": "spawnInstances",\r
      "params": {\r
        "assetId": "brick",\r
        "assetAttr": "",\r
        "colorAttr": "tint",\r
        "instanceAttrs": []\r
      }\r
    },\r
    {\r
      "id": "showing",\r
      "type": "filterByExpression",\r
      "params": {\r
        "predicate": {\r
          "fn": "mul",\r
          "args": [\r
            {\r
              "fn": "mul",\r
              "args": [\r
                {\r
                  "fn": "le",\r
                  "args": [\r
                    {\r
                      "fn": "select",\r
                      "args": [\r
                        {\r
                          "fn": "lt",\r
                          "args": [\r
                            {\r
                              "fn": "attribute",\r
                              "name": "step"\r
                            },\r
                            0\r
                          ]\r
                        },\r
                        138,\r
                        {\r
                          "fn": "attribute",\r
                          "name": "step"\r
                        }\r
                      ]\r
                    },\r
                    {\r
                      "fn": "param",\r
                      "name": "buildStep"\r
                    }\r
                  ]\r
                },\r
                {\r
                  "fn": "max",\r
                  "args": [\r
                    {\r
                      "fn": "lt",\r
                      "args": [\r
                        {\r
                          "fn": "attribute",\r
                          "name": "brickAbove"\r
                        },\r
                        0\r
                      ]\r
                    },\r
                    {\r
                      "fn": "gt",\r
                      "args": [\r
                        {\r
                          "fn": "select",\r
                          "args": [\r
                            {\r
                              "fn": "lt",\r
                              "args": [\r
                                {\r
                                  "fn": "attribute",\r
                                  "name": "stepAbove"\r
                                },\r
                                0\r
                              ]\r
                            },\r
                            138,\r
                            {\r
                              "fn": "attribute",\r
                              "name": "stepAbove"\r
                            }\r
                          ]\r
                        },\r
                        {\r
                          "fn": "param",\r
                          "name": "buildStep"\r
                        }\r
                      ]\r
                    }\r
                  ]\r
                }\r
              ]\r
            },\r
            {\r
              "fn": "sub",\r
              "args": [\r
                1,\r
                {\r
                  "fn": "mul",\r
                  "args": [\r
                    {\r
                      "fn": "attributeIs",\r
                      "name": "kind",\r
                      "value": "trim"\r
                    },\r
                    {\r
                      "fn": "lt",\r
                      "args": [\r
                        {\r
                          "fn": "attribute",\r
                          "name": "brickAbove"\r
                        },\r
                        0\r
                      ]\r
                    }\r
                  ]\r
                }\r
              ]\r
            }\r
          ]\r
        },\r
        "seed": 0,\r
        "topology": "drop"\r
      }\r
    },\r
    {\r
      "id": "studTint",\r
      "type": "transferByIndex",\r
      "params": {\r
        "index": {\r
          "fn": "attribute",\r
          "name": "brickId"\r
        },\r
        "attributes": [\r
          "tint"\r
        ],\r
        "outNames": [],\r
        "outOfRange": "clamp",\r
        "hitAttr": "",\r
        "missCountAttr": ""\r
      }\r
    },\r
    {\r
      "id": "studs",\r
      "type": "spawnInstances",\r
      "params": {\r
        "assetId": "stud",\r
        "assetAttr": "",\r
        "colorAttr": "tint",\r
        "instanceAttrs": []\r
      }\r
    },\r
    {\r
      "id": "potStuds",\r
      "type": "filterByExpression",\r
      "params": {\r
        "predicate": {\r
          "fn": "mul",\r
          "args": [\r
            {\r
              "fn": "attributeIs",\r
              "name": "kind",\r
              "value": "chimney"\r
            },\r
            {\r
              "fn": "lt",\r
              "args": [\r
                {\r
                  "fn": "attribute",\r
                  "name": "brickAbove"\r
                },\r
                0\r
              ]\r
            }\r
          ]\r
        },\r
        "seed": 0,\r
        "topology": "drop"\r
      }\r
    },\r
    {\r
      "id": "potTint",\r
      "type": "setAttribute",\r
      "params": {\r
        "name": "tint",\r
        "domain": "point",\r
        "type": "f32",\r
        "tupleSize": 3,\r
        "value": {\r
          "fn": "vec",\r
          "args": [\r
            0.85,\r
            0.52,\r
            0.3\r
          ]\r
        },\r
        "select": 0,\r
        "values": [],\r
        "weights": [],\r
        "stringValue": "",\r
        "seed": 0\r
      }\r
    },\r
    {\r
      "id": "pots",\r
      "type": "spawnInstances",\r
      "params": {\r
        "assetId": "pot",\r
        "assetAttr": "",\r
        "colorAttr": "tint",\r
        "instanceAttrs": []\r
      }\r
    },\r
    {\r
      "id": "brickMesh",\r
      "type": "meshPrimitive",\r
      "params": {\r
        "shape": "box",\r
        "size": [\r
          1,\r
          1,\r
          1\r
        ],\r
        "center": [\r
          0,\r
          0,\r
          0\r
        ],\r
        "orientation": "xz",\r
        "subdivisions": [\r
          1,\r
          1,\r
          1\r
        ],\r
        "sides": 16,\r
        "caps": "both",\r
        "flip": false,\r
        "normals": false\r
      }\r
    },\r
    {\r
      "id": "studMesh",\r
      "type": "meshPrimitive",\r
      "params": {\r
        "shape": "cylinder",\r
        "size": [\r
          0.6,\r
          0.2125,\r
          0.6\r
        ],\r
        "center": [\r
          0,\r
          0.08625,\r
          0\r
        ],\r
        "orientation": "xz",\r
        "subdivisions": [\r
          1,\r
          1,\r
          1\r
        ],\r
        "sides": 12,\r
        "caps": "top",\r
        "flip": false,\r
        "normals": true\r
      }\r
    },\r
    {\r
      "id": "potMesh",\r
      "type": "meshPrimitive",\r
      "params": {\r
        "shape": "cylinder",\r
        "size": [\r
          0.8,\r
          0.8,\r
          0.8\r
        ],\r
        "center": [\r
          0,\r
          0.38,\r
          0\r
        ],\r
        "orientation": "xz",\r
        "subdivisions": [\r
          1,\r
          1,\r
          1\r
        ],\r
        "sides": 12,\r
        "caps": "top",\r
        "flip": false,\r
        "normals": true\r
      }\r
    }\r
  ],\r
  "connections": [\r
    {\r
      "from": [\r
        "lotPt",\r
        "out"\r
      ],\r
      "to": [\r
        "lotSize",\r
        "in"\r
      ]\r
    },\r
    {\r
      "from": [\r
        "lotSize",\r
        "out"\r
      ],\r
      "to": [\r
        "lotBox",\r
        "in"\r
      ]\r
    },\r
    {\r
      "from": [\r
        "lotBox",\r
        "out"\r
      ],\r
      "to": [\r
        "lotPlinth",\r
        "in"\r
      ]\r
    },\r
    {\r
      "from": [\r
        "lotPlinth",\r
        "out"\r
      ],\r
      "to": [\r
        "lotKind",\r
        "in"\r
      ]\r
    },\r
    {\r
      "from": [\r
        "lotKind",\r
        "out"\r
      ],\r
      "to": [\r
        "massing",\r
        "in"\r
      ]\r
    },\r
    {\r
      "from": [\r
        "massing",\r
        "out"\r
      ],\r
      "to": [\r
        "tiers",\r
        "in"\r
      ]\r
    },\r
    {\r
      "from": [\r
        "massing",\r
        "trail"\r
      ],\r
      "to": [\r
        "chimRoll",\r
        "in"\r
      ]\r
    },\r
    {\r
      "from": [\r
        "chimRoll",\r
        "out"\r
      ],\r
      "to": [\r
        "chimPick",\r
        "in"\r
      ]\r
    },\r
    {\r
      "from": [\r
        "chimPick",\r
        "out"\r
      ],\r
      "to": [\r
        "chimBox",\r
        "in"\r
      ]\r
    },\r
    {\r
      "from": [\r
        "chimPick",\r
        "out"\r
      ],\r
      "to": [\r
        "chimShadow",\r
        "in"\r
      ]\r
    },\r
    {\r
      "from": [\r
        "massing",\r
        "out"\r
      ],\r
      "to": [\r
        "occluder",\r
        "in"\r
      ]\r
    },\r
    {\r
      "from": [\r
        "chimShadow",\r
        "out"\r
      ],\r
      "to": [\r
        "occluder",\r
        "in"\r
      ]\r
    },\r
    {\r
      "from": [\r
        "tiers",\r
        "out"\r
      ],\r
      "to": [\r
        "facade",\r
        "in"\r
      ]\r
    },\r
    {\r
      "from": [\r
        "occluder",\r
        "out"\r
      ],\r
      "to": [\r
        "facade",\r
        "occluder"\r
      ]\r
    },\r
    {\r
      "from": [\r
        "lotBox",\r
        "out"\r
      ],\r
      "to": [\r
        "gBox",\r
        "in"\r
      ]\r
    },\r
    {\r
      "from": [\r
        "gBox",\r
        "out"\r
      ],\r
      "to": [\r
        "gKind",\r
        "in"\r
      ]\r
    },\r
    {\r
      "from": [\r
        "gKind",\r
        "out"\r
      ],\r
      "to": [\r
        "pieces",\r
        "in"\r
      ]\r
    },\r
    {\r
      "from": [\r
        "tiers",\r
        "rest"\r
      ],\r
      "to": [\r
        "pieces",\r
        "in"\r
      ]\r
    },\r
    {\r
      "from": [\r
        "facade",\r
        "out"\r
      ],\r
      "to": [\r
        "pieces",\r
        "in"\r
      ]\r
    },\r
    {\r
      "from": [\r
        "chimBox",\r
        "out"\r
      ],\r
      "to": [\r
        "pieces",\r
        "in"\r
      ]\r
    },\r
    {\r
      "from": [\r
        "pieces",\r
        "out"\r
      ],\r
      "to": [\r
        "tint",\r
        "in"\r
      ]\r
    },\r
    {\r
      "from": [\r
        "tint",\r
        "out"\r
      ],\r
      "to": [\r
        "bounds",\r
        "in"\r
      ]\r
    },\r
    {\r
      "from": [\r
        "bounds",\r
        "out"\r
      ],\r
      "to": [\r
        "pack",\r
        "in"\r
      ]\r
    },\r
    {\r
      "from": [\r
        "pack",\r
        "out"\r
      ],\r
      "to": [\r
        "connect",\r
        "in"\r
      ]\r
    },\r
    {\r
      "from": [\r
        "pack",\r
        "studs"\r
      ],\r
      "to": [\r
        "connect",\r
        "studs"\r
      ]\r
    },\r
    {\r
      "from": [\r
        "connect",\r
        "out"\r
      ],\r
      "to": [\r
        "vary",\r
        "in"\r
      ]\r
    },\r
    {\r
      "from": [\r
        "vary",\r
        "out"\r
      ],\r
      "to": [\r
        "shownAt",\r
        "in"\r
      ]\r
    },\r
    {\r
      "from": [\r
        "shownAt",\r
        "out"\r
      ],\r
      "to": [\r
        "built",\r
        "in"\r
      ]\r
    },\r
    {\r
      "from": [\r
        "built",\r
        "out"\r
      ],\r
      "to": [\r
        "gap",\r
        "in"\r
      ]\r
    },\r
    {\r
      "from": [\r
        "gap",\r
        "out"\r
      ],\r
      "to": [\r
        "bricks",\r
        "in"\r
      ]\r
    },\r
    {\r
      "from": [\r
        "connect",\r
        "studs"\r
      ],\r
      "to": [\r
        "studTint",\r
        "in"\r
      ]\r
    },\r
    {\r
      "from": [\r
        "vary",\r
        "out"\r
      ],\r
      "to": [\r
        "studTint",\r
        "source"\r
      ]\r
    },\r
    {\r
      "from": [\r
        "studTint",\r
        "out"\r
      ],\r
      "to": [\r
        "showing",\r
        "in"\r
      ]\r
    },\r
    {\r
      "from": [\r
        "showing",\r
        "out"\r
      ],\r
      "to": [\r
        "studs",\r
        "in"\r
      ]\r
    },\r
    {\r
      "from": [\r
        "showing",\r
        "out"\r
      ],\r
      "to": [\r
        "potStuds",\r
        "in"\r
      ]\r
    },\r
    {\r
      "from": [\r
        "potStuds",\r
        "out"\r
      ],\r
      "to": [\r
        "potTint",\r
        "in"\r
      ]\r
    },\r
    {\r
      "from": [\r
        "potTint",\r
        "out"\r
      ],\r
      "to": [\r
        "pots",\r
        "in"\r
      ]\r
    }\r
  ],\r
  "outputs": [\r
    {\r
      "id": "bricks",\r
      "pin": "instances",\r
      "name": "bricks"\r
    },\r
    {\r
      "id": "studs",\r
      "pin": "instances",\r
      "name": "studs"\r
    },\r
    {\r
      "id": "brickMesh",\r
      "pin": "out",\r
      "name": "brick",\r
      "role": "asset"\r
    },\r
    {\r
      "id": "studMesh",\r
      "pin": "out",\r
      "name": "stud",\r
      "role": "asset"\r
    },\r
    {\r
      "id": "pots",\r
      "pin": "instances",\r
      "name": "pots"\r
    },\r
    {\r
      "id": "potMesh",\r
      "pin": "out",\r
      "name": "pot",\r
      "role": "asset"\r
    }\r
  ]\r
}\r
`;export{t as n,n as t};