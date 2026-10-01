var e=`{\r
  "_comment": "Panel spec — presentation only; the graph cooks identically without it. See shared/graphUi.ts.",\r
  "sections": [\r
    {\r
      "title": "Hoardings",\r
      "controls": [\r
        { "param": "props.count", "label": "Props", "min": 40, "max": 600, "step": 20 },\r
        { "param": "props.seed", "label": "Seed" }\r
      ]\r
    },\r
    {\r
      "title": "The rule",\r
      "controls": [\r
        {\r
          "param": "eyes.spacing",\r
          "label": "Eye spacing",\r
          "min": 1,\r
          "max": 10,\r
          "step": 0.5,\r
          "unit": " m"\r
        },\r
        {\r
          "param": "drop.lookAhead",\r
          "label": "Look ahead — left",\r
          "min": 0,\r
          "max": 60,\r
          "step": 1,\r
          "unit": " m"\r
        },\r
        {\r
          "param": "push.lookAhead",\r
          "label": "Look ahead — right",\r
          "min": 0,\r
          "max": 60,\r
          "step": 1,\r
          "unit": " m"\r
        },\r
        {\r
          "param": "drop.samples",\r
          "label": "Chords per eye — left",\r
          "min": 1,\r
          "max": 24,\r
          "step": 1\r
        },\r
        {\r
          "param": "push.samples",\r
          "label": "Chords per eye — right",\r
          "min": 1,\r
          "max": 24,\r
          "step": 1\r
        }\r
      ]\r
    },\r
    {\r
      "title": "The repair",\r
      "controls": [\r
        {\r
          "param": "drop.pushMax",\r
          "label": "Push limit — left",\r
          "min": 0,\r
          "max": 16,\r
          "step": 0.5,\r
          "unit": " m"\r
        },\r
        {\r
          "param": "push.pushMax",\r
          "label": "Push limit — right",\r
          "min": 0,\r
          "max": 16,\r
          "step": 0.5,\r
          "unit": " m"\r
        },\r
        {\r
          "param": "push.pushStep",\r
          "label": "Search step — right",\r
          "min": 0.1,\r
          "max": 2,\r
          "step": 0.1,\r
          "unit": " m"\r
        },\r
        {\r
          "param": "push.pushClearance",\r
          "label": "Clearance — right",\r
          "min": 0,\r
          "max": 5,\r
          "step": 0.25,\r
          "unit": " m"\r
        }\r
      ]\r
    }\r
  ]\r
}\r
`;export{e as default};