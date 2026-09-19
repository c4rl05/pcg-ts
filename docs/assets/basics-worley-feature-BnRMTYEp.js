var e=`{\r
  "_comment": "Panel spec — presentation only; the graph cooks identically without it. See shared/graphUi.ts.",\r
  "sections": [\r
    {\r
      "title": "the cloud reaching for it",\r
      "_comment": "Only the grid is exposed, and that is a fact about the graph rather than a choice. A panel addresses a NODE PARAM (or a graph param); the cell size here is \`frequency\`, a noise OPTION nested inside a field expression, which no address form reaches. Nor can it become a graph param: the grammar refuses a field-valued frequency by name. Scaling the sampled position is the substitution it recommends instead, and that one is unavailable HERE in particular, because worleyFeature undoes frequency and offset and cannot undo an arbitrary position expression.",\r
      "controls": [\r
        { "param": "grid.countX", "label": "columns", "min": 10, "max": 90, "step": 2 },\r
        { "param": "grid.countZ", "label": "rows", "min": 10, "max": 90, "step": 2 },\r
        {\r
          "param": "grid.spacing",\r
          "label": "spacing",\r
          "description": "Widen it and the same cells are sampled by fewer points, so the starbursts thin out without the diagram beneath them moving at all."\r
        }\r
      ]\r
    }\r
  ]\r
}\r
`;export{e as default};