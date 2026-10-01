var e=`{
  "_comment": "Panel spec — presentation only; the graph cooks identically without it. See shared/graphUi.ts.",
  "sections": [
    {
      "title": "The cloud reaching for it",
      "_comment": "Only the grid is exposed, and that is a fact about the graph rather than a choice. A panel addresses a NODE PARAM (or a graph param); the cell size here is \`frequency\`, a noise OPTION nested inside a field expression, which no address form reaches. Nor can it become a graph param: the grammar refuses a field-valued frequency by name. Scaling the sampled position is the substitution it recommends instead, and that one is unavailable HERE in particular, because worleyFeature undoes frequency and offset and cannot undo an arbitrary position expression.",
      "controls": [
        { "param": "grid.countX", "label": "Columns", "min": 10, "max": 90, "step": 2 },
        { "param": "grid.countZ", "label": "Rows", "min": 10, "max": 90, "step": 2 },
        {
          "param": "grid.spacing",
          "label": "Spacing",
          "description": "Widen it and the same cells are sampled by fewer points, so the starbursts thin out without the diagram beneath them moving at all."
        }
      ]
    }
  ]
}
`;export{e as default};