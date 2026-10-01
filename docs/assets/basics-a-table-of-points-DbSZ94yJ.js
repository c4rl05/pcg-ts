var e=`{
  "_comment": "Panel spec — presentation only; the graph cooks identically without it. See shared/graphUi.ts. The pointList params are absent on purpose: a numberList or stringList has no panel widget, and the node inspector edits them.",
  "sections": [
    {
      "title": "Stars",
      "controls": [
        {
          "param": "size.value.brightest",
          "label": "Brightest",
          "description": "The scale a magnitude-0 star draws at. Every star's scale is this minus falloff times its magnitude, so raising it grows all eight by the same amount.",
          "min": 0.5,
          "max": 8,
          "step": 0.1
        },
        {
          "param": "size.value.falloff",
          "label": "Falloff",
          "description": "How much smaller each magnitude step draws. 0 draws every star the same size; past about 1.4 Meissa, the faintest at magnitude 3.39, shrinks to the 0.2 floor.",
          "min": 0,
          "max": 1.5,
          "step": 0.01
        }
      ]
    }
  ]
}
`;export{e as default};