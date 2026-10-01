var e=`{\r
  "_comment": "Panel spec — presentation only; the graph cooks identically without it. See shared/graphUi.ts. The pointList params are absent on purpose: a numberList or stringList has no panel widget, and the node inspector edits them.",\r
  "sections": [\r
    {\r
      "title": "Stars",\r
      "controls": [\r
        {\r
          "param": "size.value.brightest",\r
          "label": "Brightest",\r
          "description": "The scale a magnitude-0 star draws at. Every star's scale is this minus falloff times its magnitude, so raising it grows all eight by the same amount.",\r
          "min": 0.5,\r
          "max": 8,\r
          "step": 0.1\r
        },\r
        {\r
          "param": "size.value.falloff",\r
          "label": "Falloff",\r
          "description": "How much smaller each magnitude step draws. 0 draws every star the same size; past about 1.4 Meissa, the faintest at magnitude 3.39, shrinks to the 0.2 floor.",\r
          "min": 0,\r
          "max": 1.5,\r
          "step": 0.01\r
        }\r
      ]\r
    }\r
  ]\r
}\r
`;export{e as default};