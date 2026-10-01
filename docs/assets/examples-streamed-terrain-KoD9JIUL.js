var e=`{
  "_comment": "Panel spec — presentation only; the graph cooks identically without it. See shared/graphUi.ts.",
  "sections": [
    {
      "title": "World source",
      "controls": [
        {
          "param": "scatter.density",
          "label": "Density",
          "min": 0.05,
          "max": 1.5,
          "step": 0.05,
          "unit": " /m²"
        },
        {
          "param": "scatter.cellSize",
          "label": "Lattice cell",
          "description": "The source's OWN clumping scale, deliberately not a divisor of any World cell size. It decides evenness, never population.",
          "min": 2,
          "max": 20,
          "step": 1,
          "unit": " m"
        },
        {
          "param": "scatter.boundsMin",
          "label": "Query min",
          "description": "The cell grown by the halo. A World binds this to ctx.min minus the neighbourhood radius; shrink it to the ownership box below and the border points start measuring a world that stops at the border."
        },
        {
          "param": "scatter.boundsMax",
          "label": "Query max",
          "description": "The cell grown by the halo. A World binds this to ctx.max plus the neighbourhood radius."
        },
        {
          "param": "scatter.seed",
          "label": "World seed",
          "description": "Cell-INVARIANT by contract: a World binds ctx.worldSeed here, never ctx.seed. Move it and the whole lattice moves — which is the point, and why every cell must pass the same number."
        }
      ]
    },
    {
      "title": "Thinning",
      "controls": [
        {
          "param": "thin.mode",
          "label": "Mode"
        },
        {
          "param": "thin.threshold",
          "label": "Threshold",
          "min": 0,
          "max": 1,
          "step": 0.05
        },
        {
          "param": "thin.seed",
          "label": "Thin seed",
          "description": "Keyed on point identity, so it is indifferent to which window produced a point — but not to its own seed. A World binds it cell-invariantly; a per-cell value here disagrees across the seam, silently."
        }
      ]
    },
    {
      "title": "Measure, then own",
      "controls": [
        {
          "param": "crowding.radius",
          "label": "Neighbour radius",
          "description": "The one-hop reach. The halo above must be at least this wide and needs to be no wider; raise this without widening the query and every border grows a band of undercounted points.",
          "min": 0,
          "max": 12,
          "step": 0.5,
          "unit": " m"
        },
        {
          "param": "crowding.maxCount",
          "label": "Max neighbours",
          "min": 0,
          "max": 64,
          "step": 1
        },
        {
          "param": "own.boundsMin",
          "label": "Owned min",
          "description": "The UNWIDENED cell. Ownership is a comparison against this box, never against a recomputed floor(p / cellSize)."
        },
        {
          "param": "own.boundsMax",
          "label": "Owned max",
          "description": "The UNWIDENED cell. Y is a finite ±1e6 rather than an infinity, because an infinity does not survive JSON and cannot be sent as a bind patch."
        },
        {
          "param": "own.boundary",
          "label": "Boundary",
          "description": "halfOpen is the ownership rule that tiles: two abutting cells claim a shared face exactly once between them. Switch to inclusive and both claim it."
        },
        {
          "param": "size.seed",
          "label": "Size seed",
          "description": "Salts the randomField inside \`size\`. Cell-invariant for the same reason thin.seed is."
        }
      ]
    }
  ]
}
`;export{e as default};