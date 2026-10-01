var e=`{\r
  "_comment": "Panel spec — presentation only; the graph cooks identically without it. See shared/graphUi.ts.",\r
  "sections": [\r
    {\r
      "title": "Opening",\r
      "controls": [{ "param": "corners.spacing", "label": "Size" }]\r
    },\r
    {\r
      "title": "Bars",\r
      "controls": [\r
        { "param": "mullionEnds.spacing", "label": "Mullion span" },\r
        { "param": "transomEnds.start", "label": "Transom from" },\r
        { "param": "transomEnds.end", "label": "Transom to" },\r
        { "param": "mullionWidth.value", "label": "Mullion width", "min": 0, "max": 1, "step": 0.01 },\r
        { "param": "transomWidth.value", "label": "Transom width", "min": 0, "max": 1, "step": 0.01 }\r
      ]\r
    },\r
    {\r
      "title": "Glass",\r
      "controls": [{ "param": "glass.distance", "label": "Thickness", "min": 0.01, "max": 1, "step": 0.01 }]\r
    }\r
  ]\r
}\r
`;export{e as default};