var e=`{\r
  "_comment": "Panel spec — presentation only; the graph cooks identically without it. See shared/graphUi.ts.",\r
  "sections": [\r
    {\r
      "title": "World source",\r
      "controls": [\r
        {\r
          "param": "scatter.density",\r
          "label": "Density",\r
          "min": 0.05,\r
          "max": 1.5,\r
          "step": 0.05,\r
          "unit": " /m²"\r
        },\r
        {\r
          "param": "scatter.cellSize",\r
          "label": "Lattice cell",\r
          "description": "The source's OWN clumping scale, deliberately not a divisor of any World cell size. It decides evenness, never population.",\r
          "min": 2,\r
          "max": 20,\r
          "step": 1,\r
          "unit": " m"\r
        },\r
        {\r
          "param": "scatter.boundsMin",\r
          "label": "Query min",\r
          "description": "The cell grown by the halo. A World binds this to ctx.min minus the neighbourhood radius; shrink it to the ownership box below and the border points start measuring a world that stops at the border."\r
        },\r
        {\r
          "param": "scatter.boundsMax",\r
          "label": "Query max",\r
          "description": "The cell grown by the halo. A World binds this to ctx.max plus the neighbourhood radius."\r
        },\r
        {\r
          "param": "scatter.seed",\r
          "label": "World seed",\r
          "description": "Cell-INVARIANT by contract: a World binds ctx.worldSeed here, never ctx.seed. Move it and the whole lattice moves — which is the point, and why every cell must pass the same number."\r
        }\r
      ]\r
    },\r
    {\r
      "title": "Thinning",\r
      "controls": [\r
        {\r
          "param": "thin.mode",\r
          "label": "Mode"\r
        },\r
        {\r
          "param": "thin.threshold",\r
          "label": "Threshold",\r
          "min": 0,\r
          "max": 1,\r
          "step": 0.05\r
        },\r
        {\r
          "param": "thin.seed",\r
          "label": "Thin seed",\r
          "description": "Keyed on point identity, so it is indifferent to which window produced a point — but not to its own seed. A World binds it cell-invariantly; a per-cell value here disagrees across the seam, silently."\r
        }\r
      ]\r
    },\r
    {\r
      "title": "Measure, then own",\r
      "controls": [\r
        {\r
          "param": "crowding.radius",\r
          "label": "Neighbour radius",\r
          "description": "The one-hop reach. The halo above must be at least this wide and needs to be no wider; raise this without widening the query and every border grows a band of undercounted points.",\r
          "min": 0,\r
          "max": 12,\r
          "step": 0.5,\r
          "unit": " m"\r
        },\r
        {\r
          "param": "crowding.maxCount",\r
          "label": "Max neighbours",\r
          "min": 0,\r
          "max": 64,\r
          "step": 1\r
        },\r
        {\r
          "param": "own.boundsMin",\r
          "label": "Owned min",\r
          "description": "The UNWIDENED cell. Ownership is a comparison against this box, never against a recomputed floor(p / cellSize)."\r
        },\r
        {\r
          "param": "own.boundsMax",\r
          "label": "Owned max",\r
          "description": "The UNWIDENED cell. Y is a finite ±1e6 rather than an infinity, because an infinity does not survive JSON and cannot be sent as a bind patch."\r
        },\r
        {\r
          "param": "own.boundary",\r
          "label": "Boundary",\r
          "description": "halfOpen is the ownership rule that tiles: two abutting cells claim a shared face exactly once between them. Switch to inclusive and both claim it."\r
        },\r
        {\r
          "param": "size.seed",\r
          "label": "Size seed",\r
          "description": "Salts the randomField inside \`size\`. Cell-invariant for the same reason thin.seed is."\r
        }\r
      ]\r
    }\r
  ]\r
}\r
`;export{e as default};