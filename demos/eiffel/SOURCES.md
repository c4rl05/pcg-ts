# Eiffel Tower (1889 as built): structural spec for a rule-based skeleton

Compiled 2026-09-18. Every number carries a source key (defined in §0) and one confidence tag:

- **[sourced]**: the source states the number. For the 1900 plates, this means a figure printed on the drawing, read from the scan.
- **[derived]**: computed from sourced numbers. The arithmetic is shown.
- **[estimated]**: read off a drawing by eye or by pixel measurement, or a plate digit that is ambiguous. The note says which.

Where sources disagree, all values are listed. The **primary source is Eiffel's own plate album** (1900). Its Plate XXXI is a dimensioned elevation of all 29 panels at 1:1000, with every node height and width. The numbers close to within 0.4 mm (§2.4). They also match, digit for digit, an independent transcription of Eiffel's documents (Chouard's spreadsheet).

---

## 0. Sources and conventions

### Source keys

| Key | Source | URL |
|---|---|---|
| PL-I | G. Eiffel, *La Tour de trois cents mètres*, Planches (Lemercier, 1900), **Pl. I** "Élévation. Diagrammes…", Fig. 1: elevation at 1:1000 with levels | https://gallica.bnf.fr/ark:/12148/bpt6k6542854f/f16.item (left half), …/f17.item (right half) |
| PL-VII | same album, **Pl. VII** "Ossature métallique en rabattement": panels 1–29 drawn in their own (inclined) face plane at 1:200 | https://gallica.bnf.fr/ark:/12148/bpt6k6542854f/f40.item , …/f41.item |
| PL-XI | same album, **Pl. XI** "Ensembles et détails des arcs décoratifs, poutres des arcs et poutres du 1er étage" | https://gallica.bnf.fr/ark:/12148/bpt6k6542854f/f56.item , …/f57.item |
| PL-XXXI | same album, **Pl. XXXI** "Sections des arbalétriers & des treillis. Données pour le calcul de l'ossature": diagram of the elevation at 1:1000, panel weights, member sections | https://gallica.bnf.fr/ark:/12148/bpt6k6542854f/f160.item , …/f161.item |
| THESIS | S. Narayana, "3D Modelling of Eiffel Tower using the Original Drawings", MSc thesis, Politecnico di Torino, 2020 | https://webthesis.biblio.polito.it/17045/1/tesi.pdf |
| WP04 | P. D. Weidman & I. Pinelis, "Model equations for the Eiffel Tower profile: historical perspective and new results", *C. R. Mécanique* 332 (2004) 571–584, DOI 10.1016/j.crme.2004.02.021 | https://doi.org/10.1016/j.crme.2004.02.021 (the copy read: http://fil.hogym.dk/AT/AT2010/opgave02/eiffel_mat.pdf) |
| E1885 | G. Eiffel, "Projet d'une tour en fer de 300 mètres…", *Mém. Soc. ingénieurs civils* 1885 (1), pp. 345–370. This is the **1885 project, not the built tower** | https://cnum.cnam.fr/pgi/redir.php?onglet=c&ident=ECCMC6.42 |
| CH-XLS | C. Chouard, "Eiffel_Tower_measurements.xls" (2001). Its bold cells are "read on Gustave Eiffel's documents" | https://imechanica.org/sites/default/files/Eiffel_Tower_measurements.xls |
| CH-WEB | C. Chouard, "Eiffel Tower Equation" | http://christophe.chouard.free.fr/eiffel/equation_eiffel_tower.html |
| BANKS | J. D. Cook's summary of R. B. Banks (1998), pp. 150–156 (secondary) | https://www.johndcook.com/blog/2017/12/26/equation-for-the-eiffel-tower/ |
| TE-KF | toureiffel.paris, "Les chiffres clés" | https://www.toureiffel.paris/fr/le-monument/chiffres-cle |
| TE-HIST | toureiffel.paris, "Histoire" | https://www.toureiffel.paris/fr/le-monument/histoire |
| TE-FOUND | toureiffel.paris, "Les sous-sols et fondations de la tour Eiffel" | https://www.toureiffel.paris/fr/actualites/histoire-et-culture/les-sous-sols-et-fondations-de-la-tour-eiffel |
| TE-H330 | toureiffel.paris, "De 300 à 330 mètres" | https://www.toureiffel.paris/fr/actualites/histoire-et-culture/de-300-330-metres-lhistoire-de-la-taille-de-la-tour |
| TE-PHARE | toureiffel.paris, "Le phare de toute la région parisienne" | https://www.toureiffel.paris/fr/actualites/histoire-et-culture/le-phare-de-toute-la-region-parisienne |
| TE-FER | toureiffel.paris, "D'où vient le fer de la tour Eiffel" | https://www.toureiffel.paris/fr/actualites/histoire-et-culture/dou-vient-le-fer-de-la-tour-eiffel |
| TE-RIVET | toureiffel.paris, historic rivet page | https://www.toureiffel.paris/fr/actualites/130-ans/le-rivet-historique-de-la-tour-eiffel-offrez-vous-un-objet-dexception |
| TS-FR | SETE, "Tout savoir sur la tour Eiffel" (PDF, 324 m era) | https://web.archive.org/web/20160524111512/http://www.tour-eiffel.fr/images/PDF/tout_savoir.pdf |
| WP-FR | French Wikipedia "Tour Eiffel", rev. 239220518 | https://fr.wikipedia.org/w/index.php?title=Tour_Eiffel&oldid=239220518 |
| WP-EN | English Wikipedia "Eiffel Tower", rev. 1374916289 | https://en.wikipedia.org/w/index.php?title=Eiffel_Tower&oldid=1374916289 |
| WOW | wonders-of-the-world.net, "The rivets of the Eiffel tower" (secondary) | https://www.wonders-of-the-world.net/Eiffel-Tower/Rivets-of-the-Eiffel-tower.php |
| TE-APT | toureiffel.paris, "Did Gustave Eiffel live in the tower?" (B. Lemoine): "approximately 1076 square feet (100 square meters)" | https://www.toureiffel.paris/en/news/130-years/did-gustave-eiffel-live-tower |
| TE-LIFTS | toureiffel.paris, "Ascenseurs": « piston hydraulique de 81 mètres de course » | https://www.toureiffel.paris/fr/le-monument/ascenceurs |
| FICHE-08 | SETE teaching sheet "La tour de haut en bas" | https://www.toureiffel.paris/themes/custom/tour_eiffel/assets/Fiches/FR/08_la_tour_de_haut_en_bas.pdf |
| WM-SVG | Wikimedia Commons "Dimensions Eiffel Tower.svg" (labels 57,64 / 115,73 / 276,13 / 124,90 / 74,24 / 70,69 / 40,96 / 18,65) | https://commons.wikimedia.org/wiki/File:Dimensions_Eiffel_Tower.svg |

The official toureiffel.paris pages return 403 to automated fetches, so they were read from Wayback Machine captures of those URLs (2024–2026).

The Commons category https://commons.wikimedia.org/wiki/Category:Architectural_drawings_of_the_Eiffel_Tower holds scans of several plates of the same album ("Tour Eiffel Ossatures.JPG", "Tour Eiffel Arbalétrières et treillis pour le calcul de l'ossature.JPG" = Pl. XXXI, and others). The Gallica full-resolution scans (about 6000 × 8800 px per half-plate) were used instead.

### Coordinates and datums

- **z** = height above the ground at the tower centre. PL-I: "Sol au centre de la Tour (33.50)", altitude above sea level [sourced]. This is the datum of all official floor heights (57.63 = 91.13 − 33.50, etc.) [derived].
- **h** = height above the support centres ("Niveau des centres des appuis (36m00)" [sourced PL-I]; "Centre des sommiers (36.00)" [sourced PL-XXXI]). So **z = h + 2.50** [derived: 36.00 − 33.50].
- **Half-width** = horizontal distance from the tower's vertical axis to a member axis, measured **perpendicular to a tower face**, as seen in a face-on elevation. A corner that lies on the tower diagonal is at 3D radius = half-width × √2.
- Each leg ("pile" / "montant") has a square horizontal section whose sides are parallel to the tower faces [sourced: PL-I Fig. 3 and PL-XXXI "section générale" plan diagrams]. Its four corner uprights are the "arbalétriers" [sourced: PL-I, PL-XXXI]:
  - **c**: the outer corner.
  - **a**: the inner corner, facing the tower centre.
  - **b**, **d**: the two side corners. PL-XXXI notes "Les arbalétriers b et d ont la même section".
- In a face-on elevation, c projects onto the same line as one side corner (the **outer** silhouette). a projects onto the same line as the other side corner (the **inner** silhouette). So "outer half-width" = the c/d axes and "inner half-width" = the a/b axes.
- Legs: Montant n°1 Nord, n°2 Est, n°3 Sud, n°4 Ouest [sourced: PL-I Fig. 3; PL-XXXI plan diagram].
  - The book numbers them two ways: E1900-TXT once prints "2 ou Ouest… 4 ou Est". The plates, the text's own clockwise order and the caisson legs (N and W, Seine side) all give 2 = Est, which the code follows. In the render's top view (x right, z down, PL-XVIII Fig. 3 as drawn) pile 4 Ouest is the +x+z leg, then 3 Sud, 2 Est, 1 Nord by quadrant target; `PILES` and `FACES` in `spec.ts` hold that in one place and `tests/eiffelConventions.test.ts` holds them to the plates [derived].
- Altitudes ("cotes") are above sea level; y = cote − 33.50 (`yOfCote` in `spec.ts`). A depth quoted without its datum may be an altitude: see §3.3 on the caissons' "22 m" [derived].
- Panels are numbered 1 (bottom) to 29 (top). PL-XXXI labels each panel's **bottom node** with the Roman numeral 29 − p: XXVIII is the bottom of panel 1 and I is the bottom of panel 28 [sourced]. This spec uses those node names.
- **Rabattement vs elevation.** PL-VII draws each face rotated into the drawing plane. On that plate, horizontal lengths are true, but "heights" are measured along the inclined face: in-plane height = vertical height × √(1 + s²), where s is the face slope (horizontal per vertical). PL-XXXI and PL-I are true elevations.

---

## 1. Global dimensions

| Quantity | Value | Source / tag |
|---|---|---|
| 1st floor (plancher) | z = **57.63** m; altitude 91.13 | PL-I "Plancher du 1er Étage (91,13)" and "57,63" [sourced]; WP-FR 57.63 [sourced]; TE-KF "57 mètres" [sourced]; WM-SVG says 57.64 [sourced] |
| 2nd floor | z = **115.73** m; altitude 149.23 | PL-I "Plancher du 2e Étage (149,23)" and "115m73" [sourced]; WP-FR 115.73 (one WP-FR data table says 115.75) [sourced]; TE-KF 115 m [sourced] |
| Intermediate floor (lift-transfer landing) | z = **195.93** m; altitude 229.43 | PL-I "Plancher intermédiaire (229,43)" and "195m93" [sourced]; PL-XXXI "(229.43)" drawn between nodes IX and X [sourced] |
| 3rd floor | z = **276.13** m; altitude 309.63 | PL-I "Plancher du 3e Étage (309,63)" and "276m13" [sourced]; WP-FR 276.13, TE-KF 276 m [sourced]. Today's upper level of the summit is 279.11 m (WP-FR) [sourced] |
| Lantern terrace floor ("terrasse du phare") | z = **293.215** m | PL-I "(326.715)" [sourced] − 33.50 [derived] |
| Top terrace floor ("terrasse supérieure") | z = **300.515** m, altitude 334.015 | PL-I "(334,015)" and "300m515" [sourced] |
| 1889 height to flagpole top | z = **312.275** m, which is 11.760 m above the top terrace | PL-I "312m275" and "11m760" [sourced]; WP-FR/WP-EN 312.27 m [sourced]; TE-H330 "un peu plus de 312 mètres" [sourced] |
| "300 m" | 300 m without the flag | WP-FR "Hauteur totale sans drapeau (mesure 1889) : 300 mètres" [sourced]. PL-I puts the top-terrace floor at 300.515 [sourced] |
| Height today | **330 m** since 15 Mar 2022 (DAB+ antenna) | TE-H330 [sourced]. History: 320.75 (1957; TS-FR says 318.70), 324 (2000) [sourced TE-H330 / TS-FR] |
| Base square side (outer) | **125 m** (official) · **124.90 m** "écart extérieur entre 2 piliers" · PL-I: 25.334 + 74.238 + 25.334 = **124.906** m | TE-KF "Les 4 piliers forment un carré de 125 mètres de côté" [sourced]; WP-FR [sourced]; PL-I dimension chain at ground [sourced; sum derived] |
| Pillar footprint at ground | **25 m** (official) · **25.334 m** (PL-I) | TE-KF [sourced]; PL-I [sourced]. This is the footprint of the masonry pedestal ("soubassement"): WP-FR "soubassements carrés de 25 mètres de côté et de 4 mètres de hauteur" [sourced] |
| Clear distance between legs at ground | **74.24 m** (WP-FR "écart intérieur") · **74.238 m** (PL-I) | [sourced]. It is measured between the pedestals, not the iron (see next row) |
| Pile centre to pile centre at ground | **103.907 m** (PL-I, third dimension line) | [sourced]. The iron extrapolates to 103.92 m (§2.4) [derived]. E1885 project: "100 mètres d'axe en axe" [sourced, project only] |
| Iron at ground (arbalétrier axes, panel-1 line extended to z = 0) | outer half-width **59.46**, inner half-width **44.46**. So outer-to-outer 118.92 and inner-to-inner 88.92 | [derived] from PL-XXXI: 56.2435 + 6.40 × 0.50268 = 59.461; 41.2435 + 3.217 = 44.461 |
| Iron at the supports (z = 2.50) | outer half-width **58.204**, inner **43.204**, leg axis **50.704** (axis-to-axis 101.41). 3D radius of the outer corner = 58.204 × √2 = **82.31** | [derived] from PL-XXXI (§2.4) |

**Pedestal vs iron [derived].** The pedestal's outer edge (124.906/2 = 62.45) lies about 3.0 m outside the c axis at ground (59.46). Its inner edge (74.238/2 = 37.12) lies about 7.3 m inside the a/b axis (44.46). That inboard extension is where the decorative arch lands (§5.3). The legs' iron therefore spans about 119 m, not 125 m.

---

## 2. Leg profile

### 2.1 Design intent (Koechlin, Nouguier, Eiffel)

- **Eiffel's rule** (E1885 p. 347, French original) [sourced]: « donner aux montants une courbure telle que les tangentes à ces montants, menées en des points situés à la même hauteur, viennent toujours se rencontrer au point de passage de la résultante des actions que le vent exerce sur la partie de la pile qui se trouve au-dessus des points considérés ». In English: the tangents to the corner uprights at any height meet at the resultant of the wind force on everything above. The lattice (web) bars then carry no wind shear.
- E1885 p. 349 [sourced]: « la courbe extérieure de la tour reproduit, à une échelle déterminée, la courbe même des moments fléchissants dus au vent ».
- **Wind hypotheses** (E1885 p. 350) [sourced]: either a uniform 300 kg/m², or a pressure rising from 200 kg/m² at the base to 400 kg/m² at the top.
- **As built, the curve is a polyline.** Every arbalétrier is straight within a panel and changes direction only at panel nodes. The slope per panel is in §2.4 [derived from PL-XXXI]. PL-VII draws the arbalétriers as straight segments [sourced].

### 2.2 Model equations and constants

**Weidman & Pinelis (WP04)** [sourced]. Let x be measured **downward from the top of panel 29** (the 3rd-floor level) and f(x) the tower half-width (the outer silhouette), with f = 5 m at x = 0. Eiffel's rule then becomes

  f(x) ∫_{x0}^{x} f(t) dt = f′(x) ∫_{x0}^{x} (x − t) f(t) dt   (WP04 eq. 13)

Its solution is **f(x) = A·e^{γx}** (with x0 → −∞). The wind moment is then M(x) = (2p0/γ²)·A·e^{γx}, so the profile is the moment curve "at a determined scale" 2p0/γ² [sourced].

WP04 Table 2 fits (units m and m⁻¹; [sourced]):

| fit | A (m) | γ (m⁻¹) | R² |
|---|---|---|---|
| entire | 4.2547 | 0.00892 | 0.9932 |
| upper tower (panels 12–29; **printed as "lower" in WP04 Table 2**) | 4.7439 | 0.00721 | 0.9978 |
| lower tower (panels 1–13; **printed as "upper"**) | 2.6958 | 0.01117 | 0.9996 |

The labels in WP04 Table 2 are swapped relative to the paper's own text, "lower (panels 1–13) and upper (panels 12–29)" [sourced]. A refit of their Table 1 confirms the swap [derived, profile subagent].

The two branches cross at x = ln(4.7439/2.6958)/(0.01117 − 0.00721) = **142.7 m**, which is z ≈ 133.4 [derived].

**Caveat.** WP04's input table (panel data from the tower's operating company, not Eiffel's book) uses the in-plane (rabattement) angle to step the widths. Its lower-tower widths are therefore too narrow: at node XXVIII the base half-width is 53.459 m, against 56.2435 on PL-XXXI [derived]. Use the PL-XXXI table (§2.4) as the geometry and the exponential only as a smooth approximation.

**Refit on the PL-XXXI outer half-widths** (§2.4; least squares on ln w; x down from the 3rd floor, i.e. x = 273.63 − h) [derived]:
- lower tower, nodes XXVIII…XVII: A = **2.4236**, γ = **0.011740**, R² = 0.9993
- upper tower, nodes XVII…top of panel 28: A = **4.6910**, γ = **0.0073263**, R² = 0.9966
- all nodes: A = 4.1310, γ = 0.0091643, R² = 0.9854

**Other models:**
- Constant-stress model (Banks via BANKS) [sourced, secondary]: x = x0·e^{−βy} with y* = 1/β = 201 ft (61.26 m) and x0 = 207 ft (63.09 m).
- Chouard's integral equation (CH-WEB) [sourced]: a·f(x)∫₀ˣ f² dt = x∫₀ˣ f dt − ∫₀ˣ t f dt. Its power solution f ∝ x^{1/2} is concave, and WP04 proves it cannot produce the tower's curvature [sourced]. **Do not use it.**

### 2.3 Profile rules the plates reveal [derived from PL-XXXI; PL-VII agrees]

1. **Base to 1st floor (panels 1–5): parallel legs.** Each leg is a non-tapering 15.00 × 15.00 m square prism (axis to axis of the arbalétriers). PL-XXXI prints "15.00" at every node from XXVIII to XXIII; PL-VII prints "15.000" [sourced]. The legs lean at slope 0.50268 (horizontal per vertical, per face direction) in panels 1–4, and 0.39677 in panel 5 [derived].
2. **1st to 2nd floor (panels 6–11): the legs taper.** Leg side: 15.00 → 14.10 → 13.15 → 12.20 → 11.32 → 10.4576 → 10.412 [sourced]. The slope eases from 0.336 to 0.196 [derived].
3. **Above the 2nd floor, inner corner a stops.** PL-XXXI's sections I–XI are the 8-arbalétrier sections and sections XII–XVII the 12-arbalétrier sections [sourced]. Section numbers map to panels as 29 − p, so panels 12–17 have **12** arbalétriers and panels 18–28 have **8** [derived]. PL-VII writes "Raccordement des arbalétriers" at panel 12 [sourced]. THESIS: "sixteen crossbows into only Twelve" at panel 12 [sourced].
4. **The legs merge at node XI** (bottom of panel 18, z = 179.10). Adjacent legs' side arbalétriers (b of one, d of the next) meet on each face's centre line. At XI their axes are 0.50 m apart, printed "0.50" [sourced PL-XXXI] and "250 | 250" [sourced PL-VII]. Above XI they are one member. Each face then has 3 uprights (c, bd, c), 8 in total. THESIS: "at the end of Seventeenth Panel … Twelve Crossbows into Eight" [sourced].
5. **Nodes X to top of panel 28 (panels 19–28): a straight frustum cut into self-similar panels.**
   - The outer arbalétrier slope is constant, **0.048812** (2.795° from vertical) [derived: (8.700 − 5.000)/(262.400 − 186.600)].
   - Panel heights and widths both shrink by **0.94612 per panel going up** (1/1.05695) [derived; every ratio 1.05695 ± 0.0001].
   - Every panel has height / full width at its bottom = **0.55193** [derived]. So each panel is a scaled copy of the one below.
   - The THESIS does not state this. WP04 notes that panels 19–28 share one inclination, 87°12′31″ in-plane [sourced].
6. **Panel 29 (below the 3rd floor) is prismatic**: 10.00 × 10.00 m, 11.23 m tall [sourced PL-XXXI "5.00 | 5.00 / 10.00" and "11.23"].

### 2.4 Node table (the profile)

Heights come from PL-XXXI's panel-height chain, which starts 3.90 above the support centres (3.90 + 4 × 11.00 + 7.00, then 0.23 to the 1st-floor plancher = "(55m13)" [sourced]). **Closure checks [derived]:**
- Node XXIII = 54.90 = 55.13 − 0.23.
- Node XVII = 113.00 = 149.23 − 36.00 − 0.23. Structural nodes sit 0.23 m below each floor.
- The upper chain lands at 273.6304 against the 3rd floor's 273.63.
- PL-XXXI's own "Hauteur totale 160m63" = 273.63 − 113.00.

Widths are **printed on PL-XXXI** (full widths, in m) [sourced] and halved here [derived]. Where both widths are printed, outer = inner + 2 × leg side holds exactly at every node [derived]. The last column cross-checks against CH-XLS "Total Width" at the top of the panel below [sourced], which was transcribed independently from Eiffel's documents.

| node | bottom of panel | z above ground (m) | h above supports (m) | outer half-width, c (m) | inner half-width, a/b (m) | leg side (m) | outer slope up to next node | CH-XLS full width |
|---|---|---|---|---|---|---|---|---|
| (supports) | – | 2.500 | 0.000 | 58.2041 [derived, extrapolated] | 43.2041 [derived] | 15.00 | 0.50273 | – |
| XXVIII | 1 | 6.400 | 3.900 | 56.2435 | 41.2435 | 15.00 | 0.50273 | – |
| XXVII | 2 | 17.400 | 14.900 | 50.7135 | 35.7135 | 15.00 | 0.50268 | 101.428 |
| XXVI | 3 | 28.400 | 25.900 | 45.1840 | 30.1840 | 15.00 | 0.50268 | 90.369 |
| XXV | 4 | 39.400 | 36.900 | 39.6545 | 24.6545 | 15.00 | 0.50268 | 79.309 |
| XXIV | 5 | 50.400 | 47.900 | 34.1250 | 19.1250 | 15.00 | 0.39677 | 68.250 |
| XXIII (1st floor) | 6 | 57.400 | 54.900 | 31.3476 | 16.3476 | 15.00 | 0.33615 | 62.695 |
| XXII | 7 | 68.400 | 65.900 | 27.6500 | 13.5500 | 14.10 | 0.28864 | 55.293 |
| XXI | 8 | 79.400 | 76.900 | 24.4750 | 11.3250 | 13.15 | 0.26136 | 48.950 |
| XX | 9 | 90.400 | 87.900 | 21.6000 | 9.4000 | 12.20 | 0.23922 | 43.200 |
| XIX | 10 | 100.600 | 98.100 | 19.1600 | 7.8400 | 11.32 | 0.23466 | 38.320 |
| XVIII | 11 | 110.600 | 108.100 | 16.8134 | 6.3558 | 10.4576 | 0.19620 | 33.627 |
| XVII (2nd floor; a ends) | 12 | 115.500 | 113.000 | 15.8520 | 5.4400 | 10.412 | 0.13418 | 31.704 |
| XVI | 13 | 126.800 | 124.300 | 14.3358 | 4.4436 (b/d) | 9.8922 | 0.13418 | 28.672 |
| XV | 14 | 137.500 | 135.000 | 12.9000 | 3.5000 (b/d) | 9.400 | 0.10377 | 25.800 |
| XIV | 15 | 148.100 | 145.600 | 11.8000 | 2.5686 (b/d) | 9.2314 | 0.09524 | 23.600 |
| XIII | 16 | 158.600 | 156.100 | 10.8000 | 1.6468 (b/d) | 9.15323 | 0.07561 | 21.600 |
| XII | 17 | 169.100 | 166.600 | 10.0061 | 0.9314 (b/d) | 9.07474 | 0.07561 | 20.012 |
| XI (legs merge) | 18 | 179.100 | 176.600 | 9.2500 | 0.2500 (b/d) | 9.00 | 0.05500 | 18.500 |
| X | 19 | 189.100 | 186.600 | 8.7000 | 0 (merged bd) | – | 0.04881 | 17.400 |
| IX | 20 | 198.704 | 196.204 | 8.2312 | 0 | – | 0.04881 | 16.470 |
| VIII | 21 | 207.790 | 205.290 | 7.7877 | 0 | – | 0.04881 | 15.580 |
| VII | 22 | 216.386 | 213.886 | 7.3681 | 0 | – | 0.04881 | 14.740 |
| VI | 23 | 224.520 | 222.020 | 6.9711 | 0 | – | 0.04881 | 13.940 |
| V | 24 | 232.215 | 229.715 | 6.5955 | 0 | – | 0.04881 | 13.190 |
| IV | 25 | 239.496 | 236.996 | 6.2401 | 0 | – | 0.04881 | 12.480 |
| III | 26 | 246.384 | 243.884 | 5.9039 | 0 | – | 0.04881 | 11.810 |
| II | 27 | 252.901 | 250.401 | 5.5857 | 0 | – | 0.04881 | 11.170 |
| I | 28 | 259.067 | 256.567 | 5.2848 | 0 | – | 0.04881 | 10.570 |
| top of 28 | 29 | 264.900 | 262.400 | 5.0000 | 0 | – | 0 (prismatic) | 10.000 |
| 3rd floor | – | 276.130 | 273.630 | 5.0000 | – | – | – | 10.000 |

Notes on the table:
- **Printed full widths (outer / inner / leg), [sourced PL-XXXI]:**
  - XXVIII 112.487 / 82.487 / 15.00 (the outer width is derived as inner + 30)
  - XXVII 71.427 / 15.00
  - XXVI 60.368
  - XXV 49.309
  - XXIV 38.25
  - XXIII 32.6952 (also PL-XI Fig. 70 "D'axe en axe des arbalétriers 32,6952")
  - XXII 27.10 / 14.10
  - XXI 22.65 / 13.15
  - XX 18.80 / 12.20
  - XIX 15.68 / 11.32
  - XVIII 12.7116 / 10.4576
  - XVII 31.704 total / 10.880 / 10.412
  - XVI 28.6715 / 8.8871 / 9.8922
  - XV 25.800 / 7.00 / 9.400
  - XIV 23.600 / 5.1372 / 9.2314
  - XIII 21.600 / 3.29354 / 9.15323
  - XII 20.01218 / 1.8627 / 9.07474 (the PL-XXXI total is smudged; the PL-VII Fig. 3 value is used)
  - XI 18.500 / 0.50 / 9.00
  - X 17.400; IX 16.46244; VIII 15.57540; VII 14.73618; VI 13.94214; V 13.19092; IV 12.48016; III 11.80770; II 11.17146; I 10.56952; top of 28: 10.00
- **VI's second digit is ambiguous** on the scan (13.?4214) [estimated]. 13.94214 is the only value consistent with the ×1.05695 progression and with CH-XLS 13.94 [derived].
- **IX's half-width** is printed 8.28122 or 8.23122 (a 3/8 ambiguity) [estimated]. The printed total 16.46244 gives 8.23122 [derived].
- **CH-XLS disagreement.** CH-XLS bold "half gap 18.1250" at the top of panel 4 contradicts its own total 68.250. PL-XXXI's 38.25 (half 19.125) is consistent with both, so CH-XLS's value is a misread [derived].
- **Inner corners.** a lies on the diagonal at 3D radius = inner half-width × √2, up to XVII only. b/d continue to XI.
- **Panel heights** (vertical, m) [sourced PL-XXXI]:
  - 1–4: 11.00 each
  - 5: 7.00
  - 6–8: 11.00 each
  - 9: 10.20; 10: 10.00; 11: 4.90
  - 12: 11.30; 13: 10.70; 14: 10.60; 15: 10.50; 16: 10.50; 17: 10.00; 18: 10.00
  - 19: 9.60359; 20: 9.08613; 21: 8.59654; 22: 8.13384; 23: 7.69510; 24: 7.28047; 25: 6.88818; 26: 6.51702; 27: 6.16587; 28: 5.83364
  - 29: 11.23
  - plus 3.90 below panel 1.
- **Other sources' panel heights.** WP04 gives panel 29 = 11.280 and panel 1 = 11.000. CH-XLS gives panel 1 = 15.005 measured from the supports (its own calculation) and panel 19 = 9.0969 (probably a misread) [sourced].
- **In-plane check.** The in-plane panel heights on PL-VII follow from these slopes [derived, then compared]:
  - panels 1–4: 11 × √(1 + 0.50268²) = 12.3118; printed "12,31163" [sourced]
  - panel 5: 7 × √(1 + 0.39677²) = 7.5309; printed "7.5309" (PL-XI Fig. 70) [sourced]
  - panel 6: 11 × √(1 + 0.33615²) = 11.6049; printed "11,60486" [sourced]

### 2.5 Leg inclination at the base

- Face-on elevation: 63.31° from horizontal (26.69° from vertical) [derived: atan(1/0.50268)]. CH-XLS élévation 63°18′41″ [sourced].
- Along the diagonal (the leg's true lean): **54.59°** from horizontal [derived: atan(1/(0.50268·√2))]. WP-FR "seize arbalétriers inclinés à 54 degrés par rapport au sol" [sourced]; CH-XLS 54°35′25″ [sourced].
- In-plane (rabattement) angle of an arbalétrier within its face: 65.81° [derived]. PL-VII prints 65°48′48″, and the supplement 114°11′12″ on the inner side [sourced].

---

## 3. Leg construction

### 3.1 Corner uprights (arbalétriers)

- **Count by height** [sourced PL-XXXI; derived mapping]:
  - panels 1–11 (ground to 2nd floor): **16** (4 per leg: a, b, c, d)
  - panels 12–17: **12** (a stops at the 2nd floor)
  - panels 18–28: **8** (4 corners c, plus 4 merged bd on the face centre lines)
  - panel 29: prismatic 10 m shaft
- **Cross-sections** (PL-XXXI "Sections des arbalétriers"; mm; [sourced] unless noted):
  - **Panels 1–5** (sections XXIV–XXVIII, "au-dessous du 1er Étage"): a closed box.
    - 12 angles "Corn. 100×100×12".
    - 4 web plates "Ames 4 × 822 × 12.5/14" or "4 × 800 × 15/16/17/18.5" (thickness grows downward).
    - Cover strips "C.J. 2×200×12" and "2×205×12".
    - Box about **0.80–0.82 m square** [derived from the web widths]. PL-VII prints member widths "800", "822.8", "876.99", "877" beside the arbalétriers [sourced]. **Superseded by §27**: the box is a constant 0.877 square in plan, and those widths are its sides square to the axis.
  - **Panels 6–11** (sections XVIII–XXIII, "au-dessous du 2e Étage"): a closed box.
    - 4 angles "Corn. 100×100×12".
    - Webs "866×8…11" (a) and "854×11…15" (b, c, d).
    - Cover strips "200×8…14".
    - About **0.87 m square** [derived]; see §27 (0.832-0.868 square to the axis, the 0.877 plan square).
    - Section areas at XVIII: a 43,136, b 55,664, c 56,308 mm² [sourced]. Faces 3, 8, 9 and 15 have manholes ("trous d'homme") [sourced].
  - **Panels 12–17** (sections XII–XVII): closed boxes about **500 × 500** [sourced: dimensioned "500" on the section drawings].
  - **Panels 18–28** (sections I–XI, "au-dessus du 2e Étage"): open 500 mm sections [sourced].
    - c is an L-shaped box (two 500 plates at 90° with 100×100 angles).
    - The merged b/d is an I/T section 500 deep. PL-XXXI: "Surf. de 1 bd 20400" mm² [sourced].
    - **Refined by §27.1**: panel 18 (XI) is c a closed box and bd a T 1,000 wide; from panel 19 c the open L and bd the T 500 x 500; which faces carry the heavy plates, and the 500 taken as the plan square.
- **Total arbalétrier area Ω for one montant (4 arbalétriers)** [sourced]: 210,772 (XVIII) · 226,824 · 222,524 · 230,480 · 254,784 (XXII) · 252,704 · 316,500 · 334,368 · 348,768 · 358,368 · **366,368 mm² (XXVIII, base)**.
- **Ω for the whole upper tower** [sourced]: 8 arbalétriers 208,672 (top) → 12 arbalétriers 591,684 mm².
- PL-XXXI's per-montant sequence reads 252,704 after 254,784, a slight dip. It is kept as printed [sourced].

### 3.2 Leg section size vs height

This is the "leg side" column of §2.4: 15.00 m, constant from the supports to the 1st floor, then tapering to 9.00 m at XI [sourced]. Above XI the "leg" is half a face (8.70 → 5.00 m) [derived].

Arbalétrier box width relative to leg side [derived]:
- 0.82/15 ≈ 1/18 at the base
- 0.87/10.4 ≈ 1/12 at the 2nd floor
- 0.5/9 ≈ 1/18 above

### 3.3 Foundations

- **4 masonry blocks per leg, 16 in total**, one under each arbalétrier. TS-FR: "4 massifs de maçonnerie qui supportent les 4 montants de chaque pied de la Tour, dits arbalétriers" [sourced]. WP-FR "Seize massifs de fondation" [sourced].
- Each block is **5 m × 10 m**: TE-FOUND "ses propres fondations en maçonnerie, mesurant 5 mètres sur 10" [sourced]. The blocks are tied by walls: TE-HIST "lié aux autres par des murs" [sourced].
- Bearing stones ("sommiers en pierre de taille de Château-Landon"): 18.70 kg/cm² on the stone, and 4.9–5.3 kg/cm² on the concrete (WP-FR, citing Eiffel 1900 pp. 67–68) [sourced]. The official figure is 3–4 kg/cm² on the ground (TE-HIST) [sourced].
- **Depth.** Official: 7 m (TE-FOUND) [sourced]. Deepest (N and W, Seine side) ≤ 15 m (TS-FR) [sourced]. Compressed-air caissons "to a depth of 22 m" (WP-EN) [sourced]. Read as a cote, 22 m is 33.50 − 22 = 11.5 m below the ground at the centre, within TS-FR's ≤ 15 m; read as a depth below ground it exceeds it [derived]. THESIS "36 meters of deep Masonry" is a **misreading** of the 36.00 m support-centre altitude [derived].
- Anchor bolts: "boulons d'ancrage de 7.80 mètres de long" (WP-FR); "a pair of bolts 10 cm in diameter and 7.5 m long" (WP-EN) [sourced].
- Masonry pedestals ("soubassements", decorative): 25 m square, 4 m high (WP-FR) [sourced].
- Construction jacks: 800 t capacity, 9.5 cm travel, later replaced by steel wedges (THESIS; WP-EN) [sourced].
- 1885 project only, not as built: blocks 8 m square × 6 m on a concrete base 9 m square × 4 m (E1885) [sourced].

---

## 4. Bracing and the self-similar lattice

### 4.1 Panel subdivision and pattern by region

Sources: PL-XXXI diagram, PL-VII rabattement and THESIS. "Face" here means one face of one leg (4 faces per leg) up to XI, and one face of the tower above XI.

| Region | Panels (vertical heights) | Pattern | Tag |
|---|---|---|---|
| Base tie | 0 → 3.90 above the supports | "Entretoise inférieure A" on the outer faces. "Entretoise inférieure B" on each inner face, which is lower because it passes over the entrance door (PL-VII Fig. 5 note). Both are lattice girders 15.00 long | [sourced PL-VII]; depth ≈ 2 m [estimated, read off PL-VII Fig. 5] |
| Base → 1st floor | panels 1–4 (11.00 each) | Horizontal struts at the nodes, a **mid-height horizontal**, and one **St Andrew's cross** per face per panel crossing on that horizontal. PL-VII also shows lighter secondary diagonals ("Treillis 45×45×5" labels) through the central node | layout [sourced PL-XXXI and PL-VII]; secondary diagonals [estimated] |
| 1st-floor belt | panel 5 (7.00) | Lattice girder ("Poutre à treillis", PL-XXXI table). Inside each leg face: 5 bays of about 3 m with X-lattice between 500×10 chord plates (PL-VII p. 5 detail). Between legs: the "Grande poutre du 1er étage" (§5.1) | [sourced]; bay ≈ 3 m [estimated] |
| 1st → 2nd floor | panels 6–9 (11, 11, 11, 10.20) | One X per face per panel, horizontals at the nodes | [sourced PL-XXXI, PL-VII Fig. 2] |
| | panel 10 (10.00) | X, plus a horizontal lattice girder band at its base, "3.6071" in-plane on PL-VII | [sourced]; band reading [estimated] |
| 2nd-floor belt | panel 11 (4.90) | Lattice girder; "Entre semelles 4,35368" in-plane (PL-VII Fig. 2) | [sourced] |
| Legs converging | panels 12–17 (11.30, 10.70, 10.60, 10.50, 10.50, 10.00) | One X per leg face per panel. Each tower face shows two X's side by side, whose inner uprights converge until they touch at XI | [sourced PL-VII Figs 2–3, PL-XXXI] |
| Single shaft | panels 18–28 (10.00, then 9.60359 × 0.94612ⁿ) | Per tower face: **two X-braced bays side by side** (c–bd and bd–c) and horizontals at the nodes. Panels 19–28 are self-similar (ratio 0.94612, height/width 0.55193) | [sourced PL-VII Figs 3–4]; ratios [derived] |
| 3rd-floor box | panel 29 (11.23, 10 m square) | Per face: 4 vertical bays of 2.50 m, horizontal plates 600×7 and 600×6, X-lattice in the cells. Brackets ("Console") carry the gallery out to 18.65 m | [sourced PL-VII Fig. 4 labels "2,50", "600×7", "Console"]; the cell layout [estimated] |

**Plan bracing.** Horizontal bracing at each floor: the 1st-floor platform and "Contreventement … des poutres décoratives" (PL-XI Figs 22–23) [sourced]. WP-FR: the pillars are "liées entre elles par des traverses … disposées tous les cinquante mètres" [sourced, secondary; the floors fall at roughly 57, 58 and 80 m spacings, derived].

**Member counts per panel for a generator** [derived from the patterns above; generator rule, not a count from any source]:
- Panels 1–4 per leg: 4 faces × (2 diagonals + 1 mid horizontal) + 4 node horizontals.
- Panels 6–17 per leg: 4 faces × 2 diagonals + 4 node horizontals.
- Panels 18–28 per tower: 4 faces × 4 diagonals + 8 node horizontals.

### 4.2 The self-similar lattice: sizes at each scale

**Scale 1: the leg.** A 15 m square lattice pylon (§2) [sourced].

**Scale 2: members.** Both the arbalétriers and the web bars are built-up lattice or box members.
- Web bars ("barres de treillis"; PL-XXXI "Tableau des sections des barres de treillis") [sourced]:
  - **Panels 1–9: square 800 × 800 mm struts** of 4 corner angles:
    - panel 1: 100×100×11 (area 8,316 mm² per bar)
    - panels 2–3: 80×80×10 (6,000)
    - panel 4: 100×100×12 (9,024)
    - panels 6–9: 80×80×9 (5,436)
  - **Panels 5, 10, 11: "Poutre à treillis"**, i.e. girders instead of bars.
  - **Panels 12–28: square 500 × 500 mm struts** of 4 angles:
    - panels 12–13: 90×90×12 (8,064)
    - panels 14–15: 90×90×11 (7,436)
    - panels 16–17: 90×90×13 (8,684)
    - panels 18–20: 90×90×11
    - panel 21: 90×90×12
    - panel 22: 90×90×11
    - panels 23–24: 90×90×9 (6,156)
    - panels 25–28: 80×80×8 (4,864)
- Horizontal struts: "Corn: 80×80×8" and "Corn: 80×80×10" (PL-VII) [sourced].
- Arbalétriers: boxes 0.80–0.87 m (panels 1–11) and 0.50 m (panels 12–28) (§3.1) [sourced].

**Scale 3: parts of a member.** Rolled angles 80–100 mm with 8–13 mm legs, web plates 8–18.5 mm thick, and lacing "Treillis 45×45×5" (angles 45×45×5 mm) forming a small X-lattice between each strut's corner angles (PL-VII labels throughout) [sourced].

**Scale 4: rivets.** 14–25 mm diameter (§7) [sourced, secondary].

**Scale ratios** [derived]:
- tower base : leg ≈ 119/15 ≈ 8
- leg : member ≈ 15/0.8 ≈ 19 (lower) and 9/0.5 = 18 (upper)
- member : angle ≈ 800/90 ≈ 9 (lower) and 500/90 ≈ 5.6 (upper)
- chord angle : lacing angle ≈ 90/45 = 2
- A generator can recurse **leg (square lattice) → strut (square lattice of 4 angles + X lacing) → angle**, with about 1/18 and about 1/7 scale steps.

---

## 5. First floor

### 5.1 Structural girder belt

- **"Grande poutre du 1er étage"**: a lattice girder spanning between the inner arbalétriers of adjacent legs in the tower's (inclined) face plane.
  - Vertical depth **7.00 m** (panel 5, h 47.90 → 54.90) [sourced PL-XXXI]; **7.5309 m** in-plane [sourced PL-XI Fig. 70].
  - Axis-to-axis span at the top **32.6952 m** [sourced PL-XI Fig. 70]; bottom chord **38.25 m** [sourced].
  - Bays **3.8825 m** [sourced], with an end bay 3.595 m [sourced]. The bottom chord works out as 2 × 3.595 + 8 × 3.8825 = 38.25 [derived].
  - Pattern: verticals with X diagonals [sourced drawing].
- The floor ("plancher") is 0.23 m above the top node: 91.13 vs node 90.90 altitude [derived]. The structural node is at z = 57.40 and the floor at z = 57.63 [derived / sourced].
- **Platform plan (1900):**
  - PL-I "Côté extérieur 70m695, Surface 4200 mètres carrés" [sourced]; WP-FR 70.69 m and 4,200 m² [sourced].
  - Official today: 4,415 m² (TE-KF) [sourced].
  - The platform overhangs the iron: 70.695 vs the 62.695 outer width at node XXIII [derived].
  - WP-EN: "A promenade 2.6 m wide ran around the outside of the first level" [sourced].
  - E1885 project gallery width 15 m [sourced, project only].

### 5.2 Decorative girder above the arch

- **"Poutre de l'arc"** (PL-XI calls it the "poutre décorative"), directly below the grande poutre (h 40.90 → 47.90).
  - Depth **7.834 m** in-plane (Figs 19–20) [sourced] = 7.00 m vertical [derived: 7.834/√(1 + 0.50268²) = 7.000].
  - Top length **38.250 m** and bottom length **45.287 m** [sourced]. The bottom matches the inner width at h = 40.90: 49.309 − 4 × 2 × 0.50268 = 45.287 [derived].
  - Bays 3.8825 m [sourced].
- Between it and the arch runs an arcade of 14 small round-headed openings ("montants 1…14", PL-XI Fig. 1) [sourced count].
- The girders of the two arches (faces 2 and 3) are cross-braced at the top and bottom (PL-XI Fig. 1 note) [sourced].

### 5.3 The four decorative arches (non-structural)

- **Non-structural.** WP-EN: "The only non-structural elements are the four decorative grill-work arches" [sourced]. WP-FR: "Leur rôle est « purement décoratif »", citing Eiffel 1900 p. 12 [sourced]. They were added from Sauvestre's scheme (TE-HIST) [sourced].
- **Apex.** Clear height under the keystone **39.40 m**: PL-I "Hauteur sous clef = 39m40" [sourced]. WP-FR: "s'élèvent à 39 mètres au-dessus du sol" [sourced]. That is h = 36.90, exactly at node XXV [derived].
- **Span.** WP-FR "ont un diamètre de 74 mètres" [sourced]. The PL-I clear gap between pedestals is 74.238 [sourced].
- **Plane.** The arch lies in the tower's outer face plane (inclined at 26.69° from vertical in panels 1–4) and is fixed to arbalétrier b ("Assemblage de l'arc avec l'arbalétrier", PL-XI) [sourced].
- **Shape: compound circular arcs.** PL-VII Fig. 1 prints three radii in the face plane: **36.4064 m**, **40.32373 m** and **44.525(8) m** [sourced; the last digit of the third is unclear, estimated]. PL-XI also prints "Rayon 36.4064" [sourced].
  - Reading the radial lines on PL-VII [estimated]: 40.32 governs the crown, 36.41 the haunch where the arch meets arbalétrier b, and 44.5 the lower leg that runs down beside the arbalétrier to its own pedestal.
  - Arch band ("arc décoratif") depth **2.5488 m** in-plane [sourced PL-VII and PL-XI].
- **Single-circle approximation** for a generator [derived]: radius R = 36.4064 in the face plane with its crown at h = 36.90.
  - Centre at h = 36.90 − 36.4064 × cos 26.69° = 4.37 (z = 6.87), on the face centre line.
  - Half-span 36.41 (span 72.8) at that height.
  - Vertical legs below. This is consistent with the 74 m "diameter" and the ~74.2 m pedestal gap.
- Elevation projection: vertical in-plane distances shrink by 0.89346, so a circle in the face plane appears in elevation as an ellipse with semi-axes 36.41 (horizontal) and 32.53 (vertical) [derived].

---

## 6. Second floor, intermediate landing, third floor, campanile

### 6.1 Second floor

- **Girder belt.** Panel 11, **4.90 m** deep (vertical), h 108.10 → 113.00 [sourced PL-XXXI]. "Entre semelles 4,35368" in-plane (the clear depth between the chord flanges) [sourced PL-VII]. There is a second lattice band at the base of panel 10 (§4.1) [sourced / estimated].
- **Floor.** z = 115.73 [sourced]. Structural node z = 115.50 [derived].
- **Platform (1900).** PL-I "Côté extérieur 37m63, Surface 1400 m² carrés" [**estimated** reading: the second digit could be read as 1, but 37.63² = 1,416 m² matches the printed 1,400 m², while 31.63 would be smaller than the 31.704 m iron] [derived check].
- **Today.** WP-FR côté extérieur 40.96 m and 1,650 m² [sourced]; official 1,430 m² for the lower level (TE-KF, TS-FR) [sourced]. The 2nd floor today has two levels (TE, WP-FR) [sourced].
- E1885 project: 30 m square room [sourced, project only].

### 6.2 Intermediate landing

- z = **195.93 m** (altitude 229.43), between nodes IX and X [sourced PL-I, PL-XXXI]. Transfer between the two Edoux cabins. The Edoux ram stroke is 81 m (THESIS; TE-LIFTS) [sourced].
- Panel 19 carries the floor's mass (PL-XXXI note "Dans les poids des panneaux 29, 19, 11, 5 sont comptés les poids des planchers") [sourced].
- FICHE-08 captions an engraving "transbordement des voyageurs à 240 m d'altitude" [sourced]. This conflicts with PL-I's 229.43 altitude; PL-I is preferred.

### 6.3 Third floor

- Floor z = **276.13** (altitude 309.63) [sourced]. The shaft is **10.00 m** square axis to axis (panel 29 prismatic, 11.23 m tall) [sourced PL-XXXI].
- **Gallery (outer platform).** "Côté extérieur 18m65, Surface 350 mètres carrés" (PL-I) [sourced]. WP-FR 18.65 m and 350 m² [sourced]. No element carries 18.65 (§26). Official today 250 m² for the lower (enclosed) level (TE-KF) [sourced].
- **Enclosed room.** Width **16.56 m** at floor level (PL-VII Fig. 4 "16,560") [sourced]; PL-XXXI prints "16.500" at this level [sourced]. The two differ by 0.06 m.
- **Brackets.** "Console" members cantilever the gallery outward from the shaft over about 3.0 m (PL-VII Fig. 4 "3,000") [sourced label; its extent is estimated].
- **Eiffel's apartment.** The level above carries "Balcon du logement de Mr Eiffel" and "Galerie du 3e Étage" (PL-VII Fig. 4) [sourced]. About 100 m² (TE-APT) [sourced].

### 6.4 Campanile (1889), above the 3rd floor

Chain from the 3rd-floor floor level (PL-VII Fig. 4; m) [sourced unless noted]:
1. **4.850** to the balcony and apartment level
2. **4.500** lattice box (together 9.350, CH-XLS "Cylindre 9.35")
3. **7.435** dome (CH-XLS "Dôme 7.435"). One crop reads 7.485 [estimated]; 7.435 is preferred because it matches CH-XLS.
4. **0.250**, giving a total of **17.035** to the lantern terrace

Level check: 309.63 + 17.035 = 326.665, against the printed lantern-terrace floor of **326.715** (PL-I). That is a 0.05 m discrepancy, unresolved.

- **Dome.** "Grandes poutres diagonales supérieures" [sourced PL-VII label]. Official: "Quatre arches métalliques en demi-cercle se rejoignaient au-dessus du troisième étage pour porter une petite plate-forme surmontée de la lanterne du phare" [sourced TE-PHARE].
  - Four lattice arches run along the diagonals of the box, about 10–11 m wide in elevation [estimated, pixel-measured].
  - A semicircle across the 10 m box diagonal (14.14 m) would rise 7.07 m, close to the 7.435 m printed rise [derived]. Model it as a slightly stilted semicircular cross-vault of 4 diagonal half-arches.
- **Lantern ("phare")** [sourced PL-VII Fig. 4 labels, with the element assignment estimated]:
  - base ("soubassement de la lanterne du phare") 5.750 wide
  - heights 3.980 (soubassement), 1.140 (lantern), 2.055 (cupola), 0.125, 1.200 (finial)
  - widths 1.700 and 2.686
  - TE-PHARE: two levels, each with a narrow balcony; a glazed cylindrical cage; the lantern with a cupola [sourced]
- **Top terrace floor.** 334.015 altitude (z 300.515) [sourced]. The lantern terrace to the top terrace is 7.30 m [derived]; CH-XLS "Tourelle 7.6" [sourced] disagrees.
- **Flagpole.** 11.760 m above the top terrace, to z = 312.275 [sourced PL-I].
- **Campanile mass.** 69,000 kg frame plus 60,650 kg other = 129,650 kg. PL-XXXI: "Le Campanile comprend toute la partie située au-dessus de la plateforme du 3e Étage" [sourced].
- **Later changes.** The top was rebuilt after a 1956 fire, and antennas were added (TE-H330) [sourced]. This spec describes 1889.

---

## 7. Counts and materials

| Item | Value | Source / tag |
|---|---|---|
| Iron parts | **18,038** | TE-KF, TE-FER ("Très exactement 18 038 pièces de fer"), TS-FR, WP-EN [sourced]. "18,000" in running text (TE-HIST, THESIS) [sourced]. Outlier "12 000 pièces métalliques" (TE-RIVET) [sourced] |
| Rivets | **2,500,000** | TE-KF, TE-HIST, TS-FR, WP-EN, THESIS [sourced, secondary]. **Never printed in the text**, whose one count is the 1,050,846 driven on site (p. 113): flagged, §27.4 |
| Rivets set on site | "un tiers seulement" (TE-HIST) · **1,050,846** = 42 % (WP-FR, from Eiffel 1900) · 1,050,846 (WOW) | [sourced]. THESIS: "Two-thirds … inserted … at the Levallois-Perret factory" [sourced] |
| Rivet diameters | **14, 16 and 18–25 mm** (price list: "rivets from 18 to 25 mm", "rivets of 16 mm", "14 mm rivets") | WOW [sourced, secondary; it appears to quote Eiffel 1900] |
| Rivet material | 36 kg/mm² strength, 12 % minimum elongation on a 100 mm specimen | WOW [sourced, secondary] |
| One original rivet | shank 26 mm, head 42 mm | a Shanghai steel-structure museum news item, seen only as a search-result summary (http://www.ssmuseum.net/en/news.aspx?type=2&id=170, did not resolve) [unverified] |
| Rivet pitch | **not found** in any source consulted | – |
| Metal frame | **7,300 t** puddled iron | TE-KF "Poids de la charpente métallique 7 300 tonnes", TE-FER "Au total, la Tour pèse 7300 tonnes" (quoting Eiffel) [sourced]. Workshop deliveries 6,360 t (Eiffel via TE-FER) [sourced]. THESIS "7.341 tonnes" (sic) [sourced] |
| PL-XXXI panel-mass table, sum | frame ("ossature"), panels 1–29 plus the campanile row: **7,012 t** (6,943 t without the campanile); with "divers" (floors etc.) **9,699 t** | [derived] sums of the PL-XXXI "Tableau des poids des panneaux" [sourced] |
| Total weight (with fittings, today) | **10,100 t** | TE-KF [sourced] |
| Paint | 60 t per campaign, every 7 years | TE-HIST, TS-FR [sourced] |
| Drawings | 700 general + 3,600 detail drawings, about 40 draughtsmen (THESIS) · 5,300 (TE-HIST) · 1,700 + 3,629 = 5,329 (WP-EN) | [sourced] |
| Fabrication tolerance | holes punched "to an accuracy of a tenth of a millimetre" (THESIS; TE-HIST "au dixième de millimètre"); "within 1 mm" (WP-EN) | [sourced] |
| Prefabricated pieces | "assemblée par éléments de cinq mètres environ" (TE-HIST) | [sourced] |

**PL-XXXI frame mass per panel** (kg, whole tower; [sourced]):

| panel | 1 | 2 | 3 | 4 | 5* | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| mass (kg) | 501,450 | 501,450 | 656,450 | 956,450 | 1,230,000 | 224,730 | 224,730 | 224,730 | 208,386 | 204,390 |

| panel | 11* | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19* | 20 |
|---|---|---|---|---|---|---|---|---|---|---|
| mass (kg) | 718,000 | 111,450 | 105,550 | 104,550 | 103,570 | 103,570 | 98,640 | 98,640 | 104,000 | 48,720 |

| panel | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29* | campanile |
|---|---|---|---|---|---|---|---|---|---|---|
| mass (kg) | 46,082 | 43,598 | 41,270 | 39,030 | 36,928 | 34,952 | 33,046 | 31,304 | 107,750 | 69,000 |

\* Panels 5, 11, 19 and 29 include the floor structures [sourced note].

---

## 8. Disagreements and open points

- **Floor heights.** 57 / 115 / 276 (official, rounded) vs 57.63 / 115.73 / 276.13 (PL-I, WP-FR). 57.64 on WM-SVG; 115.75 in one WP-FR table [sourced]. Use the PL-I values.
- **Base.** 125 (official) vs 124.90 (WP-FR) vs 124.906 (PL-I sum). All three measure the masonry pedestals. The iron's outer axes span about 118.9 m at ground and 116.4 m at the supports [derived].
- **Platform areas.** 1900: 4,200 / 1,400 / 350 m² (PL-I). Today, official: 4,415 / 1,430 / 250 m². WP-FR: 4,200 / 1,650 / 350 m². **2nd-floor side**: 37.63 (PL-I, estimated reading) vs 40.96 (WP-FR, current).
- **The profile table.** WP04 Table 1 (lower half too narrow, angle convention) vs PL-XXXI (preferred) vs CH-XLS (agrees with PL-XXXI except one misread half-gap and panel 19's height).
- **THESIS claims.**
  - It says panel 5 has "the same inclination" as panels 1–4. PL-XXXI and PL-XI give 0.3968 vs 0.5027, and the 7.5309 in-plane depth confirms the change [derived].
  - THESIS "Masonry 36 meters deep" is a misreading of the 36.00 m altitude datum [derived].
  - THESIS elsewhere agrees with the plates: 29 panels plus the top, panels 1–4 = 11 m, panel 5 = 7 m, and the 16 → 12 → 8 upright counts.
- **Arch.** The segment each of the three radii governs is **estimated**. The span "74 m" is a rounded WP-FR figure.
- **Campanile.** The 17.035 chain vs the printed levels differ by 0.05 m. The lantern sub-heights are assigned by estimate.
- **Rivets.** Diameters come from a secondary source only. The pitch was not found.

---

## 9. Generator recipe (derived summary)

1. **Frame.** z up, ground at the tower centre. The 4 legs sit on the diagonals, named N/E/S/W.
2. **Nodes.** Take the §2.4 node list (h and outer/inner half-widths). The supports are at z = 2.50.
3. **Legs, panels 1–17.** Place square leg sections at each node:
   - c at (±W_o, ±W_o), a at (±W_i, ±W_i), and b/d at the mixed corners.
   - Connect corresponding corners node to node with straight arbalétriers.
   - Drop a above node XVII.
   - Merge b/d with the neighbouring leg's d/b at node XI.
4. **Shaft, panels 18–28.** 8 uprights per level: corners at (±W, ±W) and face midpoints at (0, ±W) and (±W, 0). W goes from 8.70 at X down to 5.00. Each panel is ×0.94612 of the one below, with height = 0.55193 × full width.
5. **Panel 29.** A 10 m box, 11.23 tall, 4 bays of 2.5 m per face.
6. **Bracing per panel face:**
   - panels 1–4: X + mid horizontal
   - panels 6–9 and 12–28: X
   - panels 5, 10, 11: lattice girder bands
   - above XI: 2 X-bays per tower face
7. **1st-floor belt.** A 7 m lattice girder between the legs in the face plane: 32.6952 top, 38.25 bottom, bays 3.8825. Below it, the 7 m decorative girder (38.25 / 45.287), then the arcade, then the arch: crown at z = 39.40; R ≈ 36.41 in the face plane (compound 36.41 / 40.32 / 44.53).
8. **Floors.** Floors 0.23 above the nodes at z = 57.63 / 115.73 / 276.13, plus the landing at 195.93. Square platforms of side 70.695 / 37.63 / 18.65.
9. **Recursion.** Each member becomes a square lattice strut:
   - arbalétriers 0.80–0.87 m (panels 1–11) and 0.50 m (above)
   - web bars 0.80 m (panels 1–9) and 0.50 m (panels 12–28)
   - each strut made of 4 corner angles 80–100 mm, laced with 45 mm angles in X
10. **Top.** Campanile: 4.85 + 4.50 box, a 7.435 cross-vault of 4 diagonal arches, the lantern, the top terrace at z = 300.515 and the flagpole to z = 312.275.

---

## 10. The floors as fitted out in 1889: pavilions, galleries, balustrades

Compiled 2026-09-18 for `platforms.ts`. Heights are z above the ground at the tower centre (§0; the code's y) unless a number is marked as an altitude, which is z + 33.50. Tags as in §0.

### 10.1 Source keys (added)

Every plate below is from the same album as PL-I (Gallica ark bpt6k6542854f). Each plate is two scan halves, view f(n−1) on the left and f(n) on the right. The album's own "Table des planches" (https://gallica.bnf.fr/services/Toc?ark=bpt6k6542854f) gives the titles.

| Key | Source | URL |
|---|---|---|
| PL-XIII | **Pl. XIII** "Galerie du premier étage" | https://gallica.bnf.fr/ark:/12148/bpt6k6542854f/f68.item , …/f69.item |
| PL-13bis | **Pl. 13bis** "Galerie du deuxième étage" | https://gallica.bnf.fr/ark:/12148/bpt6k6542854f/f72.item , …/f73.item |
| PL-XIV | **Pl. XIV** "Panneau 29 et troisième étage" | https://gallica.bnf.fr/ark:/12148/bpt6k6542854f/f76.item , …/f77.item |
| PL-XVI | **Pl. XVI** "Ensembles des planchers des divers étages" | https://gallica.bnf.fr/ark:/12148/bpt6k6542854f/f84.item , …/f85.item |
| PL-XVII | **Pl. XVII** "Détails des planchers des divers étages" (joint details only) | https://gallica.bnf.fr/ark:/12148/bpt6k6542854f/f88.item , …/f89.item |
| PL-XVIII | **Pl. XVIII** "Rez-de-chaussée et premier étage. Aménagements", Fig. 3 "Aménagement du premier étage", 1:250 | https://gallica.bnf.fr/ark:/12148/bpt6k6542854f/f92.item , …/f93.item |
| PL-XIX | **Pl. XIX** "Étages et parties supérieures. Élévations extérieures et aménagements", Fig. 1 "Élévation du côté de l'École Militaire", 1:200 | https://gallica.bnf.fr/ark:/12148/bpt6k6542854f/f96.item , …/f97.item |
| PL-XXIX | **Pl. XXIX** "Restaurant français et restaurant russe" | https://gallica.bnf.fr/ark:/12148/bpt6k6542854f/f152.item , …/f153.item |
| PL-XXX | **Pl. XXX** "Bar anglo-américain et Théâtre" | https://gallica.bnf.fr/ark:/12148/bpt6k6542854f/f156.item , …/f157.item |
| E1900-TXT | G. Eiffel, *La Tour de trois cents mètres*, **Texte** (1900), Gallica ark bpt6k106381w. Chapter II "Plates-formes", § 1 "Plate-forme du 1er étage", pp. 212–214. Gallica's text endpoint is behind a bot check, so the OCR of the same scan was read from the Internet Archive mirror (OCR slips are flagged where a digit matters) | https://archive.org/download/n-0106381-pdf-1-400/N0106381_PDF_1_400_djvu.txt |
| WOW-FIG | wonders-of-the-world.net, "Printery Le Figaro on the Eiffel tower" (secondary) | https://www.wonders-of-the-world.net/Eiffel-Tower/Prinery-le-Figaro-on-the-Eiffel-tower.php |
| WOW-3F | wonders-of-the-world.net, "Third floor", quoting Eiffel 1900 (secondary) | https://www.wonders-of-the-world.net/Eiffel-Tower/Third-floor.php |

The album is from 1900, and PL-XVIII's Nota says it shows changes made « après l'Exposition de 1889 ». Where a plate shows a post-1889 state, the 1889 state is taken from the text or from a figure titled "pendant l'Exposition de 1889".

### 10.2 The 1st-floor plan (PL-XVIII Fig. 3)

**Where each building stands.** One building stands on each side, between two legs, centred on the face's centre line [sourced PL-XVIII, dash-dot axes]. The figure puts Pile n°2 (Est) top left, n°3 (Sud) top right, n°1 (Nord) bottom left and n°4 (Ouest) bottom right [sourced].

| side of the figure | between | building | face [sourced E1900-TXT] |
|---|---|---|---|
| top | piles 2 and 3 | RESTAURANT FRANÇAIS | SE, École Militaire side |
| left | piles 2 and 1 | RESTAURANT RUSSE | NE |
| right | piles 3 and 4 | BAR ANGLO-AMÉRICAIN | SW |
| bottom | piles 1 and 4 | SALLE DE SPECTACLE, the 1889 **restaurant flamand** | NW, Trocadéro side |

PL-XVIII's Nota [sourced]: « Après l'Exposition de 1889, le restaurant Flamand a été transformé en Salle de Fêtes, en Théâtre ». Every building's floor is "Sol (91.13)", z 57.63 [sourced; derived].

**The outer edge.**

- **Face length.** The dimension line under the bottom side reads **8.16 | 7.76 × 7 | 8.16**, "Longueur totale d'une face 70.69" [sourced PL-XVIII]. That is seven bays of 7.765 centred on the face and two end bays of 35.3475 − 3.5 × 7.765 = 8.17 [derived]. The buildings take the middle three bays.
- **The 70.69 is measured on the arcade's column axis.** 0.40 + 9 × 7.765 + 0.40 = 70.685 [derived]. The floor gutter runs outboard of it: « 71,69 m » to the outside of the gutter [sourced E1900-TXT], so 0.50 each side [derived].
- **The legs.** The column axis stands **4.00** outside each leg's outer upright line, and the leg is **15.00** [sourced PL-XVIII]. Against the node table: 35.3475 − 31.3476 = 3.9999 [derived]. The plan closes on PL-XXXI to the millimetre.

**The strips, from the column axis inward**, on a building's face:

1. **GALERIE, 2.60** wide [sourced PL-XVIII]. Its floor is printed **(89.93)** on PL-XVIII and **"Niveau de la Galerie promenade (89.90)"** on PL-XIX, with "1.23" between it and the restaurant floor [sourced]. E1900-TXT gives 1.20 in one passage and 1.23 in another [sourced]. This spec uses **89.90, z 56.40, 1.23 below the platform** [derived]. At the leg zones the gallery is 4.00 wide [sourced PL-XVIII].
2. **TERRASSE** at the platform level, reached from the gallery by paired flights of steps at each building's entrance [sourced drawing]. It is **1.52** wide on PL-XVIII but **1.6865** on PL-XXX Figs 4 and 16 [sourced]. PL-XXX's larger-scale figure is preferred. The difference, 0.1665, is probably a different reference line (façade face against façade axis) [estimated].
   - **The entrance flights** (read 2026-09-26 on PL-XVIII Fig. 3, PL-XXIX Figs 4 and 10 at 1:200, PL-XIX Fig. 1). Only the Français (labelled « Entrée ») and the Russe have them; the Bar and the Théâtre show neither steps nor a break [sourced PL-XVIII, PL-XXX Figs 4, 16]. In the centre bay a mirrored pair, each a quarter-turn winder about a newel at its front inner corner, up from the gallery square to the face and off toward the bay's middle onto a landing at terrace level [sourced drawings]. In u along the face from the bay's middle and v out from the step's face:
     - outer string on the pier axis, u 3.8825 [sourced: PL-XXIX Fig. 10's balustrade jog between its printed 3.8825s]; back string v −0.88 (Fig. 4), −0.77 to −0.86 (XVIII) [measured]; newel u 2.33, v +0.45, about 0.13 square [measured; XIX Fig. 1's tall posts at ±2.39];
     - 7 risers, 6 treads [counted Fig. 4]: two rounded bottom steps (u 2.06–4.17 to v +0.98, u 2.31–3.93 to v +0.66) and four winders, nosings on rays about 22°, 46° and 62° below the face line, the last riser drawn at about 79° [measured, ±5°, hand-drawn]. XVIII draws one curtail step and five winders instead. No riser is printed;
     - the landing between the newels pushed out over the gallery 0.41–0.44 (Figs 4, 10) or 0.60–0.66 (XVIII) [measured];
     - nothing is printed for the flights' own balustrade; XIX Fig. 1 draws the 0.90 terrace balustrade level and unbroken across the landing's front [sourced drawing].
   - PL-XVIII prints the two levels (89.93) and (91.13), a 1.20 rise [sourced]; the model keeps PL-XIX's 1.23 (§10.2 item 1).
3. **The building, 14.9975 deep** (§10.4). PL-XVIII rounds it to "14.99", and the Français chain there to 11.94 + 3.00 [sourced].
4. **BALCON**, the platform's inner edge, bows into the central void as an arc between the legs. Its chord is printed **32.695** [sourced PL-XVIII], the grande poutre's top span (§5.1), and 16.34 each side of the centre line [sourced]. E1900-TXT describes the void as a **29.00 m** square with cut corners and one rounded balcony per face [sourced]. §1's 4,200 m² gives a 28.245 square [derived, `spec.ts`]. The model keeps the 28.245 square.

**Where the buildings stand** [derived]:

- The gallery-side façade is 35.3475 − 4.2865 = **31.061** from the tower axis. The interior façade is 31.061 − 14.9975 = **16.0635**. Along the face they span ±23.295 / 2 = **±11.6475**, exactly the pier centres of the middle three bays.
- So each building fills the bay between two legs, over the full depth of a leg: at the floor, the leg's outer upright line is 31.270 from the axis and its inner line 16.289 (PL-XXXI at z 57.63).
- Along the face, a building's end clears the side uprights' axes by 4.64 at the floor and by 2.77 at z 65. It would reach an upright's skin (half-width 0.435) only at z ≈ 75.7, 18 m above the floor.
- E1900-TXT (1900 chapter, p. 326) says the passage left behind the buildings « était beaucoup trop étroit », and in 1900 the rear façades were moved back to leave at least 2 m [sourced]. So the 1889 rear façades are the ones on PL-XXIX and PL-XXX, not those on Pl. XLVII.

**Basements.** "Cuisine sous-sol (87.47)" and "Caves sous-sol (87.47)" flank every building [sourced PL-XVIII]. That floor is 3.66 below the platform [derived], and E1900-TXT agrees: « la hauteur de 3,66 m » [sourced]. The basements sit inside one 4 m panel of the floor girders (§10.6), so **nothing hangs below the deck** [derived].

### 10.3 The 1st-floor gallery and its arcade (PL-XIII, PL-XIX)

The outer gallery is a **roofed arcade** [sourced PL-XVIII legend: "P, Piliers des arcades de la galerie du 1er étage", "toiture des arcades"]. Heights below are above the gallery floor, z 56.40.

**Plan.**

- **Bays.** 9 bays per face on a **7.765** module (= 2 × 3.8825, the girder bays) [sourced PL-XIII, PL-XVIII].
- **Columns.** At each bay end stands a pier of **two cast-iron columns 0.800 apart**, centre to centre. Mid-bay stands **one column**. Between them are two small arches of **3.4825** each, centre to centre [sourced PL-XIII]. The corner pier stands 0.40 from the corner, so its outer column is the corner column [derived].
- **Column section.** The shaft is **0.18** square, on a 0.35 socle [sourced].
- **Roof depth.** The roof spans **4.1875** from the column axis to an inner arcade of iron pilasters [sourced PL-XIII Fig. 21]. Compare 2.60 + 1.52 = 4.12 on PL-XVIII [derived].
- **The inner arcade** (PL-XIII Figs 2, 21, 26–32, 37, 39; read 2026-09-26). Fig. 26 is « Arcades des Pilastres en fer »; Figs 28–31 are the transverse frames at each pier, from the column head back to a pilaster, carrying the valley gutter on their top.
  - **Where.** Fig. 21 (corner bays): 95 | 672.5 | 3.515, so 0.6725 + 3.515 = 4.1875 from the arcade's inner face to the pilaster, 4.2825 from the column axis [sourced; sums derived]. Fig. 31 (restaurant zone): the frame 4.2745 overall from the 0.18 column head to the pilaster's inboard face, 4.185 from the column axis [sourced; derived]. The two agree to 3 mm on the pilasters' inboard face at about 4.19.
  - **Before the legs** (Figs 2, 28–30) the pilaster stands at the platform's edge, "2.420", "2.427", "2.600" from the columns, and a 2.265 bracket carries the frame on to the leg, 4.947 overall [sourced].
  - **Pilasters**: one per pier, every 7.765, single, none mid-bay [sourced Figs 26, 27]; built-up, **0.497** deep square to the face, plates 130 × 5, so 0.130 across it [sourced Fig. 32; drawn 0.15–0.16 with cover plates, measured]; the leg-zone ones print flanges 140 × 7 [sourced Figs 2, 6]. Head **0.980** wide (487.5 + 5 + 487.5) and **1.600** tall, rounded into the shaft by two R 0.500 quarters, its underside 0.438 above the column tops [sourced Fig. 26]: 4.238 to 5.838 above the gallery floor [derived], the gutter line PL-XIX prints "5.84". The foot lands on the platform girder about the platform's level, with a piece down its face to the gallery [measured Figs 7, 31].
  - **The arch** (Fig. 26): two ribs 0.200 deep braced by radial angles 50 × 50 × 5 and 40 × 40 × 5; the outer rib crowned 2.862 above the gutter line; the inner rib's underside 1.950 under the outer crown and 0.912 above the gutter line [sourced]. Its printed radius was read **3.5675** and 3.0675 by two readers; a fit to the curve gives 3.62 [measured]. Each half is struck from its own centre 0.325 off the axis (« 325 », « 3.3925 ») and runs down past the gutter line to about 5.0–5.2 at ±3.39 [sourced; measured]. Its lunette is open: no infill, no glazing [sourced drawing].
  - **The crown is level.** Face arcade (Fig. 11: 2.250 + 2.650), inner arcade (Fig. 26: 0.438 + 1.600 + 2.862) and frames (Figs 28, 31: "4.900") all top out 4.900 above the column tops [sourced; sums derived]. The 8.940 of Figs 28 and 31 is measured from a « Niveau du plancher » 0.24 below the column base (Fig. 2 prints the 230 step), so it is the same crown, not a rise inward [derived].
  - **Valley gutter** (Fig. 39): 0.730 clear, 0.940 overall [sourced]; the frame's top chord 0.350 deep (200 + 150) [sourced Fig. 37].
  - Fig. 11's "Pilastre en fonte" (180 wide, 890 tall) are the balustrade's cast-iron posts, not the inner arcade.

**Heights.**

| element | above the gallery floor | z | tag |
|---|---|---|---|
| balustrade | **1.15** | 57.55 | [sourced PL-XIII "1.150", PL-XIX "1.15"] |
| column | **3.80** | 60.20 | [sourced PL-XIII "Haut' de la colonne 3m80", PL-XIX] |
| small arches' springing | 4.10 | 60.50 | [sourced: 0.300 above the capitals, PL-XIII] |
| small arches' extrados crown | **5.84** | 62.24 | [sourced PL-XIX]; 3.80 + 0.30 + 1.538 + 0.20 = 5.838 [derived] |
| plate pier over each pair, to the valley gutter | 3.80 + **2.25** = **6.05** | 62.45 | [sourced 2.250 = 1.000 + 0.650 + 0.600, PL-XIII; sum derived] |
| inner arc of the arched gable (lattice-filled) | 6.95 | 63.35 | [sourced PL-XIX]; E1900-TXT « 6,94 m à la clef » [sourced] |
| **vault crown at the face** | **8.70** | **65.10**, altitude 98.60 | [sourced PL-XIX "8.70" = 3.80 + 4.90]. PL-XXIX Fig. 13 gives the same line independently: 91.13 + 4.610 + 2.860 = 98.60 to "Dessus des arcs de la Galerie" [derived] |
| vault crown at the inner pilasters | 8.940 | 65.34 | [sourced PL-XIII Figs 28, 31], measured from a « Niveau du plancher » 0.24 under the column base: the same 8.70 crown, the vault level (re-read 2026-09-26, above; an earlier reading took it as a 0.24 rise inward) [derived] |
| palmette crest over each crown | **9.97** | 66.37 | [measured PL-XIX Fig. 1 on the full scan at 59–60 px/m, calibrated on the 7.765 and the 3.80 + 4.90 chain; earlier readings gave 10.14 (an upscaled crop, about 0.15 high throughout) and ~10.0–10.4 at 80 px/m] |
| flag masts, one per pier | top ~12.2 | ~68.6 | E1900-TXT « mâts de 8,00 m de hauteur portant des drapeaux » [sourced]; top [estimated, PL-XIX] |

**Arches and vaults.**

- **Small arches.** Intrados radius **1.538**, rib 0.200 deep [sourced PL-XIII Fig. 11], semicircular [estimated from the drawing].
- **Vault axis.** Each bay is roofed by its own vault, running back from the face with its axis perpendicular to it [sourced PL-XIII, E1900-TXT: « la toiture de chaque arceau »].
- **Valley gutters.** They sit over the piers, **0.730** wide [sourced PL-XIII].
- **Gable profile.** The outer arc fits a semi-ellipse with half-span (7.765 − 0.73) / 2 = 3.5175 and rise about 2.65 [estimated fit on PL-XIII Fig. 26; 8.70 − 6.05 = 2.65, derived]. PL-XIII prints radii 3.0675 (Fig. 11) and 3.3675 (Fig. 26) for these arcs, with 1.950 between the crowns on Fig. 26 [sourced]; the fit does not use them.
- **Crown band.** Between the inner arc and the outer arc runs a band **1.75** deep at the crown [sourced PL-XIX]; E1900-TXT says « un croissant, dont la hauteur au sommet est de 2,00 m » [sourced].
- **Roofing.** « La couverture de la galerie est en zinc ondulé reposant sur un voligeage qui lui-même prend appui sur cinq petites fermes en fer comprises dans la profondeur de l'arcade » [sourced E1900-TXT].

**The arcade's dressing** (E1900-TXT p. 213; the ledger pp. 217–218; PL-XIX Fig. 1; read 2026-09-26). One arcade, the same on all 36.

- **The crest.** « Le tout est couronné par un grand motif en zinc estampé » [sourced p. 213]. The ledger lists « Cartouches en staff » 40 and 36, and « Petits cartouches sous les motifs, patinettes » 36 [sourced p. 218 as the OCR reads it; « palmettes » presumably]. PL-XIII (the iron skeleton, Fig. 11 at 1:50) does not draw it; PL-XIX Fig. 1 does, at 1:200 [measured on the full e-rara scan at 59–60 px/m, about ±0.05]: a U-shaped frame astride the crown, its legs about 0.15 wide leaning out along the two rays that flank the crown's pair of roundels, from about ±0.54 at the inner arc to ±0.75 at 8.30, then turned in to scrolls about 0.30 across at ±0.56–0.61, 8.80; between them a cartouche about 1.20 wide from 8.08 to 8.60; on it a collar and a palmette of seven fronds from 8.67, the middle one to **9.97**, the next tips 1.41 apart at 9.42, the lowest lobes 1.53 apart at 8.84.
- **The cabochons.** « Dans les parties comprises entre les rayons de ces croissants existent des cabochons en verre jaune et, en dessus de ceux-ci, des verres coulés étamés et teintés donnant l'aspect de plaques dorées » [sourced p. 213]. PL-XIX Fig. 1 draws **12 roundels an arcade**, one in each cell between the crescent's rays, a constant distance inside the outer member, the crown's pair at ±0.32, 7.72 [counted; measured]: a boss about 0.27 across in a ring about 0.40 across (built 0.38, so that the model's crescent, narrower at its feet, holds it clear of rays and ribs). 12 × 36 = **432** [derived].
- **The gas globe.** « Au centre de chaque arcade est disposé un gros ballon en verre dépoli enveloppé d'un treillage métallique, dans lequel est un bec de gaz. Cette ligne de ballons lumineux éclaire la galerie » [sourced p. 213]: one an arcade, **36** [derived]. No plate read draws it, so its size and where it hangs are [estimated].
- **The ledger's other arcade lines** (p. 218), not built: « Verrerie des arcades » 36; « Panneaux quadrillés » 36; « Moulures » 1260 m; « Poussons masques en zinc des abouts des chéneaux des arcades » 16; « Consoles en bois » 40; « Mâts des arcades » 34 + 8, « Colliers des mâts » 40, « Pommes des mâts » 50. And p. 217: « Panneaux décoratifs en porcelaine pour entre-colonnements (Parvillée) » 40, one for each pier's two columns (40 = 4 × 10 piers) [derived], and « Arcades courantes » 14 + 18 with « caisson d'angle » and « plus-value pour arcades d'angle » 4 + 4 [sourced].

### 10.4 The four pavilions (PL-XXIX, PL-XXX, E1900-TXT)

**One plan for all four.** « quatre bâtiments ayant les mêmes dimensions en plan » [sourced E1900-TXT].

- **Length: 23m295** along the face = 3 × 7.765 [sourced PL-XXIX Fig. 10, PL-XXX Figs 4, 16, 21; derived]. PL-XXIX Fig. 11 prints "21m295" [sourced], taken as a slip.
- **Depth: 14m9975** = 3 × 3.8825 + 3.350 [sourced PL-XXIX Fig. 10, PL-XXX Figs 4, 16; derived]. E1900-TXT rounds it: « 11,65 m, plus une annexe de 3,35 m, soit ensemble 15,00 m » [sourced]. The Français' Fig. 4 prints "14m9075" [sourced], taken as a slip for 14.9975 [estimated].
- **Setback.** The gallery-side façade stands 1.6865 (terrace) + 2.600 (gallery) = **4.2865** inside the column axis [sourced PL-XXX; derived].
- **The rear annex.** « Cette annexe ne monte à toute hauteur que dans la travée centrale. Sur les côtés, cette partie s'arrête à une hauteur de 2,95 m et forme deux terrasses » [sourced E1900-TXT]. The terrace sits at **2.950** on the Bar (PL-XXX) and **2.90** on the Russe (PL-XXIX Fig. 9, "Sol (94.03)" on PL-XVIII) [sourced]. It has a 1.00 balustrade [sourced].

**The roof is the arcade's.** « Au droit des restaurants, la toiture de chaque arceau se prolonge sur toute la profondeur du bâtiment et fait corps avec lui » [sourced E1900-TXT]. So the three bays' vaults run on from the arcade to the building's back: 19.28 in the centre bay and 15.93 in the outer bays [derived]. The roof plan PL-XXX Fig. 21 prints 15.155 + 4.124 = 19.279 [sourced].

**Heights above the restaurant floor** (z 57.63):

| | Français (PL-XXIX Fig. 7) | Russe (PL-XXIX Fig. 13) | Bar (PL-XXX Figs 1, 2, 6) | Flamand |
|---|---|---|---|---|
| gutter / wall | 5.020 [sourced] | 4.610 [sourced] | 5.030 [sourced] | 4.610 [sourced, PL-XXX Fig. 12, drawn as the theatre] |
| vault crown | 7.497 → alt. 98.63 [sourced] | 7.47 → 98.60 [derived] | lantern eave **7.537** → 98.67 [sourced] | as the Bar: « identique au bar Anglo-Américain, sauf la décoration » [sourced E1900-TXT] |
| lantern ridge | 8.257 → 99.39 [sourced; the chain gives 8.217] | "Hauteur totale 8.27" → 99.40 [sourced] | 7.537 + 0.700 = **8.237** → 99.37 [derived] | 99.37 [derived] |

**Lanterns.** Each vault carries a gabled ridge lantern, **3.800** wide eave to eave, with a **2.650** glazed body, rising **0.700** [sourced PL-XXX Fig. 6; pitch atan(0.70 / 1.90) = 20.2°, derived]. Its length is [estimated from PL-XXX Fig. 21]:

- in the centre bay, about 13.6, from 0.7 inside the interior façade to 1.0 short of the gallery façade;
- in the outer bays, about 10.4, ending 0.4 short of the gallery façade.

Only the lanterns rise above the arcade crowns, by about 0.8.

**Taller ornaments.**

- The Russe's clock frontispiece finial: 2.60 [sourced PL-XXIX Fig. 9], built on the centre lantern's back end, so its top is 8.237 + 2.60 = 10.84 above the floor [derived].
- The Français' 1889 crest: a round-headed panel to about 8.46, its ball about 0.25 over that [measured, PL-XXIX Fig. 1, "pendant l'Exposition de 1889"].

**Frame and dressing** (PL-XXIX Figs 1, 3, 9, 11; PL-XXX Figs 5, 17; E1900-TXT p. 213; read 2026-09-26 at 1:100, 69-83 px/m on the e-rara scans). The plates' wall heads are 4.61-5.03 and the model's 4.82, so heights read over a wall head are kept relative to the model's.

- **Construction.** « La construction est faite en bois apparent pour les restaurants Anglo-Américain, Flamand et Russe. Elle est en pans de bois garnis de staff pour le restaurant Français » [sourced p. 213]. So the gallery front of three is their timber frame, and the Français' is its staff piers and arched doors (`FACADE`).
- **The timber screen** (PL-XXX Fig. 5; PL-XXIX Fig. 11; PL-XXX Fig. 17): a post on every 3.8825 line, "150" [sourced]; a boarded sill "0.60" [sourced PL-XXIX Fig. 11, twice; PL-XXX Fig. 5's chain 600 + 2.100 = 2.700] (a first reading took it as 0.50); a transom at "2.700" (the Russe's "2.76"), its beam "200" [sourced]; four glazed leaves a half-bay, "645.6" on the Bar and "605.6" on the Russe, on mullions "80" [sourced; counted]; over the transom two sashes a half-bay on the Bar, three on the Russe (0.56 / 1.29 / 0.56), one arched on the Théâtre [counted]. Over the wall head the vault's end is vertical boarding on all three [sourced drawings], not the Français' glazed trellis. The Russe's centre bay is open under the transom, "2.76" and "2.96" clear [sourced Fig. 11], its Nota: the glazed panels of the bays B « ont été enlevés après l'Exposition de 1889 » [sourced], so in 1889 they were glazed.
- **The terraces** on the annex at 2.95 carry a balustrade drawn "1.00" [sourced PL-XXIX Fig. 9], with a pinnacle post on each corner of the centre annex, capped about 6.6-6.85 above the floor [measured PL-XXIX Figs 1, 9].
- **Français** (Figs 1, 3): trellis on the piers of the gallery front from about 0.50 to the doors' springing, laths about 0.20 apart [measured; the ledger's « Treillage (Pillet et Schmid) », sourced]; a staff archivolt round each door, about 0.25 wide [measured]; on the back of the centre bay « pendant l'Exposition de 1889 » the crest: a round-headed panel about 2.40 wide to 8.46, two posts about 3.40 apart to 7.64 with finials, scrolled shoulders from the wall head [measured Fig. 1].
- **Russe** (Figs 9, 11): two carved gables over the centre bay of the gallery front, about 3.07 tip to tip, feet at 3.55, the apex board's top at 5.21, each 0.16 toward the bay's middle from its half-bay's centre, with a sunburst over it [measured Fig. 11, 118 px/m; Fig. 11's springing measures 4.78, its "4.61" runs to the cornice line]; a valance of carved teeth under the upper cornice of the side bays [drawn; pitch estimated]; on the back of the centre bay the clock ("1.25" [sourced]; its centre 0.63 over Fig. 9's 4.61 line, about 5.45 [measured]) inside a carved arch band, and the finial "2.60" from the ridge to the ball's top [sourced], its wheel of radius about 0.44 centred 0.49 of the way up it, 1.28, with an arrow vane [measured].
- **Anglo-Américain** (Fig. 5): on each boarded vault end a king post, a collar about 0.55 of the way up with a post "110" under each end about 2.5 out; either side a long brace from the outer foot to the king post at the collar, a short strut under it and a smaller X over the collar; raking struts rising from each post's foot on the transom out to the head beam, about 0.75-0.8 out [measured].
- **Flamand**: no plate draws its 1889 front. The text makes it the Bar's « sauf la décoration » [sourced]; the Théâtre's gallery front (PL-XXX Fig. 17) is taken as the Flamand's own, kept [estimated]: an arched sash rising about 1.50 in each half-bay over the transom; on each vault end a king post, a collar with its end posts about 2.5 out, curved braces from the end posts' feet (about 2.45 out) to the king post under the collar, and struts from the king post at the collar up and out to the arc, about 1.24 out [measured Fig. 17].

### 10.5 Balustrades

| where | height | posts | tag |
|---|---|---|---|
| 1st-floor gallery, outer edge | **1.150**: 0.150 plinth + 0.890 + 0.050 channel, a wooden handrail on top | cast-iron pilasters **180** wide every **1.74125** (half a small arch), the columns taking the other stations | [sourced PL-XIII Figs 11, 19, 20]. Infill: « 5 balustres en terre cuite dans chaque intervalle de 1.74125 » [sourced], between the column's 0.250 socle and the pilaster's 0.220 base, "1.50625" clear [sourced Fig. 11]; **720** in all (below) |
| 1st floor, round the central void ("Balcon") | not printed on the plates read | – | modelled as the gallery's [estimated]; the ledger's « Balustrade intérieure » is « Cours de balustrade en fer forgé (Bernard) », 107.25 m [sourced p. 217], wrought iron, so no balusters |
| 2nd-floor gallery, outer edge | **1.150** = 0.150 + 0.900 + 0.100 | the gallery posts (§10.7), X panels 834.22 wide between them | [sourced PL-13bis Fig. 93] |
| 3rd floor | the glazed room's **1.200** plate parapet (« Garde-corps de la galerie du 3me étage »), with glazing above it to 2.43 | – | [sourced PL-XIV Figs 2, 7] |
| Eiffel's balcony, 2.58 above the 3rd floor | **1.000**, three round bars | – | [sourced PL-XIV Fig. 7; PL-XIX Fig. 3] |

**The gallery's balusters** (read 2026-09-26). « Enfin, les colonnes sont réunies par un garde-corps constitué par des balustres en grès verni maintenus par une lisse en fer et par une large main courante en bois. Ces balustres, au nombre de 560, ont été fournis par la maison Émile Muller » [sourced E1900-TXT p. 213, checked on the page scan].

- **The rule** gives 720: five in each interval [sourced PL-XIII Fig. 11], four intervals a bay (pier column, pilaster, middle column, pilaster, pier column), nine bays a face, four faces, 5 × 4 × 9 × 4 = **720** [derived]. PL-XIX Fig. 1 draws five in every interval of every bay on its face, the corner bays included [counted].
- **The ledger** gives 720: under « Garde-corps extérieur », « Balustres en grès verni (E. Muller) » **727** at 8,50 = 6.179,50 fr, and « Pose des balustres » **720** at 1 fr = 720,00 fr [sourced p. 217, checked on the page scan; both products hold]: 727 bought, 720 set. Its « Main-courante en bois », 237,60 m at 4,25 = 1.009,80 [sourced], is 72 small arches at 3.30 between columns (3.4825 − 0.18) [derived]; 56 arches (the 560 case) would need 4.24 each, longer than an arch.
- **The text's 560** agrees with neither. It is exactly the rule less each face's two corner bays (5 × 4 × 7 × 4) [derived], which no plate draws. 720 is built (§10.10).
- **The profile**, measured on PL-XIX Fig. 1 (1:200, about 56 px/m on the full scan, a pixel 0.017; the thin parts stroke-limited): a plinth about 0.21 square, a torus about 0.17, a stem narrowing to about 0.05–0.07 just over it and swelling to about 0.12 under the bulb, a bulb about 0.21–0.22 at 0.49–0.53, a neck about 0.04–0.07, a cup, and an abacus about 0.21 from about 0.77 to the top at 0.89, Fig. 11's 0.890 between the rails [measured; a first reading had the stem tapering the other way]. The glaze's colour is not recorded.

### 10.6 The 1st-floor deck and the skirt under it (PL-XVI, PL-XIX)

**The deck structure.**

- **Main girders.** 7.00 deep: the outer one is the grande poutre (§5.1) [sourced PL-XVI Fig. 6, PL-XIX]. The inner one is drawn the same way [estimated from PL-XVI Fig. 8]. Their tops are **0.230** below the floor [sourced].
- **Cross girders** ("poutres transversales"). They span between the main girders every **3.8825**, **4.000** deep (3.90 in the leg zones) [sourced PL-XVI Figs 9, 11]. Between them run longitudinal struts 3.920 deep [sourced]. The cross girders' lattice form is not printed on the crops read [estimated].
- **Joists.** I 160 parallel to the face at **0.6471** centres [sourced "647.1"; 3.8825 / 6 = 0.64708, derived].
- **Floor build-up** [sourced PL-XVI Nota]: hourdis Perrière, a cement screed, sleepers, planks and asphalt. « Le sol des galeries n'a pas de hourdis Perrière ».
- **Depth.** The deck is 4.23 deep at the cross girders and 7.23 at the main girders [derived: 0.23 + 4.00; 0.23 + 7.00].

**Consoles.** Brackets ("consoles de la grande galerie de circulation") project from the outer girder every **3.8825**, one under each column position [sourced PL-XVI Fig. 9]. They carry the gallery 4.00 beyond the girder axis [sourced]. Each is **7.000** deep, with its outer edge a circular arc of **R = 14 m** [sourced PL-XIII]. The foot sits about 0.9 inboard of the top [estimated].

**The skirt.** A **0.50** cornice plus **5.50** of 3 mm plate panels hangs below the gallery floor, down to altitude **83.90**, z 50.40 [sourced PL-XIX, PL-XIII; derived]. Two chains close on that level [derived]:

- 89.90 − 0.50 − 5.50 = 83.90;
- 91.13 − 0.23 − 7.00 = 83.90, the grande poutre's bottom.

From outside, the grande poutre is hidden behind the skirt [derived]. The skirt's decoration, from the top down [sourced PL-XIX]:

- a 1.50 zone of volute brackets over fluted panels;
- a lattice cresting;
- a **0.80** band of names in cartouches (COUCHY, BELGRAND, REGNAULT …), about 4.1–5.0 below the gallery floor [estimated position].

**So the 72 names are on this skirt, 4.00 outboard of the grande poutre, not on the girder.**

### 10.7 The 2nd floor (PL-13bis, PL-XIX)

**The covered gallery.** Round the edge runs a roofed gallery, "Galerie couverte" [sourced PL-XIX Fig. 7], level with the platform (149.23) [sourced].

- **Cantilever.** Consoles cantilever **2.000 + 0.760** [sourced PL-13bis Figs 71, 72, 78].
- **Posts.** Box posts of two 160 channels stand every **3.36268** and rise **3.620** [sourced PL-13bis Figs 71, 93]. At the corners they are paired, 0.800 apart [sourced].
- **Width.** The two post lines are **2.096** clear apart [sourced; the digit could read 2.996, and pixels favour 2.096].
- **Roof.** A pitched roof, its ridge along the face [sourced PL-13bis Fig. 94]. Its eaves are about 3.0 and its ridge about 3.6 [estimated].
- **Attic band.** A **0.62** band rises between the eaves beam (~2.85) and the post tops [sourced Fig. 93].
- **Skirt.** It hangs **5.150** below the floor [sourced PL-XIX Fig. 2].

**What stood on the platform** (re-read 2026-09-26 on E1900-TXT pp. 199, 214–215, 321, 326–327 and PL-XIX Figs 2, 7).

- **PL-XIX Fig. 7 is the 1889 platform.** The text lists what occupied it « pendant l'Exposition de 1889 (Pl. XIX, fig. 2 et 7) »: the Otis lifts' upper framing with its stairs and queues; « les grands réservoirs cylindriques alimentant ces ascenseurs »; the unused Roux girders of piles 2 and 4, to which « deux plates-formes polygonales » were joined (closed shelter below, above « l'une comme atelier de photographie pour M. Neurdein, l'autre comme plate-forme d'observation »); the Edoux's approaches in the middle; the four helical stairs from the 1st floor and the start of the one on up. In the room left: « un pavillon en bois servant d'imprimerie au Figaro et transformé depuis en buffet », « un bar affecté à la boulangerie Viennoise et tenu par M. Jacquet », « un bâtiment compris entre l'un des réservoirs et l'ascenseur Edoux » (tickets and water-closets), « quelques boutiques et bars, et enfin des tentes-abris pour les consommateurs », and a 6 m³ fresh-water tank [sourced pp. 214–215]. So the plate's « Buffet » is the Figaro's pavilion under its later name [derived].
- **Size of the platform.** « le côté mesuré à l'extérieur du chéneau est de 57,90 m … une galerie de 56,80 m sur 2,10 m, plus … deux chéneaux de 0,55 m » [sourced p. 214, OCR]. Fig. 7's post chain closes on **36m80** for the gallery's outer post line, its corners cut 1.21 back [sourced; measured 36.79–36.98 across the posts], so the OCR's 57,90 and 56,80 are 37,90 and 36,80 (36.80 + 2 × 0.55 = 37.90) [derived]. PL-I's smudged 37.63 (`PLATFORMS`) is 0.27 short of it; not changed here.
- **Readings of Fig. 7** (1:200; e-rara scan, 59.15 px/m on eight printed 3.36 pitches; world x right, z down as PL-XVIII; ±0.3) [measured]:
  - **Reservoirs**: « Réservoir d'eau pour les Ascenseurs inférieurs (45 m³) », "3.00" across, "6.00" along [sourced]; the text: « deux réservoirs cylindriques de 3 m de diamètre et 7 m de longueur … 46,339 m³ » [sourced p. 199; the research note's "5 m" is the OCR's old-style 3]. One each side of the middle on the pile 2 – pile 4 diagonal, axis square to it, centres at t −7.76 and +8.03, s 0.2 and 0.3 in the diagonals' frame. Fig. 2 draws the pile-4 tank's end 3.07 across with its underside about 0.6 above the floor [measured]. The p. 327 table: « Fers et supports des réservoirs cylindriques, plus 90 m³ d'eau » [sourced]; p. 326: full, over 100 t [sourced].
  - **Buffet (Figaro)**: a hatched hexagon on the Russe's side (between piles 2 and 1), (−15.8, −6.0), (−12.3, −6.0), (−8.2, −1.85), (−8.2, 1.0), (−13.3, 5.83), (−15.8, 5.83), wrapping the uprights b of piles 2 and 1; « Cabinet », « Vestiaire », « Office », « Comptoir », « Bureau » inside. p. 321: near the North pile's Otis; p. 327: 30,000 kg [sourced]. No height is printed.
  - **Tickets and water-closets**: « Urinoirs et Water-closets », « Téléphone », « Billets pour le 3e » between the pile-2 reservoir and the Edoux's cage, s −2.95 to about 4.1, t −6.45 to −2.55.
  - **Boutiques**: two, flanking the Edoux's approach on its pile-4 side, s 3.23–5.29 and −4.65 to −2.62, t 2.57–3.58 and 2.52–3.52. Fig. 2 prints **2.840** for the boutique seen from the Seine and draws the W.C. to the same line [sourced; measured].
  - **Tents**: two « Tente-abri pour les consommateurs », decagons 3.58–3.76 to a corner about poles at (12.56, −0.11) and (0.05, 12.22), a post at every corner; « Tente-abri pour les visiteurs du 3e étage », 7.2 × 4.6 about (0.87, −11.18), its ridge toward pile 3.
  - **Polygonal shelters**: « Plateforme de l'abri (151.85) », 2.62 above the floor [sourced], about (−13.0, −13.3), (−9.05, −13.3), (−7.97, −12.62), (−7.75, −10.45), (−10.25, −7.87), (−12.26, −8.15), (−12.98, −9.31) by pile 2 (« Escalier d'accès à la plateforme sur laquelle sont établis le petit canon et un thermomètre enregistreur ») and its near point-image by pile 4 (« Escaliers d'accès chez le photographe », « Boutique au Rez de Ch. »); Fig. 2 draws the studio's cabin high on the Roux girders.
  - The helical stairs from the 1st floor come up by each pile's corner upright c (the brown flights), not on the leg's diagonal.
- A secondary source describes the Figaro's pavilion as a two-part kiosk of pine and pitch-pine with glazed walls, with no dimensions [sourced WOW-FIG].

### 10.8 The 3rd floor (PL-XIV, PL-XIX)

- **The gallery is inside the glazing.** The whole outline is labelled "Paroi vitrée", an octagon **16.560** across the flats with **10.90** straight sides and 45° chamfers [sourced PL-XIX Fig. 9; PL-XIV Fig. 8: 2 × 5.450].
- **Its floor.** Inside it runs the "Galerie promenade (309.83)", **3.250** wide, round the 10.00 m core at (309.63) [sourced PL-XIV Fig. 2]. WOW-3F quotes Eiffel: a closed room 16.50 wide, 251 m² [sourced, secondary].
- **The ceiling** is the floor of Eiffel's open balcony at 309.63 + **2.58** = 312.21 [sourced PL-XIX Fig. 3; derived]. The balcony overhangs the glass by about 0.5 [estimated].
- **What 18.65 measures is not clear.** Nothing on these plates dimensions PL-I's 18.65 × 18.65 "côté extérieur". The balcony would be about 17.5 across [estimated]. So no plate shows what stands at the edge of an 18.65 deck. (Settled from the text in §26: no element carries it.)

### 10.9 What `platforms.ts` builds from this

- **1st-floor decks.** The platform ring stops 2.60 inside the column axis. The gallery ring below it has its top at z 56.40 and reaches 0.50 past the axis. It is 2.60 wide all round: the 4.00 width at the leg zones (§10.2) is left out.
- **The arcade** as in §10.3, per face:
  - 28 columns and 10 plate piers;
  - 18 small arches of 6 facets each;
  - 9 vaults, a semi-ellipse 3.5175 × 2.65 with a level crown of 8.70;
  - 10 masts;
  - the dressing of every arcade (§10.3, `ARCADE_DRESS`, `arcadeDressFace`): its crest (a U-frame along two of the crescent's rays, scrolls, cartouche, collar and a seven-frond palmette to 9.97); a ring 0.38 and a yellow glass boss 0.27 in each of the crescent's 12 cells, 0.55 in from the outer rib, the bosses instances (`fittings.cabochons`, 432); a frosted gas globe on a rod in two hoops, hung from the vault's crown over the gallery's middle, 1.30 in, centred 5.90 up, 0.60 across [estimated] (`fittings.globes`, 36). The old crest, a box to 10.10, is gone.
- **The inner arcade** as in §10.3, per face: 8 pilasters with their heads, on the piers between bays −4 and 4, those at ±3.8825 and ±11.6475 on the platform with their inboard face 4.1875 inside the column axis, those before the legs (±19.41, ±27.18, by rule from the leg's width at the gallery floor) on the gallery floor against the step, 2.35 from the column axis [derived]; 8 valley gutters 0.94 × 0.35 from the face's plate piers back to the arch, or to 4.947 before the legs; 7 open arches, the outer rib hung under the vault's shell, the inner R 3.5675 crowned 6.75. The pilaster heads stop at the model's 6.05 springing less the gutter, not at Fig. 26's 5.838 [derived].
- **The entrance flights** on the Français and the Russe (§10.2): 7 risers of 1.23 / 7, two squared bottom steps and four winders solid to the gallery floor, the deck and the step cut out under them; the back string at v −0.72, not the plates' −0.77 to −0.88, because the model's grande poutre's top chord stands 0.74 inside the step [measured on the cooked girder]; the landing pushed out 0.43; the terrace balustrade's section run level along the strings and across the landing, a raking handrail over the gallery, the newels 0.20 proud [estimated].
- **The 2nd platform's 1889 massing** (§10.7): the two reservoirs (3.00 × 6.00 on two saddles, 0.6 up), the Figaro's pavilion (its hexagon stopped at x −15.0 inside the uprights b, 3.00 tall [estimated]), the tickets and water-closets and the two boutiques (2.84), the two decagonal tents and the queue's tent (heights estimated).
- **The four pavilions** from one massing (§10.4). The walls rise to the arcade's valley gutter, 4.82 above the floor [derived: 56.40 + 6.05 − 57.63], within the printed 4.61–5.03. The vaults are the arcade's, extended. The lanterns have their eave at 7.537 and their ridge at 8.237. The model has no compass: its layout copies PL-XVIII as drawn, with the render's top view (x right, z down) as the plate.
- **The pavilions' frame and dressing** (§10.4, `pavilionRule`, `screenFront`, `…Dressing` in `platforms.ts`): one rule on all four, the same under the quarter turns (the wall-head cornice, the side walls' posts on the 3.8825 lines, the terraces' 1.00 balustrade, the four pinnacles); the timber screen on the three « en bois apparent », the Russe's centre bay open; each pavilion's dressing on the face `FACES` names for it. Everything stands at most 0.09 proud of the gallery front, inside the inner arcade's plane 0.099 in front of it [derived].
- **Balustrades** as in §10.5: rails and posts. The gallery's infill is its 720 glazed stoneware balusters, five to each 1.50625 clear, as instances of one turned profile (`BALUSTER`, `fittings.balusters`); the other balustrades' infill is left out. The 3rd floor gets none of its own.
- **The 2nd-floor covered gallery** with its attic band.
- **The skirt** as one plane leaning in 0.50. That is less than the consoles' ~0.9 [estimated], so its foot clears the legs' outer uprights at the corners. The foot is at node XXIV (z 50.40), where the leg kinks and the upright's mitred skin reaches 34.66 from the axis; the panel's inner face is at 34.77 there [measured on the cooked mesh by slicing its triangles; derived].
- **The cross girders** between the legs as 4-panel N-trusses, parallelograms that lean with the legs [the form estimated].
- **Not built:**
  - the corner squares of the 1st-floor gallery, where two faces' corner vaults cross (the accounts' « arcades avec caisson d'angle », undrawn on the plates read): no pilaster, gutter or inner arch there, the corner vaults left open at the back; nor the leg zone's shell running on to the leg;
  - the basements, joists and consoles;
  - the pavilions' interiors (ceilings, vélums, coffers, salons) and their side elevations' porches and gables (PL-XXIX Figs 6, 12; PL-XXX Figs 2, 12);
  - on the 2nd platform: the two polygonal shelters (they stand where the model brings e1 up the leg's diagonal, `STAIR_OPENINGS` [estimated], which Fig. 7 draws beside the corner uprights instead), the studio and observation deck over them on the Roux girders' extensions (not built above the 1st floor), the Viennese bakery's bar (named, not drawn), and what stands in the Edoux's central block (the 6 m³ tank, the fountain, the « Cabinet pour l'étude de la résistance de l'air », the benches), which is the Edoux's head.

### 10.10 Disagreements and open points

- **Gallery floor.** 89.90 (PL-XIX) against 89.93 (PL-XVIII), a 3 cm difference. The drop is 1.23 (PL-XIX, PL-XVI, one E1900-TXT passage) against 1.20 (another E1900-TXT passage).
- **Terrace width.** 1.52 (PL-XVIII) against 1.6865 (PL-XXX).
- **Central void.** 29.00 with cut corners and bowed balconies (E1900-TXT) against the 28.245 square derived from PL-I's 4,200 m².
- **Pavilion depth.** 14.9975 (three plans) against 14.9075 (Français Fig. 4). **Russe length:** 23.295 against "21m295" on Fig. 11. **Russe height:** 8.27 against "8.67" on Fig. 12.
- **Français rear bays in 1889.** Terraces (E1900-TXT, which says they were covered « depuis l'Exposition ») against Fig. 1's ~5 m wall with arched gables.
- **The names.** They are on the skirt (§10.6), but `firstFloor.ts` puts its frieze plaques on the grande poutre, which the skirt hides.
- **The 3rd floor's 18.65** (PL-I) is not explained by any plate read (§10.8).
- **The Russe's entrance.** PL-XVIII draws the flights on the Russe as on the Français; PL-XXIX Fig. 10 draws its centre front pushed out 0.44 but closed, with no flights. PL-XVIII is followed.
- **The flights' depth.** The back string at −0.77 to −0.88 on the plates against −0.72 in the model, where its grande poutre's top chord sits (§10.9).
- **The reservoirs' length.** 7 m in the text (p. 199) against "6.00" on Fig. 7; 46.339 m³ is neither (π × 1.5² × 6.556) [derived]. The plate's is built.
- **The 2nd platform's side.** 37.90 outside the gutter (text, read with Fig. 7's 36.80) against PL-I's 37.63 in `PLATFORMS` (§10.7). The text closes the floor at 16.56, and no element carries 18.65 (§26).
- **The gallery's balusters.** 560 in the text (p. 213) against 720 by PL-XIII's rule and PL-XIX's drawing and 720 « posés » in the ledger (p. 217); 560 is the rule without the corner bays. 720 is built (§10.5).

---

### 10.11 The glass (2026-09-26)

Backlog item 17. Until now every glazed opening was built as its frame with the glass left out. Two classes carry it now: `glass` (clear) and `silvered` (the crescents' cast glass). The page draws `glass` blended at a low opacity, writing no depth, front faces only, casting no shadow and left out of the occlusion prepass (main.ts `GLASS`, gtao.ts `skipSeeThrough`).

**What the text says is glass** [sourced E1900-TXT pp. 12, 213-216, OCR]:
- The pavilions: « les ouvertures de 7,765 m sont divisées elles-mêmes en deux entraxes de 3,88 m donnant la largeur des baies vitrées ouvertes sur la galerie » (p. 213). The Bar's gables « sont décorés par des vitraux colorés de la maison Champigneulle » (p. 214).
- The lanterns (p. 214): on the Bar, « couvert en zinc et ne sert qu'à l'aération. Il en est de même pour les restaurants Flamand et Français. Pour le restaurant Russe, il comprend trois châssis vitrés. »
- The ceilings: the Bar's « quatre panneaux vitrés dans la travée centrale et trois panneaux dans les travées latérales »; the Français' « seul panneau vitré ovale par travée ».
- The arcade's crescents: « des cabochons en verre jaune et, en dessus de ceux-ci, des verres coulés étamés et teintés donnant l'aspect de plaques dorées ». The 1st platform's ledger has « Verrerie des arcades (Néret) » (p. 218); « Verre coulé étamé (Néret) » is the 2nd platform's (p. 219).
- The 3rd floor: « des glaces mobiles que l'on peut élever ou abaisser » (p. 216), and « une sorte de cage vitrée par des glaces mobiles » (p. 12).

**The glazing bars** [measured on the full-resolution scans at about 118 px/m (1:100) and 60 px/m (1:200), ±0.03-0.05; heights over the restaurant floor]:
- **Français doors (PL-XXIX Figs 1, 3).** Four equal leaves of about 0.61 across the 2.60, with the meeting stile on the axis (drawn double). A raised panel runs from 0 to 0.58. The glass is three panes high, with bars at 1.18 and 1.73, up to a transom from 2.28 to 2.44 at the springing. Above it sits the fan: an inner arched light over the two middle leaves (span 1.26, crown 3.03), split by the axis bar, and rays at about 30-32° and 53-58° from the upright, read as 30° and 60°. That gives 2 + 6 lights, with the glass crown at 3.61.
- **Russe screen (PL-XXIX Fig. 11).** Leaves are two panes high over a rail at 2.10-2.13 (drawn double). Three sashes over the transom, three panes high (bars at 3.44 and 3.76), 2 / 4 / 2 across. The plate's nota: « Les panneaux vitrés des baies B ont été enlevés après l'exposition de 1889 ».
- **Bar screen (PL-XXX Fig. 5).** The printed chain is 325 · 150 · 110 · 80 · 645.6 · 80|80 · 645.6 · 160 · 645.6 · 80|80 · 645.6 · 80 · 75 = 3882.5. Leaves are two panes high over a rail at 1.97-2.07. Over the transom, two sashes about 0.80 wide sit centrally, two by two with a bar at 3.37, flanked by diagonal boarding.
- **Russe screen, centre bay (PL-XXIX Fig. 11).** Open below the transom; over it, under the carved gables, « Châssis fixe » arched lights with vertical bars.
- **Flamand screen (PL-XXX Fig. 17, the Théâtre's front).** Leaves are two panes across and four high, with bars at about 1.13, 1.65 and 2.14. The fanlight is flattish, arched, about 3.4 wide and 1.25 high, eight across (three mullions on the leaves' lines and a bar between each two) and three high; the spandrels over it are diagonal boarding.
- **3rd-floor croisées (PL-XIV Figs 7, 10; PL-XIX Figs 3, 9).** Parapet 1.200, clear opening 1.030 and beam 0.200 are printed. Each bay is split by an intermediate I-post into two lights, 1.34 + 1.16. The sashes' subdivision is not drawn at 1:200.

**What `platforms.ts` builds** (`GLAZING`, `GLAZING_BARS`, `glazing`, `francaisDoors`, `screenGlazing`, `tympanumGlass`, `crescentGlass`), and `summit.ts` (`summitGlass`):
- Every pane is a sheet 6 mm thick [estimated]. It sits in the plane of the frame it fills, cut to the clear opening between that frame's members, and runs 2 mm into them [estimated rebate]. The exception is Eiffel's pavilion, whose panes stop at the walls' reveals, because those walls are the rooms' solids.
- Bars are 0.030 wide and rails 0.050, each 0.040 through the plane [estimated]. The doors' stiles are 0.050 and the meeting stile 0.070 [estimated].
- **Bar ends.** Where a ray's square end meets a slanting rib or head, the glass past it is its own small piece, inside the ray's band, so no light shows round a bar's end (`endFill`).
- **Pavilions.** The Français' six doors, as above: jambs 0.08, four leaves of 0.61, 20 lights each and five pieces past the rays' ends. The fan's ring is built as the six chords between the rays' feet, so every light stays convex. The transom's top is the model's springing, 2.43. The Français' glazed tympana over the façade and every vault's void-side tympanum on all four: six lights each, between the post and the rays `tympanum` already built, and five end pieces. The three timber screens, as above: the Russe's centre half-bays glazed over the transom four by three [estimated count]; the Bar's two sashes 0.80 wide by its middle mullion, the rest of its sash height boarded (0.05, in the screen's plane); the Flamand's fanlight glazed to the centre line of the arch its dressing draws in front, eight across and three high, boarded over it. Their rows split the model's sash height evenly, as the plates' bars split theirs.
- **Silvered.** One plate of silvered glass in each of the 12 cells of all 36 crescents, set 0.010 behind the gable's face [estimated], so each cabochon's ring stands in front of it, and the small pieces past both ends of each of the 11 rays. At each crescent's foot, where the two ribs come down to the springing apart, a sill 0.10 tall [estimated] from the outer rib's foot to the inner rib's edge at the sill's top, in the `platforms` class, carries the lowest plates.
- **3rd floor.** Four panes in each of the 24 croisées, either side of the bar and the meeting rail `gallery` already builds. A chamfer's last pane stops at the next straight side's vertex post, which is square to that side and so reaches 0.05 √2 along the chamfer. Two panes in each of Eiffel's pavilion's 16 windows, and one in each of its 8 doors (glazed doors as PL-XIX Fig. 3 is read; no text says so).
- **Counts.** 150 + 33 + 132 + 324 + 96 + 152 = 887 clear pieces on the 1st floor, 96 + 40 on the 3rd, and 432 silvered plates plus 1,584 end pieces.

**Left out, and why:**
- The Russe's lantern « trois châssis vitrés »: PL-XXIX Figs 13-14 draw a glass band 0.40 high, but the model's lantern stands only 0.07-0.26 above the vault.
- The ceilings' glazed panels: they are inside halls the model does not furnish.
- The Bar's stained glass (Champigneulle): its gables are drawn with the same clear glass as the tympana.

**Open:**
- The plates draw the void-side vault ends four different ways:
  - the Français' (PL-XXIX Figs 1, 3) as an ornamental lunette of piers, fan panels and lattice quarters, with no mark that says glass;
  - the Bar's (PL-XXX Fig. 1) weatherboarded, with two-by-two windows;
  - the Flamand's (PL-XXX Fig. 11) as one segmental window about 4.9 × 2.15;
  - the Russe's (PL-XXIX Fig. 9) as an oval 3.4824 wide.
  The model keeps one glazed post-and-rays tympanum for all four, as §10.4 already reads them.
- The croisées: the plate's 0.45 + 4 × 2.50 + 0.45 bays split 1.34 + 1.16 against the model's posts (§29) and its mid-bay bar and meeting rail.

## 11. The lifts and the stairs (1889)

Compiled 2026-09-18 for `lifts.ts`. Heights are z above the ground at the tower centre (§0) unless marked as an altitude (z + 33.50). Tags as in §0. Legs by the plates' numbering: n°1 Nord, n°2 Est, n°3 Sud, n°4 Ouest. E1900-TXT once prints "2 ou Ouest… 4 ou Est"; the plates and the rest of the text say 2 = Est, which is used.

### 11.1 Source keys (added)

Every plate is from the album of §10.1 (Gallica ark bpt6k6542854f), two scan halves each. The Gallica IIIF endpoint (`https://gallica.bnf.fr/iiif/ark:/12148/bpt6k6542854f/f<n>/<region>/<size>/0/native.jpg`) serves regions at full resolution, which is how the numbers below were read.

| Key | Source | URL |
|---|---|---|
| PL-XX | **Pl. XX** "Ascenseurs. Réservoirs. Canalisation. Coupe verticale suivant la diagonale de la pile 1 (Nord) à la pile 3 (Sud)", 1:200. Figs 1–3 Edoux, Fig. 4 Otis; the "Description générale" with the stairs' legend; "Données numériques" for all three systems | https://gallica.bnf.fr/ark:/12148/bpt6k6542854f/f100.item , …/f101.item |
| PL-XXI | **Pl. XXI** "Ascenseurs. Pompes. Réservoirs. Canalisation. Plan général", 1:200 | https://gallica.bnf.fr/ark:/12148/bpt6k6542854f/f104.item , …/f105.item |
| PL-XXIIter | **Pl. XXII ter** "Ascenseur Otis. Poutre de l'ascenseur, voie, cabine, appareils de sûreté" | https://gallica.bnf.fr/ark:/12148/bpt6k6542854f/f116.item , …/f117.item |
| PL-XXIII | **Pl. XXIII** "Ascenseurs à pistons articulés, système Roux Combaluzier et Lepape. Partie inférieure" | https://gallica.bnf.fr/ark:/12148/bpt6k6542854f/f124.item , …/f125.item |
| PL-XXIIIter | **Pl. XXIII ter** "Ascenseur Édoux. Deuxième étage et étage intermédiaire" | https://gallica.bnf.fr/ark:/12148/bpt6k6542854f/f132.item , …/f133.item |
| PL-XXVIII | **Pl. XXVIII** "Escalier de 1m00 de large du rez-de-chaussée au 1er étage" | https://gallica.bnf.fr/ark:/12148/bpt6k6542854f/f148.item , …/f149.item |
| VOGEL | R. M. Vogel, *Elevator Systems of the Eiffel Tower, 1889*, United States National Museum Bulletin 228, Smithsonian, 1961 (secondary; Project Gutenberg text) | https://www.gutenberg.org/files/32282/32282-h/32282-h.htm |
| AUC-ADER | Ader, lot 2187, "Escalier de la tour Eiffel, tronçon de l'escalier hélicoïdal" (secondary) | https://www.ader-paris.fr/lot/2187/553958-escalier-de-la-tour-eiffel-troncon-de-lescalier-helicoidal |
| AUC-ARTC | Artcurial, "An original staircase from the Eiffel Tower up for auction" (secondary) | https://www.artcurial.com/en/articles/an-original-staircase-from-the-eiffel-tower-up-for-auction |

E1900-TXT (§10.1) is cited by page. Its page images are Gallica bpt6k106381w, view f(page + 14).

### 11.2 Which lift in which leg (PL-XX, PL-XXI)

| system | legs | from → to | printed | tag |
|---|---|---|---|---|
| Roux, Combaluzier et Lepape (articulated pistons) | piles 2 (Est) and 4 (Ouest) | rez-de-chaussée (35.08) → 1st floor (91.13) | « soit à 56m05 » | [sourced PL-XXI] |
| Otis | piles 1 (Nord) and 3 (Sud) | rez-de-chaussée (35.08) → 2nd floor (149.23) | « soit à 114m15 avec arrêt facultatif au 1er étage » | [sourced PL-XX, PL-XXI] |
| Edoux, vertical | the tower's centre | 2nd floor (149.23) → 3rd floor (309.63) | « soit sur une hauteur de 160m40 », in two stages of 80.20 | [sourced PL-XX] |

- The rez-de-chaussée station, 35.08, is z **1.58** [derived]. The machinery is below it: « Sous-sol des machines », floor (30.50) [sourced PL-XX Fig. 4].
- **Cars.** Roux: « cabine à double étage », 100 passengers [sourced PL-XX, PL-XXI]. Otis: double-deck, 50 passengers (« 50 voyageurs ») [sourced PL-XXI]. Edoux: 65 passengers (« 65 voyageurs pesant 4.350 ») [sourced PL-XX].
- **Travel.** Roux car: « Distance parcourue par la cabine sur le chemin de roulement, 66m60 » [sourced]. Otis car: 10.83 × 12 = 129.96 along its track [sourced PL-XX]. Edoux: « Course des pistons et des cabines, 80m20 » [sourced].
- **Base slope.** Both inclined systems print « composante … suivant l'inclinaison de la voie » as × **0.815** [sourced PL-XXI]. That is sin 54.6°, the leg's diagonal lean (§2.5) [derived].
- **The Roux track curves at its top.** A straight 54.6° run would be 56.05 / 0.815 = 68.8 long, against the printed 66.60. That is consistent with a steeper top part, about 72° over the last 12 m or so [derived; only the total is printed]. The book's own Roux calculation takes every force at sin 0.815 and a rise of « 55,13 m » [sourced E1900-TXT pp. 161, 163–170], and VOGEL argues the articulated pistons could not have taken a bend under the car; neither number settles where the curve is. See §11.8.

### 11.3 The inclined tracks

- **In plan they lie on the pile's diagonal.** PL-XXI draws each track on its pile's diagonal, and PL-XXII ter Fig. 25 labels the beam's centre line « Diagonale de la Tour » [sourced]. PL-XX, a section along that diagonal, shows the beam ("P.A. Poutres des ascenseurs") between arbalétrier a and the leg's centre [sourced drawing].
- **Otis beam** (PL-XXII ter, "Coupe verticale CD", 1:50) [sourced]:
  - two plate girders **1.300** deep, their webs of plate with 60 × 60 × 7 angles;
  - **3.800** apart axis to axis, **3.400** clear;
  - top flanges **235** wide, with the rail on its « coussinet » above;
  - lateral bracing between the girders in the plane of their bottoms (Fig. 26, "Coupe horizontale EF").
- **The car rides on the beam's upper side.** On PL-XX the cars are drawn on the side facing up and out, away from the tower's axis [sourced drawing]. The car runs between the two girders: PL-XXII ter Fig. 27 draws the cabin between its rails [sourced drawing].
- **Roux gauge.** Not printed. The two chain casings ("gaines G") on PL-XXIII Fig. 11 are about 2.8 apart at 1:50 [estimated].
- **Where the rail line runs in the leg.** Only drawn, never dimensioned. It was measured on PL-XX at 1:200: the plate reads 76–79 px/m at full resolution, calibrated on a to c = 15√2 and on the 11.00 panels. Distances are along the diagonal, out from a's axis [estimated, about ±0.5 each]:

  | z | beam centre | rail line | a → b/d |
  |---|---|---|---|
  | ~39 | 2.5 | 3.3 | 10.6 |
  | ~68 | 3.4 | ~3.9 | 10.0 |
  | 79.4 (XXI) | 3.9 | 4.75 | 9.3 |
  | 90.4 (XX) | 3.7 | 4.55 | 8.6 |
  | ~112 | 2.9 | 4.05 | 7.4 |

- **The low readings cannot be right below the 1st floor.** A girder 1.9 off the diagonal has its foot 1.30 down the track's normal, 1.06 inward and 0.75 lower. It clears the leg's inner faces, and the horizontal struts in them, by 0.4 only if the rail stands at least **4.2** out from a [derived: 1.9 + 0.12 + 1.06 + 0.75 × 0.711 + 0.4√2 = 4.18]. So the half-width of the girder alone rules out the plate's 2.5 m beam centre there; the reading is off by about the width of a's box. `lifts.ts` uses 4.2–4.3 below node XXII and the measured values above it.
- **Otis beam top.** It runs on about **9.9** above the 2nd floor to its pulleys [estimated, PL-XX Fig. 3].
- **The Otis track's angles** (resolved 2026-09-26):

  | where | book | model's rail line |
  |---|---|---|
  | bottom of the course | « 0,815 », **54°35'** [sourced E1900-TXT p. 144; PL-XXI's × 0.815] | 54.59° to XXIV (50.4) |
  | XXIV → XXIII | — | 60.70° |
  | 1.50 above the 1st floor | **68°10'**, sin 0.928 [sourced p. 153, the test of the Nord lift] | 70.45° (panel 6) |
  | the upper cables | 75°50', sin 0.970 [sourced p. 144] | 75.49°, 75.61°, 76.73° (panels 7–9) |
  | top of the course, the 2nd floor | « 0,976 », **77°30'** [sourced p. 144] | 77.05° (panel 10), 74.11° (panel 11) |

  p. 144 prints « 0,976 et 0,8[15] comme sinus des angles faits avec l'horizontale du chemin de roulement de la cabine en haut et en bas de sa course »; its OCR garbles the degrees, which the table for the 1900 lifts in piles 2 and 4, on the same legs, prints in full: « Rez-de-chaussée : 54°35 … sin 0,815 », 1st floor sin 0.927, 2nd floor « 77°30 … sin 0,976 », courses 68.410 + 60.200 = 128.610 [sourced p. 344]. VOGEL's balance of the Otis system uses **78°9'** for the upper run (« 23,900 lb. × sin 78°9′ ») and 54°35' for the lower [secondary]. **Resolution:** 54°35' and 77°30' are the book's, primary and printed twice; 78°9' is VOGEL's own figure, 0.65° steeper, with no printed source behind it, and is not used. The old code comment's "about 70°" for the steep part was the model's panel 6 only (70.4°), which is the book's 68°10' at the 1st floor, not the upper run; above panel 6 the model's rail stands at 75.5–77.1°, within 2° of the book, except panel 11 (see §11.8). The motor carriage's own incline, **61°20'**, is a separate track [sourced pp. 127, 144].
- **The tracks begin in the basement.** « Sous-sol des machines », floor (30.50), z −3.0 [sourced PL-XX Fig. 4]. A car whose lower floor stands at the rez-de-chaussée reaches further down its rail than that: the Otis car's lower axle stands at z −3.09 at the ground station, the Roux car's at −2.01. `lifts.ts` carries the rail line on panel 1's lean down to z **−3.5** [estimated: the basement floor and the half metre the Otis axle needs below it].
- **Roux circuit top.** Its top pulleys stand at the top of panel 6, node XXII, z 68.4. PL-XXIII Fig. 2 labels « Niveau sup.r du Panneau 6 » [sourced label].

### 11.4 The cars

- **Otis** (PL-XXII ter Fig. 1, "Élévation latérale", 1:50) [sourced unless noted]:
  - two decks, « Plancher inférieur » and « Plancher supérieur », level, the upper set back up the slope: the stepped car of PL-XX Fig. 4;
  - floors **4.670** long, and « Poutre transv.le du châssis, long.r 3.800 »;
  - the decks **3.169** inside across (Fig. 2);
  - doors « Porte roulante 2.02 »;
  - a conductor's compartment ("Com.") at the lower end.
  - Deck height 2.40 and outside width 3.40 [estimated].
- **Roux.** No car drawing was read. `lifts.ts` uses decks 5.8 × 2.4 × 2.4 inside its narrower gauge [estimated].
- **The Otis car is rigid and tips.** « Comme elles sont invariablement reliées au truck qui les supporte, elles prennent pendant leur course toutes les inclinaisons du chemin de roulement … L'attache de la caisse des cabines au châssis a été disposée de telle sorte que dans leur position moyenne, c'est-à-dire à la station du premier étage, leur plancher soit sensiblement horizontal, afin de partager par moitié l'inclinaison qu'elles prennent en sens inverse aux deux extrémités du trajet, laquelle est environ de 0,20 m par mètre » [sourced E1900-TXT p. 135]. So: level near the 1st floor, 0.20 m a metre (11.3°) out of level at each end, one way at the bottom and the other at the top. Half of 54°35' to 77°30' is 66.0°; PL-XXII ter Fig. 1 draws the car level on its decks' stack, atan(2.376 / 1.080) = **65.6°** [derived], the same split to 0.4°. The book adds that the passengers were at first all seated for the change of inclination, later only a bench at the back and grab bars [sourced p. 135]. VOGEL (Fig. 29, after *La Nature*, 4 May 1889, p. 360) shows pivoted floor sections the operator levelled as the car went, « soon removed because they interfered with the loading and unloading of passengers » [secondary]; none is modelled.
- **The Roux car is rigid too.** « La cabine est portée sur la voie de roulement par l'intermédiaire de deux essieux munis de galets à double boudin de 600 mm de diamètre » [sourced E1900-TXT p. 160]; each deck reached at each station « par des escaliers terminés par des paliers » [sourced p. 160]. Nothing in the book says it tipped: its forces are all taken at sin 0.815, the straight run's.
- **Which deck meets the station** is not printed: the Otis serves each deck « par une petite passerelle » [sourced p. 135], the Roux by its stairs. The model puts the lower floor at the station's height [estimated].

### 11.5 The Edoux (PL-XX Figs 1–3, PL-XXIII ter)

- **The mechanism** [sourced PL-XX legend]:
  - « Cy. Deux cylindres verticaux entre le 2e étage (149.23) et l'étage intermédiaire (229.43), soit 80.20 »;
  - « Ca1. Cabine supérieure montant et descendant entre l'étage intermédiaire et le 3e étage … soulevée par deux pistons »;
  - « Ca2. Cabine inférieure faisant contrepoids à la cabine Ca1 … entre le 2e étage et l'étage intermédiaire »;
  - « Cab. Quatre câbles reliant les deux cabines au moyen de poulies de renvoi établies à la partie supérieure de la Tour ».
- **The two cars run side by side.** « Les deux cabines arrivent simultanément au niveau du plancher intermédiaire où les voyageurs changent de cabine » [sourced PL-XXIII ter Fig. 19]. So when the upper car is h above the landing, the lower one is h below it [derived].
- **Plan at the landing** (PL-XXIII ter Fig. 20, 1:50) [sourced]:
  - « D'axe en axe des cabines 5m300 », 2.650 each side of the tower's axis;
  - each car **3.570** × **3.900**;
  - « D'axe en axe des pistons 4.064 » (upper car) and « D'axe en axe des guides 4.064 » (lower car), 0.247 beyond each car's end (printed "247");
  - the landing floor (229.43); the « Plancher des machinistes » (227.17) under the distribution gear.
- **The cars line up on the Nord–Sud diagonal.** PL-XX, a section along that diagonal, shows the two cars side by side: the upper car and its cylinders on the Nord side (left), the lower car on the Sud side (right) [sourced drawing]. Fig. 20's plan frame is the tower's diagonals: Poutre H runs between two adjacent faces' merged b/d [derived from the drawing].
- **Guide posts** [sourced labels, PL-XX Fig. 2]:
  - the « Poteau-guide » on the tower's axis, 890 × 600 (the first digit could be 8 [estimated]);
  - a « Poteau-guide 500 × 600 » outboard of each car, about 5.0–5.5 from the axis on PL-XX [estimated]. PL-I's face-on elevation fixes it better: from the 2nd floor up it draws the lift as a strip of three vertical columns between the converging legs. There is one on the axis, about 0.8 wide, and one each side centred 3.64 off the axis and about 1.0 wide (edges 3.0–4.05) [estimated: dark-line runs on the deskewed PL-I Fig. 1 at 15.80 px/m, z 122–228, axis fitted on the side columns' symmetry]. Face-on, a point on the Nord–Sud diagonal shows at s / √2, so the outboard posts stand at s = 3.64 √2 = **5.15** [derived];
  - a « Poteau-guide des câbles 390 × 580 ».
- **Other members** [sourced PL-XXIII ter legend]:
  - hollow cast-iron columns Co1 guide the pistons above the landing;
  - columns Co2, « avec dents hélicoïdales à l'intérieur », guide the lower car's safety brake;
  - « Tous les poteaux-guides sont eux-mêmes reliés à l'ossature de la Tour ».
- **Heights.** 229.43 is z **195.93**, matching `FLOORS.landing` [derived]. The Edoux car height is 2.9 [estimated, PL-XX Fig. 2].

### 11.6 The stairs

- **Ground → 1st floor** [sourced PL-XX Nota]: « Un escalier de 1m00 de large conduit les visiteurs du rez-de-chaussée au 1er étage (56m00). Il y en a un dans la pile 2 et un dans la pile 4; les piles 1 et 3 n'ont pas d'escalier partant du rez-de-chaussée ».
  - **Up and down.** « L'escalier de la pile 2 sert à la montée, l'autre à la descente » [sourced E1900-TXT p. 81].
  - **Width.** E1900-TXT gives « 1,20 m entre garde-corps » against the plates' 1.00 [sourced both].
  - **Form: straight flights with landings.** PL-XXVIII Fig. 1, "Escalier dans la pile n°2, élévation en diagonale" [sourced]:
    - landings 1.300; runs printed "7.820 = 6.520 + 1.300" and "1.300 | 5.220 | 1.300";
    - the pattern repeats every **7.8555** of height (with "3.1445", 11.00 together);
    - the stair climbs « pente de 1m407 pour 1m00 », the leg's diagonal lean, so each repeat shifts 7.8555 / 1.407 = **5.583** inward [derived].
  - **Direction of the flights.** « Les deux premières montées vont de gauche à droite tandis que la suivante revient de droite à gauche … ménager le passage de la cabine » [sourced E1900-TXT p. 81]. Per 11 m panel the text counts 23, 23 and 19 steps of 0.25 × 0.16 [sourced].
  - **Position in the leg.** Hung from a beam near arbalétrier c (PL-XXVIII Fig. 1bis) [estimated]. PL-XXVIII's Nota: the stair in pile 4 is the same, except where it starts at the ground [sourced].
- **1st → 2nd floor** [sourced PL-XX legend]: « e1. Escalier tournant de 1m60 de diamètre conduisant du 1er étage au 2e étage; il y en a quatre semblables, un dans chaque pile ».
  - **Steps** [sourced E1900-TXT p. 81]:
    - treads 0.64 wide, risers 0.178;
    - one helix per panel, joined by straight flights of 10 treads of 0.255 and 11 risers of 0.207.
  - **Position.** PL-XX Figs 3–4 draw the helices beside arbalétrier c, each panel's helix set further in than the one below it [sourced drawing]. Measured, the axis sits about 2.3 inside c along the diagonal, at the panel's top node [estimated]. Core about 1.60 − 2 × 0.64 = 0.32 [derived].
- **2nd → 3rd floor, service only.** « interdit au public … simplement un escalier de service » [sourced E1900-TXT p. 81].
  - **The helices** [sourced PL-XX legend; diameters read on PL-XX Fig. 2]:
    - e2, 2nd floor → landing, Ø **1.600**;
    - e3, landing → 3rd, Ø **1.680** (that the label is a diameter is [estimated]).
    - e3 reaches « l'escalier de raccord (Panneau 26-27), 314 marches » [sourced PL-XX Fig. 2].
  - **They take the halves of the shaft the cars leave free** [sourced drawing PL-XX Fig. 2]: e2 under the upper car's run, between its two cylinders; e3 over the lower car's run. E1900-TXT: « placé au départ dans la moitié gauche … reporté … dans la moitié droite … laisser libre la course des cabines » [sourced].
  - **Auctioned sections** (dismantled 1983): Ø 1.70, 3.47 high (AUC-ADER); Ø 1.75, 2.60 to a landing, 14 steps, 24 sections cut and 20 sold on 1 December 1983 (AUC-ARTC) [sourced, secondary]. Those diameters are the later stair's, a little over the plate's.
- **Step counts to each level, 1889** [sourced E1900-TXT p. 304]:

  | level | steps | cumulative |
  |---|---|---|
  | 1st floor | 347 | 347 |
  | 2nd floor | 327 | 674 |
  | intermediate landing | 456 | 1,130 |
  | 3rd floor | 455 | 1,585 |
  | summit | 125 | **1,710** |

  The average risers are 56.05 / 347 = 0.162, 58.10 / 327 = 0.178, and 80.20 / 456 = 0.176 [derived].
- **After 1889.** In 1899–1900 the Sud Otis was replaced by a wide stair, the Est and Ouest stairs became up-only, and the helices were closed to the public [sourced E1900-TXT pp. 331, 361–362]. None of that is modelled.

### 11.7 What `lifts.ts` builds from this

- **Legs.** Following `platforms.ts`'s layout of PL-XVIII (x right, z down), pile 4 Ouest is the +x+z leg, quadrant target 0; then pile 3 Sud (1), pile 2 Est (2), pile 1 Nord (3). Otis tracks go to the odd targets and Roux tracks to the even ones [derived].
- **Tracks.** Each is two 1.30-deep plate girders with rails, 3.80 apart (Otis) or 2.8 (Roux), plus a tie at every node and an X of lateral bracing per panel. The rail line is read at every node from the leg's inner corner plus `RAIL_OFFSET`.
  - Otis: from z −3.5 to 125.63.
  - Roux: from z −3.5 to 68.4.
- **Cars.** One per leg, each one rigid body: two decks stepped up the slope, level on the slope it was drawn on (Otis 65.6°, Roux the 54.6° base run), a chassis along the rails, and a hanger under the lower deck's outer end. The graph builds each with its lower floor at 30 (Ouest), 42 (Sud), 12 (Est) and 22 (Nord) [estimated moment].
- **Runs.** `LIFT_CARS` publishes each leg car's run as the rail line itself, arc-length parameterised, station for station the one the girders are built on, cut half a wheelbase beyond the lowest and highest stations; the stations as arc lengths where the lower floor's centre stands at the station's height (z 1.58, 57.63, and for the Otis 115.73); and the axis and slope the car is level on. The car's two axles stand on the line half a wheelbase either side of its arc length (Otis 8.109, Roux 9.80, the chassis) and the body lies along the chord between them, so it tips smoothly where the rail bends. The page moves each mesh by one turn and one move from where it was built, at a metre a second, end to end. Measured on the published runs:
  - Otis course, station to station: **128.83** (book 128.61 to 129.96). Tip: −11.0° on the whole 54.6° run, −1.6° at the 1st-floor station, +10.0° to +11.5° in panels 7–10, +8.6° at the 2nd-floor station.
  - Roux course: **68.13** (printed 66.60). Level to 0.01° up to the point where its upper axle passes XXIV, 14 m short of the top; then tipping forward, 3.4° at z 51, **11.7°** at the 1st-floor station, where its chord spans XXIV to panel 6.
  - `tests/eiffelLifts.test.ts` holds this against the cooked graph: each line lies on the rail re-derived from the cooked rail boxes (under 1 mm at every vertex), the cooked lower deck moved the page's way stands at each station, the Otis deck's tilt is the chord's slope less 65.6° to 5e-4°, and slid its whole run no car comes within 0.97 of a leg's inner-face plane below XVII or into an entretoise (least 0.42, Otis; 0.84, Roux).
- **Edoux.**
  - The central post, 115.73 → 276.13.
  - Two outboard posts at ±5.15 on the Nord–Sud diagonal (from PL-I, §11.5).
  - Measured face-on on a 4096 px orthographic render, the same way PL-I was read, the model's strip has the plate's three clusters. The side clusters are 2.95–4.02 off the axis against the plate's 3.0–4.05. The central cluster is 1.42 wide against about 0.8, because the boxes turned to the diagonal show their diagonals face-on. The model's columns are solid; the plate draws outlines.
  - Nord: the cylinders at 2.650 ± 2.032 from the axis, up to the landing, then the piston columns on to 276.13.
  - Sud: the lower car's guide columns, 115.73 → 195.93.
  - Both cars at mid-run, 40.1 above and below the landing [estimated moment].
- **Stairs.**
  - e1 in all four legs: a helix per panel 6–11 and 11-riser flights between them.
  - The ground → 1st stair in piles 2 and 4, in two 1.00 lanes 1.8–3.8 off the diagonal, clear of the car. Each 7.8555 repeat has three flights of 15 risers and a 5.583 inward shift.
  - e2 and e3 in the shaft.
  - Treads are boxes, with a newel per helix and a hand rail swept along each helix.
- **Checked on the cooked mesh.** Every vertex, and 11 points along every triangle edge, was tested against the leg sections re-typed from §2.4.
  - Tracks, cars and the leg stairs stay inside their leg below XVII. The closest margins to a face plane: Otis girders 0.41, Roux 0.76, cars 1.21, ground stair 0.63, e1 1.20. No sample falls inside a horizontal strut's 0.3 box.
  - The Otis beam's last 10 m above XVII pass 0.6 inside the line of b and d, into the open middle, where the leg's inner faces carry no members.
  - The Edoux posts stay 0.90 inside the shaft square at the top. The Otis beam tops stay 2.1 clear of them.
- **Not built** (the machinery is §11.9 now):
  - of the machinery, what §11.9 lists as not built;
  - e3's « escalier de raccord » and the stairs above the 3rd floor;
  - the openings the lifts need in the decks of `platforms.ts`: the 1st and 2nd floors and the landing are solid there, so tracks, posts and stairs pass through them.

### 11.8 Disagreements and open points

- **Rail line below the 1st floor.** The plate reading gives 3.3; the clearance of the girders' feet requires at least 4.2 (§11.3). The model uses 4.2.
- **Ground stair width.** 1.00 (PL-XX, PL-XXVIII) against 1.20 between hand rails (E1900-TXT).
- **Riser.** 0.16 (E1900-TXT) against 7.8555 / 45 = 0.175 for three 15-riser flights per repeat (the model) [derived].
- **Leg numbering.** One E1900-TXT passage swaps 2 and 4.
- **e3's diameter.** 1.68 (PL-XX label) against 1.70–1.75 (auctioned sections).
- **The Edoux central post.** "890 × 600" or "800 × 600": « 800 × 600 », printed twice (PL-XXIII quater Fig. 2, ter Fig. 19); closed (§11.9).
- **The Otis upper incline.** 77°30' (E1900-TXT pp. 144, 344) against 78°9' (VOGEL); the book's is used (§11.3).
- **Panel 11's rail.** The model's rail line stands at 74.1° from XVIII to XVII and on up the beam, against the book's 77°30' at the 2nd floor, because `RAIL_OFFSET` falls 4.2 → 4.1 while a leans in 1.30. Reading 77°30' there would put the rail 0.21 further out at XVII (4.41) and the beam top about 0.4 further out still, toward the line of b and d that its last 10 m already pass 0.6 inside; not changed. The Otis car tips +8.6° at its 2nd-floor station instead of about +11.9°.
- **The Roux car at the 1st floor.** Rigid on two axles over the model's rail, it arrives tipped 11.7° forward; the book reads its car on the straight run (forces at sin 0.815) and never says it tipped. A rail straight at 54.6° to the 1st floor would stand 1.05 nearer a than the 4.35 the inner faces' struts need. And its course, 68.13, is 1.53 longer than the printed 66.60, where the printed figure reads as a steeper top than the model's 60.7° and 70.4°.
- **The 1st floor's lift well and the Otis car.** Passing through the 1st floor, the Otis car's outer end sweeps to t 32.30 (along the diagonal from the axis), ±1.58 across, within the deck's 0.60; `platforms.ts`'s well ended at 32.1 in its chamfer, so the car cut 0.20 into the deck there. The well now ends at 32.4, inside both the end member's reading (32.25 ± 0.3) and PL-XVIII Fig. 3's station (t 24.5–32.5), and the car passes clear [derived]. The Roux car passes clear, and the Otis car clears the 2nd floor's well. The 1st floor's girders under the deck are not checked.

### 11.9 The machinery (2026-09-26)

Read from PL-XX, PL-XXI, PL-XXII, XXII bis, XXII ter, XXII quater, PL-XXIII, XXIII bis, XXIII ter, XXIII quater and E1900-TXT pp. 127–192, the page with Fig. 144 (p. 164) read on its image. `lifts.ts` carries every number with its tag; the headline ones follow. Heights are z.

- **The Roux chain** (piles 4 Ouest, 2 Est).
  - Two circuits a lift, one each side, in the driving wheels' planes, « D'axe en axe des roues 4.080 » [sourced PL-XXIII Fig. 4]: 2.040 either side of the track's centre line.
  - The strands one over the other, square to the track, « juxtaposées » in one double duct over the car's course [sourced p. 156]; the lower strand carries the car [sourced p. 155]. 0.243 and 0.448 over the model's rail line (the girders' top): the lower 0.045 over the rail's top, the rail 0.198 over the girder [measured PL-XXIII Fig. 14 at 596 px/m], the upper 0.205 higher [sourced « 195 » + 10].
  - The driving wheel R: pitch 3.864 = 1.000 / sin 15°, twelve arms and teeth, « 12m00 par tour de roue », rim 3.616 [sourced p. 158, PL-XXIII Fig. 3, XXIII bis Fig. 35]; centre z −0.03 (altitude 33.47: « 3.41 » under the Roux ground floor 36.880) [sourced Fig. 144]. The return pulley R′: 3.646 at the rollers' axles, smooth [sourced PL-XXIII bis Fig. 4]; centre z 69.33 (« 11.70 » over the 1st floor) [sourced Fig. 144]. Each centre its pitch radius off the lower strand [derived]; their distance on the model's rail line 82.40 against the printed « 82m305 » [sourced Fig. 144].
  - The wraps: 218° at R′ from « l'angle de T et T′ … 38° environ » [sourced p. 164]; 250° at R [derived: the wrap that closes the loop on the book's pieces with the tensioners in range; Fig. 144's schematic tangents read about 235°, which leaves them 1.63]. Each wrap joins the upper strand's duct by one tangent arc.
  - The pieces, down the lower strand from the joint under the cabin's piston: a special piston, 81 ordinary, 11 counterweight pistons, 81 ordinary (all 1.000 axle to axle), two tensioners « 1m725 à 2m225 », and the cabin's piston, **2.90**; « 180,90 m en moyenne » [sourced p. 156 on the page image: the OCR's « 2,t)0 » and « 180,00 » are misreads]. The model's loop is 180.69, its tensioners 1.789–1.798 over the whole round. Every piece is rigid, walked chord by chord round the wheels (the polygon a chain makes on a sprocket), and each wheel turns by 2 asin(1 / 2r) a metre of chain, 30° on R, so the pins ride it without drifting.
  - The duct: three U-irons, 0.29 across, from 0.13 to 0.63 over the rail line, the lower channel's inboard side open on the « 85 » slot [sourced p. 156, measured Fig. 14]. It stops where the strands part: the book's « gaine circulaire » round both wheels is left out so the chain shows on them.
  - **Correction to §11.3:** the "gaines G ≈ 2.8 apart" are the Galle chains' sheaths (« G. Gaines de refoulement des chaînes de Galle », PL-XXIII legend), not the chain ducts; and the Roux ground floor on Fig. 144 and PL-XXIII Fig. 1 is « 36.880 » (z 3.38), not PL-XXI's 35.08 the model's station uses.
  - Instances: 177 axles, 177 bars and 11 counterweight boxes a circuit, 1,460 in all; the page re-places them every frame from the car's position (`LIFT_CHAINS`).
- **The Otis machinery** (piles 3 Sud, 1 Nord).
  - The motor: two girders « 0,915 » deep, « 2,439 » apart, « 39,35 m » long at « 61°20′ » [sourced pp. 127–128], their foot a + 11.2 at z −3.3 [measured PL-XX Fig. 4 at 59.3 px/m, ±0.5], on the car's side of the track (« 9 m en moyenne » over it, PL-XXII Fig. 30); the cylinder Ø 1.065 × 12.674 from z −2.15, 0.35 over the girders' axis [sourced; measured]; « 5 poulies fixes » Ø 1.524, three at z 28.2 and two at 30.65, and the guide pulley « a » at 31.1 [sourced p. 133; measured] (PL-XXII Fig. 31 says six). Every pulley's axis stands 0.457 over the girders' axis, clear of the cross ties under them [derived].
  - The carriage: six travelling pulleys in two groups, four rollers Ø 0.505, the rods [sourced p. 133, Fig. 32]; « la pression d'eau n'est jamais introduite que par le haut du cylindre » [sourced p. 127], so it runs DOWN the girders as the car rises, a twelfth of the car's way (the « palan à 12 brins ») [sourced]: 10.74 over the model's 128.83 course, its lower group at z 12.4 with the car at the 2nd floor [measured PL-XX Fig. 4].
  - The counterweight: its own track « sous la grande poutre de l'ascenseur » [sourced PL-XXI], two girders 0.300 deep, 1.000 apart, their top 2.171 under the rail line [sourced « 871 » + 1.30, PL-XXII quater Fig. 23], from z 2.9 to node XXIV, about 58 m [measured] against the text's « 45 m », which the truck (11.245) and its travel (43.32) could not fit in. The truck « 11m245 », six wheels « 500 », the « grande poulie » « 1m830 » lying flat inside its frame on its upper end, 0.24 over the rail head [sourced; measured; p. 141 takes 1.85], a third of the car's way DOWN as the car rises [sourced « 129m96 / 3 = 43m32 »]: 42.94 over the model's course; its upper end 54.9 up the track with the car on the ground [measured]. Pou7 (1.161, z 51.8), N°1 (0.80, z 52.5), N°2 (1.15, at the 1st floor) [sourced sizes; positions measured]. The two 29 mm cables as three strands, flat in the grande poulie's plane and parallel to the track, each paid out a metre for three of the car: truck to Pou7, Pou7 round the poulie, the poulie up to N°1 [derived]. Pou7 stands 0.335 off the centre line to take its strand tangent, against Fig. 23's « 419 »: the real pulleys are tilted (13° about the track, 6° in plan, measured), which the flat reeving leaves out.
  - The car's safety gear: a stack of masses straddling each rail, 1.2 × 0.25 × 0.19 [measured PL-XXII ter Fig. 6; parts sourced].
- **The Edoux** (2nd floor → landing → 3rd).
  - The pair in opposition by construction: the upper car (A, the pistons') rides its 80.20; the lower (B) moves a metre down for each of A's up, so their floors always sum to twice the landing's.
  - Cars 3.570 × 3.900 [sourced], **2.685** overall (« 2.685 », « 2.250 » inside; the text's 2,20) [sourced PL-XXIII quater Fig. 2, ter Fig. 17], replacing the model's 2.9: plate to « 1,10 », window posts to 2.25, a roof railing [sourced]. A's palonnier under it, 4.30 to its pins' blocks on the pistons' axes, and its roof frame; B's palonnier on its roof, pins about 4.00 apart and 2.83 over its floor, its brake frame 0.40 to 1.91 under it with arms to the spindles in the columns, its 0.50 walkway, and its floor beams out to cables a and b's tensioners [sourced; measured PL-XXIII ter Fig. 17]. The palonniers' ends and A's roof frame narrow to 0.16 where they ride the columns' slots.
  - The pistons Ø 0.320, 80.960 long, their top 0.875 under A's floor [derived from « 308,755 », p. 191]. The cylinders Ø 0.380 from z 114.00 to 195.06 [sourced], their caps « 916 × 580 » on cross beams « 0,718 » apart and E girders 1.20 deep [sourced]; the inner cylinder's cap across the other way, on a cross beam « 0,992 » from the post and on the post [derived]. Columns Co1 (bore 0.380, 0.42 outside in the model, 0.44 measured) and Co2 (Ø 0.43, derived from « 3m632 » between), both slotted toward their car; the inner gland drawn 0.43 against the central post. Cross beams 0.43 deep [measured].
  - The six pulleys Ø 1.326 / 1.206 (flanges 1.370 / 1.250) in pairs at s −4.064, 0, +4.064, axles at z 284.73 / 283.33 and 283.03 / 281.63 (8.60 / 7.20 / 6.90 / 5.50 over the 3rd floor) [sourced pp. 173, 175; PL-XXIII quater Figs 3–4], each turning a radian per metre of cable over the radius the cable wraps it at, 0.648 / 0.588; the four flat cables 0.200 × 0.032 in the cars' plane, dropping at s ±4.712, ±4.652, ±0.648, ±0.588 [derived from « 9.424 », « 9.304 »], each drop stretched as its car moves.
  - The Sud cable guides above the landing, hollow « léger caisson », « 390 × 580 » at s 4.682 and a light one at 0.618 [sourced; measured], slotted for B's palonnier; the tanks Ø 3.00 × 3.80 on the landing (s 0, t −5.8) and under the 3rd floor (s 1.7, t −1.8) [sourced size; measured places; the OCR's « 5,00 m … 50 m³ » is 3 read as 5]; the machinists' floor (227.17) and the two distributors.
  - The central post is « 800 × 600 » (PL-XXIII quater Fig. 2, ter Fig. 19), not PL-XX's "890": §11.8's open point is closed. The Nord outboard post stops under the landing's machinery (PL-XXIII ter Fig. 20 draws none there) [estimated].
- **Still to open, in modules `lifts.ts` does not own** (held in `tests/eiffelLiftMachinery.test.ts`'s `PENDING_PLATFORMS`, where the census lets them pass until they are made):
  - the landing's deck: the upper car's well (s −4.435 to −0.865, t ±1.95) and a slot for its palonnier's ends and pistons (s −4.93 to −0.37, t ±0.25); the lower car's well lengthened for its roof palonnier and its columns (s 0.39 to 4.91, t ±0.26);
  - the 2nd floor: the lower car's well and pit, with its columns (s 0.35 to 4.95, t ±2.0), and holes for the upper car's cylinders and pistons (s −4.9 to −0.4, t ±0.25);
  - the 3rd floor: the upper car's well lengthened to s −4.93 to −0.37 over t ±0.25 (its roof frame and the columns Co1);
  - `spec.ts` `EDOUX_PLAN`: the Sud cable guides above the landing (s 4.487–4.877, t ±0.29; s 0.488–0.748, t ±0.13, z 195.93–280.98), and Co2 at its true Ø 0.43 below it (s 0.403–0.833 and 4.467–4.897, t ±0.215, where it lists ±0.17).
- **Not built:** the Roux cylinders, Galle chains and valve gear under the ground; the Otis garant cables' runs through the pile, the 2nd-floor pulley pylon and the control cables; the Edoux distributors' racks and pipes, the machinists' shelter and glazed booth, the chape de réglage.

### 11.10 The stairs: all 1,710 steps of 1889 (2026-09-26)

`stairs.ts` builds the climb run by run to E1900-TXT p. 304's table (Hénocque, « Tableau des données relatives à la montée à pied »), and `lifts.ts` places it. Heights are z (cote − 33.50).

- **The count** [sourced p. 304]: 347 to the 1st floor, 327 to the 2nd, 456 to the intermediate landing, 455 to the 3rd, 125 to the summit (334.01); cumulative 347, 674, 1,130, 1,585, **1,710**. The table's horizontal walk (119, 77, 102, 100, 39 m) is not modelled.
- **What a step is.** PL-XXVIII Fig. 5, re-read at full resolution, prints T3 as « 23 marches de 0.15933 = 3.6646 » plus a 0.1720 step onto its landing, 3.8366, on « 23 marches de 250 » = 5.750 plus « 270 », 6.020; and T4 as « 19 marches de 0.15933 = 3.0272 » plus two steps of 0.1498, 3.3268, on « 0.235 », « 4.75 », « 0.235 », 5.220 [sourced]. The text gives e1's joining flights as « dix marches de 0,255 m et … onze contremarches de 0,207 m » [sourced p. 81]. So a plate's « marche » is a tread, and a climber's step is a riser: T3 has 24 risers and T4 21 [derived]. The model counts risers (and a ladder's rung pitches). It builds a tread at the top of every riser, except where the riser lands on a slab the model builds (a landing or a floor); that slab is then the step's tread.
- **Before this section** (HEAD 352b0c4, one climb): 351 / 320 / 450 / 459 / 0 = 1,580 [measured on the built runs].

| run | built | the plates fix | the count closes | riser |
|---|---|---|---|---|
| ground → 1st (piles 2 up, 4 down) | 28 + 4 × (24 + 24 + 21) + 24 + 19 = **347** | the running part, 276 (PL-XXVIII Fig. 5) | the start, 28 of 0.1721 (was 30), and the arrival's last flight, 19 of 0.1786 (was 21) | 0.158–0.179 |
| 1st → 2nd, e1 (every leg) | 5 helices of 56, 51, 50, 46 and 61; 4 joining flights of 11; 19 to the floor = **327** | 11 × 0.207 joining, 19 × 0.178 last (§21) | the helices, 264 | 0.171–0.1745, against the printed 0.178 (3%) |
| 2nd → landing, e2 | a helix of 435, then 16 + 5 = **456** | « 16 marches 2.92 », « 5 marches 0.91 », and the helix's top (225.60) | the helix | 0.1756 (1.4%) |
| landing → 3rd, e3 | 314 + 13 + 128 = **455** | « 314 marches sur une hauteur de 54m88 »; the raccord's « 13 marches », « 2.327 » | the upper helix, to the 3rd floor | 0.1796 |
| 3rd → summit | 15 + 12 + 9 + 13 + 22 + 30 + 16 + 8 = **125** | the campanile's « 22 marches de 178 = 3.916 » | the little stair, 15 of 0.172; the steep stairs and ladders, 88 of 0.205 | 0.172 / 0.178 / 0.20–0.21 |

- **The ground stair's start and arrival** are the parts no plate counts: 347 − 276 = 71 risers over their 4.82 + 7.23 [sourced heights, p. 81].
  - **The plates and the book disagree by four steps here.** Fig. 37 prints the start « 7.50 » long [sourced]: 30 treads of 0.250, 5.30 along the diagonal elevation (Fig. 1 draws 4.96–5.3 [measured]). At the plates' own riser the arrival takes 24 + 21, so the plates make 351 against p. 304's 347.
  - The model keeps the book's count. It takes the four out of the two flights no plate counts, two each: the start becomes 28 of 0.1721, 7.00 long (4.95 in the elevation), and the last flight 19 of 0.1786, both 8–12% over the 0.15933 [open decision; they were 30 and 21].
  - The arrival keeps the model's T3 and Pm, then 19 risers to the floor.
- **e1's helices** carry 327 − 44 − 19 = 264 risers, shared by their rises (largest remainder). At the printed 0.178 they were 257, and the run 320 [derived].
- **e2** carries 456 − 21 = 435 risers in the helix's 76.37 [derived]. Its foot, « 11 marches 1.974 » up to a platform at (151.16) (§20.3), is still not built: the helix starts on the floor.
- **The service landings.** « De distance en distance de petits paliers correspondant à trois marches facilitent la montée » [sourced p. 81]: each landing takes three treads' angle and rises nothing.
  - The interval is not printed. The sections sold when the stair was cut up in 1983 were « 2.60 » to a landing, « 14 marches » [sourced, secondary AUC-ARTC], so e2 and e3 take a landing every 14 risers [estimated for 1889]: 31 in e2, and 22 + 9 in e3.
  - The helices turn more for them: about 15 treads' angle a turn, landings included.
- **Where the 455 ends.** The row prints « Troisième plate-forme (terrasse) + 312,21 ». That is the level of the gallery and the apartment (« Niveau du plancher (312.21) du logement », PL-XIX Fig. 3), 2.58 over the 3rd floor (309.63).
  - Counted to 312.21, the upper helix's 128 risers would be 0.1998 each, 14% over the rest of e3. Counted to 309.63 they are 0.1796, close to the helices' 0.178.
  - And 149.23 → 229.43 and 229.43 → 309.63 are both 80.20: 456 and 455 on the same stair [derived; the verifier's observation].
  - So the model reads the 455 to the 3rd floor, and counts the 2.58 above it in the 125 [inference].
- **3rd floor → summit**, by the stairs PL-XIX Fig. 3 names on the elevation [sourced labels], in the order climbed:
  1. « Escalier conduisant au logement de M. Eiffel », « un petit escalier tournant » [sourced p. 216], "1.60" [sourced PL-XIX Fig. 6], centred 1.85 out on +x [measured, §29]. It carries e3's turn on from the 3rd floor to the apartment's floor, 2.58, in 15 risers [derived].
  2. « Escalier établi sur la Terrasse du logement de M. Eiffel ». The terrace is the gallery (« galerie à ciel ouvert, placée à la cote + 312,21 », p. 216).
     - PL-XIX Fig. 8 (the section EF at the roof, 60 px/m on « 10.680 »), labelled « Escaliers d'accès au Campanile », draws two flights. The first runs on the gallery along the pavilion's +x wall, « 2.420 » long [sourced] and « 54 » wide [sourced, read as 0.54], at x 5.37–5.95, z +1.50 to −0.92, climbing toward −z [measured]. At its head is a landing outside the roof's edge. The second runs from there over the roof, diagonally inward, to the foot of stair 3 [measured; its rise estimated].
     - Fig. 6's 0.62 × 1.00 on the gallery, « Escalier conduisant au Campanile », is only the part of the first flight under Fig. 6's cutting plane (the verifier's reading; the first build took it for the whole flight, 67° steep).
     - The model: 12 risers up the wall from the balcony's deck (2.43, `summit.ts`) to the roof's top (4.85) over 2.42, at 45°, 0.06 clear of the roof's edge; a 0.58 landing at its head; 9 risers over the roof to a 0.60 square landing at stair 3's foot, at 47°.
  3. « Escalier établi sur le côté de la poutre en diagonale continue ».
     - PL-XIX Fig. 5 (the section GH, 59.9 px/m on « 10.680 ») draws it hatched beside the continuous girder, labelled « Escalier conduisant à l'escalier du campanile », « 2.85 » long. Its centre line is 0.98 off the girder's axis toward pile 4 (+t), at s about 1.0–3.8 [measured].
     - The model runs it from the landing at its foot up and inward to the girders' top in 13 risers, at 43°. The roof flight and this one share the roof-to-girder-top 4.505 in 9 + 13, at one pitch.
  4. « Escalier du Campanile ».
     - PL-XV Fig. 2: « 22 marches de 178 = 3.916 » round the core, from the girders' top to the « Palier », "1.980" across, with the landing's railing « 1.200 » and « Porte d'entrée dans le cylindre de l'escalier 2.00 » at the landing [sourced].
     - Treads are 0.62: the 0.99 envelope less the core's 0.35, kept 0.02 off its sheet [derived].
     - It starts at 45° between +s and +t, toward stair 3's head, and turns 1.5 to the landing [estimated]. The landing is 1.00 of arc, railed at 1.200.
  5. The « échelle verticale en fer » inside the core (p. 79), "300" wide in the "700" [sourced PL-XV Fig. 2; the "300" is its width, not a pitch].
     - It runs from the landing's door to the lantern's floor, 30 rungs, hung 0.2 off the axis opposite the door [estimated].
     - Its part below the landing, reached by the plate's lower door, is not built.
  6. The lantern's ladders [sourced PL-XV Fig. 1 labels and chain]:
     - the « Échelle mobile », from the lantern's floor (329.020) to the cupola's floor (332.360): 16 rungs, leaning from 0.9 to 0.55 off the axis toward −s [estimated];
     - the cupola's floor itself, 0.792 × 2.44 (§29.3), built as the ladders' landing and laid long across s, so the mobile ladder arrives at its edge;
     - the « Échelle » on up to the top platform (334.015), beside the "600" at the crown: plumb, drawn about 0.2 off the axis [measured PL-XV Fig. 1], built 0.15 off toward +s and 0.34 wide so it passes the model's 0.60 crown ring [estimated], 8 rungs. The top platform has no hatch in the model, so its deck is the last rung.
  - The 125, less the campanile's 22 and the little stair's 15, leaves 88 over the steep stairs' and ladders' 18.04 m. That is one pitch, 0.205, shared per flight by height (12, 9 + 13, 30, 16, 8) [derived: the count]. No plate gives a pitch; the core's ladder rungs measure about 0.199 apart on PL-XV Fig. 1 (47 px at 236 px/m, the verifier's reading).
  - The climb steps down 0.15 from the apartment's floor (2.58, where the little stair arrives) to the balcony (2.43, `summit.ts`, from PL-VII); the text puts the gallery at 312.21, the apartment's level. The step down is not counted.
- **Frame and rails.**
  - Straight flights: two stringers (the ground stair's « U de 350 mm », 0.25 elsewhere [estimated]) and a hand rail each side on posts at most 1.2 apart. The rail is 1.00 over the nosing line on the ground stair [sourced PL-XXVIII « 1.000 »] and 0.90 elsewhere [estimated].
  - Spirals: a newel (the diameter less two treads; the campanile's is `summit.ts`'s core) and the outer rail 0.90 over the treads, on a post every fourth tread.
  - Ladders: two flat stiles, and round rungs built as 0.025 boxes.
  - The steep stairs 2 and 3 have stringers only.
- **What it costs.** Measured on the lifts' graph cooked alone, HEAD against this, interleaved four times. The stairs do not vary with depth, so plain, `?laced` and `?rivets` gain the same.
  - Stairs: 36,852 → 51,828 triangles. Rails: 12,600 → 19,136. The lifts' mesh classes: 85,708 → 107,220 (+21,512).
  - Cook: 44–52 → 49–70 ms after the first run, about +8 ms.
  - Tread boxes: 332 × 2 legs, 326 × 4, 454, 455 and 121, 2,998 in all. One climb's 1,688 treads, plus its 22 steps onto slabs, make the 1,710.
- **What the stairs needed of the other parts** (each the least change that lets a stair through):
  - `summit.ts`: the lantern's balcony floor is a ring from the soubassement's wall out, where a full decagon closed the lantern's room at the balcony's level, 0.775 over the lantern's floor; the cupola and the stair core are open at both ends (their caps closed the core's top, which the ladder climbs out of, and the cupola's foot, which the mobile ladder climbs through); the dome's two crown rungs across the axis are gone, because the core rises through the « carré » the arches leave round it [sourced p. 79].
  - `platforms.ts`: the 1st floor's opening for the ground stair's arrival is t 31.84–36.91, s −1.65…−0.45 (was 31.34, −1.58…−0.52): the landing moved 0.50 out with the shorter last flight, and the new 1.00 rails and posts stand 0.60 either side of T3's lane.
- **Clearance** (`tests/eiffelStairsClearance.test.ts`): 6,581 stair boxes (every tread, stringer, post, newel, landing, stile and rail segment, on every leg) against 515,702 triangles of every other part, exactly (box against triangle), and every lift car and every body that slides with one swept over its whole run against the stair boxes. Static: none. Swept: none, except one exemption, open and bounded: at their 2nd-floor station (s ≥ 127 on their runs) the Otis cars' outer ends (piles 1 and 3) pass through the last metre of e1's last flight, 18 box meetings. That flight stood there before this section: HEAD's e1 top flight is built by the same code, on the leg's diagonal, and §21's "never a stair" was a sweep to 50.4 only. This section adds its rails, posts and stringers to the same place; PL-XX Fig. 3's section, which it was read from, projects onto the diagonal, so the real flight stood to one side of the car. PL-XIX Fig. 7's 2nd-floor plan draws a short flight along the face near c in pile 3, which may be its arrival; not read far enough to rebuild e1's top here.
- **Held** by `tests/eiffelStairs.test.ts` (the count per run and in all, the flights the plates fix, every foot and head on a floor, landing or tread within a step, the cooked treads) and `tests/eiffelStairsClearance.test.ts` (the clearance).
- **Superseded:**
  - §11.6's "Per 11 m panel the text counts 23, 23 and 19 steps of 0.25 × 0.16": 23 and 19 are treads, and the risers are 24 and 21.
  - §11.7's "Not built: e3's « escalier de raccord » and the stairs above the 3rd floor".
  - §20.3's "e3's top": e3 ends at the 3rd floor and the little stair goes on.
  - §29.3's not-built stairs and the cupola's inner floor, which is now the ladders' landing.

### 11.11 The walk: the climb at eye level (2026-09-26)

`walk.ts` strings §11.10's flights into the path one climber's feet take, and `walkView.ts` puts the page's camera on it (`?walk`, `?walk=<step>`, or the panel's "walk").

- **Which way up** [sourced E1900-TXT p. 81]: « L'escalier de la pile 2 sert à la montée, l'autre à la descente »: the ground stair and e1 in pile 2 (Est), then e2, e3 and the summit stairs, which are built once.
- **The path on a stair is the stair's.** Every flight hands back its walking line (`Flight.line`), made in the same loop as its treads: the foot, the middle of each tread at its top (a spiral's at its walking radius, with its landing slots; a ladder's rungs), the head. No point on a flight is placed by hand.
- **Between flights** [estimated unless noted]: a turn on a landing, 0.125 onto it (on the ground stair's P4 landings the leg's face diagonal crosses at head height: 0.15 onto it puts the eye 0.24 from it, 0.10 the body 0.08 from the flights' end posts); four walks across floors, found by a clearance search over the cooked decks (a 0.10 grid, a body 0.25 clear from 0.6 to 1.6 over the floor) and held by the test: the 1st floor in pile 2, the 2nd floor to e2, the intermediate landing to e3, and from the little stair through Eiffel's apartment and out by the +x wall's door (`summit.ts` PAVILION_OPENINGS, u −2.57) onto the terrace; from the campanile's head along its landing to the core's door (« Porte d'entrée dans le cylindre de l'escalier 2.00 » [sourced PL-XV Fig. 2]) and in; from the core's top round the lantern's floor to behind the mobile ladder; a pace onto the top platform.
- **The eye**: 1.60 over the feet; on a ladder 0.25 behind the rungs, leaning with it; in the cupola, whose floor is 1.655 under the platform [sourced PL-XV Fig. 1] and whose sphere is « de 2,686 m de diamètre » [sourced p. 79], it keeps 0.20 under the shell (a climber crouches).
- **Measured**: 591.7 m of path; its steps, riser by riser, 347, 674, 1,130, 1,585, **1,710**. The shadow map at eye level: 9.1-10.2 cm a texel fitted to the whole tower (it grows with what is built), 2.2 cm fitted to a 60 × 40 × 60 m box round the walker (the panel's "near shadow", off by default: it loses the tower's shadow on the ground and the steel reads the same).
- **What eye level found** (`tests/eiffelWalk.test.ts` `FOUND`, each bounded, each open): e2's 16 start over its helix's last turn (1.3 m of headroom) and pass under the landing deck's edge; e3's raccord overhangs its lower helix's last turn; the spiral landings are straight boxes whose ends overhang the turn below (e3's upper helix, the campanile); the core has no door cut; the top platform has no hatch (the « 600 »); the terrace deck is 0.15 under the apartment's floor, where the book has both at 312.21. Off the flights (the test's body and floor checks): e1's joining flights meet each helix through its unbroken outer rail; the little stair's rail runs on round its head, and it ends 0.45 inside the floor's square well; the campanile's first tread stands 0.55 from the girder stair's head with no floor between; e2's and e3's service landings are straight boxes that overhang the turn below all the way up.

### 11.12 The stairs at eye level: what the walk found, fixed (2026-09-26)

A follow-up to §11.10 and §11.11: the defects the walk found on the stairs, each fixed in `stairs.ts` (and, for the core's door and the top platform's manhole, `summit.ts`), read again on the plates where they bear on it. Plates re-read at full resolution (IIIF, 8727 px wide for PL-XV and PL-XIX, 8995 for PL-XX), where every 1:200 figure measures about **60 px/m** (PL-XIX Fig. 7 on its « 36m80 », Fig. 9 on « 10.90 », PL-XX on e1's Ø 1.60) and PL-XV's 1:50 figures 220–240: the 79–81.5 px/m quoted in `stairs.ts` were taken on smaller images, and only their ratios carry over.

- **The service helices' landings** (e2, e3). Each is a sector now (`sectorLanding`): a box per tread's angle, square to the sector's radius at its FORWARD edge and reaching back from it, so nothing stands past that edge, where the turn below climbs toward it. A box centred on its slot overhung that edge near the newel, over a riser nearer: 1.83 of room.
  - **A turn to each landing.** At about 15 treads' angle a turn, a turn with a landing in it climbed 12 risers, 2.1, and the tread above and behind the walker came to 1.76 over his feet (the walk's eye, every turn). The helices with landings now take 17 slots a turn, the 14 risers and the landing's 3, so each turn climbs 14 risers, 2.46, and the landings stand one over another. Read as one turn, the 1983 sections' « 2.60 » with « 14 marches » (§11.10) is that pitch [inference]. e2 turns 30.75 times (was 34.75), e3's lower helix 21.9, its upper 8.4 (18.2 slots a turn: it ends where the little stair starts, below). With the sectors alone and 15 slots a turn the least room was 1.83; at 16, 2.01; at 17, 2.18 (the verifier's counterfactual).
  - **None in the last turn** (`SERVICE_LANDINGS.headClear`, 15 risers): the flight leaving the head crosses over that turn, and the landing e2 had one riser under its head cost that turn three treads' angle. The count is unchanged: 30 landings in e2 (was 31), 21 + 8 in e3 (was 22 + 9).
- **e2's head** (frame 06: 1.3 m over the last turn; PL-XX Fig. 2 re-read):
  - PL-XX draws the « 16 marches 2.92 » end-on [measured], so they run along ±t, as the model has them; its footprint is 0–0.85 on the helix's −s side there [measured], where the model's is on its +s side, the side the landing's opening (Fig. 14, s −2.73 … −0.11) leaves room for two lanes. Which way they run is not drawn, nor their going [not settled]. « Plancher des Machinistes (227.17) » spans over the helix's top [sourced level], which is why it stops at 225.60 [inference].
  - The 16 now start where the helix's walking line, run on straight from its head, leaves its circle, 0.62 on, over a pad laid on the last turn: 2.18 of room under the pad, 2.46 under the head [derived]. They pass under the landing's deck edge (the model's opening starts at t 3.22, `platforms.ts` LANDING.wells) with 2.15 over their treads (the verifier's cast), where the eye was 0.12 from it.
  - They turn on a landing 0.60 deep (was 0.90, which met the edge girder facing pile 4 at t 5.67), and the 5 come back on 0.20 goings [estimated] onto a landing at the deck's level that runs on 0.85 to the opening's near edge, t 3.22: the last riser's slab. Before, the flight's head stood 0.18 inside the opening and its last going over the void (the walk's test could not see it: its floor check is off the flights; the verifier found it).
- **e3's raccord** leaves its lower helix at the head of a last turn without a landing: 2.34 of room under it over that turn, where there was 1.55 (the walk's 217 samples at 0.06 are gone). PL-XX Fig. 2 draws it from the lower helix's newel, on its −s side, to the upper helix's newel's foot, rising 2.25 [measured] over only about 1.2 projected; its true run and treads are not settled.
- **e1's rails** stop where a flight crosses a helix's outer edge, foot and head (`railOpen`): the flight's band, its half width and a stringer either side, where it crosses the circle, asin(sin b + 0.475) − b at the angle b the flight meets it (0.49 rad on the diagonal) [derived]; posts in the opening are left out. The walk's body met the rails at 30 samples; 7 are left, the walk's straight step from a helix's head to a flight's foot passing under the back edge of the flight's first tread (0.093 from the knee sample).
- **The rails' facets.** Each tread's arc is cut into as many chords as keep the rail within 5 mm of its circle (`RAIL_SAG`, `railChords`) [estimated]: 2 a tread on most helices, 3 on e1's last (its treads span 25.7°), where it was one (21–26° chords, visibly kinked at eye level, frames 05 and 09); the rails now stand 2.2–4.7 mm off their circles, against 15–23.
- **The campanile** (PL-XV Fig. 2, which faces −t, re-read): its treads cross in front of the core going down and behind it going up, the extremities 0.62 and 2.51 up [measured], so it turns **once**, in the model's other stairs' hand, from +z (the Seine side, −s + t) round to the « Palier » over its first step [measured; it was 1.5 turns from +x, estimated]. The landing is a sector of the treads' reach from the last riser's slot to 0.10 past the door's far jamb (it was a straight box 1.00 long whose inner end overhung the turn below, 1.86 of room). The plate's elevations give the Palier about 50–60° [inference]; the model's is 99°, what the door needs.
- **The core's door** (`summit.ts` CORE_DOOR): « Porte d'entrée dans le cylindre de l'escalier 2.00 » [sourced], 2.00 its height over the Palier (2.02 on its dimension line [measured]); Fig. 2 draws it edge-on at the core's −s silhouette with its near jamb about 47° round toward +t [measured], so it opens from over the stair's arrival toward −s. Its width is not drawn: three of the core's 16 sides, 0.42 [estimated; about 0.5 were it centred on −s]. The core is the prism below the sill and above the head, and between them its other sides as 4 mm plates. The walk goes along the landing to the door's middle and in.
- **The core's ladder** faces +t, its rungs along s: Figs 1–2 draw it face-on through the core's foot opening, « Ouverture dans le cylindre de l'escalier 2.000 » with a 0.130 sill, which faces +t [sourced; measured]; its rungs run the core's whole height [measured], about 0.20–0.21 apart. The model hangs it 0.2 off the axis toward −t, the climber on its +t side (it faced the door before), and carries its rungs on down to the girders' deck as frame, not steps (19, from the landing's level down). The foot opening is not cut. PL-XIX Fig. 12 prints « Trappe. Au-dessous, échelle partant de la plateforme du phare » in the lantern's floor over it [sourced].
- **The girder stair to the campanile.** PL-XIX Fig. 5 puts the flight's head outside both girders' plated tops [measured]; nothing is drawn between it and the first step at legible scale, and the only plated way round is the top of the discontinuous girder's +t arm [inference]. The model lays a plate from the head to the two girders' flanges, 1.13 over them [sourced], in the corner they leave [estimated]: it was 0.55 with no floor. Fig. 3 may put the head 0.35 under the girders' top [low confidence, not followed].
- **The top platform's manhole.** The « 600 » of PL-XV Fig. 1 is a sheet collar Ø 0.60, about 0.31 tall, flush with the deck [measured], and PL-XIX Fig. 10 draws the deck with a central opening about 0.58 across under the tripod's legs [measured]: the deck is a ring from the crown ring's 0.30 to its 0.85 now (it was whole, and the last ladder came up through it). The last ladder stands 0.21–0.28 toward +s, its rungs along t, at most 0.36 wide inside the ring [measured]: built 0.21 off and 0.30 wide, its stiles inside the model's ring. The tripod stands over the manhole, its legs on the collar's rim and meeting 1.00 over the deck [sourced ROD, §29]: the climber's head comes up inside it (the walk's `FOUND`, bounded).
- **The little stair** (PL-XIX Fig. 6, 63.5 px/m on « 10.00 »): the Ø « 1.60 » is drawn with about 83° of its circle closed by the apartment's floor, on the tower's axis side, 146° to 229° round its axis in the world's plan (atan2(z, x)) [measured]; the well is the other 277° [inference]. The stair turns those 277°, from the sector's far edge, where e3's upper helix now ends (8.4 turns, was 9), round to its near edge, and its head steps onto the floor there, a sector at the floor's level (it turned a whole turn from e3's raccord's line and ended 0.45 inside the square well, its rail running on round the head). Its rail stops a walker's width, 0.35, short of the head, where the walk steps off across the well's −s edge and goes round it on the floor. Figs 6, 9 and 3 may turn it the other way round [low-medium confidence]; the model keeps e3's hand. `summit.ts`'s square well is unchanged.
- **e1's last flight and the Otis cars** (§11.10's one swept exemption), re-read: PL-XX Fig. 3 lands the flight's head about 6.2 in from the corner post, right beside the Otis cabin at its 2nd-floor station, rising 3.38 over 4.3–4.7 projected [measured], and a section cannot show which side of the car's line; PL-XIX Fig. 7's four flights by the corner posts, parallel to the faces, about 2.6 long, with arrows that disagree between legs, do not match it. Not settled, so the flight stays on the diagonal and the exemption stays, bounded. The Otis legs are piles 1 and 3 [sourced text; Fig. 7].
- **What it costs** (the lifts' and summit's graph cooked alone, HEAD against this, interleaved twice, six cooks each; the stairs do not vary with depth, so plain, `?laced` and `?rivets` gain the same): stairs 51,828 → 53,568 triangles (the landings' sectors, pads and the core ladder's lower rungs); rails 19,136 → 37,328 (the chords); the core 32 → 220; the top deck 96 → 288: +20,312 in all. Cook: 18–39 against 22–51 ms after the first, within the noise.
- **Held** by `tests/eiffelStairsHeadroom.test.ts` (new: 2.00 of room over every stair's walking line, cast up from the foot and a 0.15 ring round it, against the stairs' own pieces; the landings a turn apart and none in the last turn; a sector's pieces stopping at its forward edge; the rails' sag; e1's openings; the core's door, its landing and ladder, the manhole, the little stair's floor; each with a control), `tests/eiffelWalk.test.ts` (its lists shortened and tightened to what is reached: e2's helix and 16, e3's, the campanile's landing and door, and the little stair's rail and well gone; e1's rails 30 → 7; the top ladder 25 → 14, now the tripod over the manhole; the lantern round the core's head 24 → 19 and 8 → 7; the girder stair's floor gap gone; the step in by the door listed under the campanile at 0.40 rather than passing at the stride's 0.35 exactly; one 1-sample finding in the cupola marked `phase`, bounded, not required, since whether a 5 cm sample lands in it moves with the walk's length), and §11.10's tests. Checked by a fresh verifier (casts from the walking lines, the cooked core and deck, the plates' crops, frames at eight steps); its findings (the 5's last going over the opening, the little stair's floor on the wrong side of its circle, four misstated numbers) are fixed above.

---

## 12. The campanile re-read (PL-XIX Figs 3–13, PL-VII Fig. 4)

Added 2026-09-18 after a proportion audit of the summit against the plates. Where this section and §6.3, §6.4 or §10.8 disagree, this section is the later reading and `summit.ts` follows it.

### 12.1 Sources

- **PL-XIX** (key in §10.1) has more than its Fig. 1. The other figures are all at 1:200 ("Échelle 0m005 p. m."):
  - Fig. 3, "Troisième étage, élévation";
  - Fig. 4, "Coupole, élévation";
  - Fig. 5, the plan of the dome girders over "Toiture du logement de Monsieur Eiffel";
  - Fig. 8, a second plan of the same girders;
  - Fig. 9, "Plan du troisième étage, coupe horizontale AB";
  - Figs 10–13, the lantern's horizontal sections QR, OP, MN, KL.

  The scans are about 78.8 px/m. That was checked against figures printed on the same drawings: Fig. 3's "5.00" = 394–400 px and Fig. 4's "3.980" = 315 px. Figs 5 and 8 scan at about 82 px/m, so they were measured against their own "14.870".
- **PL-VII Fig. 4** (key in §0) was re-read for panel 29's rows and members, and for the lantern.
- Pixel readings here are **[estimated]**, following §0's tag rule. They were made on the full-resolution scans with a ruler overlay.

### 12.2 Readings

**Panel 29 (PL-VII Fig. 4)**

- **Rows.** "3,173" is a lattice band at the base and "8,057" the rest [sourced].
  - The 8.057 holds three X rows, drawn 2.42–2.47 apart between horizontals [estimated].
  - PL-XIX Fig. 3 prints the band as "3.50" [sourced].
- **Horizontals.** Plate girders: "600×6" at the band's top and at its base, "600×7" under the floor [sourced]. The two horizontals between the X rows are light angles [estimated].
  - The band-top girder hangs from its node: drawn 0.1–0.65 below the 3.173 mark [estimated].
  - The floor's structure is "850" deep [sourced], read as a 0.25 build-up over the 0.60 girder, which puts the girder 0.25–0.85 below the floor [derived].
- **Posts.** "500" is printed three times [sourced]; the posts are drawn 0.53 [estimated]. They are as heavy as the corner uprights, not as light as the diagonals.
- **The web.** Flat bars, drawn as double lines 0.08–0.11 wide [estimated].
  - One X per cell in the rows.
  - In the band, each diagonal is a pair of bars about 0.30 apart along the face [estimated].
  - Every cell corner carries a gusset fillet [drawn].
- **The core above the floor.** The corner uprights c and the merged b/d on the face centre lines continue up through the room to the balcony beam [drawn, PL-VII Fig. 4].

**The room (PL-XIX Figs 3, 5, 9; PL-VII Fig. 4)**

- **The chain's 4.850 [sourced] is two storeys:**
  - 2.58, from 309.63 to "Niveau du plancher du logement de Mr Eiffel (312.21)" [sourced];
  - then "Logement de Mr Eiffel 2.270" [sourced Fig. 3];
  - 2.58 + 2.27 = 4.85 [derived].
- **The 16.56 glazed octagon (§10.8) holds only the lower 2.58.**
  - A 1.20 lattice parapet ("Treillis 40×40×4") [sourced PL-VII], with glazing above.
  - PL-VII splits the storey 1.200 + 1.030 + 0.200 = 2.430 up to its balcony beam ("Fer I 120×5×48") [sourced]. That is 0.15 under PL-XIX's 2.58.
- **The apartment stands inside the core.**
  - Fig. 5 prints its roof square as "10.680" [sourced]; Fig. 3 draws it 10.84 wide and 2.27 tall [estimated].
  - Nothing 16.56 wide continues above 312.21.
  - 10.68² = 114 m² gross, against TE-APT's "100 m²" [derived].
- **The balcony on the gallery's roof** ("Balcon du logement de Mr Eiffel").
  - Railing "1.000" [sourced PL-VII].
  - The deck's edge is drawn 17.6–17.9 across [estimated PL-VII], so it stands 0.5–0.7 proud of the glass.

**The lattice box and the dome (PL-XIX Figs 3, 5, 8; PL-VII Fig. 4)**

- **The dome is a true semicircle.**
  - Fig. 5 prints "7.435" on each half-diagonal and "14.870" across [sourced].
  - PL-VII's right-hand chain prints "11,935" = 4.500 + 7.435 [sourced].
  - So the rise equals the plan radius, 7.435: a semicircle springing from the box's top, with no stilt. §6.4's "slightly stilted" is withdrawn.
  - PL-VII's left-hand chain reads "7,485" [estimated digit]. 11.935 and Fig. 5 settle the rise at 7.435. The 0.05 gap to 326.715 stays open (§6.4).
- **Fig. 3 labels the box's 4.50 "Parties droites des poutres en diagonale"** [sourced]. The diagonal girders run straight up through the box and curve above it, so 11.935 is their full height.
- **The ribs are box girders.**
  - "1.130" overall and "0.770" between the chords, at the girders' ends [sourced Fig. 5]. Fig. 8 reads "1.180" / "770" [sourced; a second reading].
  - About 1.2 deep at the crown [estimated PL-VII]. They are not planar trusses.
- **The box's width, read four ways:**
  - corner-column axes 10.36 (PL-VII) and 10.48 (PL-XIX Fig. 3) apart, face-on [estimated];
  - outer faces 10.96 and 11.2 [estimated];
  - PL-VII prints "10,00" inside it [sourced];
  - the plans draw a "10.680" square [sourced].

  One layout fits all four: columns on the ribs' springing, 7.435/√2 = 5.257 from the axis, so 10.515 apart [derived], and about 0.55 wide [estimated]. That leaves 9.965 clear between them, PL-VII's 10.00. The 10.680 square falls within the columns' width.
- **The box's faces.**
  - A diamond mesh of flat bars about 0.09 wide, 0.75 apart along the face, at about 58° [estimated PL-XIX Fig. 3, PL-VII].
  - A plate at the foot and one at the head, and posts at the 2.50 bays.
  - No horizontal at mid-height.

**The lantern (PL-XIX Figs 4, 10–13; PL-VII Fig. 4)**

- **The lantern terrace** ("Plateforme du phare") is a square with chamfered corners [sourced drawing, Fig. 13].
  - Fig. 13 dimensions "5.750" along the DIAGONAL, chamfer flat to chamfer flat, and prints "776" along a chamfer [sourced].
  - The side is therefore 5.750/√2 + 0.776/√2 = 4.615 [derived].
  - PL-VII draws the deck 4.57–4.63 [estimated]. Its own "5,750" arrows, 4.37 apart, sit across the elevation where the side should be.
  - §6.4's "5.750 wide base" is withdrawn.
- **The lantern is decagonal.**
  - Figs 12 (section MN, the balcony) and 13 (KL, the soubassement) draw 10-sided plans with flats to the Seine side [sourced drawing]. The period engraving's apparent octagon is set aside for the plans.
  - The soubassement is "2.60" across the flats [sourced Fig. 13]; 2.734 across the corners [derived]. PL-VII's "2.686" [sourced] falls between them.
- **The balcony** ("Balcon de la Lanterne (329.7…)").
  - "3.60" across the flats [sourced Fig. 12; the reading of its last digit is estimated]; 3.785 across the corners [derived].
  - The elevations draw it 3.75 (PL-VII) and 3.83 (PL-XIX Fig. 4) across the corners [estimated].
  - Its floor is 2.305 + 0.775 = 3.080 above the terrace [sourced PL-VII], at altitude 329.795 [derived], which agrees with the label.
  - It stands on quarter-round consoles 0.775 deep [sourced], and its parapet is "0.900" [sourced PL-VII, PL-XIX Fig. 4].
- **The cupola is bulbous.** Straight sides for about 0.9, then it rounds in to the top deck [estimated PL-XIX Fig. 4, PL-VII]. It is drawn 2.74 wide [estimated].
- **The top terrace.** The 0.125 deck is drawn 1.75–1.80 wide [estimated PL-VII], with a "1.00" railing round it [sourced PL-XIX Fig. 4].
- **"Soutien du paratonnerre 3.05"** [sourced PL-XIX Fig. 4] stands on the top terrace.
  - Posts "1.700" apart [sourced PL-VII; PL-XIX draws 1.79].
  - The posts run straight for "1.200" [sourced PL-VII], or about 1.8 [estimated PL-XIX], then close in on the pole.
  - At 1:1000, on PL-I, it reads as a small cupola above the top terrace.

### 12.3 What `summit.ts` builds from this

- **Panel 29.**
  - The band at 3.173, then three even X rows [estimated split].
  - Posts 0.50; flat bars 0.09; paired bars in the band.
  - 0.60 × 0.20 plate girders, one hanging from the band's top node and one 0.25–0.85 under the floor. The base's girder is the shaft's own 0.60 horizontal.
  - The corner uprights and the b/d posts run on to the apartment floor.
- **The gallery.** A 16.56 / 10.90 octagon, 2.58 tall, built as its frame: mullions about every 1.35 m, sill, parapet and head rails, and the parapet's X. The panes are left open, since no glass class exists.
- **The balcony and the apartment.**
  - The balcony deck is the same octagon grown 0.52, with a 1.00 railing.
  - The apartment is a 10.68 × 2.27 box.
- **The box.**
  - Laced-looking corner columns 0.55 square at ±5.257.
  - A plate at the foot (on the apartment's roof) and at the head (under the springing).
  - Posts at the bays and the diamond mesh.
- **The dome.** Two crossed semicircles of extrados radius 7.435 about the box's top, crown at y 292.915. Each rib is four chords 0.18 square, 1.02 × 0.95 apart (1.20 × 1.13 overall, 0.77 clear across), laced with a rung and an X on every face, in 12 segments.
- **The lantern.**
  - The 4.615 chamfered terrace with its 1.00 railing.
  - The decagonal soubassement, balcony floor and 0.9 parapet, on ten consoles at the corners.
  - The glazed lantern as rings, posts and a zigzag.
  - The bulb cupola, a 1.80 top deck, and the conductor's cage (8 ribs, 1.70 × 3.05, two rails).
- **Not built:**
  - the straight parts of the diagonal girders inside the box;
  - the "contrefiches" (struts) from the core to the box's corners inside the room;
  - the glazing itself, windows and doors;
  - the flag and the 1.50 lightning-rod fan.

### 12.4 Disagreements and open points

- **Terrace side.** 4.615 [derived from Fig. 13's printed diagonal and chamfer; PL-VII draws it] against PL-XIX's drawn 5.0 (Figs 4 and 13) [estimated]. PL-XIX's drawn chamfer-to-chamfer diagonal, about 6.0, is itself longer than its label.
- **Balcony.** 3.60 across the flats (printed) against 3.97 as Fig. 12 draws it [estimated]. The elevations side with 3.60.
- **The gallery's height.** 2.58 (PL-XIX) against 2.43 to PL-VII's balcony beam.
- **The box.** Its column axes at 10.515 [derived] against the plans' 10.680 square. 10.680 is read as the apartment roof's outline, which the columns straddle.
- **The girders' straight parts.** A 1.13 × 1.2 girder standing in each corner of the box would show about 1.6 wide face-on [derived]. Both plates draw 0.6–0.7 corner columns there [estimated]. How the straight parts sit inside the box is not resolved, so the model springs the ribs from the columns and does not build the straight parts.
- **The ribs' intrados chords** land 6.35 out on the diagonal, inside the box's top, where no member is drawn in the model.
- **Panel 29's rows.** This reading draws them 2.47 / 2.46 / 2.42; the audit read 2.68 / 2.45 / 2.65. Both sum to about the printed 8.057 less the plate girders. The model's even thirds are [estimated].

## 13. Legs and shaft: member proportions against the plates (2026-09-18)

An audit of the legs' and shaft's member SIZES against the plates (panels 1–28), each finding re-read on the full-resolution Gallica scans before any number changed. PL-VII is a rabattement: its depths are in the face plane, so a vertical depth is the printed one over √(1 + s²), s the face's slope. This section supersedes §4.1's "base tie ≈ 2 m [estimated]" and "lighter secondary diagonals [estimated]", and fills §4.2's silence on the horizontals' depth.

### 13.1 Readings

| Member | Plate reads | Was | Now | Tag |
|---|---|---|---|---|
| Horizontal struts, panels 1–11 | "800" on the node and mid horizontals of panels 1–4 (PL-IX Fig. 8, 1:100); ≈0.77 drawn in panels 6–11 (PL-VII Fig. 2) | 0.60 | **0.80** | [sourced PL-IX] |
| Horizontal struts, panels 12–29 | "600" on the shaft horizontal at IX (PL-VII Fig. 3); 0.58–0.60 drawn at X and in panels 15–16. Heavier than the 500 diagonals | 0.40 | **0.60** | [sourced PL-VII] |
| Panel 10 | a lattice band "3,6071" deep at its base (300 × 5 flats, 30 × 30 × 4 angles, ≈45°), a 600 top chord ("600" printed on it), then "6,564325" of TWO X's per leg face either side of a central post, every strut printed "600" (PL-VII Fig. 2) | one full-height X of 800 | band + two X's + post, all **0.60**; the band's top at XIX + 3.6071 / 1.0272 = 104.11 | [sourced]; the band's bar spacing 0.93 m [estimated] |
| Upright section at the 2nd floor | sections XVIII–XXIII ≈ 0.87, XII–XVII "500" (PL-XXXI) | 0.87 → 0.50 spread over panel 12 | a **step at XVII**: the chains are cut there, each skinned and riveted from its own table | [sourced PL-XXXI] |
| Lacing step (the X's repeat) | 800 struts: the mid horizontal's crossings every 61 px at 61 px/m, **1.00 m** (PL-IX Fig. 8; PL-VII panel 2 agrees); 600 shaft horizontals ≈ **0.94** (PL-VII Fig. 3, node X: 64 px at ≈67 px/m; an earlier reading 0.92); 500 struts **0.66–0.69** (PL-VII Fig. 3, panel 19) | 0.71 m everywhere (45°), the step taken from the call's widest section | per member, from its own width | [estimated, measured] |
| Lacing bar | "Treillis 45 × 45 × 5" | 0.040 | **0.045** | [sourced PL-VII] |
| Gusset plate thickness | "Gousset G (8 m/m)", "Attache 8 m/m", "8 m/m" at gussets A and E (PL-IX); "Ep. 10" at panel 5 (PL-VII) | 0.015 | **0.008** | [sourced PL-IX] |
| Gusset extent | riveted over the upright's flange, out to **1.423** from the upright's axis along the horizontal and **1.298** along a flat diagonal (PL-IX Gousset A, 1:50); "1.340", "1.404"/"1.424" at panels 8–9 (PL-VII Fig. 2); "900"/"1000" on the shaft horizontals (PL-VII Fig. 3). A diagonal's chords end on the plate in groups of 5–6 rivets ≈0.08 apart | 1.38–2.44 m out along a panel-2 diagonal: an empty wedge at the upright | from the upright's face (the rectangle's obtuse corner on it) to 1.5 (diagonals) or 2.2 (horizontals) strut half-widths past the joint start. As built: the XXVII horizontal's plate ends 1.465 m out, panel 8's 1.34–1.40, the shaft's 0.86–0.88; a panel-2 diagonal's 1.27–1.91 | [sourced] extents; the reach multiples [estimated] |
| Seam rivet pitch | the arbalétrier's flange rows on Gousset A, scaled by its printed 800 and 1.423 (310–318 px/m): every 40.4 px, **0.127–0.130**; a histogram of the sheet's rings clusters at 37.8 px, 0.122. (A first reading against the printed "88,5" gave 0.117, but that dimension is drawn too wide to scale by) | 0.10 | **0.125** | [estimated, measured] |
| Base tie A (outer faces) | "2,987" between the chords' 200 × 8 plates and "3,387" over them (PL-VII Fig. 1); the drawn chords 255 px apart at 79.7 px/m, 3.20 | 2.24 in-plane | **3.187** in-plane axis to axis [derived] = 2.848 vertical | [sourced] + [derived] |
| Base tie B (inner faces) | "2.000" (PL-VII Fig. 5; it passes over the door) | 2.24 | **2.000** in-plane = 1.787 vertical | [sourced] |
| The ties' lattice | Warren girders of single 70 × 70 × 8 angles with a bottom chord and no posts but the central one (PL-VII Figs 1, 5); A's bottom joints ≈3.75 apart | 7 bays, posts and an X each, 0.24 m bars | a Warren, 4 V's a face, **0.10** m bars | [sourced] pattern; bays [estimated] |
| Panel 5's belt | posts every 3.000; 80 × 80 × 8 bars from a post's foot through the next post's mid-height (square gussets) to the top of the one after, ≈50° off the chord (PL-VII Fig. 1) | an X a bay, 21–29° off the post, 0.24 m bars | that double lattice, 0.10 m bars | [sourced] |
| Panel 5's chords | they line up with the grande poutre's, whose "800 × 12" chords' outer faces lie on the node lines ("Entre semelles 7,5309" = 7.00 × 1.07584; §14.1) | the node horizontals, centred on XXIV and XXIII: a 0.37 step against the girder at b | chords with their outer faces on XXIV and XXIII; no horizontal on either node line; the central posts below and above run up to (down to) the node line. As built then: 0.50 laced struts, axes 0.25 in the plane inside the node lines (not the 0.80 this row first said); since §19, solid "500 × 10" plates 0.50 wide on the same axes | [sourced] |
| Panel 4's Masque | "Masque placé sur le panneau 4" (PL-VII Fig. 6): a screen over the whole panel, 15.000 × 12.311 in the plane, in front of its web: a "630 × 4" chord whose lower edge clears the foot's node line by ≈0.45 (24 px at 50.8 px/m; an independent reading 0.43–0.47), a "750 × 4" chord "2,746" clear above it (drawn 2.68), a top band ≈0.52–0.59 deep under XXIV, a dense 45° double lattice between them; above, vertical posts and heavy bars crossing at the posts' mid-heights up to a top band under XXIV, its top corners rounded. The drawn posts fall 3.86 apart, the one nearest c cut short by the leaning upright: the decorative girder's 3.8825 rhythm from the axis, carried across the leg | none | built on the two leg faces in each tower face, 0.44 out from the face plane (clear of the uprights and their rivet heads), in flat plates and bars, in four layers so no two crossing plates share a plane; posts at 3.8825 k | [sourced] chords, clear and extent; the 0.45 lift, the bars' widths (0.32, 0.30, 0.20, drawn 0.3–0.4), the lower lattice's pitch (1.94), the top band (0.55) [estimated]; the rounded corners not built; which faces carry it is not printed, and outer faces only is inferred (Fig. 6 sits beside Fig. 1's outer face, same scale and orientation, and its posts keep the tower-axis rhythm) |
| Panel 11's belt | posts "3,36268" apart (≈3 bays); a diamond lattice of 80 × 80 angles crossing at the posts' mid-heights and meeting the chords at mid-bay, an angle of 53°49′43″ printed at one bar (PL-VII Fig. 2) | 4 bays, an X each | 3 bays, the diamond, 0.10 m bars | [sourced]; bays [estimated] |
| Central posts | a laced strut up the middle of every leg face, parallel to the uprights, through the X crossings and across the node horizontals at rosettes: "800" in panels 1–4 (PL-IX Fig. 8, "Rabattement de l'un des quatre premiers panneaux"), "Corn: 80×80×8" with "800" in panels 6–9 (PL-VII Fig. 2), "600" in panel 10, and continued down through both base ties (PL-VII Figs 1, 5) | none | on all 16 leg faces: tie, panels 1–4, 6–9, 10; each stretch stops clear of the member it stands on | [sourced] |
| The gap between adjacent legs | an X per panel between b of one leg and d of the next, with the horizontals continued across it (PL-VII Fig. 2 panels 12–14, Fig. 3 panels 15–16: "5,1372" at XIV, "1,8627" at XII) | open | X's in **panels 12–16**, horizontals at XVI–XII, 500 / 600 | [sourced] |

### 13.2 What changed in the model beyond the numbers

- **The upright skins agree with their seam rows everywhere.** A swept chain puts one ring at each vertex, in the plane bisecting the two segments there and rolled against that bisector, while the seam rows lie in each segment's own frame; between kinked nodes the skin was a twisted blend of two rolls and the rows sat up to 10.8 mm off it (measured on the build before this change). The uprights now carry a ring 0.01 m either side of every node where the column turns (XXIV–XVIII and XV–XIII: where Plate XXXI's slope changes; XVI and XII are collinear to 1e-5), so each panel's box is untwisted, and no seam row is laid within 13 mm of such a node. Every seam rivet is now within 0.04 mm of its skin.
- **Joint clearances see the column's kinks.** A member's joint began where it cleared the upright measured against the column's bisector at the node. With 0.80 horizontals the bottom chord at XXIII sits 0.33 m below the node, beside the segment below, which leans closer. The legs and the shaft now solve it against the closest of the bisector and the two segments (`endSinMin`, `JointOpts.kinks`). At XI the shaft's bd stands on the two legs' b and d, still 0.50 apart ("250 250", PL-VII Fig. 3): members ending there clear both (`JointOpts.uprightAt`).
- **The slender gap X of panel 16** meets b and d at a sine of about 0.17, under the joints' default clamp of 0.25, which would leave its joint rivets inside them; that set clamps at 0.10 (`JointOpts.minSine`).
- **Joint rivets only where a chord is.** Each member end's rivet window (its joint start, and that plus the plate's reach) is now read once at the end and carried along the member. Read at every sample, as before, a table that steps along the member (the upright's at XVII, the merge at XI) slid the window: an independent check found 352 heads 229–327 mm nearer the upright than the strut's trimmed start, on bare plate. Now every joint rivet has a chord 8 mm under it (the plate's thickness).
- **`spec.ts`** now carries the arch as §14.1 reads it (`ARCH.band` 3.9173 outer to outer, `extradosRadius`, `montantPitch` 2.5488, `lowerRadius` 44.5258 from y 20.20, `footX` 37.1188) and `FIRST_FLOOR.arcadeOpenings` 7 per half with `montants` 14. `MEMBERS.upright` is a 1 cm step at XVII, so a reader of the size at 115.73 (the 2nd floor) now gets 0.25, not 0.435.

### 13.3 Disagreements and open points

- **Panel 5's chords** are labelled "500 × 10" on PL-VII Fig. 1 and drawn as solid plates, ≈0.5 deep, their axes 0.25 inside the node lines. (This bullet first said the model built them 0.80 laced; the code built 0.50 laced struts, `BELT1_CHORD` 0.25, and since §19 builds them as solid 0.50 plates.) Their outer faces are on the node lines either way.
- **Panel 17's gap** (XII → XI) is open on PL-VII Fig. 3: b and d close from 1.863 to 0.50 axis to axis, their boxes to touching. The audit listed the gap bracing as panels 12–17; the plate draws it in 12–16.
- **The central post in the ties** is labelled "877" on PL-VII Figs 1 and 5, against "800" on PL-IX Fig. 8 in panels 1–4. The model uses 0.80 throughout panels 1–9 and the ties.
- **The ties' top.** Measured up from the support centres, A's bottom chord ("1,378") plus its depth puts its top chord about 0.3 m above node XXVIII, and B's ("2,765" + 2.000) likewise. The model keeps both ties' tops at XXVIII, whose horizontal is their top chord, and hangs the depth below it.
- **Panel 10's two printed spans** (3.6071 + 6.564325 in-plane) close to 9.90 m of vertical against the panel's 10.00. The band's top is taken from XIX.
- **The belts' bars** are single 70–80 mm angles, 0.07–0.08 across, drawn 0.10–0.17 wide at 1:200. The model's 0.10 square sits between. Panel 10's band is of 300 × 5 flats, which a square member cannot draw; it gets the same 0.10.
- **The lacing on the strut faces normal to the tower face** is a single zigzag on PL-IX Fig. 8's inset "Treillis des surfaces normales"; the model laces all four faces in an X.
- **Panel 6's upright** still widens 0.82 → 0.87 over the panel, not at XXIII: PL-VII prints 822.8, 864.879 and 876.99 up it, and the audit found the spread within 5%.

---

## 14. The first floor, and the 2nd floor between the legs, re-read (2026-09-18)

A proportion audit of the arches and the girders between the legs, each finding re-read on the Gallica scans of PL-VII (f40, f41) and PL-XI (f56) before any number changed. PL-VII is a rabattement: its printed depths are in the face plane. This section supersedes §5.2's "arcade of 14 small round-headed openings ('montants 1…14')", §5.3's "band depth 2.5488", its reading of which radius governs where, its single-circle approximation with "vertical legs below", §1's closing sentence as far as it concerns the model, and §10.6's "the inner one is drawn the same way [estimated]" (it is now built). `spec.ts`'s `ARCH` comment (band 2.5488, one circle) and `FIRST_FLOOR.arcadeOpenings` are stale for the same reasons; `firstFloor.ts` no longer reads either.

### 14.1 Readings

| Element | Plate reads | Was | Now | Tag |
|---|---|---|---|---|
| Band depth | "3m,9173" printed on the axis at the crown, from the intrados' underside to the extrados' top (PL-VII Fig. 1) = 40.32373 − 36.4064. PL-XI Fig. 1 measures ≈3.50 vertical (3.92 in the plane) outer to outer at x 2.7 | 2.5488 axis to axis | **3.9173** outer to outer: intrados R 36.4064 and extrados R 40.32373 concentric, to the members' outer faces; chords "600 × 7" | [sourced] |
| 2.5488 | printed twice, tick to tick ALONG the intrados near the haunch (PL-VII Fig. 1): the montants' pitch | the band depth | the montant pitch | [sourced] |
| Montants | numbered 1–14 from the crown, per half: "Montant 1" on the axis AB, "Montant 8" at the leg, 11–14 along the band near M (PL-XI Fig. 1); radial; "400" wide (PL-VII) | 15 posts spread evenly along the chord | radial lines at 2.5488 on the intrados: 1–8 run on to the arcade chord, 9–11 to b, 12–14 close the band where the extrados has met b | [sourced] |
| Their check | PL-VII's post spacings along the arcade chord, axis outward: 2.8577, 2.8955, 2.9533, 3.043, 3.1683, 3.3347, 3.5505. Radial lines at a 2.5488 pitch on R 36.4064 cross the chord's axis (y 43.40) at spacings 2.8669, 2.8953, 2.9531, 3.0427, 3.1679, 3.3344, 3.5500 | — | six of seven within 0.5 mm (the first 9 mm long: measured off the axis post's face, perhaps). It fixes the circle's centre, the crown's 39.40 and the chord's 43.40 together | [derived] |
| The lower arch | "R-36.4064 / R=44.5258" at B, and "1.00" across section AB from arbalétrier b's axis (PL-XI Fig. 10). Below the band one member, drawn curving to vertical onto a small pier at the pedestal's inner edge (PL-VII Fig. 1) | straight beside b from y 20.2, landing 3.7–7.3 m out on the pedestal (clear span 81.7) | the circle comes closest to b's axis where it runs parallel to it, y 20.20, at **1.0003** in the plane; there it turns, tangent, to R 44.5258, which is vertical at x **37.1188**, y 3.90: PL-I's pedestal face 37.119 to 0.2 mm, the 74.238 clear span | [derived] |
| Pier and foot | a moulded capital at ≈ y 5.1, the pier ≈1.3 wide, standing from about the ground at the pedestal's inner edge; the member ≈0.46–0.6 wide there, its inner face at ≈37.03 (PL-VII Fig. 1 at 19.6 px/m, ±0.1) | none | the arch stops at y 5.10 on a 1.3 square pier from the ground | [estimated] |
| Bracket | two ties from b to the lower arch, the upper continuing panel 1's mid horizontal, an X between them and a strut below: "Corn: 80×80×8", "C: 80×80×8" (PL-VII Fig. 1) | none | ties at 11.9 and 9.4, strut to the arch at 7.1 | [sourced] members; heights [estimated] |
| Arcade | "tôles découpées en arc de cercle ou laissées pleines au sommet des arcs", on the extrados of faces 1 and 4 only (PL-XI Nota); plates "3m/m" (PL-VII). PL-XI Fig. 1 draws the spandrels solid between montants 1 and 4, openings 4\|5 … 7\|8 under the chord and 8\|9 … 10\|11 under b | 14 openings evenly across ±22.64, four over the crown | seven per half, solid within \|x\| < 8.9 | [sourced] |
| Head radii | 1.2362 (5\|6), 1.272 (6\|7), 1.317 (7\|8) under the chord; 1.2506 and 1.196 beside the leg (PL-VII Fig. 1) | 1.617, one for all | the circle tangent to both montants' faces and to the chord's underside (or b's face): 1.2453, 1.2813, 1.3266; 1.2699, 1.2145 — 9–10 mm and 19 mm over, systematically (the openings' "50 × 50 × 6" edging, likely). None springs inside the extrados | [sourced] radii; the rule [estimated] |
| Arcade chord | "749" deep, the post-spacing dimension line on its axis (PL-VII) | 0.50 | 0.749 | [sourced] |
| Extrados at the crown | the printed numbers leave 0.19 in the plane between the extrados' top and the 749 chord's underside; PL-XI Fig. 1 draws ≈0.12 vertical at x 2.7 (4 px at 1:500) | 1.17 m gap | 0.19 in the plane, filled by the solid crown plates: nothing shows through | [derived] |
| Decorative girder | posts every 3.8825 from the axis out to ±19.4125, the outer pair short ("500") from the chord up to b, leaving the end bay "3,2313" = 22.6438 − 19.4125 at the chord; "360" croisillons; its own top chord "330 × 8" under the grande poutre's bottom flange; the top corner at b rounded (PL-VII Fig. 1, PL-XI Fig. 1) | 9 posts to ±15.53, the 50.40 chord shared | 11 posts, an X a bay, the 330 chord, a fillet at b | [sourced]; the fillet's radius 1.5 [estimated] |
| Grande poutre | chords "800 × 12"; "Entre semelles 7,5309" = 7.00 × 1.07584, the node-to-node depth in the plane, so the chords' outer faces lie ON the node lines (top 0.23 under the floor, PL-XVI); posts "168" with square mid-height gussets, the end pair "500"; a "360" diagonal per bay falling toward the axis ("Corn: 90×90×10") and a "360" set the other way through the posts' mid-height gussets ("Corn: 80×80×10"); the end bay's diagonal leaves b about a third of the way down (PL-VII Fig. 1) | 0.50 chords on the node lines; 0.48 bars in an X a bay | as read | [sourced]; the end diagonal's height [estimated] |
| Two planes | "Les panneaux des arcs ne sont décorés que sur les faces extérieures 1 et 4 … Les poutres des deux arcs sont en outre contreventées en bas et en haut entre les faces 2 et 3" (PL-XI Nota). Fig. 1's side view runs "Arc décoratif, Face 1 / Face 2" along arbalétrier b and "Face 4" along arbalétrier a, "15.00" apart; Fig. 2 (coupe AB) draws the frames between faces 2 and 3 and, beyond them, the face-4 arch seen from the tower's centre with its own arcade and decorative girder ("Face 4 ornementée") | one plane | the arch, arcade, decorative girder and grande poutre twice: in the face plane, and 15.00 inboard on the a uprights, where the deck's cross girders (`platforms.ts`) now find their inner ends' support | [sourced] |
| Entretoises | ABCD between faces 2 and 3 at montants 1, AEFD at montants 8, GHIJ at the decorative girders' posts 1'–5' ("1'" at 15.5, "2'" at 7.8, "3'" on the axis on Fig. 1: posts 0, ±7.765, ±15.53), and bracing top and bottom (PL-XI Nota, Fig. 2) | none | frames of latticed cross members with light diagonals; X bracing between the GHIJ frames at the girders' top and bottom chords | [sourced] positions; members [estimated from Fig. 2] |
| 2nd floor, between the legs | at node XIX a band "3,6071" deep in the plane, a diamond lattice of "300 × 5" flats and "C. 30×30×4" under a "600" chord; above it to XVIII an X each side of a post on the axis, "600"; panel 11 "entre semelles 4,95368", chords "450 × 8", posts at 0 and ±"3,36268" — a fifth of the face's 16.8134, so the same rhythm runs on across the leg faces to c — and a diamond lattice of 80 × 80 angles (PL-VII Fig. 2; PL-I cross-hatches panels 10 and 11) | panel 11 only, four equal bays with X's [estimated] | all three | [sourced]; the band's bars ≈1.21 apart along the chord [estimated, measured] |

Measured on the cooked model (ray casts in the face planes): crown clear height 39.40; band 3.9174 outer to outer in the plane; the lower arch's inner face at x 37.095 (y 5.2; traced at 5.3), 37.037 (6.24), 36.869 (8.1), 36.420 (10.9), 35.764 (13.64) against PL-XI's traced 37.22, 37.15, 36.92, 36.42, 35.71; clear span 74.19 at the pier top; the grande poutre's chords 0.800 deep with faces at 50.400 and 57.400, in both planes; the window between the 1st floor's gallery and the 2nd floor's lintel 33.7 at the axis (PL-I 33.0; was 43.7).

### 14.2 The legs' faces (for `legs.ts`; not built by `firstFloor.ts`)

- **Panel 5** of each leg face is a lattice belt (PL-VII Fig. 1, "500 × 10" chords, §13.1). On the plate its chords' outer edges line up with the grande poutre's, whose flanges lie on the node lines; a belt with its chords' AXES on the nodes steps about 0.37 against the girder where the two meet at b.
- **"Masque placé sur le panneau 4"** (PL-VII Fig. 6): a decorative lattice screen over the whole of panel 4 of the leg face, 15.000 wide and 12.311 tall in the plane — posts, heavy X's and a top corner rounded like the decorative girder's, a "750 × 4" chord 2.746 above the panel's foot with a double lattice under it, and a "630 × 4" bottom chord. It carries the decorative girder's band across the legs, which is what makes the first floor read as one band running straight across each face. Not in the model.
- **Panels 10 and 11**: the lintel band, the X's and panel 11's belt run across the leg faces from c to c' (PL-VII Fig. 2); `legs.ts` builds them (§13.1).

### 14.3 Disagreements and open points

- **Where the radius changes.** The audit read the junction at point N, y ≈ 17.7 on PL-XI Fig. 1. Two closures place it at the parallel point instead, y 20.20: the printed 1.00 holds only there, and only there does R 44.5258 land vertical on the pedestal face (at 17.7 it lands at 36.87). The audit's own PL-XI trace agrees: below y 16 it fits the parallel-point junction to +0.013 mean, 0.14 worst, against +0.16 and 0.37 for 17.7. "Partie N" is a detail around N, not the junction's height.
- **PL-VII's drawn heights run short.** In the rabattement the band draws 3.36 at the crown for the printed 3.9173, and the grande poutre 6.36 for 7.5309: its heights draw at ≈0.85 of its horizontal scale. Readings off PL-VII take its printed numbers, never its pixel heights.
- **The pier's** height, width and base are read off a 1:200 overview [estimated]. It overlaps the pedestal's inner face by ≈0.4, as drawn, so the ground-level opening between the piers is 73.50 where the arch's own is 74.24.
- **b's face.** Everything that stops at upright b (montants 9–14, the heads beside the leg, the extrados' end, the girder's short posts and fillet) stops at its box face, 0.41 square to the member; b leans along the leg's diagonal, so that face is 0.4495 from its axis horizontally across the tower face [derived].
- **The fans** stand for the band's fan-and-scroll ornament with a rim and three spokes; the entretoises' and the bracket's member sizes are estimated.
- **Stale elsewhere**: `spec.ts`'s `ARCH` comment and `FIRST_FLOOR.arcadeOpenings` (above); §10.9/§10.10 on "the names band" and on `firstFloor.ts` carrying frieze plaques.

---

## 15. The platforms re-read: names band, landing, 3rd floor, 2nd-floor skirt (2026-09-18)

Compiled for `platforms.ts` from a proportion audit against the plates. Every reading below was re-derived on the Gallica scans: PL-XIX f96/f97 at 1:200, PL-XIII f68/f69 at 1:50, PL-XIV f76/f77, PL-XVI f84/f85, PL-VII f41, PL-I f16. Each pixel measurement is calibrated on a dimension printed on the same figure. Tags as in §0.

### 15.1 Readings

**The 1st-floor gallery level.** PL-XIX prints "Niveau de la Galerie promenade (89.90)" with "1.23". PL-XVIII prints "GALERIE (89.93)" twice [sourced]. The model keeps 89.90, z 56.40. Plate I at 1:1000 draws its own 1st-floor level line 2.9 m low on its ground-to-3rd-floor calibration (the whole-tower audit's calibration A). So its reading that "the floor sits 2 m high in the band" is the plate's scale, not a model error.

**The names band (PL-XIX Fig. 1, 80.7 px/m; calibrated on "0.50", "5.50" and "8.70").**

- The band runs **4.02 → 4.82** below the gallery floor, altitude 85.88 → 85.08, z 52.38 → 51.58 [measured]. f96 and f97 agree within 0.04. §10.6's "4.1–5.0 [estimated]" is superseded.
- There is one cartouche per console bay, between pilasters every 3.8825 [measured, 313 px]. PL-XIX's list gives 18 names a face [sourced].

**The 1st-floor skirt, top down, below the gallery floor** [measured PL-XIX Fig. 1]:

| zone | depth below the floor |
|---|---|
| cornice ("0.50") | 0–0.51 |
| cove with volute consoles (printed "1.50", drawn 1.62) | 0.51–2.17 |
| cresting | 2.17–3.61 |
| mouldings | 3.61–4.03 |
| names | 4.03–4.82 |
| mouldings, fascia, bottom band | 4.82–6.00 (83.90) |

**Its projection and lean (PL-XIII Fig. 2, "Console β, coupe transversale au milieu d'un pilier", 1:50; calibrated on "7,000" and "2,400").**

- The gutter box's outer face is "326" + 350/2 = **0.50** outside the column axis [sourced]. That is E1900-TXT's 71.69.
- The plate starts on the column axis 0.52 below the floor. It leans in **0.93** to the foot, straight: a line fits with rms 7 mm, and a circle of R 14 fits 11× worse [measured].
- Fig. 1, the corner elevation, draws **0.62** [measured].
- E1900-TXT calls the plate « de forme concave ».

**The arcade gables (PL-XIX Fig. 1; PL-XIII Fig. 26; E1900-TXT).**

- The lunette under the inner arc is « un treillis de bois »: a diamond trellis on PL-XIX, and no iron below the inner arc on PL-XIII Fig. 26 [sourced].
- The glass (yellow cabochons, silvered and tinted cast glass) is in the crescent above [sourced].
- The crescent's depth at the crown is 1.75 on PL-XIX, 1.95 on PL-XIII (the iron) and 2.00 in the text [sourced].

**The landing (PL-XVI Figs 14–15 "Plancher intermédiaire"; PL-XIX Fig. 14, 79.8 px/m on the uprights' 2 × 8.367).**

- **Side.** « **11.337** » on all four sides of PL-XVI Fig. 14 and twice on PL-XIX; the half-side is « 5.669 » [sourced]. So neither 11.237 nor 11.327, the readings the audit and this reading's first pass took.
- **Plan.** A square turned 45° with its vertices on the face centre lines [sourced drawing, ±0.1]. The corner triangles of the shaft are open. Four « Contrefiche » struts run in from the shaft's corners.
- **The well.** « Cage de la Cabine Edoux du 2ème étage à l'étage intermédiaire »: « 3.67 » along the N–S diagonal [sourced] by ≈4.2 across it [measured; PL-XVI prints a « 4.35 » nearby]. Its centre is ≈2.7 out toward pile 3's side [measured].
- **Depth (PL-XVI Fig. 15).**
  - Beams A, B, C, D and H: « 220 » under the floor, « 2.300 » deep. So the band is **2.52** deep, which is Plate I's ~2.5 m cross-hatched band.
  - Beam G (facing pile 1): « 430 », « 1.300 ».
  - E and F are lighter [sourced].

**The 3rd floor (PL-XIX Figs 3, 6, 9; PL-VII Fig. 4; PL-XIV Figs 2, 13; E1900-TXT).**

- **The floor structure.** The edge beams, « poutres de rive … de 850 mm de hauteur » [sourced; PL-XIX "850"], stand **flush** with the 16.56 glazed octagon, at most 0.07–0.14 inside it [measured].
- **The consoles.** « des consoles de 7,207 m de hauteur fixées sur les faces extérieures des arbalétriers d'angle » [sourced]. So there are **two a face** on the corner uprights, 8 in all, and none on the 2.50 bays.
  - PL-XIV Fig. 13 draws the corner upright with a console box of two webs « 500 » apart, and a second box going the perpendicular way [sourced].
  - No fascia runs between them [sourced drawings].
- **The console profile.** The webs are « découpées suivant un arc de cercle de 9,280 m de rayon » [sourced], concave outward.
  - Free circle fits: R 8.96–9.01 on PL-XIV, 9.49 on PL-VII and 11.1 on PL-XIX.
  - PL-VII's printed « R: 2,980 » fits no plate (rms 0.39–0.57) [measured].
  - The tip is flush with 16.56, 3.2 beyond the c axis. PL-VII's « 3,000 » is the strut beyond the upright's face.
  - The foot leaves the upright tangentially at 5.3–5.5 [measured].
- **18.65.** At the 3rd floor the glass, the parapet, the edge beam, the console tips and the balcony railing all stand at 16.56. Nothing on any plate is 18.65 wide: Plate I's own strokes reach 17.6–17.7 [measured]. §10.8's open point is answered this far: whatever PL-I's "côté extérieur 18m65" measured, it is not drawn. §26 answers the rest from the text: no element carries it.

**The 2nd-floor skirt (PL-XIX Figs 2, 7, f97; 78.95 px/m on the printed "10.46 | 12.71 | 10.46", 77.9 px/m vertically on "5.150").**

- **Extent.** It hangs « 5.150 » from the floor's edge down to altitude 144.08, z 110.58: node XVIII, the foot of panel 11's belt [sourced].
- **Form.** « une tôle courbée de 3 mm d'épaisseur formant corniche décorative » [sourced E1900-TXT].
- **Continuity.** It runs unbroken across each face, over the legs and the gap between them, with no consoles under it. Its ornaments stand every 3.36 (the gallery posts), and it carries no names [sourced drawing].
- **Profile.** Read from the silhouettes the perpendicular faces' skirts cut at the ends of the elevation, as depth below the floor → half-width [measured, both ends averaged]:
  - 0.2–0.6 → 18.97
  - 1.18 → 18.86
  - 1.95 → 18.35
  - 2.72 → 17.98
  - 4.06 → 17.71
  - 5.15 → 17.50

  So it curves steeply under the cornice, then runs nearly straight: 1.45 in all from the drawn cornice line.

### 15.2 What `platforms.ts` builds now

Before → after figures are measured on the cooked mesh (`buildEiffel`, legs + shaft + summit + platforms).

| item | before | after |
|---|---|---|
| names band, below the gallery floor | 1.10–1.90, 18 plaques at 70.69/18 | **4.02–4.82**, one per console bay at (k + ½) × 3.8825 |
| 1st-floor skirt's lean | 0.50 | **0.60** |
| arcade gables | solid half-ellipses | crescent + open lunette, the vault a 0.10 shell, solid over the pavilion halls |
| landing | a 16.23 square, 0.60, 263.5 m² | **diamond** 11.337 on its girders' axes, 0.22 floor, 109.9 m² net of the wells; lattice girders 2.30 deep (G 1.30) round its edge |
| 3rd floor | an 18.65 square × 0.60, overhanging the room by 1.05 | the **16.56 octagon** (10.90 sides) × **0.85**, flush (drawn 0.01 deeper, off panel 29's plate girders' underside) |
| 3rd-floor consoles | none | 8, R 9.28 |
| 3rd-floor face-on silhouette at z 269 / 272 / 274 / 275 | 10.5 (box only) | 11.03 / 12.27 / 14.40 / 16.04 |
| 2nd-floor skirt | none (the deck 0.60) | **5.15** deep, five planar strips on the profile |

- **The 1st-floor skirt's lean.** The panel is a plane mitred at the corners, so it takes one lean. At 0.60 its foot's inner face stands 34.67 from the axis at node XXIV: 0.01 off the grande poutre's bottom chord (34.66) and 0.09 clear of the legs' outer uprights (34.58) [measured on the cooked mesh]. The section's 0.93 would pass through that chord.
- **The landing's girders and wells.**
  - The girders are N-trusses of 5 panels [form and sections estimated].
  - The wells are the lower car's, 3.67 × 4.2 at 2.650 toward pile 3, and a 1.80 square for the e2 stair at 2.650 toward pile 1, where `lifts.ts` builds its helix.
- **The 3rd floor's wells.** The upper car's, as the landing's, at 2.650 toward pile 1, and the e3 stair's at 2.650 toward pile 3.
- **The consoles.**
  - Each is a box 0.50 wide in the plane of its upright's outer face.
  - Its flange is the R 9.28 arc, tangent at 5.5 and reaching 8.28 at the edge beam's underside, and it runs straight below the tangent point to the foot 7.207 down.
  - The web is a top strut, a foot tie, and horizontals and diagonals back to the upright [estimated].
  - The silhouette follows PL-XIV's R 9.28 fit. Plate I's 13.1 / 16.3 at 272 / 274 is ±1 m at 1:1000.
- **The 2nd-floor skirt.** It starts at the model's deck edge (18.815), not the drawn cornice line (18.95), and follows the measured half-widths below 1.18.
- **The cross girders** already end on the legs' inner-upright line. `firstFloor.ts`'s inner grande poutre now stands there, and each girder's inner end sits inside its top chord and posts (z 16.30–16.70 at the end, y 57.25) [measured].
- **Clashes.** Triangle against triangle, on the whole tower [measured]: the names, both skirts, the vault gables and shells touch nothing of the legs, the shaft, the girders or the lifts. The contacts that remain are joints:
  - the consoles butt on the corner uprights' outer faces at 5.25;
  - the cross girders end in the grande poutres;
  - the Edoux guide posts pass through the landing;
  - the 3rd floor is pierced by panel 29's uprights and posts and takes the ends of its top-row members, as the deck before it was.
- **Triangles.** `platforms.ts`'s own output (the platforms class without the lifts) goes from 18,324 to 33,652. About 14,000 of that is the gables' crescents and the vault shells. The names class stays at 864.

### 15.3 Disagreements and open points

- **The console radius.** PL-VII prints « R: 2,980 », against the text's 9.280 and three plates' fits. It may be a transposition of 9,280, or the radius of the webs' cut-outs. This is unresolved.
- **The 1st-floor skirt's lean.** The section gives 0.93 and the corner elevation 0.62. The model's plane takes 0.60, held off the grande poutre's chord. A warped panel (0.93 mid-face, 0.62 at the corners) is not built.
- **The 2nd-floor skirt's profile** is read off the end silhouettes, which may partly be the corner consoles' decoration rather than the plate itself (medium confidence). The text's « courbée » supports a curve.
- **The inner arc's radius.** 3.3675 is printed on PL-XIII Fig. 26; that it belongs to the inner arc is [estimated].
- **The landing.** Beams A and C and the struts are not built. Its stair wells follow `lifts.ts`'s helices (e2 and e3 at 2.650 on the N–S diagonal), not Fig. 14's drawn stair positions. In `lifts.ts`, e3 starts on the landing over the lower car's well, and e2 arrives under the upper car's berth: that is `lifts.ts`'s matter.
- **The 3rd floor's gallery floor** is 0.20 above the core's (309.83 against 309.63) [sourced PL-XIV]. The model's floor is flat at 309.63.
- **18.65** is carried by no element: the text's two descriptions of the floor close it at 16.56 (16.30), and the widest thing at the level is Eiffel's balcony at 17.60 (§26). Nothing is built at that width.
- **Stale elsewhere.**
  - §6.3 "Gallery (outer platform) 18m65" and "Brackets … over about 3.0".
  - §10.6's names position "4.1–5.0 [estimated]" and "the foot sits about 0.9 inboard".
  - §10.8 "What 18.65 measures is not clear".
  - §10.9: "the skirt as one plane leaning in 0.50", and "Not built: … the names band … the inner arcade's gable" (the gable is now built as the outer one).

## 16. The summit re-read: panel 29's rows and band, the box, the ladder cylinder (2026-09-19)

Compiled for `summit.ts` from a second proportion audit of the summit, each finding re-checked on the plates: PL-VII Fig. 4 on f41 at 78.8 px/m, axis at column 855, the 3rd floor at row 2926; PL-XIV Fig. 2 on f76 at 1:50, 318–321 px/m. Tags as in §0.

### 16.1 Readings

- **Panel 29's light horizontals.** PL-XIV prints the chain from the floor down: "250" to the top girder's top, then "2.970", "2.440", "2.670" and "2.900", which sum to 11.230 [sourced]. That puts the two light members' centrelines 3.22 and 5.66 below the floor, at 272.91 and 270.47. PL-VII draws them at 272.93 and 270.52 [measured]. The chain's 2.670 lands on the band girder's centreline at 267.80, 0.03 from the model's 267.773, which PL-VII's "3,173" fixes.
- **Panel 29's X's** run between the corners of their CLEAR panels, where the gussets sit: from post face to post face, and from the girder or light to the next. They lean 49–50 degrees on PL-XIV. An X from axis to axis would lean 43–47. The row-1 crossing is 2.01 below the floor on PL-XIV, at 274.12 [measured].
- **The band.** Each 2.50 bay holds an X from corner to corner of the clear panel, plus a diamond through the panel's side mid-points, so five crossings a bay. PL-XIV shows it with its gussets, and PL-VII draws the same [sourced drawing].
- **Bar sizes.** On PL-XIV, the flats of the X's and the band are 0.15–0.16 across, the built rising bars 0.18, and the light horizontals 0.15–0.16 [measured]. PL-VII's 1:200 double lines sit 0.08–0.09 apart.
- **The box's corner columns.** PL-VII draws each as a laced part 0.55 wide plus a plain band 0.27 inside it, 0.80–0.84 in all. The outer lines are at −5.54 and +5.45, and the inner edges at ±4.70 [measured]. PL-XIX Fig. 3 and PL-VII both give the axes 10.24–10.25 apart. The "10,00" printed inside the box runs between the two laced parts' inner lines (±4.97).
- **The box's face.** Its mesh repeats at (0.41, ±0.54) by 2D autocorrelation, over both the right panel and the left-centre one [measured]. So the diamonds are 0.825 wide and 1.09 tall, and the bars lean 53 degrees. Fitting the pattern's phase puts a diamond's centre on the axis at the box's foot, so the two families cross on the axis at 281.52 + 1.09 n [measured]. There are no posts at the 2.50 bays. On the axis the mesh stops on a strip 0.38 wide (−0.20 to +0.18, with a line down its middle) [measured].
- **The ladder cylinder.** "Cylindre en tôle avec échelle à l'intérieur" (PL-XIX Fig. 5), "700" (Fig. 13) [sourced]. PL-VII draws it 0.72 wide on the axis in the dome's opening, from the box's top to the lantern terrace [measured].
- **The balcony railing** stands on the glass line: the rail post continues the mullion (PL-XIV Fig. 2), and PL-VII ends the rail at ±8.2–8.3. The deck overhangs it by 0.45–0.6.

### 16.2 What `summit.ts` builds now

Before → after figures are measured on the cooked mesh at default detail.

| item | before | after |
|---|---|---|
| light horizontals (centrelines) | 270.759, 273.444: 8.057 in even thirds, counted into the 0.85 floor | **270.47, 272.91** |
| X rows, clear between members | 2.64 / 2.58 / 1.79 (the top one into the floor) | 2.32 / 2.28 / 2.29 |
| X crossings | 269.42 / 272.10 / 274.79 | 269.23 / 271.69 / **274.14** |
| X lean | 47 degrees, axis to axis | 49 degrees, clear corner to corner |
| band | a doubled X, bars 0.24 apart | **X + diamond**, clear corner to corner |
| flat bars / light horizontals | 0.09 / 0.10 | **0.15 / 0.16** |
| box corner columns | 0.55 at ±5.257 (inner 4.98) | **0.83** at ±5.12 (inner 4.705, outer 5.535) |
| box face posts | 3 a face, 0.20 | **1**, on the axis, 0.38 |
| box mesh | 0.75 apart, 58 degrees, no set phase (its bars on the plate's: darkness 57 against the panel's mean 56) | **0.825, 53 degrees**, symmetric about the axis, in phase (darkness 96) |
| ladder cylinder | none | **Ø0.70**, 16 sides, 280.98–293.215 |
| balcony railing | ±8.81, at the deck edge | **±8.31**, on the glass line |

The rivets stay on steel. Every summit set is within 0.05 mm of the skin of the member it fastens (axis·n ≥ 0.999). No head is inside a corner column, a panel-29 post or a plate girder, and no two heads within a set come closer than 38 mm [measured]. Panel 29's bar ends take 8 rivets a bar, as before: 1536 on the web and 256 on the lights.

### 16.3 Disagreements and open points

- **Bar width.** PL-XIV (1:50) is taken over PL-VII (1:200). PL-VII's double lines are about half as far apart as the detail plate's flats are wide.
- **The strip on the box's axis.** The audit read it as the cylinder behind the face. It is built as a face post instead: it is 0.38 wide against the cylinder's 0.72 just above the box, and the mesh stops on it.
- **The corner column's plain band** may be a separate flat on the face rather than part of the column. It is built as one 0.83 member.
- **The cylinder** starts on the apartment's roof: nothing below it shows, since the apartment is built solid. Its "Escalier du campanile" and the four contrefiches are still not built.
- **Superseded.**
  - §12.3's panel-29 bullets ("three even X rows", "flat bars 0.09; paired bars in the band") and its box bullets ("0.55 square at ±5.257", "Posts at the bays").
  - §12.4's "Panel 29's rows" and "The box" (column axes at 10.515).

## 17. The arch's foot and its bracket re-read (2026-09-19)

Compiled for `firstFloor.ts` from a re-audit of the lower arch. Each reading was taken twice, the second time blind, on the Gallica scans: PL-XI f56 (1:500, 31.75 px/m; z counted down from the crown's 39.40), PL-VII f40 (1:200, about 80 px/m across; its heights are used only as ratios) and PL-I f16 (1:1000, 15.95 px/m on "74m238"). This section supersedes §14.1's "Pier and foot" and "Bracket" rows and §14.3's "The pier's" bullet. Tags as in §0.

### 17.1 Readings

| Element | Plate reads | Was | Now | Tag |
|---|---|---|---|---|
| The member's end | PL-XI: runs vertical to z 2.83–2.99, nothing drawn below. PL-VII: 0.24–0.26 of the pedestal's drawn height under its top (top 7158–7173 px, end 7277.5, pier's foot ≈7614). PL-I: 0.2–0.3 (0.18–0.32 over both feet) | stopped at 5.10, 1.10 above the 4.00 pedestal, on the pier's top | runs straight down the plane from 3.90, where R 44.5258 turns vertical, and its highest corner stops at 2.95 on the collar's top. The seam rows stop above the collar | [estimated] |
| The pier | PL-VII, from row profiles at 80 px/m: collar 0.88–0.90 round the 0.60 member; capital 1.59–1.61; rusticated shaft 1.45–1.50; base 1.93. Collar, capital and shaft are centred on the member to 0.03. The base is flush with the shaft on the pedestal's side and flares 0.43 toward the opening, and the same holds at both feet on PL-I. PL-I: capital ≈1.9 over a narrower shaft (±0.2, the line) | a 1.3 square box from the ground to 5.10 | base 1.93 to 0.75, 0.215 inboard of the axis; shaft 1.50 to 2.20; capital 1.60 to 2.75; collar 0.90 to 2.95. Upright under the member's end, x 37.419 | [estimated]; the base's flare [sourced drawing] |
| The bracket | PL-XI: ties at z 12.0–12.1, 11.0 and 8.5–8.57. An X in the short box between the first two and an X between the second and third. A strut from b at the third tie down to the arch at 5.9–6.1. PL-VII draws the same ("Corn: 80×80×8", "C: 80×80×8"), its second tie a third of the way down | ties 11.9 and 9.4 with one X between them, strut to 7.1 | ties 11.9 (panel 1's mid horizontal), 11.0 and 8.55, with two X's, strut to 6.0 | [sourced] drawing; heights [estimated] |
| The pedestal's inner face (`platforms.ts`) | PL-VII: the soubassement's edge, measured from the pier's axis, is 2.9–3.0 out at its top, 1.8–2.3 across the capital, and 0.7 at the foot, where it runs into the pier's base. PL-I: 2.3–2.8 at the top, 1.0–1.3 near the ground. The pier stands in front of the masonry, not in it | a plain box face at 37.119 | unchanged | [sourced] drawing; metres [estimated] |

Measured on the cooked model: the member's inner face 37.119 from 2.98 to 3.9; the pier centred on x 37.419 and z 57.978 (outer plane), in both planes and at both feet; every arch rivet within 0.005 mm of its own member, none inside a pier, the lowest at 2.984.

### 17.2 Disagreements and open points

- **The pedestal, for `platforms.ts`.** The plates' 74.238 ticks fall on the arch's feet: the member's inner faces, which the R 44.5258 closure puts at 37.1188. The masonry recedes from there, so its inner face is ≈38.1–38.2 from the axis at the ground (it meets the shaft's outer face, 38.169), ≈39.2–39.7 at the capital, and ≈39.7–40.4 at the top. The model's box face at 37.119 has three effects:
  - it buries the pier's outer half and the member's foot between 2.95 and 4.00;
  - the member's inner face lies 0.2 mm from the box face, so the two z-fight;
  - in a face-on elevation the box's front face hides both.
  A face battered or stepped over those numbers frees them. Nothing in `firstFloor.ts` needs to change when it moves.
- **The pedestal's height.** PL-I draws its top 5.1–5.3 above the local ground; the model keeps WP-FR's 4 m. The end is placed on the ratio PL-VII and PL-I draw and on PL-XI's absolute height; on a 4 m pedestal they agree at 2.8–3.05. A 5 m pedestal would put the ratios at ≈3.8, which is PL-I's own absolute reading, against PL-XI's 2.8–3.0. That is unresolved.
- **Naming.** PL-XI Fig. 1 labels the upright beside the lower arch "Arbalétrier c" on Pile N° 1. PL-VII Fig. 1 labels the same member "ARBALÉTRIER b". Geometrically it is the side corner in the face plane nearest the opening, which §0 calls b, so this is a lettering difference, not a change of position. The bracket is built to that axis, as before.
- **Stale elsewhere**: `spec.ts`'s `ARCH` comment calls x 37.1188 "the pedestal's inner face". It is the arch's own foot.

---

## 18. The platforms' residuals: the void, the step, the skirts' ornament, the pedestals, and why the floors read black (2026-09-19)

Compiled for `platforms.ts` from a re-audit of the 1st floor against Plate I and the 1889 photograph. Each change below was first confirmed on the Gallica scans: PL-XVIII f93 (1:250, 62.6 px/m on "70.69"), PL-XVI f84/f85, PL-XIX f96/f97 (1:200, 80.8 px/m), PL-XXIX f152/f153 (1:100, 1:40), PL-VII f40, PL-I f16. Tags as in §0.

### 18.1 Readings

| Element | Plate reads | Was | Now | Tag |
|---|---|---|---|---|
| Central void | PL-XVIII traced by colour: straight edges 14.52–14.83 from the axis; 45° cuts on \|x\|+\|z\| 23.7–24.1 on all eight; a bowed « Balcon » per face, apex 13.08–13.31, leaving the straight edge at ±7.0–7.3. PL-XVI Fig. 9: « Balcon » triangles between the inner girders on the same cut; « Consoles du balcon int. » on 15.53, « 3.00 » in from the inner girder (16.35). E1900-TXT: « 29,00 m » with cut corners | a 28.245 square | edges 14.50, cuts at 24.0, a circular bow (R 23.1) from ±7.2 to its apex 13.35. 4,251 m² against the printed 4,200 | [sourced] 14.50, 13.35; [measured] 24.0, ±7.2 |
| Void railing | — | on the square | along the edge, 0.09 onto the deck | [estimated] |
| Balcony consoles | PL-XVI 1:100 « Console des balcons intérieurs »: top 0.230 under the floor, « 590 » deep at the tip, foot « 3.730 » under the floor on the leaning inner girder, the flange concave | nothing under a 1.9–2.2 overhang | on the girder's posts at 0, ±3.8825, ±7.765, tips 0.10 inside the edge; the cut corner's edge girder from post 7.765 to post 7.765 | [sourced] depths; stations beyond ±3.88 and the web [estimated] |
| Gallery-to-deck step | PL-XIII Fig. 2 « Axe de la poutre » 2.600 inside the column axis | a 0.63 open slot, all four faces | the edge girder closes 56.40 → 57.03, 0.30 thick. Below the gallery floor the legs' outer uprights come within 0.2 of its line, so it stops there | [derived] |
| Terrace balustrade | PL-XXIX Figs 15–17: 0.90, its axis 1.524 in front of the restaurant posts, posts 0.10 every 0.7765, a rail at 0.43 | none | along each pavilion's outer bays; the centre bay's paired flights (PL-XVIII « Entrée ») are not built | [sourced] |
| 1st-floor skirt ornament | PL-XIX Fig. 1: volute consoles « 1.50 » under every column position; diamond-lattice cresting 2.17–3.61; mouldings 3.61–4.03, 4.82–4.95, 5.62–6.00; pilasters between the names, each cartouche ≈3.28 | a bare plate | 19 consoles a face (quarter-ellipse, 0.40 past the column axis, 0.60–2.10 under the gallery floor), 4 lattice panels and diamonds a bay, pilasters 0.40, three mouldings, the two round the names stopping on the plaques' edges (4.02, 4.82, 0.01 inside the reading); name plaques 3.2825 (gap 0.60) | [sourced] zones; sections [estimated] |
| Gables | PL-XIX, PL-XIII Fig. 26, E1900-TXT: the crescent glazed between rays; a wooden trellis in the lunette with three rays from the middle column | a solid crescent, an empty lunette | outer and inner ribs and 11 rays, glass left out; laths on both diagonals 0.40 apart and the three rays | [sourced] drawing; sizes [estimated] |
| Pavilion façade and tympana | PL-XXIX Fig. 3 (1:100, 162.7 px/m on "4.61"): per bay pier 0.85, door 2.60, pier 0.86, door 2.60, pier 0.85; doors from the floor, heads springing 2.43, rising 1.12; glazed tympana on a post and rays. PL-XXIX Fig. 1 (« pendant l'Exposition de 1889 ») glazes the void-side tympana too; PL-XXX Fig. 1 boards the Bar's | a solid block under a solid vault | the hall as walls, the façade as piers and door heads, the vault a shell with a glazed tympanum at either end | [sourced] widths; heights [measured] |
| 2nd-floor skirt | PL-XIX Fig. 2: a leaf console on every gallery post (3.36268), ribs, panels divided in four, a bottom band | a bare curved plate | ribs 0.30, consoles to 1.60 below the floor, three muntins a bay, rails 1.18–1.30 and 4.85–5.15 | [sourced] rhythm; sizes [estimated] |
| 2nd-floor masts | PL-XIX Fig. 2 (78 px/m): a mast on every outer gallery post, tops 7.8 above the floor; PL-I the same row | none | 12 a face, 3.62 → 7.80 | [measured] |
| Pedestals' inner faces | PL-VII: the soubassement's edge 2.9–3.0 out from the pier's axis at its top, 1.6 a third of the way up, ≈1.0 at the foot; re-read blind (79.7 px/m on "15.000"): 2.90 at the top, 2.31 at the capital's head, 1.79 at its foot, 1.11 where it meets the base, the base flush with the shaft (0.74). PL-I 2.3–2.8 and 1.0–1.3 (re-read: 39.9 at the top, 38.7 at the ground; blind: 3.05 ± 0.4 and 1.6 ± 0.25, the two pedestals drawn unevenly); both draw an ogee under a cornice | upright at 37.119, burying the arch's foot and pier | battered, 38.17 at the ground (flush with the pier's shaft, 37.419 + 0.75) to 40.30 at the top, both inner faces: within 0.1 of PL-VII's four stations, 0.35 of its round moulding halfway up | [measured]; the plane for the ogee [estimated] |
| Stairs through the floors (`lifts.ts`, §20) | PL-XIX Fig. 14: « Escalier de l'étage intermédiaire au 2e étage », an opening « 2.62 » × « 2.45 » against the edge girder facing pile 4 (re-read: drawn 2.49 × 2.30, against the girder); Fig. 9: the helix at (1.36, 1.29) (re-read at (1.36, 1.37), 78.7 px/m on the octagon's walls) | the landing's well for e2 on the N–S diagonal under the upper car, the 3rd floor's for e3 at (2.65, 0); no openings in the 1st and 2nd decks | the landing open at s −2.73…−0.11, t 3.22…5.67 (the « 2.45 » from the girder's axis, the floor's edge); the 3rd floor's well 1.80 square on (1.36, 1.29); the 2nd deck open for e1's last flight in every leg (t 15.95…17.16, s ±0.40) and the 1st deck for the ground stair's arrival in piles 4 and 2 (s 2.02…3.18, t 28.24…30.66) | [sourced] landing opening; the other three [derived] from the cooked stairs, 0.05 clear |

Measured on the cooked model (ray casts and triangle tests on `buildEiffel`, plain and laced): the void's edge 13.35 at the face's middle, 14.50 from ±7.2 to ±9.5, |x| + |z| = 24.00 on the diagonals; the step closed at 32.75 between 56.40 and 57.03; the terrace balustrade's top 58.53; the skirt's consoles out to 35.74, its foot 50.40; the crest over the axis 66.50, 10.10 above the gallery floor; the 2nd floor's masts to 123.53, 7.80 above its floor; the pedestal's inner face 38.17, 39.63 and 40.27 at 0.05, 2.75 and 3.95. No stair or lift car passes through a deck: every `lifts.ts` triangle tested against every slab (1st deck, gallery ring, 2nd deck, landing, 3rd floor), to 1 mm, gives none, where the same build without the openings gives 576 (e1 through the 2nd deck in all four legs, the ground stair through the 1st in two, e2 through the landing, e3's upper helix and its rail through the 3rd floor). The newels of e2 and e3 stand on their floors, touching them. No part this section adds crosses or sits inside the legs, the arches, their piers, the girders or the lifts. The crossings left are the ones the model already had (the decks and the cross girders where the legs and the girders they meet pass through them), plus the deck's seams on the diagonals, inside the slab, which the legs' inner uprights pass through. The pedestals cross nothing (the previous box, as the control: 288 crossings with the arches and 512 with the piers). Every face `platforms.ts` writes to the platforms class has a unit, flat, outward normal. Triangles: the platforms' own 33,652 → 102,512 (the arcade with its gables and trellis 51,744 of them, the two skirts' relief 23,776), the pedestals 48 → 288.

### 18.2 Disagreements and open points

- **Plate I's 1st-floor band is not wrong in the model.** The whole-tower audit read the skirt 7.6 below the floor line against Plate I's 6.3, and the band's top 8.9 above it against 10.5. Plate I's « Plancher du 1er Étage (91.13) » line meets its own drawing at the gallery's floor, not 1.23 above it: from that drawn floor Plate I puts the crowns 8.5–8.9 above (PL-XIX 8.70), the skirt's foot 5.7–5.9 below (PL-XIX 6.00) and its urns 10.6–11.0 above (PL-XIX's palmettes 10.14, the model's 10.10). Both chains to 83.90 are printed (§10.6), so the skirt's depth stays; the lean stays 0.60, inside the plates' 0.46–0.96 and held off the grande poutre's chord. Re-read for the check (f16, 15.9 px/m, ±0.4 for the line's weight): the dashed line ends on the balustrade's foot; from there the crowns 8.8, the skirt's foot 5.85, the urns 10.9 and the masts 15.1, where PL-XIX, at five times the scale, gives the palmettes 10.14 and the masts 12.16. The model keeps PL-XIX's.
- **The 1889 photograph shows neither the 2nd floor's roofed gallery nor its masts**, where it shows the 1st floor's masts plainly. The plates are of 1900; the model follows them, as it already did for the gallery.
- **The black floors were normals, not colour.** The platforms class also holds `lifts.ts`'s rail skin, which carries normals; the class merge filled every other part's missing `normal` with zero (139,800 of the class's 152,652 points before this change), and the page shades a zero normal black. `platforms.ts` now writes flat normals for all its parts; the lift cars and stairs (73,800 points) still have none. The girders (13,752), arches (25,632), summit (312) and horizontals (192) classes have zero normals by the same mechanism.
- **`spec.ts`'s `PEDESTAL.inner` (37.119)** is now the arch's foot, not the masonry's face, and nothing reads it; `platforms.ts` builds the batter from its own `PEDESTAL_BATTER`. `PEDESTAL` should become `{ outer: 62.453, height: 4, innerFoot: 38.17, innerTop: 40.3 }`, its comment saying that the chain's 74.238 ticks are the arch's feet (`ARCH.footX`), not the masonry, and that the pedestal is no longer 25 m square (24.28 at the ground, 22.15 at the top); `platforms.ts` would then read those two instead of its own. `ARCH`'s "the pedestal's inner face" at 37.1188 (§17.2) is the same slip.
- **The balcony consoles' top bar is hidden.** It stands at the girder's top, 0.23 under the floor [sourced], inside the model's 0.60 deck [estimated]; only the tip's lower 0.22, the flange and the web show.
- **A blind re-read of the plates** (no model or notes to hand) agrees with the rows above but for four points, none changed:
  - PL-XVIII's void edges at 14.67 ± 0.10, where the model keeps E1900-TXT's 29.00 square (14.50). Its bow is 1.4 deep, not 1.15, and meets the straight edge at an angle, where the model's circle is tangent there.
  - PL-XIX's cartouches 3.42 between the pilasters' shafts (0.46), where the model's plaques are 3.2825, the reading to the pilasters' bases.
  - PL-XIX Fig. 2's masts, 15 a face: the nine at 3.36 from the middle, then three at each end, on posts 2.01 and 1.21 in from the corner post and on the corner post itself. The model has 12 a face, on the gallery's posts every 3.36268 and the corner. Their tops 7.72 (model 7.80).
  - The landing's opening as drawn is 2.49 × 2.30, smaller than its printed 2.62 × 2.45. The model builds the printed size.
- **The landing's opening is 0.08 wider than the lifts unit's reading.** §20 reads t 3.40…5.85 (2.45 back from the girder's far edge) and asks for 3.30…5.85. The model takes the printed 2.45 in from the girder's axis, where its floor stops: 3.22. e2's last riser meets the floor at t 3.31, so 3.30 would clear it by 0.01.
- **The Edoux guides still pass through the landing and the 3rd floor**, with no wells, as before this section: those are posts, not stairs, and no plate read shows the floor cut round them.

## 19. Legs and shaft: the residual proportions — panel 11's belt, the 500s' lacing, plan bracing, the belts, the Masque (2026-09-19)

Compiled for `legs.ts`, `shaft.ts`, `strut.ts`, `lattice.ts` and `spec.ts` from a fresh re-audit of the legs and shaft (its sections A–H). Every finding was re-read on the Gallica scans before a number changed: PL-VII f40/f41 (1:200; 78.2–78.4 px/m in Figs 2–3, 78.7–79.7 at Figs 1 and 6, ≈83 at Fig. 5 and the panel-5 detail, where the scan is not at one scale), PL-VIII f44/f45 (Figs 1–7 at 1:500, Figs 8, 16, 17 and 24 at 1:200, Figs 13–15 and 18–22 at 1:1000). Where this section and the audit disagree, it says so. Tags as in §0.

### 19.1 Readings

| Member | Plate reads | Was | Now | Tag |
|---|---|---|---|---|
| Panel 11's chords | "450 × 8" printed on both (PL-VII Fig. 2), drawn 0.45–0.49 and solid; the bottom band's lower edge on the XVIII line, the top band's upper edge on XVII's | the 0.80 laced node horizontals centred on XVIII and XVII (1.6–1.8× the plate) | plates 0.45 × 0.008, axes 0.225 in the plane inside the node lines (y 110.821 and 115.279); no leg horizontal at XVIII or XVII; panel 10's post now stops on XVIII's line | [sourced] |
| Panel 11's posts | "3,36268" printed twice between posts; three to a leg face; drawn square to the chords (their ends differ by the scan's tilt only) | two a face at thirds, leaning with the uprights (pitch 3.49) | three at 6.725, 10.088 and 13.451 from the tower's axis (2, 3, 4 × 3.36268), on all four faces, each clipped 0.485 short of the uprights' axes (the one nearest b starts 0.18 above the chord) | [sourced] pitch; the count and grid [measured] |
| Panel 11's lattice | two systems: an X from a post's foot to the next post's top in every bay, AND the diamond from mid-bay through the posts' mid-heights; bars every half pitch, "C. 80 × 80 × 8", "53°49′43″" at one | the diamond only | both: bars every 1.681 each spanning one pitch from one chord's axis to the other's, the rivet lines they are drawn to (53.5°, against the printed 53°49′43″); at mid-depth they cross at every post and every bay centre | [sourced] pattern |
| Lacing of the legs' 500 diagonals, panels 12–17 | the X-centre spacing along straightened strips and by autocorrelation along both arms of both diagonals of a leg face (PL-VII Figs 2–3): panel 12 51–56 px, **0.69**; 13 72–84 px, **1.01**; 14 75–80, **0.98**; 15 63–66, **0.82**; 16 72–76, **0.96**; 17 66–77, **0.91** (its falling diagonal 75–77, its rising 66–68: the draftsman laced the two differently) | 0.68 in every 500 (the shaft's step) | per panel, read once per member at its mean height (`LEG_LACING_500`; `WebOpts.lacingBands`). The shaft's 500s (0.68), the 800s (1.00), the 600s (0.94) and the gap X's (0.68) are unchanged | [estimated, measured] |
| Plan bracing ("contreventements") | PL-VIII Fig. 13 ("entre les panneaux 12-13 et 13-14": XVI, XV), Fig. 14 (XIV), Fig. 15 (XIII; the Nota: XII alike), Fig. 18 (XI; X alike), Fig. 19 (VIII, VII), Fig. 20 (VI), Fig. 21 (V, IV, III, II), Fig. 22 (I and under the 3rd floor), and IX drawn with its girders A, C, H in Fig. 17's elevation. Up to XII: four long girders, each from b (d) on one face to d (b) on the next, crossing in a diamond just inside the face centres; four across the legs' corners, each leg's own b to d; A along a diagonal inside the diamond, H′ from its middle to a side. XI–II: the diamond on the bd's, A across it. I and top28: A and three short members. The girders are drawn about as deep as the 600 face horizontals ("599,3", Fig. 17). "Poutres B, C, D, E, F: une corn. haut et bas et un treillis /\ avec cornières" | nothing inside the legs above XVII or inside the shaft but the lifts and stairs | 9 girders a node at XVI–XII, 5 at XI–II, A alone at I and top28 (17 nodes, 97 girders): flat Warren trusses in vertical planes, chords 0.60 apart centred on the node, 0.09 chords and 0.06 web bars; A along x = z, between the Edoux cars. Each stops 0.05 short of the Edoux (`EDOUX_PLAN`, the lift's own numbers from `lifts.ts`): A frames into the central guide post from both sides at every node, the diamond into the outboard guide posts at VII and VI and into the NORD cylinder at V, and at IV–II the NORD side of the diamond ends free either side of the upper car's run (122 stretches) | pattern [sourced]; depth and sections [estimated]; the openings [derived from lifts.ts] |
| Entretoise diagonale | PL-VIII Fig. 1 "Plan de l'entretoise diagonale des panneaux 1, 2, 3": a lattice girder from d to b, "21.2132", "600" either side, its section an N; Fig. 8: "715.6" deep, at the tops of panels 1, 2 and 3 (XXVII, XXVI, XXV), and again at XXII and XXI, whose widths it prints ("14.100", "13.150") | none | at XXVII, XXVI, XXV, XXII and XXI in every leg: 0.60 laced struts laced as the 600s (0.94), sections squared to the vertical plane through them, joints solved against the box's corner (r √2), since they meet b and d along the leg's diagonal; 19.940 and 18.597 axis to axis at XXII and XXI. At XXVII–XXV the leg's lift runs through the girder's middle, so there it is two, each 8.857 from b or d to 1.75 short of the leg's diagonal, ending free (no plate, no joint rivets there; `JointOpts.endFlags`) | [sourced]; the opening [derived from lifts.ts] |
| Base tie A's bottom chord | "2,987": its upper arrow on the XXVIII dash-dot line, 16 px under the top chord's top edge; "3,387" from that top edge, 0.40 above XXVIII (PL-VII Fig. 1) | 3.187 below XXVIII in the plane (y 3.553) | **2.987** (y 3.731) | [sourced] |
| Base tie B's bottom chord | "2.000" from the same top edge, "2,765" from the chord to the support line (PL-VII Fig. 5): 2.765 / 1.1182 over y 2.50 | 2.000 below XXVIII (y 4.613, 0.36 low) | **1.600** (y 4.970) [derived: 2.000 − 0.40] | [sourced] + [derived] |
| The ties' lattice | X-braced, not Warren: in every bay a steep bar (≈62°) crosses a shallow one (≈36°); the joints of both chords fall on one pitch from the central post's line at each chord's height (A: 240 px at 78.7 px/m, 3.05; B: 164–171 px at 83, 2.0), so the X's are regular in the face's parallelogram and read skewed | Warren, four V's at 3.75, no crossings | an X in every bay from the face's centre line and in the short end bays against the uprights; the stations are fractions of the face, so they lean with the leg: A six bays a face (60° and 34° in the full bays), B eight. A also has a bar up every joint parallel to the uprights, which with the steep diagonals makes the V's it is drawn with; B's steep bars are all parallel, as drawn | [sourced] pattern; pitches [measured] |
| Panel 5's posts | four a face, 324 px apart at ≈83 px/m (3.90), end bays ≈1.7, square to the chords: the grande poutre's 3.8825 from the tower's axis | five bays of 3.000, leaning 20° with the uprights | at 19.413, 23.295, 27.177, 31.060 (5–8 × 3.8825), square to the chords; bars spanning two pitches from chord axis to chord axis through the posts' mid-heights, 42.2° (drawn ≈42°) | [sourced] 3.8825; the positions [measured] |
| Panel 5's chords | "500 × 10", drawn solid 0.50–0.58 (PL-VII Fig. 1) | 0.50 laced struts (§13.3's "0.80" was wrong) | plates 0.50 × 0.010 on the same axes, 0.25 inside XXIV and XXIII | [sourced] |
| Panel 10's band | "300 × 5" flats (drawn 0.24–0.30); a row across the band autocorrelates at 127 px at 79.7 px/m, the same at six heights: 1.59 per family; V's at both chords | 0.10 square bars, twelve stations a face (0.94) | flats 0.30 × 0.005 every 1.59 from the tower's axis, each spanning two pitches from the XIX horizontal's axis to the band chord's (48°; an independent reading draws them at 49–51° and 126–128 px apart, 1.61–1.63 at 78.4 px/m, 1.59–1.61 at the 79.4–79.7 the panel-11 posts give there), one family 5 mm either side of the face plane | [sourced] section; pitch [measured] |
| The Masque's posts and lower bars | posts 35–38 px between their outer outlines at 79.7 px/m, 0.44–0.47, drawn as two strips; the lower lattice's bars 24–26 px, 0.30–0.32, as heavy as the upper | 0.32; 0.20 | **0.45**; **0.31** | [estimated] |
| The Masque, rendered black | — | the girders class merges the Masque's boxes, which had no `normal`, with swept members that carry one; `mergePrimitives` fills an attribute an input lacks with its default, so all of the Masque's points had (0, 0, 0), and `toBufferGeometry` uses `normal` whenever the geometry has one | `flatBars` writes each box's own face normal (meshPrimitive lays a box out in blocks of four points, +x −x +y −y +z −z), turned by its copy's `rot`; every flat bar and plate the legs build now has unit normals agreeing with its triangles' winding | [derived] |

### 19.2 Measured on the cooked model

On `buildLegs` + `buildShaft` (rivets, laced) and on the whole tower (plain): no leg horizontal at XVIII or XVII; 32 panel-11 plates at y 110.821 and 115.279, 0.450 × 0.008; three posts a face at 2.000, 3.000, 4.000 pitches, each constant in x; the bars crossing mid-depth at 6.725, 8.407, 10.088, 11.769, 13.451, 15.132 (two at each); lacing steps 0.690, 1.010, 0.980, 0.820, 0.960, 0.910 in panels 12–17 (sixteen struts each), 1.000 below XIX, 0.680 in the shaft and the gap X's; plan-bracing stretches 10 at XVI–XII, 6 at XI–VIII, 8 at VII and VI, 7 at V–II, 2 at I and top28 (244 chords, 2,214 web bars), sampled every 2 cm clear of every Edoux post, column and car run (a control rectangle on A's line is reported); 32 entretoise members, the leg cars slid along their tracks through 16 car boxes crossing none of them (before the opening: all twelve at XXVII–XXV, ±1.86–1.91 across the diagonal), plates only at the 40 joined ends; tie A's bottom chord y 3.731 (2.987 in the plane), B's 4.970 (1.600); panel 5's posts at 5.000–8.000 × 3.8825, plates 0.500 × 0.010 with axes 0.250 inside the node lines; panel 10's flats 0.300 × 0.005 starting every 1.59 on the chord, from XIX's axis; panel 11's bars at 53.5°, panel 5's at 42.2°; the Masque's posts 0.450, lower bars 0.310. Rivets (the fixA verifier, entretoises added): every rivet within 0.038 mm of the steel it fastens, none inside an upright's box (the entretoises' lacing rivets 56.7 mm clear, their joint rivets 112 mm), every joint rivet over a chord. The girders class's zero-normal points 13,752 → 7,032: the 6,720 that went are exactly the Masque's, and the rest are `lifts.ts`'s tracks and guides. Triangles on the plain tower: the plan bracing 39,328 (chords 3,904, web 35,424), the entretoises 512, the chord plates 384 a belt, panel 10's flats 3,072, the belts' bars and posts 13,568. Sampled every 0.05 m against every lift block, none of the new members runs through a track, car or stair; the Edoux guides are in 19.3.

### 19.3 Disagreements and open points

- **The audit's lacing steps for panels 16 and 17 (0.84, 0.79) were not reproduced.** Both diagonals of a leg face were read in each panel; panel 16 gives 0.94–0.97 and panel 17 0.85 (rising) and 0.98 (falling), averaged 0.91. Panels 13–15 agree with the audit within 4%, panel 14 at 0.98 against its 0.95. The step does not lengthen steadily downward: panel 12 is laced at the shaft's 0.69. An independent re-reading (matched filter on straightened strips, 78.4 px/m) gives 1.01 / 0.96 (panel 14), 1.05 / 0.98 (13), 0.67 / 0.68 (12), 0.83 / 0.80 (15), 1.02 / 0.94 (16), 0.99 / 0.87 and 1.02 / 0.81 (17, both faces), the shaft's 19 0.68 / 0.71: the same table within 0.02 averaged per panel (16 at 0.98). The two diagonals of a panel differ by 4–20%, the one falling to the right always the longer, on both faces: the draftsman's, not the design's, which is why the model takes their mean.
- **The plan bracing and the Edoux lift.** A runs along x = z, between the two cars (which run on x = −z), and would pass through the "890 × 600" central guide post at every node; it stops at the post's faces instead, framing into it from both sides. PL-VIII Fig. 21 draws the heavy girders on the car line (E–D, H) as stubs from the corners that stop short of the middle, as the car's run needs, and A with a joint mark at the centre. The diamond's sides stop at the outboard guide posts (VII, VI) and the NORD cylinder (V). At IV, III and II the plate's diamond stands 4.41, 4.17 and 3.95 from the axis along the N–S diagonal, inside the run of the model's upper car (to 4.435: 3.57 along the diagonal on axes 2.65), so there its NORD side ends free 0.05 either side of the run. Fig. 21 draws that side whole, so either the car or its axis in `lifts.ts` is too large or too far out by about 0.1–0.5 m there, or the side was carried round the car in a way the 1:1000 plan does not show.
- **The entretoises and the leg lifts.** PL-VIII Fig. 1 draws the entretoise whole from d to b; PL-XX, the section along the tower's diagonal, projects it onto the b/d line, where it cannot show whether the girder was opened for the car. The model's Otis and Roux cars (`lifts.ts`), slid along their tracks, sweep the leg's diagonal out past its centre at XXVII–XXV, ±1.56–1.61 across it, so there the entretoise is two halves ending free 1.75 either side [estimated]. At XXII and XXI the runs stay clear and it is whole.
- **Not built:** H′, H and K (they would cross the Edoux cars' run as the model places it), the corner struts Fig. 13 draws from each c toward the diamond, the paired girders (B and C) Figs 14–15 draw as double lines, and the three short members of Fig. 22. The entretoises' 0.7156 depth and N section are drawn as 0.60 square laced struts.
- **Tie A's top chord** is a plain chord (200 × 8 with 80 × 80 × 10 angles), about 0.2 deep, its top edge 0.40 above XXVIII; the model keeps the 0.80 laced XXVIII horizontal as the ties' top chord, whose top edge lands there too.
- **The belts' bars** stay 0.10 squares (80 × 80 angles, drawn 0.16–0.19 at 1:200 on panels 5 and 11); panel 5's square gussets at the posts' mid-heights and panel 10's 30 × 30 × 4 angles are not built.
- **The gap X's lacing** (panels 12–16) was not re-read and stays at the shaft's 0.68.
- **Zero normals elsewhere.** The same merge still blackens `lifts.ts`'s boxes in the girders class (7,032 points), and 25,632 points in arches, 312 in summit and 192 in horizontals, none of them from the legs or shaft.

## 20. The lifts and stairs: residual proportions (2026-09-19)

Compiled for `lifts.ts` from the re1 audit (§I of its report), each finding re-read on the plates. Shaft frame (s, t): s toward pile 3 Sud, t toward pile 4 Ouest; the plans' u = s, v = −t. Tags as in §0.

### 20.1 Readings

- **e3 on the landing.** PL-XIX Fig. 14 (f96, 1:200, 81.3 px/m on its printed 11.337) puts e3's newel at (s 3.0, t 3.3), beside the lower car's « Cage … 3.67 » and 0.36 clear of it [measured; re-read on the full scan, within 0.03]. PL-XX Fig. 2 draws it over the car only because the section projects onto the N–S diagonal.
- **e3's course.** « 314 marches sur une hauteur de 54m88 » to « l'escalier de raccord (Panneau 26-27) », « 13 marches », « 2.327 » [sourced PL-XX Figs 1-2]. PL-XX Fig. 1 draws the upper helix at u ≈ 1.3, and the 3rd floor's plan (PL-XIX Fig. 9, 79 px/m on its 16.560) has a helix at (1.36, 1.29) [measured].
- **e2.** At (−2.8, 1.3) on PL-XIX Figs 7 and 14 and PL-XXI [measured]. Its helix stops at (225.60), and « 16 marches 2.92 » and « 5 marches 0.91 » follow [sourced PL-XX Fig. 2]. The first of these is drawn end-on, so it runs across the car line. The landing has no well under the upper car. It is open at s −2.73…−0.11, t 3.40…5.85 (« 2.62 » × « 2.45 »), labelled « Escalier de l'étage intermédiaire au 2e étage » [sourced; measured].
- **Roux** (PL-XXIII Fig. 4, 309.8 px/m on « 4.080 »). The running wheels Ro are 3.57 apart axis to axis. The upper cabin is 3.27 across and about 2.1 from floor to roof [measured]. Fig. 11's plan reads the rails 3.70 [measured].
- **Otis car** (PL-XXII ter).
  - Floor to roof top is 2.13, from the chain « 205 », « 275 », « 1.00 », « 0.65 » [sourced Fig. 1].
  - Floor to floor is 2.37, and the upper deck stands 0.54 further in [measured at 316 px/m].
  - « D'axe en axe des Roues = 8m109 » [sourced Fig. 2].
  - The chord plate is « 285 × 8 », « 85 » outboard of the web and « 200 » inboard [sourced Coupe CD].
- **Ground stair** (PL-XXVIII).
  - Fig. 5, per 11.00 panel: P4 1.300; T3 « 23 marches de 250 », run « 6.020 », rise « 3.8366 »; Pm 1.00; T3 again; Pa « 1.300 »; T4 « 19 marches » back, « 5.220 », « 3.3268 ». Risers « 0.15933 » [sourced].
  - Fig. 1: each P4 stands 7.820 in from the one below. The running part lies « entre … (39.90) et … (83.90) », nodes XXVIII to XXIV [sourced].
  - Fig. 1 bis puts the lanes on either side of the diagonal: T3's 1.16 to one side, T4's 0.81 to the other [measured, 77.9 px/m].
- **e1.** PL-XX Fig. 3 draws one helix through panels 10 and 11 to about 113, then a straight flight to the floor [measured]. The joining flights have 11 risers of 0.207 on treads of 0.255 [sourced E1900-TXT p. 81].

### 20.2 What `lifts.ts` builds now

Before → after, measured on the cooked mesh.

| item | before | after |
|---|---|---|
| e3 | one helix at (2.65, 0), standing in the lower car's well | (3.0, 3.2) from the floor: 314 risers of 0.1748 to 250.81, a 13-riser raccord, then (1.36, 1.29) to the 3rd floor |
| e2 | helix at (−2.65, 0), rising through a 1.80 well under the upper car | helix at (−2.8, 1.3) to 192.10; 16 risers Ouest, a landing at 195.02, 5 risers back into the opening |
| Roux | gauge 2.80, car 2.40 wide × 2.40 high | gauge 3.57, car 3.27 wide × 2.10 high |
| Otis car | 3.40 wide, 2.40 high, floors 2.55 apart, upper deck set back 1.81, chassis 11.19 | 3.169 wide, 2.13 high, floors 2.37 apart, set back 0.54, chassis 8.10 |
| Otis girder, rail below the 1st floor | 0.235 flange centred on the web; rail 4.20 out from a | 0.285 flange, 0.085 outboard; rail 4.35 out |
| ground stair | 3 × 15 risers of 0.1746 per 7.8555 | per panel: 24 + 24 risers of 0.1599 inward, 21 of 0.1584 back; P4 / Pm / Pa 1.30 / 1.00 / 1.30; 7.82 in per panel |
| e1 | 6 helices; joining treads 0.263 / 0.224 / 0.168 / 0.156 / 0.073 | 5 helices plus a 15-riser flight to the floor; treads 0.263 / 0.255 / 0.255 / 0.255 |

**Checked.** Every lift triangle was tested against every other class, and no lift part hits a strut. At the old 4.20, the Otis girders' feet cut the faces' 0.80 struts; at 4.35 they clear them. The chassis no longer cuts its rails. The stairs do not overlap the Edoux cars' paths, the wells or the guide posts. Slid along its straight run, every car clears the face struts and the ground stair.

### 20.3 Disagreements and open points

- **Ground stair across the diagonal.** The plate puts the lanes over the car's path, which leaves about 2.9 between the inner landings and the rail line (measured square to the slope). The model's level-floored cars ride higher above their rails than that. So the lanes stand beside the car instead, 2.1–4.15 off the diagonal.
- **e3 at t 3.2, not 3.3.** At 3.3 its hand rail runs into the plan bracing's diamond side at node III (t 4.175).
- **e3's top.** The model takes e3's upper helix to stand under the helix that Fig. 9 labels for the apartment's stair. PL-XX Fig. 1 instead ends e3 at a « Passerelle (305.18) » under the reservoir Re3.
- **e2's dog-leg** is [estimated]. Its foot, « 11 marches 1.974 » up to a platform at (151.16), is not built.
- **Car runs vs the entretoises.** The cars reach about 6.5 out from the rail line at the same height. So over their runs they cross the entretoises diagonales at XXVII–XXV (10.3–10.9 out from a), and the pedestals' top plate at the stations.
- **Openings the floors still need** (`platforms.ts`):
  - the landing's e2 well replaced by the opening at s −2.73…−0.11, t 3.30…5.85;
  - the 3rd floor's e3 well moved to (1.36, 1.29);
  - openings for e1's last flight in the 2nd floor, and for the ground stair's arrival in the 1st.
- **Superseded.** §11.3's Roux gauge (2.8) and its rail line at 4.2; §11.4's Otis heights and width and its Roux decks; §11.6's "three flights of 15" and "e2 and e3 take the halves of the shaft"; §11.7's ground-stair, e1 and shaft-stair bullets; §11.8's riser line.

## 21. The lifts and stairs: round 3 — the Otis set-back, the ground stair's layout, e1's last flight (2026-09-19)

Compiled for `lifts.ts` from the final audit's lift rows (its §3 and §4), each re-read here on the Gallica scans (bpt6k6542854f): PL-XXII ter f116, PL-XXIII f124/f125, PL-XXVIII f148/f149, PL-XX f100. Leg frame: r out along the leg's diagonal, l across it; the shaft frame (s, t) as §20, which for pile 4 (quadrant target 0) is (l, r). Tags as in §0.

### 21.1 Readings

| Element | Plate reads | Was | Now | Tag |
|---|---|---|---|---|
| Otis set-back | PL-XXII ter Fig. 1 made floor-level (the crop turned +11.8°, 315.7 px/m on « 4.670 »): « 1,080 », its arrows from the lower floor's outer end (u 272) to the upper floor's (u 620); re-read here, the lower floor 272 → 1750 and the upper 620 → 2096, so both floors are the 4.670 and the inner ends agree (346 px). Floor to floor 750 px = 2.376 | 0.54, 2.37 | 1.08, 2.376: the decks stack on atan(2.376 / 1.08) = 65.6°, the slope the plate draws the car level on (its rail 64.75° under the level floors) | [sourced] 1.080; [measured] 2.376 |
| Otis trough | the decks' inner-lower walls run parallel to the track, both 1.07–1.16 below the girders' top, square to the track (the fin audit's track-horizontal frame) | the inner end 1.1 below the rail line vertically (0.64 square) on the lower deck; the upper deck wholly above the rail line (+0.30) | each deck's floor inner end 1.1 below, square to the track, on the lower deck; the upper 0.60 (see 21.3) | [measured] |
| Roux deck | PL-XXIII Fig. 11 (1:50, 313 px/m on « 5.200 » and « 2.850 »): « Emplacement de la Cabine au bas de sa course », dotted, 3.94 × 3.21; Fig. 3 draws the upper cabin's outer wall and three windows, the rest behind the near girder, the lower cabin cut by the gutter | 5.8 [estimated], reaching 5.31 above the rail line | 3.9 long, stacked along the slope, each deck's inner end 1.1 into the trough: the car 3.30 above the rail line | [measured], read as one deck [estimated] |
| Ground stair P4 | Fig. 1 « 2.05 » and Fig. 5 « 2.050 »: P4's outer end to c's axis at the node, re-read on both; « 12.642 » closes on it | 5.10 | 2.05 | [sourced] |
| Ground stair lanes | Fig. 1 bis (1:200, 77.9 px/m on « 3.927 »): c's centre line through its « × » at y 2242; T3's stringers at 2109/2120 and 2200/2211, its axis 82 px (1.05) to one side; T4's at 2263/2275 and 2352/2365, its axis 72 px (0.92) to the other; 80 and 77 px clear (1.03, 0.99) | T3 at l +2.6, T4 at +3.65, both beside the car | T3 at l −1.05, T4 at +0.92, straddling the diagonal over the car's path | [measured]; which side is T3's [estimated]: the section read as a plan from above with c to the left, pile 2 Est, puts T3 toward pile 3 Sud |
| Ground stair start | Fig. 1: ONE flight from « Sol du Rez-de-Chaussée (35.08) » up and out to the first P4 on « Poutre P5 », at the « entretoise fictive » (39.90), « 4.82 »; its run drawn 4.96–5.3 in the diagonal elevation (78.6 px/m) | 9 risers inward from 1.58, a 1.30 landing, 21 risers out | 30 risers of 0.1607 on 0.250 treads, 7.50 long, at 45° to the diagonal (parallel to a face), so 5.30 in the elevation; it lands on P4's inner edge in T4's lane | [sourced] rise; [derived] the 45° (29–30 of the stair's 0.250 treads need 7.25–7.5, the elevation draws 5.0–5.3); [estimated] its side |
| e1 last flight | PL-XX Fig. 3 (81.5 px/m on its panel ticks): from the top helix's landing (≈ 112.3) up and inward to the 2nd floor's girder, 265 px high and 420 px long | 15 risers of 0.178, 113.06 → 115.73, run 3.83 | 19 risers of 0.178, 112.35 → 115.73, run 4.84 | [measured] |
| Box normals | — | the lift boxes wrote no `normal`; their classes zero-filled it (girders 7,032 points, platforms 73,800) | every box's local face normal turned by its composed `rot` after the last copy | — |

### 21.2 Measured on the cooked model

Measured on the dumped boxes of the cooked lifts (`buildLifts` alone and in the full tower, plain and laced):
- **Otis cars** (piles 3 and 1): the upper floor's outer end 1.080 in from the lower's, floors 2.376 apart, the stack on 65.6°; the lower deck's inner end 1.10 below the girders' top, square to the track, the upper deck's 0.60; the car 1.10 below to 4.44 above that line.
- **Roux cars** (piles 4 and 2): decks 3.90 × 2.10 × 3.27, 2.50 apart and 1.78 further in, both inner ends 1.10 into the trough; the car 1.10 below to 3.30 above the rail line.
- **Ground stair** (piles 4 and 2): every P4's outer end 2.05 in from c; lanes at l −1.05 and +0.92; Pm 6.64 and Pa 10.93 in from c at their heights; the start 30 treads, riser 0.1607, going 0.250, 45.0° to the diagonal, 5.30 along it, its foot at y 1.58 12.0 in from c and 6.1 across; the lowest stair surface over the car's band (|l| ≤ 1.64), the arrival apart, is a Pa's underside 3.71 above the rail line, against the car's 3.30.
- **P4's corners.** At 2.05 from c the leg's faces leave ±1.34 at 0.50 from their planes: P4 is full width (l −1.55…+1.42) from 2.26 in, and loses a 0.21 corner on T3's side and a 0.08 one on T4's at its outer end. At 5.10 the old P4 never came near the faces; the first run with the plate's 2.05 put its T3-side corner into the node's horizontal strut at XXVII, XXVI and XXV (SAT, the control that showed the test reports hits).
- **e1's last flight**: 19 treads of 0.178, 112.348 → 115.73, run 4.84 inward (r 19.97 → 15.38 in pile 4, a at 7.66); the top helix now ends at 112.35.
- **Collisions**: every lift box and hand-rail segment against every other part's triangles (SAT, boxes shrunk 1 mm; 350,420 triangles plain, 3.15 M laced): no lift part meets a leg, shaft, arch, girder, gusset, summit or name part. What remains is the decks and the pedestals: the tracks through the 1st deck (all legs) and the 2nd (Otis), the Edoux guides through the landing and the 3rd floor, the tracks' and the start flight's feet in the pedestal, e1's last flight and the ground stair's arrival through their decks where the openings above are not yet cut. Each car slid rigidly along its chassis, lower floor 1.6 → 50.4 in 0.25 steps: it meets only the pedestal (lower floor under 7.5 Roux, 7.9 Otis), never a stair, rail or member.
- **Normals**: every lift output carries unit normals, none zero, none against its winding (girders 7,032 points, platforms 86,966).

### 21.3 Disagreements and open points

- **The Otis car is level where the plate's is not.** PL-XXII ter draws it level on a track of about 65°; the model parks both Otis cars level on the 54.6° run (`CAR_AT`). There the plate's 65.6° stack leaves the upper deck 0.60 into the trough, not 1.1, and a rigid car would tip about 11°, which is not modelled. The model's rail line has no 65° part to park it on: 54.6° to XXIV, 60.7° to XXIII, 70.5° beyond.
- **The Roux deck length is a reading of one outline, and the readings differ.** Fig. 11's dotted cabin reads 3.94 long closed at u 494 (the fin audit), 4.4–4.5 closed at the dotted verticals further out, or 4.9 and more if it runs into the gutter (this section's blind verifier, 3.19 across at 316 px/m); it may also be the whole car's plan, which would make each deck shorter still; Fig. 3 hides the inner end. PL-XXVIII settles the bound: its stair's innermost landings Pa stand 3.71 above the rail line (their underside), square to it, and a level deck of length L dipping 1.1 reaches 0.815 L + 0.12, so L < 4.4. The model keeps 3.9 (the car 3.30, 0.41 clear); 4.45 would put it into the landings.
- **Pile 4's start is pile 2's.** PL-XXVIII's Nota: « la disposition dans la pile 4 est la même, le départ au Rez-de-Ch. excepté (voir fig. 5 planche XVIII) »; that figure was not read, so pile 4 takes pile 2's start, turned [estimated].
- **Blind re-read** (the verifier, no model values to hand): the Otis « 1,080 », the stack 65.3° on a track drawn 65.4°, the floors 2.35 ± 0.02 apart (the model 2.376) and both decks 1.00–1.04 into the trough; P4 « 2.050 » also on Fig. 37; the lanes 1.04 and 0.88; the start one flight of 30 risers drawn at 41.9° over 5.3, which Fig. 37 draws 7.50 long at 45° to the diagonal; e1's last flight 3.34 high, 19 risers. It agrees with every row but the Roux length (above) and the upper Otis deck's 0.60 (the parking slope, above).
- **The start's side** is read from nothing: which face its flight runs along is [estimated]; the 45° is also what Fig. 37 draws.
- **The arrival** is still one flight on inward from the last Pm (Fig. 2's turns, which keep it near c, are not built). With the lanes over the car's path it now stands over the rail line near the 1st floor, its landing 3.44 above it, where the model's car does not go.
- **The masonry pedestal covers the start's foot.** The plate starts the stair at 35.08 (y 1.58) inside the leg; `platforms.ts`'s pedestal is a closed frustum 4.00 high over the whole leg, so the flight's first 15 treads, its stringers and the tracks' feet are inside it (its stringers cross the top plate), and so are the cars' low stations (lower floor under about 7.5–7.9).
- **Openings the floors need** (`platforms.ts`, from the cooked stairs: every tread with less than 2.0 under the deck's underside, and the stair's own arrival):
  - 1st deck (underside 57.03), the ground stair's arrival: pile 4 s −1.58…−0.52, t 31.34…36.91; pile 2 s 0.52…1.58, t −36.91…−31.34. The §18.1 opening at s 2.02…3.18, t 28.24…30.66 (and its pile-2 twin) no longer has a stair under it.
  - 2nd deck (underside 115.13), e1's last flight: pile 4 s ±0.35, t 15.23…19.09, and the same turned in the other three legs (pile 3: s 15.23…19.09, t ±0.35; pile 2: s ±0.35, t −19.09…−15.23; pile 1: s −19.09…−15.23, t ±0.35). §18.1's t 15.95…17.16 is too short.
  - The tracks have not moved. The cars' sections, square to the track: Otis 1.10 below to 4.44 above the rail line, ±1.585 across (was 0.64 below to 5.33 above); Roux 1.10 below to 3.30 above, ±1.635 (was to 5.31).
- **Superseded:** §20.2's Otis-car and ground-stair rows and e1's "15-riser flight"; §20.3's "Ground stair across the diagonal".

## 22. Legs and shaft: round 3 — plan bracing A and its members, the entretoises, the gap X's lacing, the ties, the belts' flats and gussets, the Masque (2026-09-19)

Compiled for `legs.ts`, `shaft.ts`, `strut.ts` and `spec.ts` from the final audit's legs rows (`fin-legs-report.md`: section A's OFF rows and its minor ones where they were cheap), each re-read on the Gallica scans before a number changed: PL-VII f40/f41 (1:200), PL-VIII f44/f45 (Figs 1–7 at 1:500, 8, 16, 17, 24 at 1:200, 13–15 and 18–22 at 1:1000). Where this section disagrees with the audit, it says so. Tags as in §0.

### 22.1 Readings

| Member | Plate reads | Was | Now | Tag |
|---|---|---|---|---|
| Plan bracing: girder A | PL-VIII Figs 13–15 and 18–22 each draw the whole tower's square with A as one straight line from c_TL to c_BR through the axis (Fig. 14 at 16.7 px/m, Fig. 15 at 16.4); Figs 16, 17 and 24 print "1.000" between A's outer chords at every band (drawn 75–84 px, mean 79 at 78.9 px/m, 1.00) against "594.6"–"599.3" for the rest (drawn 43–50 px, 0.58); Fig. 13's detail "Poutre A": an X lattice, "Corn. et Semelle" top and bottom | along x = z but only inside the diamond (±4.91 on x at XVI, 6.9 m of the 40.5 m diagonal), 0.60 deep, Warren | **corner to corner**, each end stopping at its c column, **1.00** deep with an X in every panel; still framing into the Edoux's central guide post from both sides: 38.83 m of the 40.55 c–c at XVI, 12.55 of 14.14 at top28 (the rest is the two column trims and the post) | [sourced] |
| Plan bracing at IX | Fig. 17 draws no band at IX: the "Plancher intermédiaire (229.43)" stands in panel 19 on "Contrefiche"s instead (plan Fig. 12) | a band at y 198.70 | none (16 braced nodes, not 17) | [sourced] |
| Plan bracing: H′, H, K, E, F, G | Figs 13–15 (XVI–XII): H′ from the middle of the long girder B to A's centre; on the opposite long girder B′, H, a stub along the other diagonal, and the K bracket, two short struts parallel to the faces from H's end back to B′, its apex 1.7–2.2 in from B′. (Re-read 2026-09-26: the stub is H, tinted as H′ is and ended as H′ is on an I-section; the dashed curve beside the letter H is its leader, running from the letter to the stub's end in all three figures, and the captions list H at every one of these nodes: Fig. 13's « Poutre H », « 596 »; Fig. 14's « A, B, C, D, E, F, H et H′ »; Fig. 15's « A, H, H′ et K ». See §26.) Fig. 18 (XI; X alike): H′ from c to A's centre; H from the opposite c through the lozenge's side C′ to the K bracket 1.3 inside it. Figs 19–20 (VIII–VI): E from c to the lozenge's side, F on to the centre; H from the opposite c to that side. Fig. 21 (V–II): E from c to the centre; H as before. Fig. 22 (I, 28-29): E from c to the centre; at the opposite corner two "G" off the two faces, 1.9 in, meeting at a chamfer, and H from c to it. Every figure leaves one half of the second diagonal open: toward c_TR in Figs 13–18, the other half in Figs 19–22 | not built | built on the second diagonal (x = −z), the plates' open half mapped onto the Edoux's car run (the lower car's, s > 0, up to X; the upper car's, s < 0, from VIII up: plate (X, Y) → model (x, −z)). What still meets the Edoux is cut at it (`EDOUX_PLAN`): H′ frames into the NORD cylinders and the central post at XVI–X, H and K at XVI–XII into the SUD outboard guide post, E/F into that post and the central post, the G frame and H at I and top28 into the NORD outboard post. 145 girders a tower (97 before) | pattern [sourced]; K's reach, G's offset [measured]; the mapping [derived] |
| Plan bracing: the bands | Figs 13–15, legends: "les contreventements des poutres en haut et en bas sont constitués par une âme et une cornière" (13, 14), "par de simples cornières" (15). Drawn in each leg's corner bay, between its corner girder and the long girder parallel to it, as lines parallel to the tower's faces: sparse in Fig. 13, about 2.3 apart in Fig. 14 (a band 3.63 wide), about 1.5 in Fig. 15 (2.33 wide) | none | at XVI–XII, in the planes of the 0.60 girders' top and bottom chords, a grid of angles parallel to the faces over each corner bay, the pitch the band's width over 1.55 rounded to whole cells (4.95 at XVI … 0.83 at XII); 0.07 square. 360 members | pattern [sourced]; pitch, section [estimated] |
| Entretoise diagonale: section | PL-VIII Fig. 1 prints "600" and "600" either side of a heavy central spine (the audit's profile: three lines, outer ones 1.24 apart at 32.0 px/m), an X lattice in each half and transverse struts; Fig. 8 prints "715.6" (drawn 0.68–0.70 between the chords' lines at 79.2 px/m) and draws the crossings every 0.556 with a vertical at every other one (1.112; 88.5 px at 79.6 px/m) — but Fig. 8 is a face-plane view, which foreshortens the diagonal girder by cos 45° (its own "15.000 (suivant la diagonale 21.2132)"), so along the girder the crossings fall every **0.79** and the verticals every 1.57 (1.76 at XXI); Fig. 1, at true length, has its transverse struts every 1.54; the section is an open N | 0.60 square laced strut, laced as the 600s (0.94) | a rectangular laced strut **1.20 × 0.7156** (`WebOpts.halfB`: N, the girder's plan normal, 0.60 each way; B, vertical, 0.358), laced every 0.79 (X-centre to X-centre, as every strut's step is read); its plates cover the chords' depth, its joint rivets sit on them, and its joint clearance is solved with its extent in the vertical plane; plain, a 1.20 × 0.7156 box (`flatBars`) | [sourced]; the step [measured] |
| Entretoise diagonale: continuity | drawn whole, d to b, in Fig. 1 and at all five nodes of Fig. 8 | two halves at XXVII–XXV in every leg, ±1.75 open about the leg's diagonal, "for the cars" | **whole at all five nodes in the Roux legs (piles 4, 2) and at XXII in the Otis legs**; open ±1.75 at XXVII–XXV and XXI in the Otis legs (piles 3, 1). From `lifts.ts` as it stands, each car slid along its whole run (its own `car`, every 0.05 of floor height, box against box): the Otis car clips a whole 1.20 girder at XXVII–XXV (its upper deck's outer top corner, 0.02 into it) and at XXI (0.14–0.15, its track bent above the 1st floor); the Roux car clears it everywhere by 1.11 (brute force; a separating-axis bound gives 0.79), its tracks by 4.2, and the Roux legs' ground stair by 2.97 (its flights cross the girder's line in plan 3.3 above it). With the openings, 0.165 to the Otis car | [sourced] whole; the openings [derived from lifts.ts] |
| Gap X's lacing, panels 12–16 | the X-centre spacing along each arm of the gap X (PL-VII Fig. 2 at 78.25 px/m, Fig. 3 at 78.29; template and autocorrelation agree within 1 %): panel 12 0.76 / 0.70, 13 1.11 / 0.92, 14 1.13 / 1.00, 15 0.98 / 0.98; panel 16's arms show at most two laced bays between their gussets and the crossing plate | 0.68 (the shaft's) | by panel, the arms' means: **0.73, 1.01, 1.06, 0.98**, and panel 16 as 15 (`LEG_GAP_LACING_500`) | [estimated, measured]; panel 16 [estimated] |
| The ties' chords | Tie A: top chord "200 × 8" with "Corn. 80 × 80 × 10", drawn 17 px (0.22), wholly above XXVIII (+0.21 to +0.41), its top edge the "3,387" datum; bottom chord "200 × 8" with an angle, drawn 0.22 (PL-VII Fig. 1). Tie B the same: "200 × 9" and "200 × 8" (Fig. 5). Neither figure draws a laced horizontal at XXVIII | the 0.80 laced XXVIII horizontal as both ties' top chord; bottom chords 0.10 square bars | **no horizontal at XXVIII**; a plate chord 0.22 × 0.08 on all four faces, its axis 0.29 above XXVIII in the plane (top edge 0.40); both bottom chords plates 0.22 × 0.08 at 2.987 / 1.600 below XXVIII; the ties' bars rise to the top chord's axis; the central post runs on from the bottom chord through the top chord to XXVII in one stretch | [sourced] sizes; the plate's thickness [estimated] |
| Tie A's joints | top joints at ±0.55, ±3.6, ±6.6 from the face's centre, flanking the "877" post; no bar parallel to the uprights at any joint (a line profile reads 0.01–0.04 on those lines against 0.99–1.00 on drawn bars) | joints on the centre line and every 3.05; a post up every joint | joints at ±(0.55 + k 3.05), no X in the bay across the post, no posts; six X'd bays a face as before | [measured] |
| Panels 5 and 11: bars, posts, gussets | panel 5's bars "Corn. 80 × 80 × 8" drawn 0.15 wide, its posts 0.14 (three lines 12.0 and 11.5 px apart at 83 px/m), a gusset "Ep. 10" at each post's mid-height, 0.62–0.70 × 0.86–0.90 (Fig. 1); panel 11's bars "C. 80 × 80 × 8/10" 0.13–0.14, posts "C. 70 × 70 × 8" 0.155, gussets 0.64–0.72 × 0.97–1.06 (Fig. 2) | 0.10 square bars and posts, no gussets | flats as wide as drawn (panel 5: bars 0.15, posts 0.14; panel 11: bars 0.135, posts 0.155), an angle's leg (0.08) thick, the two bar families 5 mm either side of the face plane; a gusset 0.66 × 0.88 (panel 5) or 0.68 × 1.01 (panel 11), 0.010 thick, either side of the lattice at every post's mid-height, slid clear of an upright it would reach (the post nearest b in panel 11: 0.06) | [measured]; thicknesses [estimated] |
| Panels 5 and 11: bar angle | panel 11 prints "55°49′49″" near b, exactly atan(4.95368 / 3.36268), node line to node line (the "53°49′4x″" in bay 1 reads as the same angle); panel 5's bars run node line to node line through the post gussets, 44.0 ± 1 (atan(7.5309 / 7.765) = 44.1) | chord axis to chord axis: 53.5° and 42.2° | working lines node line to node line, the bars ending on the chords' axes: **56.0°** (the model's panel is 4.993 in the plane, the plate prints 4.954) and **44.1°**; the crossings at mid-depth are where they were | [sourced] |
| Masque: the upper X's | the upper zone's dark pixels, projected along each trial angle, are sharpest at "\" 48.5° and "/" 46.5° (0.25° steps, 79.7 / 79.1 px/m), a split that is the scan's own 1.1° rotation (the chords fit at +1.0 to +1.2°): taken out, both families read 47.0–47.25 (an independent re-read); the audit's trace of two "\" bars 48.0 and 48.7 | 42.8° (each bar two post pitches) | **47.5°** through each post's mid-height, each bar about 1.7 pitches | [measured] |
| Masque: the lower lattice | V's at both chords: under the 750 chord at 1098, 1250, 1405, 1556, 1711, 1866 px (153.6 apart, 1.93; the post over 1400), over the 630 chord at 1010, 1172, 1325, 1623 px, half a pitch off; the bars' centre lines meet about 18 px (0.23) inside the 750's lower edge and about 4 px (0.05) short of the 630's upper edge, where the bars' edges meet on it (an independent re-read) | V's only at the 630 chord, on the grid; 45°, their tops 0.33 apart at the 750 | V's at both chords: the 750's on the post grid (every 3.8825 / 2), the 630's half a pitch off, each bar 1.5 pitches along over the 2.746 clear plus 0.23 into the 750 less 0.05 short of the 630 (2.926; 45.1°) | [measured] |
| Masque: rounded corners | the frame fills both top corners, its inner edge an arc about 1.0 in radius (0.8–1.2 read); one corner is acute (about 66° in the face plane, the uprights leaning 24°), the other obtuse | not drawn | an arc of 1.0 tangent to the top band's lower edge and to the screen's side, the corner filled behind the top band with concentric flat bands 0.10 wide (four-millimetre plates) | [estimated] |

### 22.2 Measured on the cooked model

On `buildLegs` + `buildShaft` + `buildLifts` (plain, laced and riveted) and on the whole tower (`tests/eiffelSkeleton.test.ts`, 15 tests): the entretoises' chords 0.555 either side of the girder's plane and 0.3128 above and below its node (outer faces 0.60 / 0.358), laced every 0.790; 28 members (the Roux legs 5 whole each; the Otis legs XXII whole and 4 halves at each of XXVII–XXV and XXI); the gap X's laced 0.730 / 1.010 / 1.060 / 0.980 / 0.980 in panels 12–16, eight struts each; no leg horizontal at XXVIII; the ties' top chord at XXVIII + 0.29 / F on all four faces, the bottom chords at y 3.731 (A) and 4.970 (B); tie A's upper joints all at 0.55 + k 3.05 from the centre line or on an upright, twelve rising and twelve falling bars on its two faces; the central posts 144 (the tie's stretch and panel 1's are one); panel 5's and 11's bars at rise / run = H / span to 1e-3 (44.1°, 56.0°), crossing at mid-depth at every post and bay centre, a gusset pair at every post (32 and 24 a leg); the Masque's upper bars 47.500°, every lower bar 1.5 half-pitches along over 2.986, its apexes at the 750 chord on the grid to 0.01 of a half-pitch (the bars 45.1°, 2.926 apex to apex); every new flat bar and plate carries unit normals agreeing with its winding. Plan bracing: 16 nodes, A 1.00 deep, 145 girders and 360 band angles; triangles 59,152 (39,328 before). Rivets (the fixA verifier with the entretoises added): every rivet within 0.032 mm of the steel it fastens, none inside an upright's box (the entretoises' 3,936 lacing rivets 178 mm clear, their 1,960 joint rivets 248 mm), every joint rivet over a chord. Against every lift block, sampled every 0.05 m over each member's section (tracks, cars, the Edoux, the shaft and ground stairs, hand rails): no contact; the least clearances 0.41 (the ties' top chord to the ground stair), 0.43 (panel 5's bars to it), 0.50 (panel 11's bars to the Otis track), 0.031 (plan girder A to the Edoux's central post); the entretoises as built 1.13 from the parked cars; each leg car slid over its whole run clears them by 0.165 (Otis) and 1.11 (Roux).

### 22.3 Disagreements and open points

- **The Otis legs' entretoise openings are the lift's, not the plate's.** PL-VIII draws the girder whole at all five nodes. With the sourced 1.20 width, the Otis car as `lifts.ts` builds it reaches 0.02 into the girder at XXVII–XXV and 0.15 at XXI, so in the two Otis legs the model opens it there. Either the car's upper deck or its rail offset (`RAIL_OFFSET`, "4.35 out from a", ±0.5) is a little generous, or the girder was carried over the car in a way the plan cannot show. (A first pass also opened it in the Roux legs for their ground stair, from the flights' bounding boxes; the stair clears a whole girder by 2.97.)
- **The ties and the pedestal.** Tie A's bottom chord (y 3.63–3.83) now matches the plate, and lies inside the top slab of `platforms.ts`'s pedestal (a closed 4.00 frustum over the whole leg, 0.40 shell); PL-VII Fig. 1 draws the "Soubassement" beyond the uprights and the tie 1.378 over the "Ligne des centres des sommiers", in the open. A pedestal raised toward the 5.2–5.8 other plates give would bury tie B (y 4.97) and the XXVIII plate as well: the conflict is the pedestal's form, not the ties' heights.
- **The entretoise's section** is the N's bounding box, laced on four faces at one step, not a web and two inclined wings: the plan's central spine is not built, and its plan faces take the elevation's 0.79 where Fig. 1 draws an X in each half every 1.54.
- **Tie A's end bays** keep an X each; the plate draws one end post at the b end and its end bays are not resolved.
- **Panel 10's band chords** (a solid 600 top chord, a solid "Âme 5 m/m" bottom one drawn 0.70) stay laced struts, and its "C: 30 × 30 × 4" angles are not built.
- **Plan bracing** (from its own re-read): K's apex (1.7–2.2 in from B′, 4.2–5.5 from the axis) lands on or inside the model's SUD outboard guide post (5.15 out), and at XII near the lower car's run, so K frames into the post; Fig. 22's G frame stands around the NORD outboard post and inside the upper car's run at top28, so G and H stop there. In Figs 13–15 the dashed curve by H is the letter's leader, and H is the stub, built (§26; this replaces "H … is dashed only and not built"). The girders stay flat trusses in one plane (B/F are "300" wide boxes with "treillis en plats >< sur les faces horizontales"); the lozenge side cut by the upper car's run at IV–II is unchanged.
- **Against the audit.** Every OFF row it lists for these members was confirmed on the scans before it changed. An independent re-read of this section's own readings corrected three before the model settled: the entretoise's step (first read off Fig. 8 without its foreshortening, 1.12), the Roux legs' openings, and the lower V's insets (first derived as 0.12 each side). Two readings differ slightly from the audit: the Masque's lower V's repeat every 153.6 px (1.93, the half post pitch the model keeps) where the audit read about 150 (1.88); and tie B's top chord, which the audit did not list, is drawn as tie A's (a "200 × 9" plate over XXVIII, no laced horizontal), so it changed with it. Its panel-16 gap reading ("too short to read") stands: panel 16 takes panel 15's step.

---

## 23. The summit, round 3: the two diagonal girders, and the balcony's level (2026-09-19)

Compiled for `summit.ts` from the final audit's summit rows (fin-sum A1, A6, A7), each re-read on the plates before it was changed, then re-read by a blind second reader who was not told the answers (`node_modules/.cache/r3b-ver/notes.md`): PL-XIV (f76, f77) at 1:50, 317.2 px/m along and 315.6 up on the printed 14.870 and 4.500; PL-XIX (f96) at 1:200, 80–82 px/m on the 7.435 arms and the 10.680 square; PL-VII Fig. 4 deskewed, 78.9 px/m. Tags as in §0.

### 23.1 Readings

- **The stage above the apartment is two girders, not a box.** PL-XIX Fig. 3 labels the 4.50 zone "Parties droites des poutres en diagonale". Fig. 5 (coupe GH, at the lantern terrace, looking down on the dome) and Fig. 8 (coupe EF, just under the springing) draw only an X on the diagonals: "14.870" end to end, "7.435" each arm, "1.130" over the flanges and "770" between the webs [sourced]. Nothing runs along the 10.680 square's sides; the square is the apartment's roof. The dome's arches are the girders' "parties courbes" (Fig. 4).
- **Which girder is continuous.** On Fig. 8, with "Côté de la Seine" at the bottom, the girder from lower left to upper right runs through the crossing and carries the pulley supports at "4.064" either side; the other is "discontinue" and butts against it [sourced; both readers]. The model's Seine side is +z (the face between piles 1 and 4), so that girder is the N–S diagonal, the Edoux cars' line in `lifts.ts`, and PL-XIV Fig. 4 names the two cars' spaces under the continuous girder [sourced labels]. The two readings agree.
- **A web, in its own plane** (PL-XIV Fig. 4, the continuous girder's elevation):
  - Chords "Âme 400 x 10" under "Semelle 360 x 10": 0.41 (top) and 0.38 (bottom) to the "4.500" datum lines, 0.44 and 0.43 overall [measured].
  - From each end: a plain plate "Âme de 750 x 6", "750" wide, with the arbalétrier c's axis "364" in from the end [sourced]; the mesh bars and "Plat 128 x 6" flats are drawn across it.
  - A light vertical "Corn. 70 x 70 x 8" 1.23–1.31 in [measured].
  - The pulley post, "3.371" from the end and "4.064" from the centre, "1.250" wide [sourced], with two windows "500" wide: 2.04–2.62 over the foot, and 3.47 up to the top chord [measured].
  - At the centre a plate 1.36–1.37 wide [measured] with two windows "500" x "600", "800" apart, at 0.32–0.93 and 1.72–2.32 [sourced sizes, measured heights].
  - Between them a diamond mesh of angles ("Corn. de 60 x 60 x 7"): 1.21 along the girder, bars at 42.9–43.2 degrees [measured, both readers].
- **The mesh seen face-on.** PL-VII's mesh (52.6–52.9 degrees; 0.825 wide in the fin-sum audit, 0.846 in the second reading) and PL-XIV Fig. 2's hidden lines (0.83) are these webs seen at 45 degrees: 1.21 / sqrt 2 = 0.856, and atan(sqrt 2 tan 43) = 52.8 degrees [derived]. The detail plate is followed.
- **The corner upright is inside the girder's end.** "364" from the end puts the arbalétrier c's axis at 7.435 − 0.364 = 7.071 = 5 sqrt 2, panel 29's corner at (±5, ±5) [derived]. Its 0.50 square section, turned 45 degrees to the girder, reaches 0.354 across it, inside the webs at 0.385, and 7.425 along it, just inside the end [derived]. PL-XIV Fig. 2 draws it solid up through the 4.500 zone, and its "Corn. ouverte à 135°" join the webs to its faces [sourced]. PL-XIX Fig. 8 labels it "Arbalétrier c" at each end.
- **The end, the top and the bottom.** PL-XIV Fig. 3 ("Vue par bout"): the two webs' end posts "770" apart, X-laced with "Plats 50 x 8" in five panels of "884" [sourced]. Figs 5 and 5 bis (top gh, bottom ef):
  - the top is plated over the whole length, the 360 flanges and "Tôle 540 x 4" between them;
  - the bottom is open, its flanges starting "464" in from the end, with a cross angle "70 x 70 x 8" 1.94 in [measured];
  - at the crossing, "2 Goussets 1.130 x 10".
- **The ladder cylinder stands on the crossing.** PL-VII and PL-XIX Fig. 3 draw it from the girders' top up, not between them [both readers]. PL-XIV Fig. 1 (coupe hf, the continuous girder's centre) puts two pulleys, a 0.400 block, a "Treillis 50 x 4" X frame and the cable between the webs there, and no cylinder.
- **The balcony deck is 2.430 over the floor**:
  - printed on PL-XIV Fig. 2, as 1.200 + 1.230;
  - PL-VII's chain reads 1.200 + 1.030 + 0.200 (fin-sum), and its drawing about +2.50 (second reading);
  - PL-XIX Fig. 3 reads "1.20" + "1.23" (fin-sum), or +2.5 ±0.1 (second reading);
  - PL-VII's rail top is at 279.56 [measured].

  PL-XIX's "Niveau du plancher (312.21) du logement", +2.58, is the apartment's floor, a 0.15 step higher. The deck is "Fer I 120" [sourced PL-VII].

### 23.2 What `summit.ts` builds now

Measured on the cooked mesh at default detail (and with `rivets`).

| item | before | after |
|---|---|---|
| the 4.500 stage, in plan | a box: four latticed faces at ±5.12, 0.83 corner columns at (±5.12, ±5.12), a 0.38 post on each face's axis, 0.30 plates at head and foot | **two girders on the diagonals**, 14.870 x 1.130, webs ±0.385. The N–S one is continuous. Nothing is built on the square's sides |
| face-on outline | ±5.535 | ±5.54 over the webs' end plates; ±5.60 over the chords; ±5.657 at the 20 mm top plating's corners |
| head and foot bands | 0.30, 0.30 | chords 0.40, 0.40 (with the 20 mm plating and flanges) |
| corner, face-on | one solid 0.83 column, 4.705–5.535 | near web's end plate 4.455–4.985, the mesh across it; the end frame's lacing 4.985–5.53, over the far web's plate; the upright 4.75–5.25 inside |
| mesh | 0.825 x 1.09 at 53 degrees, in the four faces | 1.21 x 1.13 at 43 degrees in each web, on across the end plates. Face-on that is 0.856 x 1.13 at 52.9 degrees, four webs deep, each pair ±0.272 about the axis-symmetric phase |
| posts | one 0.38 on each face's axis | pulley posts 1.25 wide at ±4.064 (face-on 2.16–3.04); the central plate 1.36 wide (face-on ±0.75 over both webs); light verticals at ±6.185 |
| corner uprights | none above the apartment | 0.50 square at (±5, ±5), 280.98–285.46 |
| ladder cylinder | 280.98–293.215 | **285.48**–293.215 |
| balcony deck | 278.51–278.71 (0.20) | **278.44–278.56** (0.12) |
| railing | 278.71–279.71 | 278.56–**279.56** |
| glazing | 276.13–278.51 | 276.13–278.44 |
| apartment block | 278.71–280.98 | 278.56–280.98, its floor's 0.15 step inside it |

**Normals.** Every girder mesh carries unit normals, none zero and none against its winding. The balcony deck, the lantern terrace, the apartment and panel 29's plate girders were `meshPrimitive` boxes with no `normal`. They are now `flatBars` boxes that write one (`levelBoxes`).

**Rivets** (`rivets: true`). The old `summit.cage.*` sets are gone. The new ones:
- `summit.diagonals.uprights`, 928: the uprights' seams, between the chords.
- `.bars`, 1320: two through each mesh bar's end, clear of the chord, plate or vertical it lands on. On the end plates only the outer head is placed. A head within 38 mm of one already placed is left out.
- `.chords`, 3416: two rows on each face of every chord.
- `.lacing`, 48: one at each end-frame node.

Every one is within 0.001 mm of its own member's skin, with axis·n = 1.000. No head centre lies inside any girder member, the dome or the apartment. No two heads in a set are closer than 42.9 mm [measured].

### 23.3 Disagreements and open points

- **PL-VII's corner reads narrower than the 3D structure.** PL-VII draws a plain band and a laced part: 4.67–4.94 and 4.94–5.49 in the fin-sum reading, 4.74–5.03 and 5.03–5.57 in the second. The end frame gives the laced part (0.545). The near web's "750" end plate, though, projects 0.53 wide, so the model's corner runs from 4.455. PL-XIX Fig. 3 draws a band, crossed by the mesh, from about 3.8–4.5 to 4.87, and PL-XIV Fig. 2's clear panel starts at 4.48. The detail plate is followed.
- **Face-on the mesh is denser than PL-VII's.** A face-on view looks through four webs: the near girder's two and the far one's two, each pair ±0.272 either side of the single mesh PL-VII draws. PL-XIX Fig. 3 draws the layers. PL-VII's single mesh and its 0.38 axis strip read as simplifications, not structure: at the centre the continuous girder's plate spans ±0.75 face-on.
- **The outline at the chords.** The 1.130 top plating runs to the square-cut ends, so the chords stand to ±5.60 and the plating's corners to ±5.657 face-on. PL-VII's head and foot lines measure 10.98–11.03 overall. Over the webs the outline is ±5.54, as before.
- **Chord depth**: 0.40 against PL-VII's 1:200 bands of 0.34–0.35.
- **The central plate's lower window** is drawn from 0.32 over the foot, inside the bottom chord's 0.38–0.40; the model stops it at the chord.
- **Not built:**
  - the 6 Edoux pulleys, their bearing bars and cables;
  - the central "Treillis 50 x 4" frame between the webs (PL-XIV Fig. 1);
  - the "Plat 128 x 6" flats on the end plates;
  - the springing gussets ("Gousset de 10 m/m", "Attache de la partie en arc");
  - the four contrefiches under the girders, hidden in the solid apartment;
  - the "Escalier du campanile".

  The dome keeps its own section: its rib chords stand at ±0.475, the girders' webs at ±0.385.
- **`lacedWeb`** changes nothing in the girders: the plates lace none of their members as struts. The end frames are laced at every detail.
- **`summit.dome.lacing`**, unchanged this round, sits on the mitred chord's node, 3.75 degrees off either face (axis·n 0.99786 = cos 3.75°).
- **Superseded:**
  - §16.1's readings of the box's corner columns and face as a structure (their widths and mesh stand, as projections of the girders);
  - §16.2's rows for the box's corner columns, face posts and mesh, and the cylinder's start at 280.98;
  - §16.3's "strip on the box's axis", "corner column's plain band" and "The cylinder starts on the apartment's roof";
  - the balcony deck at +2.58, wherever it appears.

---

## 24. The first floor and platforms, round 3: the pedestals, the arch's foot, the bracket, the terrace balustrade, the lift openings (2026-09-19)

Compiled for `firstFloor.ts`, `platforms.ts` and `spec.ts`'s `PEDESTAL` from the final audit's rows (its S.2 and R.2 tables), each re-read on the Gallica scans by three readers who had no model, code, notes or earlier report to hand: PL-I f16/f17, PL-VII f40 and PL-XI f56 (the foot, the pier, the bracket); PL-XVIII f92/f93, PL-XX f100/f101, PL-XXI, PL-XXVIII and PL-VII (the pedestal in plan and section); PL-XVI f84/f85, PL-XVIII f93 and PL-XIX f97 (the lift openings, the terraces). Tags as in §0.

### 24.1 Scales

Every height below was read on its own plate's vertical dimensions, never on its horizontal scale.

- **PL-I Fig. 1** is not isotropic. Near its foot it reads **15.27 px/m** vertically on its own « Hauteur sous clef 39m40 » (y 6397.5 → 6999) and 15.08 on « 57,63 », against **16.14** across on the ground chain 124.906. Above the 1st floor its increments run at about 16.1, so only the lower 58 m are drawn short. The sheet is also warped at the feet (horizontals slope 0.020–0.030), so each foot was read along sheared rows, from the ground line at the same x.
- **PL-VII Fig. 1** (rabattement): **79.57 px/m in-plane** on the leg's node lines 17.40 / 11.90 / 6.40 (y 6135 / 6625 / 7115), which is **89.05 px per vertical metre** (÷ 1.11924, from « 12,31163 » for 11.00). Across it reads 80.0 on « 15,000 ». Its two halves are offset about 9 px at x 1650, so each item was read against local lines only. Its drawn sommiers line reads 2.30–2.34, not 2.50.
- **PL-XI Fig. 1** is a true elevation: **32.17 px/m** vertically on the leg's node grid (6.40 at y 2806.7, 11.00 m panels), with the intrados crown on the 39.40 line. Across it reads 31.0–32.2, depending on whether the « 15,00 » ends are taken on the uprights' edges or axes.
- §17's PL-XI heights applied the horizontal 31.75 px/m vertically, counting down from the crown. Over 36 m that 1.3 % puts the foot 0.5 m low. That is where the 2.83–2.99 end and the bracket 0.5 m low came from.

### 24.2 Readings

| Element | Plate reads | Was | Now | Tag |
|---|---|---|---|---|
| Pedestal, what it is | PL-XVIII Figs 1, 2, 4, 5 (79.4 px/m on the shoes' 15.00): a square **ring of cut-stone walls** round each leg's foot, the corner toward the tower's centre rounded, the **interior open** at the rez-de-chaussée floor (35.08) = 1.58, holding the four masonry blocks A–D the uprights stand on (« Massifs … sur lesquels reposent les arbalétriers … par l'intermédiaire des appuis »), the lift station and the stairs. PL-XX's section (inner corner, pile 3) ends the wall in a ridge, not a slab. PL-XVIII Fig. 2 notes that « le parement incliné des fermes du soubassement est recouvert de châssis vitrés ». PL-VII draws the « Fermes du Soubassement » on either side of the face plane, with base tie A between them. The lower bracing stands 2.0–3.8 inside the walls. | a closed box of six 0.40 plates, its top plate across the whole leg | a hollow skirt of plates on its outer surface, open inside the leg's footprint (`PEDESTAL_SKIRT`) | [sourced] |
| Pedestal, top | PL-I **5.45 / 5.53** (the two feet); PL-VII **5.65–5.74**; PL-XX's ridge at the rounded inner corner 6.89 | 4.00 (WP-FR) | **5.55** | [measured] |
| Pedestal, profile (PL-I, both feet within 5 px) | Battered block to 1.96–2.01, its outer face 1.49 out at the ground (the chain's 62.453); cornice to 2.72, nose 60.96. Steps: lines at 3.14 / 3.55 / 4.16–4.22 / 4.75–4.81 / 5.21–5.27, set back 0.71 / 1.67 / 2.4–3.0 / 3.10 / 3.50 / 4.15 from the nose at 16.13 px/m; inner end +0.4 … 2.1. PL-VII draws the same total recession (3.7 outer, 1.5 inner) as a torus, fascia, concave sweep and cyma, ending in a lip at the upright; its torus nose sits 1.48 inside the batter's foot. | outer face upright at 62.453; inner face battered 38.17 → 40.30 | block 0–2.00 (62.453 → 60.83, 38.17 → 39.05); cornice 2.00–2.72 (60.96 / 38.90); steps 2.72 / 3.14 / 3.55 / 4.20 / 4.75 / 5.25, outer 60.32 / 59.46 / 58.81→58.27 / 58.18 / 57.82 / 57.45, inner 39.20 / 39.30 / 39.35→39.80 / 39.90 / 40.10 / 40.45 | [measured]; the set-backs scaled ×0.90 [estimated] |
| The arch member's end | PL-XI: the iron ends at **3.42** (±0.05), at PL-VII's shaft top. PL-VII: it enters the collar at **4.36** (as the pier is drawn; 4.58 by the rabattement rule). PL-I: meets the collar's top at **3.96 / 4.27** (the fin audit 3.91 / 4.02). Within 2° of vertical below 4.4 (PL-XI) to 5.7 (PL-VII). | 2.95 | the collar's top **4.30**, 1.25 under the pedestal's top; the arc is 0.5° off vertical there. The iron's hidden metre inside the stone is built plumb to 3.42 (§26). | [measured] |
| The pier (PL-VII, from the ground; tops as drawn / by the rabattement) | plinth + base 1.09 / 1.66, 1.81–1.93 wide, flaring 0.50 toward the opening; rusticated shaft 3.05 / 3.41, 1.35 at the margins and 1.51 over the bosses; neck band and fillet 3.37 / 3.69, 1.31–1.43; capital block 3.92 / 4.19, 1.57; flared neck 4.24 / 4.47, 0.70; collar 4.36 / 4.58, 0.86–0.90. PL-I puts the capital about 1 m lower (a 65 px pier). | base 0.75, shaft 2.20, capital 2.75, collar 2.95 | base 1.07 (1.93), shaft 3.01 (1.50), band 3.32 (1.37), capital 3.87 (1.60), neck 4.00 (0.72), collar 4.30 (0.90); the collar reaches down past the member's tilted end, whose lowest corner is at 4.03 | [measured], ×0.986 to the collar |
| The bracket | Ties top down: PL-XI **12.48 / 11.50 / 9.05** (fin: 12.51 / 11.50 / 9.07); PL-VII **12.65 / 11.48 / 9.20** (fin: 12.45 / 11.32 / 9.13). All are referenced to the node line 6.40 or panel 1's mid line 11.90, a few metres off. The top tie is 0.6 above that mid line, not on it. The strut leaves the upright at the lowest tie's node and meets the arch at **6.62 / 6.66** (fin: 6.70 / 6.74). | 11.90 / 11.00 / 8.55, strut to 6.00 | **12.52 / 11.45 / 9.11**, strut to **6.68** (the means) | [measured] |
| Terrace balustrade | PL-XVIII Fig. 3 (63.0 / 63.3 px/m on 70.69): on every face it runs to the gallery's mid-bay columns at **±15.53** (ends at ±15.48–15.67), each end turning back to a post. Français and Russe: broken over the centre bay, ±3.88, with two curved flights down to the gallery. **Bar and Théâtre: unbroken.** Printed « 2.60 » to the gallery's column axis (measured 2.52–2.70) and « 1.52 » from the pavilion's front. | ±3.88 → ±11.65 on every face, its axis 2.76 in (0.16 behind the step) | ±15.53, broken over ±3.8825 on faces 2 (−z, Français) and 3 (−x, Russe), unbroken on 1 (+x, Bar) and 0 (+z); its outer face flush with the step's, axis 2.65 in | [measured] |
| Lift openings, 1st deck | PL-XVI Fig. 9 (« plancher entre les arbalétriers », 1:500 on its 16.35) and Fig. 10's joists. A slot on the leg's diagonal from the V at corner a, with edges on t − \|s\| = 23.9 (0.8 past a's axis), to an end member at **32.25 ± 0.3** (1.5 short of the leg's centre). Its sides are girders at **±2.70** (5.24 clear) from 26.6 to 31.3, chamfered to ±1.9 at the end. The leg's interior is otherwise a joisted floor. PL-XVIII Fig. 3 puts every station, Otis and Roux alike, at t 24.5–32.5 with the car within ±2.2. | solid: the Otis and Roux tracks crossed it in all four legs | open in all four legs: the V in three steps from 24.6, ±2.62 from 26.52 to 31.30, ±1.90 to 32.40 (32.10 until the rigid Otis car's sweep, 32.30, was measured; §11.8) | [measured] |
| Lift openings, 2nd deck | PL-XVI Fig. 12 (1:200, 78.1 / 79.1 px/m on its printed column chain): piles 1 and 3 are marked « Ascenseur inférieur » and **open**; piles 2 and 4 have the same frame, joisted. A neck **3.800** wide between the track's girders runs from a header « 2.8048 » past a (10.765) to 12.117. 45° struts widen it to girders **5.500** apart (5.33 clear) from 12.9. Chamfers « 0.9017 × 0.526 » bring it to ±2.1, and the end girder is at 10.765 + « 6.1452 » = **16.910**. The triangle between the header and a has no joists. | solid: the Otis tracks crossed it | open in the Otis legs: ±2.02 from 10.30 to 12.55, ±2.33 to 12.97, ±2.665 to 16.25, ±2.10 to 16.83 | [sourced; measured] |

### 24.3 Measured on the cooked model

All figures are for `buildEiffel(1889)`, riveted and plain.

- **Pedestal.** Its top is at 5.55 and its outer foot at 62.453. Its profile is exactly the table above.
- **Pier.** Its parts are 1.93 / 1.50 / 1.37 / 1.60 / 0.72 / 0.90 wide, with tops at 1.07 / 3.01 / 3.32 / 3.87 / 4.00 / 4.30. The arch member's axis ends at 4.165.
- **Bracket.** Its paths lie at 6.68, 9.11, 11.45 and 12.52.

**Collisions.** The lift boxes and hand rails were tested against every other triangle by an exact separating-axis test with each box shrunk 1 mm.
- The Otis and Roux tracks no longer meet either deck. Before, they met them in 66 + 24 triangle pairs.
- No stair meets a deck after `STAIR_OPENINGS` took the lifts unit's new stairs (§21). The ground stair's arrival in piles 4 and 2 now opens at s −1.58…−0.52, t 31.34…36.91. The old s 2.02…3.18 well is gone. e1 opens at s ±0.40, t 15.12…19.09 in every leg: wider than §21's s ±0.35, t 15.23…, because its stringers graze ±0.35 and start at t 15.18, inside the slab (an independent check found them 54 mm into it at §21's figure).
- The parked cars meet nothing but their own chassis.
- The pedestals meet nothing. That covers the uprights, the base ties, the central posts, the tracks' feet and the ground stair's start. The old box crossed the uprights, the bracing, the tracks' feet and the ground stair: 288, 56–64, 768 and 80 triangle pairs, by two independent tests. The skirt's plates stop 0.02 short of a hole that follows each upright's horizontal section: 1.33 × its 0.41 half-width, as measured on the cooked skin.

**Contacts left, all joints by design.**
- The member stands in its collar.
- The bracket's bars end on the arch's axis and on b's.
- Against the legs the bracket meets the same members as before: uprights 1,104 → 1,120 pairs, horizontals 524 → 424.

**Normals.** No class has a zero normal. `ffArcadePlates` now keeps its extrusion's normal; it had dropped it, and so held 25,632 zero points in the arches class. In `ffArcadePlates`, `fitOut` and `fitOutCurved` every stored normal is unit, flat and agrees with its triangle's winding. (The same check finds 8 triangles of the legs' uprights near y 57.5 reversed, outside this section.)

### 24.4 Disagreements and open points

- **The pedestal's top.** PL-I (5.45–5.53) and PL-VII (5.65–5.74) agree. PL-XX's section puts the ridge at the rounded inner corner at 6.89 ±0.1. The model follows the two elevations.
- **The pedestal's upper profile.** PL-I draws steps and PL-VII a concave sweep; PL-XVIII's note says it is an inclined, glazed facing on iron trusses. The model builds PL-I's steps.
- **Not built:**
  - the rounded inner corner, a quarter circle of about 3 m;
  - the base mouldings' further projection in plan (61.77 on PL-XVIII against the face-on 62.45);
  - the ring's inner walls;
  - the 35.08 floor inside.
- **The pier's capital.** PL-I puts it about a metre lower than PL-VII. The model follows PL-VII, the plate at five times the scale.
- **PL-XI's 3.42 is the iron's own end, about a metre inside the stone.** Its hidden metre sits inside the collar and capital, built plumb on the pier's axis (§26).
- **The 2nd floor's opening begins 0.5 nearer a than the plate's header.** It runs from 10.30 where the plate has 10.765, into the unjoisted triangle. The reason is that the model's rail line there is `lifts.ts`'s estimate: its track crosses the floor from 10.38. The neck stands at ±2.02, the girders' flanges plus 0.035, where the plate's deck meets their webs at ±1.90. Both openings leave their chamfers decked and step their V's.
- **No car is placed at either floor.** `lifts.ts` builds its cars level for the 54.6° run below node XXIV only. The openings were therefore checked against the tracks and the parked cars. In plan the cars (3.169 and 3.27 wide) fit the 5.24 and 5.33 clear widths. A car's swept path through the steeper panel 6 is not modelled.
- **The +z face** is drawn on PL-XVIII as the Théâtre that replaced the Restaurant Flamand after 1889. Its unbroken balustrade is carried back to 1889 [estimated].
- **Superseded:**
  - §17.1's end, pier and bracket heights, and §17.2's pedestal bullets;
  - §18.1's pedestals row and its terrace-balustrade extent;
  - §18.2's `PEDESTAL` bullet. `PEDESTAL.inner` and `.innerTop` are gone; the tiers replace them.

### 24.5 Where the first floor meets the uprights as built (2026-09-26)

§27 rebuilt the lower uprights as PL-XXXI's box; `firstFloor.ts` still cut its ends to the old swept skin. The joint was re-read on PL-XI f56 (Figs 3, 5, 10, 11, by their printed dimensions) and every place the floor meets an upright re-fitted. Tags as in §0.

| Element | Plate reads | Was | Now | Tag |
|---|---|---|---|---|
| b's (and d's, a's) web across the face | the box's plan square, faces in the face planes (§27) | 0.4495 from the axis (the 0.41 skin carried across) | the plan half, 0.4385 (`UPRIGHT_BOX.planHalf`); the web leans with the leg's side face, 78.36° to the face plane, so 0.30 off the plane it stands 0.068 nearer or farther across the face | [sourced text; derived] |
| The joint | Figs 3 and 5 ("Attache de l'arc sur l'arbalétrier", sections square to the upright): the arch's face plates are riveted by angles to b's WEB, 284.8 either side of its centre line and 118.3 in from its edges (at a joint 121.4 / 109). Fig. 11 (section AB): the arch is a caisson 0.558 deep (0.279 either side of the face plane), its b side the web itself, its section cut to the web, 0.627 and 0.512 wide on its two faces, beside the printed 78°21'44" | each end square to its axis, cut to the rolled skin: a wedge open one side, buried the other | every member lands on the web, its end cut to the web plane | [sourced drawing] |
| The fin | Fig. 11 draws the fin's two angles on the web's centre line, between the caisson's plates, inside it | — | not cut: `builtup.ts` and `legs.ts` unchanged. It stands into each landing member, which draws the caisson closed | [sourced drawing]; the closed caisson [derived] |

**What is built.** `landAt` runs each landing end (the extrados, montants 9–14, the decorative girder's short end posts and the diagonals to their tops) on along its axis until all four corners reach the web; `toTheWeb` then brings every vertex past a web back onto it along its member's axis, so each side keeps its plane and normal and only the end turns onto the web. A member meeting the web at a sine under 0.3 (the intrados at AB, the fillet, the heads) and the flat pieces (plates, ironwork) are cut across the face instead. The arcade's plates and heads are laid out per plane to the web in their own layer, 0.042 nearer on face 1 of the outer arch and 0.042 farther on face 4 of the inner. The extrados's last two steps share the stretch to b (0.83 of a step each), since its cut runs 1.73 m along it. The cut sets' seam rows are kept out of the boxes.

**Measured on the cooked model** (`buildFirstFloor`, the +x+z leg, against the census's analytic box, tests/eiffelArchEnds.test.ts; plain and laced alike unless said):

| | Before | After |
|---|---|---|
| Extrados end (4) | corners 103 mm inside to 245 mm off | all four on the web (0.0) |
| Montants 9–14 ends (24) | one corner 56 mm off, the others 34–215 mm inside | 0.0 |
| Decorative end posts (4), at y 48.5–49.5 | 67 mm off / 159 mm inside | 0.0 |
| Diagonals to their tops (4) | 161 mm off / 139 mm inside | 0.0 at the plain depth; the laced struts: nothing inside, nearest 0.0 |
| Vertices inside a box below XXIV | 1,396 at the plain depth, to 239 mm | 0 |
| Plates and heads nearest a's web (inner arch) | 55.9 / 3.3 mm off | 0.0 |
| Fin, laced | — | every landing end's footprint spans the fin and its flats (±0.10) |

**Residuals.**
- **The intrados at AB**: its outward side is cut onto the web; its inward side stands 67 mm off at the tangent point. Fig. 11 closes both faces on the web; the square member cannot without widening one side.
- **The ironwork** is laid out once, to the web at the face plane: on the web at b, 45 mm short of a's web on face 4 of the inner arch.
- **Rivets** (the riveted tower, heads more than 2 mm inside a box): `ff.arches.montants` 301 → 48, `ff.girders.endPosts` 172 → 56, `ff.arches.chords` 272 → 257, `ff.girders.web` 108 → 128. A seam row's `keep` reads the member's axis, not the head, so a head on a surface the cut took away stays inside, hidden in the closed box; the 20 new ones are the laced diagonals' lacing heads past their cut ends (strut.ts places them).
- **Still run to b's axis** by convention, hidden in the box: the girders' chords (the decorative girder's membrure and top chord among them, up to 0.44 in), the grande poutre's end diagonal (above XXIV, where the cut stops), the bracket and the 2nd floor's bands.
- **Grazing cuts lie in the web's plane**: where a face is cut across the face (the fillet's last segment, the heads' edges, the intrados' outward side) it is flattened onto the web's outer surface, which may z-fight at the plain depth (materials are double-sided); not yet checked in a render.
- **The laced girder diagonal** is an open strut: the fin shows through its lacing rather than entering a solid.
- This supersedes §27's "The first floor" residual bullet.

## 25. The chords' joints: no plate on a flat, and the rivets a flat does carry (2026-09-26)

Compiled for `legs.ts` (`beltRivets`, `tieRivets`, the landings note in `postCrossings`) from PL-X and PL-XII at full resolution (e-rara IIIF 8976371, 8976373), read twice independently. It settles the backlog item "plates on the belt and tie chord flats", which a crossing-plate attempt had failed (96 plates in air, 64 through the first floor's deck).

### 25.1 Readings

| Girder | Plate reads | Was | Now | Tag |
|---|---|---|---|---|
| Base ties A, B: bar to chord | PL-X Figs 2, 7, "Barres de treillis — Attache sur âme (Entretoise A / B)", 1:10: web "Ame 200x9" (Fig. 9 "Ame 200x8") with one "Corn: 80x80x10" along its outer edge; each "70x70x8" bar laps onto the web with 2 rivets on its axis, no plate. Fig. 2 prints the first "42" below the working line where a joint's bars meet ("70" from the outer edge; Fig. 7 "74"), the second "58" beyond it and "30" off the inner edge; the pitch along the bar follows the bar's angle ("64,5" on Fig. 2's steep bars, "100" on Fig. 7's shallow one). The bars run on over the web to the angle's toe, 80 in | no rivets | 2 rivets per bar end on its axis at those depths taken from the MODEL's working line, the chord's axis (110 in on its 0.22): 0.042 past it, then 0.058 on but no nearer the inner edge than 0.03, so 0.152 and 0.190 in; at least 0.042 apart along the bar. Taken from the outer edge instead (112, 170), a joint's two bars put their first heads 12-30 mm apart (320 pairs) because the model's bars meet 40 mm deeper than drawn. Heads on the bar's two faces. The bars' run past the axis to the toe is not built (`tie()`) | [sourced] depths; the shift [derived] |
| Base ties: edge row | one row through the angle, 40 mm in from the outer edge, pitch about 130 (Fig. 2 at 2.35 px/mm) | none | that row on both faces of both chords, broken where the central post stands and 0.02 clear of the uprights' faces at its own height | [measured] |
| Base ties: the post | Fig. 9 "Coupe AB" (1:5): "C.j. d'âme 120x6", "Ame 200x8", "C.j. d'âme 200x6", "C.j. de cornière 65x65x10", "Corn. 80x80x10": a web SPLICE where the "877" post crosses | — | not built (the splice unit) | [sourced] |
| Panel 5: post and bar to chord | PL-X Figs 14, 17: "Ame de 500x10" with its edge angle's single close row; posts "Corn: 80x80x8" riveted on the web, 2 lines of 4; bars "Corn 80x80x8" ("Ame 120x6" on one) 2 lines of 4-5; the two bar families on opposite faces of the web; no plate at any chord joint. The gussets are the posts' mid-height squares ("Epaisr 8 m/m") and, at a chord's END, the upright's "Gousset 8 m/m" with a "Couvre-joint" "1,600". Measured at 1:50 (0.2365 scan px per mm, checked on Fig. 17's "3,8825", the "500" web and PL-XII's "1,681.3"): the edge row 51-65 in, 31 heads over a 3,8825 bay (0.129; local 131-139); the angle's toe 108-118 in; posts' lines 91-96 apart, pitch 92-107, the first 30-40 off the web's inner edge; bars' lines 100-108 apart, pitch 105-117; posts and bars both run on over the web to the toe | posts butting on the chords' inner edges; no rivets | posts run on over the BOTTOM chord's web to the toe, 0.113 in (not at the top chord, which lies in the 1st floor's deck; running them on there put 48 of the 64 into the slab); the edge row 0.06 in at 0.129 on the bottom chord; post laps 2 lines ±0.047 of 4 at 0.10, the first 0.035 off the inner edge; bar laps 2 lines ±0.052 at 0.11, as many as fit between the inner edge and the bar's end on the chord's axis: 3 of the drawn 4-5 | [sourced] pattern; spacings [measured] |
| Panel 11 | PL-XII Fig. 1: "Ame: 450x8", "Semelle 300x8", a single row along the edge; bars "Corn: 80x80x8", posts "Corn: 70x70x8" straight on the web, 2 lines an end (bars about 5+5, posts 4+4); "fourr 8 m/m" fillers; no plate at a chord node. Measured at 1:50: the edge row 48-51 in, pitch 128 on the bottom chord (13 pitches; the top chord 146 over 20); the toe about 100 in; posts' lines 93 apart, pitch 68-108 (irregular); bars' lines 92-95 apart, pitch about 75 | no rivets | as panel 5, bottom chord only: posts to the toe, 0.10 in; the edge row 0.05 in at 0.128; post laps ±0.046, 4 at 0.08; bar laps ±0.047 at 0.075, 3 of the drawn 5 fitting before the chord's axis | [sourced] pattern; spacings [measured]; the post pitch [estimated] |
| Panel 10's band | PL-XII: "Ame de 5 m/m" 600 deep, "Corn: 80x80x9" rows on both edges; the "Ame 300x5" bars stop at the edge angle, whose row tightens where each lands; fillers "fourr 5 / 3 / 2 m/m"; no gusset in the band. Panel 10's leg-face X lands on gussets "D" (on the band's top chord, "1,800" x "750") and "C" (under panel 11's bottom chord, "1,860" x "1,060") IN the chord plane | not built | not built (the band's top chord is a laced strut here, not a flat; "C" and "D" are a separate unit) | [sourced] |
| A plate ON a chord flat | nowhere in PL-X or PL-XII | the rejected crossing-plate attempt | none, by source | [sourced] |

### 25.2 Measured on the cooked model

The belts' TOP chords lie in the floor decks: panel 5's at XXIII (y 56.94-57.40) in the 1st floor's 0.60 slab (57.03-57.63), panel 11's at XVII (115.06-115.50) in the 2nd's (115.13-115.73); all 16 of each intersect the platforms class. So they take no rivets, and a plate there would have been buried. The ties clear the masonry. The chord rivets, whole tower at `?rivets`: 19,008 heads (belt 5: 3,456 edge, 768 post lap, 1,568 bar lap; belt 11: 2,336, 512, 2,464; ties: 6,496 edge, 1,408 lap), 874,652 -> 893,660; triangles unchanged at 3,301,812. Every head sits on the face of what it fastens (within 2.5 mm, inside its footprint by a head's radius) with its shank through a chord; no part of its dome more than 2 mm into other steel (probed on its axis from 2 mm to its rise and on a ring at 0.9 of its radius; nearer than 2 mm reads the rivets' own 1 mm jitter), and none in an upright, a deck or another head. No belt post reaches a floor slab: the panel-5 posts stop at y 56.95 under the 1st floor's 57.03, the panel-11 posts at 115.07 under the 2nd's 115.13, as before. Running the posts on to the bottom chords' toes adds no contact with other girders: 8 of panel 5's corner posts touch the grande poutre's main chord at y 50.55-51.29, the same 8 as before. Of each leg's 112 tie bar ends, 88 take a lap group: 16 land at an upright (the chord-end plate of PL-X Fig. 6, not built) and 8 under the central post. The edge rows stop 0.12 short of the uprights' faces: at 0.06 the adjacent face's joint gusset at corner a took 16 heads.

### 25.3 Open

- **The chord-end plates.** Every girder here ends on the upright's 8 mm gusset (PL-X Figs 6, 14, 17: "Gousset 8 m/m", "Couvre-joint 1,600"), which also catches the end bar or post. Not built; it is the upright-joint rule's, not this one's.
- **The fillers ("fourrures")** under the bars on PL-XII are not built.
- **The bars' run to the angle's toe.** On all three girders the bars run on past the chord's axis to the toe and their groups with them (panel 5's 4-5 heads a line, panel 11's 5). Not built: at the toe a V's two bars close on the post's own group. The model's bars take the heads that fit before the axis, 3 a line.
- **Panel 5's mid-bay column.** Both readers find an unclaimed column of rivets on each chord's web midway between posts, where no member lands (one reads 2 x 3, the other 2 x 4 at gauge about 94 and pitch about 102), probably a web cover or stiffener. Not built: the count is not agreed and the plate names nothing there.
- **Rivet diameter** is printed at none of these joints; the heads stay the tower's 38 mm.

## 26. Three leftovers: Plate I's 18.65, the plan bracing's H, the arch's hidden foot (2026-09-26)

Compiled for `platforms.ts` (`THIRD`), `shaft.ts` (`planBracingLines`) and `firstFloor.ts` (`IRON_END`) from E1900-TXT and PL-I, PL-VIII Figs 13–15 on the e-rara scans (8976362, 8976369, full resolution). Tags as in §0. Tests: `tests/eiffelLeftovers.test.ts`.

### 26.1 Plate I's 18.65 at the 3rd floor: carried by no element

- **The text describes the floor twice, and both close it inside 16.56** [sourced E1900-TXT]:
  - p. 79, § 9 « Plancher du troisième étage »: « un carré de 16,56 m de côté à angles abattus, la longueur du grand côté est de 10,90 m et celle du petit 3,15 m ». Its « galerie promenade de 3,00 m de largeur libre située sur tout son pourtour au-dessus des consoles ». Panel 29's top horizontal « se prolonge sur chaque face sur 3,00 m de longueur et vient soutenir la galerie », to the attachments with the consoles and the « poutres de rive » (850), which carry the 1.20 plate parapet. From the corner uprights' outer faces at 5.25 that is 8.25 out, the 16.56's 8.28 within 0.03 [derived].
  - p. 215, the aménagements: « une galerie-promenade en encorbellement à angles abattus, de 3,23 m de largeur … La largeur est de 16,30 m et la surface de 231 m² ».
  - Neither names anything outboard of the parapet. (The 3.15 short side does not close with 16.56 and 10.90, which give 4.00; PL-XIX Fig. 9 draws 45° chamfers on 10.90, which the model builds.)
- **Above it.** The 4th platform is « un carré de 16,60 m de côté à angles abattus », 10.00 and 2.30 sides, its « sablière » on posts « rivée sur la paroi pleine du garde-corps de la troisième plate-forme » [sourced p. 79]. Eiffel's balcony, 0.52 proud (`summit.ts` `BALCONY`), is the widest thing at the level: 16.56 + 2 × 0.52 = 17.60 [derived], PL-I's widest stroke, 17.6–17.7 (§15.1) [measured].
- **PL-I's convention elsewhere.** Its 1st floor's « côté extérieur 70m695 » is the text's « 70,69 m de côté, mesuré dans l'axe des colonnes extérieures » (« 71,69 m, mesuré à l'extérieur du chéneau ») [sourced p. 212]. Read that way the 3rd floor's is 16.56.
- **The pair itself.** The text's own areas for the level are 270 m², « complètement couvert et donne avec les consoles extérieures une surface de 270 mètres carrés », and 272 m² in its footnote on visitors' loads [sourced E1900-TXT, the opening chapters]; the octagon is 258 [derived], the gallery 231 [sourced]. An 18.65 floor would be 340–350. PL-I's 350 fits 18.65² = 348, not the floor. Whence PL-I took 18.65 is not recorded: 2.09 wider than the floor, 1.05 wider than the balcony. An earlier scheme's side is a guess [weak inference].
- **Built:** nothing new. The test holds every output within the band from the consoles' foot to the balcony's railing at or under 8.80 from the axis (the balcony; `summit`), none past 9.325, the deck at 8.28 across the flats and 13.73 on |x| + |z|.

### 26.2 The plan bracing's H at the hash nodes (XVI–XII): the stub, built

- **Read on PL-VIII Figs 13, 14, 15** (Fig. 14 at 11.9 px/m on its « 9.2314 | 5.1372 | 9.2314 »). On the long girder B′ a short member runs in along the other diagonal, TINTED as H′ is and ending, as H′ does at A's centre, on a small I-section. The two thin members parallel to the faces from its end back to B′ carry the two letters K. The letter H stands beside it with a dashed curve that starts at the tinted member's end and sweeps past the letter: a LEADER, not a member. A girder is straight, and the curve ends nowhere. The captions list H at every one of these nodes: Fig. 13's details « Poutre H (Corn. aux angles et treillis en plats … sur toutes les faces) », section « 596 »; Fig. 14 « Les poutres A, B, C, D, E, F, H et H′ sont constituées comme celles de la Fig. 13 »; Fig. 15 « Poutres A, H, H′ et K » [sourced].
- **So H is the stub** from B′ to the K apex, and the code had built it all along, mislabelled K [sourced drawing]. It is H's end, not the K apex alone, that carries the I-section: 4.4 ± 0.5 from the axis on Fig. 14 [measured], among the Edoux's outer guides (`EDOUX_PLAN`: guide S2 at 4.51–4.85, the outboard post at 4.90–5.40). The stub, 1.9 long (`kReach`, 1.7–2.2 measured in §22; 1.91 on Fig. 14 now), puts the apex 4.52–5.10 out, inside that band at every hash node.
- **Built.** `planBracingLines` now labels the stub H. Nothing moves: at each hash node, at both chord levels, H is one stretch on t = 0 from the long girder's chord in to the outboard post's face plus its clearance, s 5.495 [derived], 1.455 / 1.107 / 0.988 / 0.932 / 0.877 long at XVI / XV / XIV / XIII / XII, clear of every Edoux box by more than its chord's half-width. Drawn whole to its apex, it would run into the post, which the test's control shows.

### 26.3 The arch's iron below the collar: a plumb foot to 3.42

- **The reading** (§24.2): PL-XI Fig. 1 ends the iron at 3.42 (±0.05), at PL-VII's shaft top, about a metre under the collar's top (4.30) [measured]. A blind re-read (23.95 px/m on the node grid) puts the tint's end at 3.47 and the drawn end line at 3.27–3.30: ±0.10 is the honest band. Every part of it is inside the stone.
- **Why plumb.** Below the collar the member cannot go on in the face plane. That plane leans 0.503 per metre (panels 1–4), so over the 0.88 down to 3.42 the member's axis would move 0.44 off the pier's, and a 0.60 section leaning with it is 0.67 across horizontally: its side would stand 0.13 out of the 0.72 neck at the neck's top [derived]. The pier is upright and holds it, so the hidden foot is plumb on the pier's axis [derived]; the joint inside the stone, and so its exact form, is [estimated].
- **Built:** 16 feet (2 planes × 2 sides × 4 faces), each a 0.60 square (`ARCH_CHORD`, "600 × 7") on the collar's axis, from the height of the chord's square end, y 4.165, down to 3.42. At 4.165 the chord's axis stands 0.068 out from the pier's, and the two overlap over 0.53 of the 0.60, hidden in the collar. They pass the collar (0.90), the neck (0.72) and end in the capital's block (1.60, 3.32–3.87). A build-time guard throws if a tier it passes is not wider than the member. A separate member set (`ffArchFeet`, class `arches`, last in the class), with no rivet rows.
- **The chord's rows are untouched.** `rivets.ff.arches.chords` has 108,160 heads before and after, compared point for point and bit-identical [measured]. None is inside a pier tier, and no rivet of any set stands on a foot.
- **Measured on the cooked model:** the feet's skin spans 3.420–4.165; every edge, sampled every 5 mm, lies inside a tier of its own pier. Carried down the leaning plane instead, the same check finds it outside.

## 27. The built-up uprights: PL-XXXI's sections as built, supports to XVII (2026-09-26)

The lower arbalétriers (sixteen, supports to node XVII) were a swept square skin, 0.82 below the 1st floor and 0.87 to the 2nd, squared to the tower's faces by an up hint. They are now built as PL-XXXI builds them: `UPRIGHT_SECTIONS` and `UPRIGHT_BOX` in `spec.ts`, laid out by `builtup.ts`. The design study behind it (the section table read off the plate, the audit of the 73 rules that read an upright, a prototype, an independent re-derivation) lives in the working cache, not the tree; what it settled is here.

**The section table** [sourced PL-XXXI, the e-rara scan (pageId 8976398) read crop by crop; PL-IX figs 21-28; the text]. Every member area rebuilds exactly from its printed parts (an angle is t(2L − t): 100×100×12 = 2,256 mm²), all 33 of sections XXVIII-XVIII and all 11 Omegas, except XX b, where the plate writes 2 × 866 × 11 = 19,054 for 19,052 and prints 55,622 (and so Ω XX 222,524 for 222,520): Eiffel's slip, kept as printed. It corrects the older notes (§3.1): XXV b = c = d = 84,792; XXVI c 87,992; XXVII c 87,992 and d 91,192; XXII b 67,908, c 67,544 and Ω **254,784** (not 251,784: the drawing's label, the Ω list beside the elevation and a + 2b + c agree). **Ω below XVIII is ONE leg's four arbalétriers**, not the tower's (PL-XXXI's Nota); at 7.8 t/m³ XXVIII's 366,368 mm² is 2,857.7 kg/m, the text's "2,850 k" [derived].
- Panels 1-5 (XXVIII-XXIV): 4 webs, each face two 400 half plates butted on its centre line; 12 angles 100×100×12 (4 inside corners, 2 per fin, 2 per channel); on each montant-EXTERIOR face a C.J. 205×12 with two angles back to back on it (flat legs over it, outstanding legs a fin about 100 proud); on each montant-INTERIOR face a C.J. 200×12 and two angles with their heels **385** apart, flat legs turned out (PL-IX fig. 21, "207.5 | 385 | 207.5"): a channel, the seat of the montant's lattice gussets [sourced].
- Panels 6-11 (XXIII-XVIII): 4 webs, 4 inside corner angles, one C.J. 200 wide and as thick as its web on every face, no outer angles ("sans addition de cornières de renfort") [sourced]. XVIII c alone is heavier on its two exterior faces (15 webs, 12 C.J.) than inside (8, 8) [sourced D18].
- Which faces are interior, per member, from the montant key (faces 3, 4; 5, 8; 9, 10; 14, 15) [sourced M1/M2]: in the +x+z leg c's −x and −z, b's +x and −z, a's +x and +z, d's +z and −x.
- Section k governs the panel ABOVE node k ("la section de l'arbalétrier [du panneau 5] est celle portant le numéro XXIV") [sourced text]; the base stretch below XXVIII takes XXVIII's [derived].

**The box** [sourced text: "un carré dont les côtés ont 877 mm mesurés extérieurement"; "de même dimension extérieure, soit 877 mm mesurés horizontalement"; "la dimension extérieure du tronçon restât constante"]: a constant 0.877 square IN PLAN from the supports to XVII, its faces in the tower's face planes, thicker plates growing inward. Square to the leaning axis it is a lozenge, **101.64° / 78.36° in panels 1-4**, PL-IX fig. 28's printed 101° 38′ 16″ [derived]. The web widths PL-XXXI prints are its sides, 877 × sin(the angle between the axis and the face's horizontal): 800.0 in panels 1-4, 822.8 in 5, 851.5 / 835.6 for a / c at XXIII, within 2 mm of every printed width from XXVIII to XIX [derived, tests/eiffelBuiltup.test.ts]. **XVIII's printed widths are XIX's** (panel 10's), not its own panel 11's (862.6 for a's 866, 861.2 for c's 854), and **the node table is not the cause** (checked 2026-09-26): PL-XXXI's elevation prints XVII "10.412 | 10.880 | 10.412" (31.704), XVIII "10.4576 | 12.7116 | 10.4576" (33.6268) and XIX "11.32 | 15.68 | 11.32", panels 11 and 10 "4.90" and "10.00" high, which `NODES` carries exactly [sourced, the scan's elevation at 5100,3900 of 8976398]; and the text's in-face angles for panels 6-9, "72° 19′ 56″" and (OCR "70°") "76° 54′ 10″", come out of `NODES` to the second for c (atan(√(11² + 3.6976²) / 3.6976) = 72° 19′ 57″; atan(√(10.2² + 2.44²) / 2.44) = 76° 54′ 10″) [derived]. For panel 11's own lean to give 866 and 854, a's face would have to lean 0.15 and c's 0.235 per metre, which are panel 10's; the printed node widths put panel 11's at 0.187 and 0.196, and no one misread width moves both. XVIII's printed areas are computed from those widths (a: 4 × 866 × 8 + 4 × 200 × 8 + 4 × 2,256 = 43,136). So it is the plate's own reuse of XIX's widths for the belt panel's section, not a node error [derived; whether the plates were cut to them is not stated]. The model builds the box from the plan square, so no printed width is used.

**What the old skin was.** Its 0.41 half-width below the 1st floor was neither the plan half (0.4385) nor the half-side square to the axis (0.400); and a square swept with an up hint put one face pair exactly in the z-facing tower planes but rolled the other **11.6°** off the x-facing ones in panels 1-4 (7.8° in panel 5, about 2° by panel 11) [derived, and re-derived independently]. No half-width fixes a roll: the section is not a square.

**How it is built** (`builtup.ts`): one flat box per plate per panel, in its face, node to node (a tronçon is cut square to its axis [sourced text]), one plate set per leg copied onto the quadrants. Where the column turns (XXIV-XVIII) the two panels' faces meet on the node's HORIZONTAL line (both boxes have the node's plan square there) [derived], which crosses a plate's square end at up to 24° (panels 1-4): no box can mitre on it. Each plate ends where its centre line crosses the node's horizontal plane, run on 30 mm to close the sliver between its end and the next panel's. Sampled over the true faces within 0.35 m of every turn (1.7 M points, 5 mm in from the corners), none is left uncovered and the plate a point shows stands at most 21 mm proud of it or 14 mm short [measured]; at the corners themselves a notch under 10 mm wide stays open 10-40 mm above the node, up to 7.3 mm deep at XXIV and XXIII (2.8 at XXII, under 1.5 above), where the upper panel's face is wider than the lower plate [measured]; the first build ran each end on to the plane bisecting the two panels' normal sections, which left 304 points uncovered and 28-32 mm steps (found by the independent check). Eiffel's tronçons are spliced there under cover plates ("ils s'infléchissent dans le joint", at XXIV [sourced text]), which the splice item will draw. The thickness steps at the node (D5 of the study: Eiffel's joints, where a step can fall, are about 2.25 m either side of it, which side unstated; the plates grow inward, so it cannot be seen). At an ACUTE corner of the lozenge a web's inner edge stands t cos 78.36° past the neighbouring web's outer face, 3.7 mm for the thickest (18.5): a sliver along the edge [derived]. The box's top at XVII lies inside the 2nd floor's slab (its ends 115.34-115.66, the slab 115.13-115.73) and its foot at the supports (2.21-2.79) inside the pedestal, so neither end is capped [derived].

**Depth** (D2 of the study): the webs at every depth, so every rule fitted to the box sees one envelope; the C.J.s, fins and channels from the laced depth up; the seam rows at the riveted depth, today's rule (a row 0.055 in from each corner of each face, every 0.125) re-seated on the true faces, centred on each panel and at least half a pitch off each node. Where the column turns, a row stops half a pitch short of its own crossing of the fold or its plate's end, whichever is first, so no head sits under the next panel's plate. The rows as built (the C.J.s' and the flat legs' rows) are §27.3's, at the `fullRivets` depth. Nothing inside the box is drawn (the inside angles, the diaphragms): a closed box shows none of it.

**What reads it.** The legs' joint rule (`jointUpright`, `jointFace`): a strut keeps the joint's CLEAR off the box's widest in-plane half-width in its panel PLUS what stands out of the face it lands on (every leg-face member lands on an interior face: the channel's 100 in panels 1-5, 0.102 in the member's plane since the face's normal is the lozenge's skew off it; the C.J. in 6-11), and its gusset plates' near edges meet the web itself, the panel's narrowest in-plane half-width. The entretoises meet b and d at the plan square's corner, 0.4385 √2. Measured against the true box by tests/eiffelBuiltup.test.ts's census, which models the box itself and was taken first of the tower from before it: no leg rivet head inside the box (before: 116, lacing heads 13-16 mm deep, where the true box is larger than the rolled skin was), no web-member vertex inside it (before: 888, up to 25 mm), and every strut at least 31 mm off the webs. The lacing that moved with the joint starts turned four post-landing plates at XXII from "lacing behind" to clean by 0.11 mm (tests/eiffelSkeleton.test.ts).

**Residuals, measured, left for their own items.**
- **D3 of the study: the joint plates are today's**, beside the strut (0.400-0.408 off its face plane), not on the channel's legs where PL-IX seats the real gussets. A plate laps its upright's NEIGHBOURING faces 8 mm off their webs, so there a C.J. or a flat leg meets it 4 mm deep and an outstanding leg stands through it: in the +x+z leg, 120 plates are pierced by a channel's leg (up to 84 mm past the plate) and 120 by a fin's flat legs (8 mm), 2 by a fin (32 mm), all in panels 1-5 [measured]. Seating the joint on the channel (the gussets 385 apart) is D3b.
- **The first floor** (`firstFloor.ts`), *as it stood when this section was written — since re-fitted to the true web, §24.5*: it read the old skin: `UPRIGHT_FACE` = 0.41 / √(…) = 0.4495 across the face, from `MEMBERS.upright[0][1]`. Against the true box its arch ends at a's two exterior faces and at b's −x and d's −z stand 2.3-3.0 mm (a) and 9.2-11.0 mm (b, d) off the web at their nearest vertex (y ≈ 41) and 55-59 mm at their farthest (y ≈ 40 and 43): each end is cut to the rolled skin, so it opens as a wedge onto the true web. Those are fin faces, and the fin (112) stands into every arch end. Its girders reach the fins of a, b and d at y ≈ 49.7 [measured].
- **The pedestals** (`platforms.ts`): the hole round each upright is sized on the square skin's lean (0.41 × 1.33 + 0.03 = 0.575 in plan), 0.112 off the true box [measured: the nearest masonry vertex].
- **The belts and ties** still clip at `MEMBERS.upright` (0.41 / 0.435 across the face), inside the box's 0.4385: chord ends bury in the web, a panel-5 belt gusset 8.5 mm in, its posts 21.5 mm off. The ties' edge rows' first heads (0.46 in plan) stand 2.6 mm off the web, but their rims reach 9.5 mm into the C.J. over the landing face's butt [derived]. Re-fitting them changes the chord rows' counts (tests/eiffelChordRivets.test.ts), which is rivets25's work.

### 27.1 The upper uprights, XVII to the top of panel 28 (2026-09-26)

The legs' c, b and d above the 2nd floor and the shaft's eight were a swept 0.25 square skin to the summit. They are now built as PL-XXXI's "Partie supérieure" builds them: `UPPER_SECTIONS` and `UPPER_BOX` in `spec.ts`, laid out by `builtup.ts` (`upperLegPlates`, `shaftPlates` and their seam rows), the same way as the box below.

**The table** [sourced PL-XXXI, crops UP1-UP4 of the e-rara scan 8976398]. Every c, b|d and Ω of sections I-XVII rebuilds from its printed parts (angles t(2L − t): 100 × 100 × 12 = 2,256, 90 × 90 × 9 = 1,539, 100 × 100 × 10 = 1,900) [derived, tests/eiffelBuiltup.test.ts]; Ω is the WHOLE tower's here, 4 c + 8 b|d to XII, 4 (c + bd) from XI. The text's 591,084 for XVII is the plate's 591,684 misquoted [sourced: the plate's own arithmetic].
- XVII-XII (panels 12-17): c a closed box, 2 webs 500 × 49 on its two tower faces, 2 × 500 × 8 inside, 3 angles 100 × 100 × 12 and a 90 × 90 × 9 where the two 8's meet: 65,307. b or d a closed box, 500 × 25 (XVII-XV), 20 (XIV), 10 (XIII-XII) on TWO faces, 8 on the others: 41,307 / 36,307 / 26,307 [sourced].
- **Which faces are heavy**, off the drawings (plan, the tower's exterior at the bottom and the left) [sourced UP3, UP4]: c's two tower faces; b's and d's face in the tower's face and the face toward the face's centre line, away from c (b's toward the next leg's d). So at XI, where the two meet, their two facing heavy faces are the T's stem and their faces in the tower's face its flange.
- XI (panel 18): c a closed box, 51 and 8: 67,307. bd "4 Ames 4 × 500 × 10" and 6 angles 100 × 100 × 12: a T, flange 2 × 500 = **1,000** on the face, stem two plies of 10: 33,536 [sourced; the drawing dimensions "500 × 500"].
- X-I (panels 19-28): c an **open L**, only its two heavy exterior plates (51 at X, 48 at IX-VIII, 32 at VII-II, 25 at I) and 3 angles 100 × 100 × 12 (the heel inside the corner, one at each free edge turned inward): 57,768 / 54,768 / 38,768 / 31,768; bd a **T**, flange 500 × 10 on the face, stem 500 × 8 inward, 6 angles 100 × 100 × 10 (the flange's tips, either side of the stem's root, back to back at its tip): 20,400 [sourced]. The text: "l'arêtier c prend la forme d'un angle droit", "complété et fermé sur ses quatre faces" over the height of each bracing attachment, and the bracing's gussets "sur la branche intérieure du simple T que forme la section des arbalétriers bd" [sourced text]. The plate draws XI's c as a closed box where the text's "sections I à XI" would make it an L; the plate is followed.
- The ply splits (12 + 12 + 12 + 13 for 49, 12 + 13 + 13 + 13 for 51, 11 + 12 + 12 + 13 for 48, 7 + 12 + 13 for 32, 12 + 13 for 25, in their drawn order) are read off small labels [?]; the totals are printed. XII-XIII's c labels add to 48 against the table's 49; the table is kept. The L's local closing plates are the text's, not the drawings' (which draw the L open, and whose areas leave them out).

**The box in plan** [derived]. "500" is taken as the plan square, as the 877 is below: at XI the legs' b and d stand 0.50 apart axis to axis ("250 250", PL-VII Fig. 3; the node table's 0.25), and the merged T is 1,000 on the face, so two 500 boxes touch there in the face's centre plane. Square to the axis a face is then 495.6-500.0 wide (the lean up here is at most 0.13). The faces lie in the tower's face planes, the plies grow inward, the thickness steps at the node, and where the column turns (XV, XIV, XIII, XI, X) each plate ends on the node's horizontal line, as below; panels 19-28 are one straight frustum. The T's stem runs in to the plan square's inner face, 0.49 behind the flange (the printed "500 × 8" plate is 10 mm more, within the drawing).

**The L's closing** [measured]: the text gives no height, so the L is closed by 8 mm plates on its two inner faces over each node's attachments as the model has them: the face lattice's joint plates within 0.35 of the box span −0.99 to +1.04 about every node from X up, so `UPPER_BOX.closure` = 1.05 either side. The plan girders at c (1.00 deep at most) end within it.

**What reads it.**
- The joint rule: nothing stands out of the upper webs (no C.J.s; the plies grow inward), so a strut keeps the joint's CLEAR off the 0.25 plan half, as before. Over panel 18 and at X the merged bd is the 1,000 T: the shaft's merge clearance (0.25 + 0.25 near a face's centre line) used to stop at XI, which left panel 18's diagonals 0.5 mm INSIDE the flange and its horizontals 2.1 mm off it; it now runs to X (`shaft.ts`), and every web member stands 17 mm or more off the upper steel [measured].
- The plan bracing's lozenge girders at a merged bd from X up stopped at the corner of a box the T does not have, their lines 0.18 off its steel; they now run in to its stem, PLAN_CLEAR off its angles (`stemStop`): 0.09-0.10 [measured]. At XI the corner stop stays: the girder's bottom chord lies beside the legs' two boxes there, its top chord 0.18 off the T above. At c the L's closing takes them as the box did.
- Seams: today's rule re-laid on the steel as built: a box's four faces two rows each, the L's two plates at its heel and its free edges (4), the T's flange at its tips and either side of the stem and the stem through its angles at root and tip (8). On b's and d's faces toward the next leg the rows stop where the two faces close to two heads' rise apart, 0.195 below XI [derived]. Every head stands on its own member's steel, none in another's; before, 13,539 of the legs' 49,376 and 15,180 of the shaft's 44,039 stood more than 2 mm off the true faces (the skin's square was square to the axis, not in plan, and the L has no plates where 4 of the 8 rows ran) [measured, the upper census, tests/support/eiffelBuiltupCensus.ts].
- `summit.ts` reads no shaft section: panel 29's corners are its own 0.25 boxes (`MEMBERS.upright`), whose exterior faces at top28 (5.25) are the L's; its posts stand on the T.

**Residuals, measured.**
- The joint plates are today's (D3), ending on the 0.25 line: at a T the outer plate lies beside the flange's edge in its plane and the inner one ends 0.15 short of the stem's tip angles, where PL-IX's gussets would lap the flange and the stem's tip.
- A joint plate's acute corner at XI stands 2-5 mm into the 1,000 flange (6 vertices a quarter, 14 mm in from its tips): the joint's near edge meets the upright at its obtuse corner, the rest of it inside, which inside a T shows; a gap-lattice plate's corner 2 mm into b's and d's corner at XV; the 2nd floor's belt chords run to the axes inside the deck at XVII, inside b and d; the first floor's `ff.second.chords` heads (112) lie inside the boxes at XVII. All as before the change.
- The tronçon joints above XVII (5-7 m apart [sourced text]) are drawn since, with their covers (§27.2); the corner gussets every 2.50 m and PL-XIII bis's details are not.

**Cost** [measured]: uprights 11,328 → 16,896 triangles plain, 34,368 → 49,152 laced and riveted; the plan girders +432; the shaft's bracing −768 (panel 18's shorter struts); rivets: the legs' upper seams 49,376 → 48,984, the shaft's 44,128 → 33,960, the shaft's bracing −96.

### 27.2 The splices: the tronçons' joints and their covers (2026-09-26)

Every arbalétrier is now cut into its tronçons, and every joint carries its cover plates (couvre-joints) and their rivets: `SPLICE` in `spec.ts`, the splices at the end of `builtup.ts`, held by `tests/eiffelSplice.test.ts`.

**Readings** [sourced].
- "La longueur d'arbalétrier comprise entre les axes des entretoises est en nombre rond de 13,50 m et a été divisée en trois parties de 4,50 m ... Par l'adoption de cette longueur, il existe trois joints dans chaque panneau ; celui du milieu correspond à l'entretoise intermédiaire ... les deux autres sont à des distances égales de l'entretoise principale" [text p. 75]: joints at L/6, L/2 and 5L/6 of panels 1-4, each node on the middle of its tronçon. The model's panels 1-4 are 13.50-13.52 along the axis [derived].
- "Quant au joint lui-même, toutes les pièces qui constituent le tronçon viennent s'arrêter dans un même plan normal à l'axe ... les joints sont recouverts par des couvre-joints, dont les sections, ainsi que celles des rivets d'attache, sont toujours au moins égales à celles des arbalétriers (voir pl. IX, fig. 21 à 26)" [text p. 75]. **So no ply is staggered past another**: the backlog's "staggered so no two plies join at the same station" is not the tower's. What steps along a face is the covers' ends, of two or three lengths (PL-IX figs. 21-24).
- Panel 5: "Ils s'infléchissent dans le joint qui existe en ce point" (at XXIV) [text p. 76]; PL-X fig. 19 ("Joint d'arbalétrier entre les panneaux 4 et 5") dimensions "Entre les deux coudes 8,0267" and "Distance au joint 4,01335": a joint at the bend and one mid-panel. The model's panel 5 is 8.0267 long to the fourth decimal [derived, the node table]. PL-X figs. 15 and 18 section the upper bend (XXIII) through "C.J. Sem. 200 × 12", "C.J. d'âme 12 m/m" and "Corn. C.j. 80 × 80 × 15": a joint there too.
- Above XVII: "Les joints sont distants de 5 à 7 mètres ; ils sont soigneusement ajustés et recouverts de couvre-joints" [text p. 77]. The erection chapter: "le joint des tronçons se trouvait généralement au milieu du panneau", and the riveters' platform was raised "pour la rivure soit des jonctions du panneau, soit des joints intermédiaires des tronçons" [text p. 116].
- PL-IX figs. 21-24 ("Joints des arbalétriers", 1:40), outside the box: on a montant-exterior face (figs. 23-24, faces 1, 2, 6, 13 and 7, 11, 12, 16) a web cover "290 × 15" (fig. 24 "295 × 15") either side of the fin, 0.94 long, and an angle "80 × 80 × 15" in each of the fin's angles, 1.34 long; on a montant-interior face (figs. 21-22, faces 5, 10, 14 and 4) "C.j. 380 × 12" between the channel's legs on 12 mm fillers ("Fourr. ép. 12") beside the C.J., "0.54 + 0.54" = 1.08 long, an angle "85 × 85 × 15" in each channel angle, 1.34, and a flat "85 × 12" over each corner angle's row, 1.02 (fig. 22 prints both lengths: 1.08 on the centre cover's extension lines, 1.02 on the strip's, which is drawn about 4 cm off the joint's centre; the model centres it). Inside: "590 × 15" over each web's butt, "70 × 13", the corner angles' own covers. Figs. 25-26 draw the manhole faces (3, 8, 9, 15: "un trou d'homme de 0,50 × 0,345 m est ménagé au droit de chacun des joints dans l'une des faces" [text p. 75]) with a 2.136 cover round a "345 × 520" hole.
- PL-X fig. 19 at the bend: the covers run "380" and "510" into panel 5 and "765" and "965" into panel 4 (the extension lines pair 380 and 765 with the web covers, 510 and 965 with the angles'). It draws the joint LEVEL ("Joints des âmes et des cornières"), not square to the axis: its two "Distance au joint", 2.05549 and 2.41479, differ by the printed 359.3 of obliquity. The model folds its plates on the node's horizontal plane (§27), which is that. PL-X fig. 14 labels the upper bend "Coude de la face" beside a "Couvre joint".

**Where** [`SPLICE`]. A panel of axis length L takes round(L / 4.5) joints at (i + ½) L / n below XVII (panels 1-4: exactly the text's three), round(L / 6) above [sourced for panels 1-4; derived for the base stretch (one, mid-way) and panels 6-11 ("analogues à ceux du premier étage", p. 77: three a panel in 6-8, two in 9 and 10, one in 11); the 6 m estimated, the middle of the printed 5-7]; panel 5 its two bends and its middle [sourced]. The other bends (XXII-XVIII, XV-XIII, XI, X) fall inside a tronçon: the text places no joint at them [?]. Measured: 30 joints an upright below XVII (2 of them bent); above, the legs' c, b and d 12 each over panels 12-17, the shaft's c 14 and bd 14; the upper spacings run 4.55-8.4 m, two in three within 5-7 (the shaft's lower panels give the shortest, its short top panels, one joint each, the longest).

**What is drawn** (laced depth and up, with the C.J.s). The outer covers of figs. 21-24 at their printed sizes on panels 1-5; PL-X's on 6-11 (a 12 mm web cover either side of the C.J. and a 200 × 12 over it, lengths taken as panels 1-4's [estimated]); above XVII one 12 mm cover over each outer plate, 0.94 long [estimated]. Every cover is centred on its joint (fig. 21's strips are drawn about 4 cm off it [simplified]). A cover stops 7.5 mm short of its web's edge (fig. 23's 290 on the 297.5 a 205 C.J. leaves) and, at an ACUTE corner of the lozenge where the neighbouring web's inner edge stands more than 1 mm out of the face (3.3-3.6 mm in panels 1-5, §27), 2 mm short of that edge: fig. 23's 290 becomes 277-282 there [derived]. **At a bend** each half lies on its own panel's face, runs the fig. 19 length, and starts where the whole of it is clear of the fold and of the other panel's plates (which run on past the fold, §27), found by bisection against their boxes: a V of web 1-21 cm long shows between the halves, where the real covers were bent to the angle [derived]. Not drawn: the covers inside the box, fig. 21's "100 × 12" (whose seat this reading cannot place), the manholes (figs. 25-26's faces take fig. 21's cover: no box is cut).

**Rivets** (riveted depth). Each cover carries its own field [measured on PL-IX fig. 23 at its scale, 290 px/m, twice, independently]: the corner angle's row runs on over the cover at its own 0.125; inward of it columns 0.067 apart, staggered, every 0.076 (0.074-0.078), the first and last heads 0.035 off the joint and the cover's ends. Fig. 21's centre cover: a rectangular grid, columns ±0.055 and ±0.158, every 0.064 (0.060-0.066) [measured, 291 px/m, twice]. The angle covers: a row on the flat leg and one through the outstanding leg at the seam pitch, a head either side (on the fin's two covers; on a channel's, one on the cover and one on the channel leg's inner face). The upper covers: the plate's seam rows run on over them, with columns about 0.067 apart between (none across a T's stem). The corner rows stop half a pitch short of the cover over them. Heads under a joint plate go, as the lacing's do (`offJointPlates` in `strut.ts`): 17,440 of 288,224. Only the joints a plate can reach are asked (the bends, the mid-panel joints of panels 1-4 where the intermediate entretoise lands, everything above XVII): with every head asked, no head of the other joints came within 12 cm of a joint plate, and asking costs about 9 µs a head [measured]. Measured on the cooked tower: every splice head on a cover's face (or on a channel leg's inner face), none in any plate, none within a head of another but the two back-to-back heads of a rivet through a channel's leg; no seam head under a cover.

**Counts and cost** [measured, interleaved runs against the same tree without the splices, four each]. Joints: 480 below XVII (30 an upright, 2 bent), 144 on the legs above, 112 in the shaft. Covers: 11,800 boxes, 141,600 triangles, laced and riveted depths. Rivets: +270,784 splice heads (258,208 on the legs, 12,576 in the shaft), −45,064 seam heads under the covers (212,240 → 167,176): 878,000 → **1,103,720** on the riveted tower (+26 %), +14.4 MB of instance matrices at 64 bytes a head. Riveted cook 6.0-6.3 s → 7.3-7.5 s median (+1.1-1.2 s, of which the joint-plate query is about 0.9 s: asked of every head it was +2.7 s). The book's 1,050,846 is the rivets driven ON SITE (the count against it: §27.4).

**Residuals, measured, left to other items.**
- **The joint plates (D3)**: they lap an upright's faces 8 mm off the web, over the covers: 1,104 covers stand 1-10 mm into one, an angle cover up to 41 mm through one. 640 at the mid-panel joints of panels 1-4 (the intermediate entretoise's plates; PL-IX fig. 19 seats that entretoise's gusset square to the face, beside the cover), 440 at the bends (the 1st floor's), 16 in panel 16 (XIII-XII). Seating the joint plates as built (D3b) clears them.
- **The first floor's arches**, whose ends stand 2-11 mm off the webs (§27): 444 of their vertices in a cover at the joints of panels 2-3. **The 2nd floor's chords**, clipped at the old skin inside the web (§27): 242 vertices in panel 11's cover.
- **The first floor's rows** on the uprights' webs over the bends XXIV and XXIII (`ff.girders.main`, `ff.girders.endPosts`, `ff.arches.montants`) run under the covers there: 98 splice heads stand within a head of one of theirs.
- The seam heads that stand in a joint plate (not the splices' doing): 65 before, 50 now.

### 27.3 The rows as built, at the `fullRivets` depth (2026-09-26)

Until now the built-up uprights carried only today's corner-angle rows. PL-IX draws more on every lower face, and they are now laid: `lowerBuiltRows` in `builtup.ts`, `SEAMS_AS_BUILT` in `spec.ts`, the rivet output `leg.uprights.built`.

**Readings** [sourced PL-IX figs. 21-24 at 1:40, the rows outside the covers; figs. 10-17 at 1:20].
- A montant-exterior face in panels 1-5 carries a row down each of the fin's flat legs, through the flat, the C.J. and the web, 0.056-0.057 off the centre line [measured, fig. 23]. It also carries a row through the fin itself, drawn as half circles along it, half a pitch out of step with the flats' rows.
- A montant-interior face carries the two rows of the strip over the half plates' butt (fig. 21 labels it "Sem. 200 × 12", the table's C.J.), 0.052-0.058 off the centre line, on the lines the joint cover's inner columns continue. It also carries a row down each channel angle's flat leg. The channel legs' own rivets (half circles) are drawn only over a joint, where they are the leg covers' (§27.2), so no row runs through them elsewhere.
- In panels 6-11 each face carries the C.J.'s two rows (PL-X figs. 15, 18 section the C.J.; the rows are taken as in panels 1-5 [estimated]).
- Every row is at the seam pitch, 0.125 (`UPRIGHT_SEAMS`, measured on the 1:20 gussets). The 1:40 joint figures draw them 0.10-0.15 apart: 0.15 in fig. 21, about 0.12 in fig. 22, 0.10-0.14 in fig. 23.
- The "double staggered rows" of the backlog are figs. 10-17's strips where a gusset is riveted to the tronçon. Those are shop rivets on plates the model does not seat where PL-IX does (D3, §27), so they are not drawn. The staggered fields of the joints' covers are §27.2's.

**What is built.** Each row is centred on its stretch and at least half a pitch short of its ends: a straight node, or at a turn the first of its fold, its piece's end and the next panel's same piece's end. Each row stops half a pitch short of any cover over its line. A rivet through the fin is laid as its two heads, back to back at the same stations. Both heads are asked about the joint plates at one point on the fin's centre plane (`throughHeads` in `strut.ts`), so a rivet keeps both heads or neither. Asked one head at a time, 912 heads had lost their partner. A stretch too short for two heads is left bare: a resample always lands both ends of a path. Heads a joint plate stands over go (`offJointPlates`).

**Counts and cost** [measured, interleaved runs, four each]:
- Heads: 133,000 laid, 120,368 kept. The riveted tower goes from 1,103,720 instances to 1,224,088 at `fullRivets`, +7.7 MB of instance matrices.
- Cook time: 6.85 s → 8.01 s median (the independent check measured 6.73 → 8.24).
- The default riveted depth is unchanged: 1,103,720 instances, bit-identical to the tree without this change, 6.85 s against 6.79 s.
- Because it adds that much, the rows are gated behind their own flag (`Detail.fullRivets`, with `rivets`). The page does not expose it yet (a `?rivets=full` would be one line in `main.ts`).

**Measured on the cooked tower** (`tests/eiffelRivetCount.test.ts`):
- Every head is seated on a plate of the upright and none is inside any plate: the upright's, a joint plate, a cover.
- No head lies under a cover.
- No head is on another head, except up to 50 heads (50 measured) near the first floor's girders' own rows on the faces at XXIV-XXIII; 72 since the lacing's crossings (§27.5).
- Every head on the fin has its other head back to back with it.

### 27.4 The rivet count against the book (2026-09-26)

**Readings** [sourced].
- "Le nombre total des rivets posés sur place, a été de 1.050.846" [text p. 113]: the rivets driven ON SITE, not the tower's. The same page splits them by period of the erection: 189,580 for the four first panels (to 4 Dec 1887), 235,809, 283,898, 162,184, 100,739 and 50,868, and 27,768 to finish the riveting.
- The legs stood 28 m high, at panel 2's top entretoise, with "le nombre des rivets posés à 98.000" [text p. 103].
- The shop drove the rest: the pieces arrived "préparées jusqu'à l'extrême limite ... la plupart des rivets étaient posés" [text p. 100], and the shop's 6,360 t exclude "le poids des rivets posés sur place" [p. 101]. No shop count is printed anywhere in the text.
- **The 2,500,000 for the whole tower (§7) is a secondary figure the text never prints: flagged.** If it holds, the shop drove about 1.45 M.

**Site or shop** (`rivetClass` in `spec.ts`). A rivet joining two pieces that came to the Champ de Mars separately is a site rivet; one within a piece is a shop rivet [derived]. The pieces were: a tronçon, with its gussets riveted on in the shop ("les tronçons portent en outre rivés sur les cornières les goussets découpés", p. 75); a laced bar or entretoise; a chord flat with its angles. That gives:

| Class | Site share taken | Range | Why |
|---|---|---|---|
| member ends on their gussets (`.joints`) | 1 | 1 | the bar and the tronçon came separately |
| tronçon joints (`.splices`) | 1 | 0.5–1 | "un trou d'homme ... au droit de chacun des joints ... permet d'effectuer la rivure" (p. 75); a cover may have come shop-riveted to one tronçon [?] |
| crossings (`.crossings`) | 1 | 0.5–1 | one bar may have run through, its half of the plate shop-riveted [?] |
| a bar or post on a chord flat (`…Lap`) | 1 | 1 | two pieces |
| everything else (seams, lacing, a flat's own rows, the rows as built) | 0 | 0 | along one piece |

**Counted** as rivets, not heads: a rivet whose two ends the model draws counts once (two heads facing apart on one axis, within 3 mm of it). That covers rivets through a fin or a channel leg, a T's stem, or a belt's flat seen from both sides: 21,647 of 1,103,720 heads.
- The riveted tower is 1,082,073 rivets. Of these, 336,153 are site rivets (32 % of the book), or 191,833 if every cover and crossing was half shop-riveted.
- Shop rivets: 745,920; at `fullRivets`, 856,408.

**Against the book** [measured, `tests/eiffelRivetCount.test.ts`; the tolerance reasoned there]:
- **Never more than the book.** Every site rivet the model draws is one the book counts. At the high share the model stays under 1,050,846 tower-wide and under each period's count by the height that period finished at (10 % for the period edges, estimated).
- **The lower legs.** Here the model builds every piece the text joins on site: the tronçons' joints and covers, the bars' ends, the crossings, the ties.
  - Its site rivets are 60 % of the book's 189,580 for the four first panels, and 61 % of the 98,000 at 28 m. The two checkpoints agree, so the model is as complete in panels 1-2 as in 1-4. Moving either band's edge 0.5 m moves them 3 %.
  - The rest is what the model leaves out: the joints' inside covers' own rows, the corner angles' covers, the manhole faces' longer covers (figs. 25-26), the diaphragms and the anchorages. We reckon that at under half, so the test holds each checkpoint between half the book's count and all of it.
  - **That floor holds at the central reading only**, the covers and crossings all site-riveted. The splices are 90,209 of the 113,185 in period a. Were they half shop-riveted (the low end of their range), the model would stand at 34 % and 35 %.
- **Tower-wide the model draws a third**, pinned at ±2 %. What is missing is site riveting not drawn at all (the platforms' floors, galleries and stairs, the lifts' girders, the campanile) or drawn without being told apart. The first floor's girders carry about 224,000 heads, all classed shop, though their joints were driven on site; 24 of their heads sit on the uprights' plates, which by the rule are site rivets.
- Per period at the high share the model stands at 61 %, 16 %, 41 %, 31 %, 19 % and under 1 % of periods a-f [measured independently].

**Open.**
- Whether the splice covers and crossing plates came half shop-riveted: this is the 0.5-1 range.
- Unit 12 (shop and field tagging) reads `rivetClass`.

### 27.5 The lacing: its crossings riveted, and no batten plates (2026-09-26)

The backlog asked for "tie plates across the chord angles at every strut end, and lacing bars with rounded ends riveted singly at each crossing of the zigzag" (PL-VII, PL-IX). Read against the plates, only the crossings hold, and they are built (`latticeStruts` in `strut.ts`).

**Readings.**
- **The text** [sourced E1900-TXT p. 75]: the panels 1-4 entretoise is a box of "cornières de 80 × 80 × 10 reliées par des cornières de 45 × 45 × 5 disposées pour des raisons d'aspect en treillis double dans les plans verticaux et en treillis simple dans les plans horizontaux (voir fig. 8 de la planche IX). L'attache de ces cornières est indiquée dans la figure 27."
- **The crossings** [sourced drawing PL-X Figs. 12-13, panels 6-9, 1:50]: on the 800 struts' 45 × 45 × 5 double lattice, one rivet at every crossing of the two zigzags, on the face's centre line. At 1:100 (PL-IX Fig. 31) no rivet is drawn on the lacing at all, so that scale says nothing either way. Riveting every laced strut's crossings so, panels 1-4's included, is inferred from those two figures [inferred].
- **The bars' ends on the chords** [sourced drawing PL-IX Fig. 27, "Attaches sur cornières 80 × 80", 1:10]: two rivets a bar, the ends cut straight (not rounded, and not square to the bar). Two layouts are drawn: the two bars side by side in a V, four rivets; or lapped, three, the middle one through both. PL-X Figs. 12-13 draw one head a bar end at 1:50. The model keeps its one head where a zigzag's vertex meets a chord.
- **"Rounded ends riveted singly"** is PL-X Fig. 8, "Attache O" (1:10): flats 55 × 7 with rounded ends, lapped under one rivet on a 70 angle [sourced drawing]. The text puts them in one place only: the base entretoises A and B, whose two walls they tie ("réunies elles-mêmes d'une paroi à l'autre par des plats de 55 × 7 (voir fig. 3 et 8)", p. 76). They are not the web's lacing, and the model builds no such wall ties, so there are none to round.
- **Batten plates.** None are drawn at a strut's end. The gusset sends tongues along the chords, and nothing crosses between them (PL-IX Figs. 10-17 at 1:50). The lacing runs to the gusset's edge (PL-IX Figs. 8 and 31 at 1:100, PL-X Figs. 12-13 at 1:50). The gusset is the end tie, so none are built.

**What is built.** A face's two zigzags cross once a bay, half way between two lacing samples. That holds on the short last bay too, since both run corner to corner over the same segment.
- The crossing points are those segments' midpoints (`pathSegments`). That is exact for a constant section. A strongly tapered strut moves the true crossing up to 12 mm off the midpoint, and the head still lands on the bars [measured by the independent check].
- A head stands on each face's centre line there, on the outer bar, `LACE` (0.0225) off the chords' plane. On the swept lacing that is 0.0225 on all four faces mid-strut. In a strut's end bays the sweep's frame stands the ±N faces' bars 2-4 mm higher, so the head there is sunk, never lifted [measured].
- The crossings are shop rivets, since they fasten the lacing within a bar (`rivetClass`: "along one member").
- A ±N face's crossings are kept off the crossing plates, like its chord heads.
- All four faces' crossings are asked about the joint plates in the lacing's shared query (`plateQueryOf`). A ±B face carries no plate of its own, but a neighbour's joint plate can reach over it. Tested first without that query, 8 heads stood in a joint plate at y 68.
- **The first floor's girder web** runs its struts past the uprights' webs, and `toTheWeb` cuts the cooked steel back onto them. Its lacing heads inside the upright's box now go with the steel (`WebOpts.keepHeads`, `outsideUprights`). That removes 696 heads that stood inside the boxes, most of them there before this change.

**Counts and cost** [measured, `?rivets`, interleaved runs; checked independently]:
- The crossings add +104,680 heads, and the box filter removes 696: 1,103,688 → 1,207,672 rivet instances.
- Per set: the first floor's girder web +36,560 (then −696), the legs' bracing +22,408, the first floor's entretoises +11,760, the legs' horizontals +10,228, and the rest under 9,000 each.
- Cook time: 7.4-7.5 → 8.1-8.3 s. No triangles are added, and the plain and `?laced` depths are unchanged (every output hashes identical): the crossings exist only with rivets.
- The count against the book (§27.4) is unchanged, since these are shop rivets.

**Open.**
- **One head a vertex where Fig. 27 draws three or four.** Going to two a bar would add about 220,000-440,000 heads. That waits for device-resident rivets.
- **The model laces every face with an X.** The text gives the entretoises single lattice in their horizontal faces.
- **Where the girder web meets the uprights (y 48.9-49.1).** In the struts' last bays the cut-back lacing leaves about 49 crossing heads with no bar under them, 9 of them 3-6 cm up. 22 crowd the rows as built on the uprights (§27.3).
- **Heads under other steel.** About 1,100 crossing heads have steel within 3 cm above them, 870 of them in the girder web, about the rate of that set's chord heads. About 200 stand 12-23 mm from a `decoTop` head facing the same way at y ≈ 50.1 [measured by the independent check].
- **Heads inside the uprights' steel from before this change.** The first floor's sets keep 672 such heads: `main` 424, the arches' chords 154, their montants 61, and 33 across five more sets [measured]. They are the first floor's to settle.

### 27.6 Shop and site rivets on the page (2026-09-26)

**The rule** is §27.4's `rivetClass`: one class per rivet output, so the tag is the batch. The page draws every output with a site share (`.joints`, `.splices`, `.crossings`, the `…Lap`s) in a material of its own and the rest in the rivet asset's (`main.ts`, `RIVET_TONE`). No per-instance channel is needed, because no output mixes the two.

**The look.** The book gives no colour difference: the tower was painted over both. What differs is how they were driven. The riveters replaced the erectors' temporary bolts "par des rivets posés à chaud" [sourced text p. 107]. Each gang was four men: "le riveur, le frappeur, le teneur de tas et le mousse chauffeur" [sourced text p. 114]. The book does not say how the shop drove its heads. So a site head is drawn a step lighter and rougher than a shop head, as a hand-closed head painted on the tower [estimated]: 0x684a37 at roughness 0.68, against 0x5c4232 at 0.58. That difference shows close up and not from the ground.

**The toggle.** The "site rivets" checkbox, or `?site` in the URL, lights the site heads orange (0xe0782a) against the shop's, to show where the Champ de Mars riveting was. A "site-driven" line counts the heads it covers. That is heads, not rivets: §27.4 counts rivets.

Rendered on a local dev server at the guide's `rivets-close` pose, both ways: the joint and splice rows light up, and the uprights' seam rows stay shop. There are 349,456 site heads of 1,207,672 (29 %).

### 27.7 Hand-driven heads (2026-09-26)

A hand-closed head is never the snap's exact dome, square on its hole. Every head now takes its own width, rise, lean, turn about its axis and off-centre (`heads.ts`).

**The split.**
- **The graph settles which.** Every rivet carries one draw, `headDrive` in [0, 1), from its own identity (`randomField`: its position with its seed; `rivetSpawn` in `strut.ts`), as a per-instance channel. The same head draws the same value in every cook and whatever order the heads come in.
- **The page settles how, once, at load.** It right-multiplies each instance matrix by the head's transform in the unit head's own frame (`driveHead`, `driveMatrix`): scale by width and rise, turn about y, lean the axis, move off centre, sink.
- **Why not all in the graph.** That was built first, and measured: per-head frame arithmetic over 1.2 M heads, with a node's copy of every head at each step, added about 4 s to the riveted cook. The draw alone is within the cook's noise, and the page's pass is about 0.5 s, once, with nothing per frame.
- **What it keeps.** The graph's instance transforms stay the rule's, so every seat, axis and clearance the tests hold is unchanged. The rim-clash invariants (§27.5 and earlier) still read the same numbers.

**The ranges** [estimated: no source measures a head's departure]:
- Width ±4 % and rise ±12 %. The one original head recorded is 42 mm across (§7), against the model's 38.
- Lean up to 3°, toward any side.
- Off-centre up to 1.2 mm in the plate.
- Turn: any angle.
- Each value is the fractional part of the draw times an odd multiplier. The draw is a multiple of 2^-24, so each value is exactly uniform, at a resolution of about 12 bits, which a head's variance cannot show.

**The rim never rises.** Leaning by θ lifts one side of a rim of radius w by w sin θ. The head is sunk exactly that along its axis, so the rim's highest point stays on the plane the head was set on. The far side goes 2 w sin θ into steel no one sees. The off-centre moves the head in its plane, not off it. The transform stays a rotation times a scale, which three's instanced normal transform handles exactly.

**Measured.**
- Cook time: within the noise at the riveted depth. The independent check's interleaved runs put the change 150-420 ms either side of HEAD on a loaded machine.
- Every rivet output's transforms hash identical to HEAD's. Instances and triangles are unchanged.
- The channel is 4 bytes an instance, and the page drops it once the heads are driven.
- At the guide's close pose the heads differ in size and highlight, subtly. The lean shows at 0.2 m.
- A driven head reaches up to 21 mm from its seat against 19: the clash tests still read the rule's 19 mm heads.

Tested in `tests/eiffelRivetHeads.test.ts`:
- the decode's bounds;
- the rim never rising, with a control that the unsunk lean lifts it;
- the lean;
- the draw's independence of order;
- the channel on every rivet output of the tower.

---

## 28. The arches' ironwork: PL-XI Fig. 14, the decorated panel (2026-09-26)

What dresses each panel of the arch's band, read off PL-XI (scan e-rara 8976372, 8856 px wide) and built by `ironwork.ts`, placed by `firstFloor.ts` (`bandPanel`, `bandIronwork`).

### 28.1 Readings

- **The text.** "Sur les faces intérieures et extérieures, ces tympans sont décorés entre les montants par des tôles de 3 mm découpées en arc de cercle. De même chacun des panneaux des arcs est ornementé sur ces mêmes faces par un motif formé de cornières et de volutes avec macarons en fonte (pl. XI). Les panneaux restent sans aucune décoration sur les autres faces (fig. 18)" [sourced E1900-TXT p. 80]. The supply accounts list "Volutes des arcs décoratifs" among the cast pieces bought in [sourced E1900-TXT, fournitures]. So the "rosettes" of the backlog are these **macarons**, one in each volute's eye; the crossing plates (`crossing.ts`) are another thing.
- **Which faces.** Fig. 1 labels the outer arch's outer face "Face 1, ornementée"; Fig. 14 is "Panneau décoré des faces 1 et 4"; Fig. 18 "Panneau non décoré des faces 2 et 3" [sourced]. That is the code's `PLANES` decorated sides, unchanged.
- **Which panels.** Fig. 1 draws the motif in every band panel from the crown to montant 14, thirteen a half, including the two below where the extrados has died into b (12|13, 13|14), where b's line cuts the motif rather than squeezing it (Fig. 1 at 1:200; Fig. 13 "Partie L" at 1:50 shows panel 11|12 with the frame's head and a volute beside the arbalétrier) [sourced drawing].
- **Fig. 14, member by member** (1:50; 241 px/m on the scan from the printed 2.7173 clear depth along the axis bar, which the 0.60 chords and 0.40 montants give to 4%; the figure is drawn turned about 6° and folded near its middle, so readings are in the panel's own frame, s across and v up the axis from the intrados' face) [measured]:
  - **Frame**: "Ame 160 x 7" on "Corn. 80 x 45 x 7" [sourced]: legs parallel to the panel's axis standing on the intrados, their outer edges on the montants' faces at the foot (leg centrelines at s = -1.11 and +0.99, mean 1.05; the rule gives 1.016); a semicircular head, its centreline's crown at v = 2.10, springing about 1.09; a point of its outer edge at (-0.81, 1.83) is on the rule's circle to 1 cm [measured].
  - **Bars** (the fan): three, "Corn. 100 x 45 x 6" on the axis and "Corn. 100 x 45 x 8" either side [sourced], feet nearly touching on the gusset "Entretoise 120 x 6" at s = -0.14, 0 and +0.21, and blind the second time -0.21, 0, +0.19 (built at 0 and ±0.19, the mean), the axis bar radial to the extrados, the other two aimed at the extrados' corners at the montants and ending about 0.10 short of them (read at (-1.08, 2.65) and ±1.09 for a corner at ±1.19, 2.70) [measured]; built cut square where the bar's edge meets the montant or the chord. Fig. 1 at 1:200 reads as four or five spokes; the 1:50 figure names three and draws three, and that is built.
  - **Volutes**: "Volute en fonte 80 x 45" [sourced], four C-scrolls, each laid along one of the two outer bars over a hatched packing "Fourr." and curling away from it. Eyes [measured]: upper (-0.44, 2.34) and (+0.46, 2.34), curling toward the axis bar; lower (-0.66, 0.34) and (+0.70, 0.33), curling toward the frame's legs, inside the frame. Built symmetric at (±0.45, 2.34) and (±0.65, 0.34). The upper left's centreline reaches about 0.33 left, 0.29 up, 0.25 right and 0.16 down of its eye, which a logarithmic spiral with growth k = 0.14-0.19 fits (radius × e^(-2πk) a turn); built k = 0.19 above (the upper scrolls just touch the extrados, as drawn, and 0.18 lets them past it once the bars' feet are at ±0.19), 0.13 below. The upper scrolls' packing runs v 1.82 to 2.19 along the bar, ending on the frame's head.
  - **Macaron** ("Volute et macaron", 1:10, 1205 px/m): a disc 125 across (150 px) with a raised cross, bolted through the volute's eye; the Coupe EF draws the boss standing over the volute [measured; its relief estimated at 30 mm, the cross 12 mm].
  - **Section CD** (Fig. 16): the ironwork lies in the rib box's face-1 plane: "Volute en fonte", "Corn. 100 x 45 x 6", "Corn. 80 x 45 x 7", "Corn. 100 x 45 x 8" all on that face [sourced]. The model lays it against the montants' faces (0.20 off the rib's plane) like the arcade's plates, 45 deep [sourced legs; the frame's flat taken the same, estimated].

### 28.2 What is built

- **The rule** (`ironwork.ts`): the motif is placed rigidly in each panel's frame; the frame and bars are cut at the opening's top edge (the extrados' face, or b's inner face where b cuts in); a volute is kept only if its centreline stays half its width clear of every edge and of the frame and bars (touching its own bar only across the 5 mm packing, estimated), and its macaron clear by its radius. The tails run the drawing's length or until they butt on the frame's head.
- **The grammar**: a turtle program of `line`, `arc` and `spiral` strokes; the frame is line-arc-line, a volute `kissingScroll`: the eye is placed, and the spiral's start radius follows from the eye's distance to the packing line (r0 = distance / cos(atan k)), so every scroll leaves its bar tangent. Closed form, no randomness.
- **Counts**: 26 panels a plane, 2 planes a face, 4 faces: 208 panels. Panels 1|2 to 11|12 keep all four volutes; 12|13 keeps the lower two, 13|14 the lower one on the crown side: 94 volutes and macarons a plane, **752** in the tower [derived; tests/eiffelIronwork.test.ts].
- **Triangles**: a curved bar is its boundary walled plus its quads capped, 8 triangles a segment, each segment as long as its outer edge's radius allows a chord at most 5 mm off it (`chord.ts`; a fixed 18° step until 2026-09-26, when these were 27,456 and 191,872). Frames and bars at every depth: **38,464**. Volutes and macarons with the laced web only: **+194,688** (6% on the laced depth's 3.3M; at the plain depth's 0.41M they would be half again, and are sub-pixel from where that depth is looked at).

### 28.3 Disagreements and open points

- Fig. 1's four or five spokes against Fig. 14's three: three built (above).
- The volutes are drawn tapering toward the eye; built at their 80 width throughout. The small clip tying each lower volute to the frame's leg (Fig. 14, two rivets) is not built.
- No rivets on the ironwork; Fig. 14 draws them on every bar and the frame.
- The figure's two sides differ by up to 4 cm (the fold); the built motif is symmetric, on the mean.
- A blind re-read (a second reader, not told these numbers) agreed on the topology, the faces, the panel range, the eyes to 3 cm and the frame's crown to 4 cm (2.14); it read the bars' feet at ±0.20 and the outer bars ending 0.10 short of the corners, both now built. It read the macaron's dome in the Coupe EF at about 105 across against the plan's 125 ring; the plan's ring is built. "Corn. 80 x 45 x 7" sits between the frame's leg and the left bar and may name either; given to the frame.

## 29. The top, room by room: the gallery's croisées, Eiffel's pavilion, the contrefiches, the arches' section, the lantern, the rod (2026-09-26)

Compiled for `summit.ts` from E1900-TXT pp. 79–80 (§§ 11–12), pp. 215–216 (§ 3) and its cost table, and from PL-XIV Figs 2, 4, 7–10 (1:50, about 237 px/m), PL-XV Figs 1, 2, 33 (1:50, 236–240 px/m), PL-XVI Figs 22–27, PL-XIX Figs 3–6, 9, 12, 13 and PL-VII Fig. 4 (1:200, all about 60 px/m at full resolution, not the 79–82 of §12.1: each calibrated on its own printed figures). Two readers took the rooms and the top; a third, blind to both, re-derived every number and re-measured the cooked mesh. Tags as in §0. Tests: `tests/eiffelSummitRooms.test.ts`.

### 29.1 Readings

- **The gallery's windows: 24 croisées, not 21.** The cost table prints « Croisées anglaises (Lepage) … 250 la pièce … 6.000,00 »; 24 × 250 = 6 000, so the OCR's "21" is a misread [sourced]. PL-XIV Figs 8, 10 print the posts along a 10.90 side at 0.200 and 0.700 from each vertex (a 0.50 solid pier), then 2.950, 5.450 (the face's axis, "Joint"), 7.950, 10.200 [sourced]: four bays of 2.25 / 2.50 / 2.50 / 2.25. A chamfer, "3.9592", has a post at its middle, "1.9796" [sourced]: two bays. 4 × 4 + 4 × 2 = 24 [derived]. PL-XIX Fig. 3 draws two lights a bay.
- **The gallery's wall.** "Tôle de 1.200 × 3" with a lattice of "Corn. 40 × 40 × 4" riveted on it (PL-XIV Fig. 7; PL-VII "âme de 3", "Treillis 40 × 40 × 4") [sourced]: the parapet is SOLID, as the text's « paroi pleine du garde-corps » says, with its lattice outside. Then the window "1.030" and the "sablière" 0.200 to the balcony's deck [sourced].
- **The balcony's railing.** « trois fers ronds formant les lisses du garde-corps de la terrasse » on the window posts continued (p. 79); "Rond de 25 mm" at the top, "Rond de 20 mm" below, at 1.000, 0.600 and 0.150 over the sablière's top [sourced PL-XIV Fig. 7; the last read from the total].
- **The pavilion.** « un pavillon carré en bois, de 10,50 m de côté … La hauteur est de 2,27 m; la toiture, presque horizontale, est garnie de plomb. Les parois sont doubles et munies à l'intérieur de coton minéral » (p. 216) [sourced]; PL-XIX Fig. 6 prints "10.500", and Fig. 5's "10.680" is its roof [sourced]; the roof's irons are « des fers de 100 mm » on the girders' bottom chord (p. 79) [sourced]; « une poutre double à treillis … logée dans l'intérieur des parois en bois … hauteur de 2,56 m » ties the uprights inside the walls (p. 79) [sourced].
- **Its rooms, on PL-XIX Fig. 6.** The text: « un salon de réception avec cabinet de toilette, cuisine et water-closet, ainsi que quatre petits laboratoires … d'électricité, de météorologie, de physique et de physiologie », and « l'emplacement de la cage d'ascenseur prolongée » [sourced]. The plan labels "Cuisine", "Office", "W.C.", "Coffre", "Physiologie", "Optique", "Cabinet de toilette"; the salon is its furniture (canapé, piano, foyer); two rooms are unnamed [sourced labels, positions measured ±0.15]. The cage is printed "3.90" × "4.210" at 45 degrees on the upper car's line, about 2.7 out toward pile 1 [sourced size; measured place], the check that the plan's Seine side is +z. Each outer wall has four two-light windows (0.87 wide, sill 1.06, head 1.92) and two full-height doors (0.89 × 1.95) either side of a solid centre panel [measured PL-XIX Figs 3, 6].
- **The contrefiches.** « des contrefiches inclinées venant prendre un nouvel appui sur l'arbalétrier d'angle au niveau de la galerie du troisième étage », boxes of « une âme de 600 × 8 » with 70 × 70 × 8 angles (p. 79) [sourced]; PL-XIX Fig. 3 prints "4 Contrefiches des poutres en diagonale" and PL-VII "Contrefiche 600 × 762" [sourced]: one under each end of each girder. Heads under the girder's foot 4.42–5.04 out, feet on a gusset on the corner upright from 309.63 to about 310.9, "4.830" along one, leaning 24–30 degrees [measured PL-XIV Figs 2, 4].
- **The arches' section.** « d'une largeur de 1,300 m; le rayon de leur extrados est de 7,435 m. Leur section suivant un plan diamétral est un caisson de 1,300 m sur 0,77 m », two trusses of « quatre cornières de 50 × 50 × 6 » in the girders' planes (p. 79) [sourced]. PL-XV Fig. 2 prints 7.435 and 6.135 and labels the arches "Parties demi-circulaires des poutres en diagonale" [sourced]; 9 panels a quarter, one every 10 degrees [measured]. The crown's « carré » is printed "770" and "385" [sourced PL-XV, PL-XVI Fig. 22]: the trusses' inner faces on the webs.
- **The stair core.** « le cylindre en tôle de 690 mm de diamètre intérieur servant de noyau à l'escalier tournant du phare » (p. 79); "Diam. ext. 700", "Hauteur totale du cylindre 10m035" from the girders' top 318.985 to the lantern's floor 329.020, which it carries « en son milieu » [sourced PL-XV Figs 1, 2; p. 80]. The spiral stair round it is "1.980" across, 22 steps of 178 to a landing with a 1.200 railing [sourced PL-XV Fig. 2, PL-XIX Fig. 5].
- **The lantern's chain** (PL-XV Fig. 1) [sourced]: terrace 326.715; lantern floor 329.020 (+2.305; the text's 2.342 is the chamber's wall); balcony 329.795; "sablière inférieure" 330.695 (so the 3.980 soubassement); "sablière supérieure" 331.835 (the 1.140 glass); cupola floor 332.360; platform 334.015. The terrace's railing posts rise « 1,090 m » (p. 79; PL-XV Fig. 2: 150 + 300 + 300 + 300 + 40).
- **The decagon.** « un prisme décagonal … dont le côté a 0,80 m » (p. 79) [sourced]: 2.589 across the corners, 2.462 across the flats [derived]. PL-XIX Fig. 13's "2.60" is across the CORNERS (its extension lines leave vertices) and PL-XVI Fig. 24 prints a "1.25" apothem [sourced, both rounded]. The balcony is "3.611" across the flats [sourced PL-XIX Fig. 12, first digit half hidden] on "10 consoles pareilles" 0.775 tall [sourced PL-XV Fig. 33].
- **The cupola.** « la coupole sphérique, de 2,686 m de diamètre … de 2,180 m de hauteur » (p. 79) [sourced]; PL-XV Fig. 1 splits the 2.180 as a 0.755 drum to the "Naissance", 1.300 of sphere to its Ø 0.600 crown ring, and 0.125 to the platform [sourced]. A sphere of radius 1.343 rises 1.309 to that ring [derived], the printed 1.300 within 9 mm. PL-XIX Fig. 4's "2.240" does not close the chain and is set aside.
- **The top platform.** « plancher circulaire en tôle striée, de 1,70 m de diamètre »; « Le garde-corps … a 1,20 m de hauteur, … cornières de 60 × 60 × 8. Cinq de celles-ci sont cintrées … sur une douille pentagonale qui maintient le paratonnerre à 2,05 m au-dessus de sa base » (p. 80) [sourced]. PL-XV Fig. 1: posts on the rim from 0.275 under the platform, rails at 0.230 / 0.530 / 0.830 / 1.130 / 1.200; the bent angles plumb to +1.800, then in over 1.000 (two R 500 arcs) into the socket from +2.800 to +3.050, "Soutien du paratonnerre 3.05" on PL-XIX Fig. 4 [sourced].
- **The rod.** « fixé, sur un trépied, le paratonnerre, dont la longueur totale est de 10,790 m. C'est un fer rond de 60 mm à la base, terminé par trois pointes inclinées de 1,50 m et qui porte le pavillon national » (p. 80); PL-XV Fig. 1 "Hauteur du paratonnerre 10.790", PL-XIX Fig. 4 "10m790"; the tripod's apex "1.000" over the platform on PL-XV, PL-XIX and PL-VII [sourced]. PL-VII prints "10.760" over that apex and PL-I "11m760" over the platform [sourced]: 312.275, the spec's `flagTop`. The points lean about 18 degrees on PL-VII, the only figure drawn to scale [measured, low confidence].
- **The outlines the text gives and the plates do not close.** The 4th platform's « carré de 16,60 m … grands côtés 10,00, petits 2,30 » does not close; nor does the phare floor's « grands côtés 3,40 … petits côtés 0,70 » against the plates' "5.750" / "776" (PL-XV Fig. 2, PL-XIX Fig. 13, PL-VII). The plates are followed (the phare floor stays 4.615 / 0.776).

### 29.2 What `summit.ts` builds now

| item | before | after |
|---|---|---|
| gallery bays | 8 a side, 3 a chamfer (44) [estimated] | **24 croisées**: 2.25 / 2.50 / 2.50 / 2.25 a side, 2 a chamfer, 0.70 solid piers at the vertices |
| parapet | an open X lattice | a solid 1.20 sheet, its 40 × 40 lattice outside |
| window | open to the deck | 1.030, a two-light sash (bar and meeting rail) a bay, the 0.200 sablière over it; its panes §10.11 |
| balcony railing | 2 rails | 3 round bars, 0.15 / 0.60 / 1.00 |
| balcony deck | solid | open for the Edoux car at its top stop, the cables, the Sud guide post, the little stair and the contrefiches |
| apartment | a solid 10.68 box, 278.56–280.98 | a **pavilion** 10.50 square: the 0.15 floor step, 0.25 double walls with 16 windows and 8 doors, the uprights cased in its corners, partitions with 12 doors round the salon, cuisine, office, W.C., coffre, physiologie, two laboratories, optique (physique), cabinet de toilette and the Edoux's cage; the 10.68 roof, 0.10 deep, under the girders' foot |
| panel 29's b/d posts | through the deck to the apartment's floor | to the balcony's beam, on inside the walls |
| contrefiches | none | **4**, 0.600 × 0.762 boxes of two walls, heads under the girders 4.80 out, feet on the corner uprights at 276.8, leaning 27.5 degrees |
| arch section | 1.20 × 1.13 on 0.18 chords, 12 segments | **1.300 radially** (7.435 to 6.135), two trusses of 0.10 chords, inner faces on the webs (0.77 clear), 9 panels a quarter |
| stair core | 285.48–293.215 | **285.485–295.52**, 10.035, through the terrace (a 0.77 square opening) to the lantern's floor, which it carries |
| lantern terrace railing | 1.00 | 1.09 |
| soubassement | a solid decagon 2.60 across the flats (0.845 sides) | an open sheet decagon of **0.80 sides** (2.589 across the corners), the lantern's floor inside it at 329.020 |
| lantern balcony, across the flats | 3.60 | 3.611 |
| cupola | a bulb, straight 0.9, closing to 1.80 | a 0.755 drum and a **Ø 2.686** sphere to the Ø 0.600 ring |
| top deck | a 1.80 decagon | a **Ø 1.70** disc, 0.125 |
| conductor's cage | 8 ribs 1.70 × 3.05, 2 rails | a **1.20** railing of 10 posts and 5 rails, 5 of its angles bent in to a pentagonal socket at 2.80–3.05 |
| flagpole | Ø 0.24 to 0.12, the platform to 312.275 | a **rod** Ø 0.06 to 0.04, 10.790 long, seated 0.030 in a 1.000 tripod, three 1.50 points at 18 degrees, the tips at 312.275 |

Nothing of the girders, the contrefiches, the uprights, the dome, the lantern or the Edoux (the upper car at its top stop, its cables, pulleys and guides) lies inside any wall, partition, floor, roof or deck (sampled at 2 cm; each zero-check has a failing control). Nothing but the core stands in the spiral stair's 1.98 envelope from the girders' top to its landing's railing.

### 29.3 Disagreements and open points

- **The rod's tip.** 10.790 from the 1.000 apex (text, PL-XV, PL-XIX) gives 312.305; PL-VII's 10.760 and PL-I's 11m760 give 312.275. The model seats the rod 0.030 into the tripod's head, which keeps all five figures; nothing prints the seat.
- **The points' lean**, 18 degrees on PL-VII against about 9 on PL-XV's broken, not-to-scale drawing.
- **The balcony's deck** is built level at +2.43; PL-XIV Fig. 2 prints « Pente de 0m03 par mètre », so it rises toward the pavilion by about 0.1. The 0.15 step stands.
- **The gallery's height.** The text's « 2,50 m » under the ceiling against 2.31 clear under the deck here, unless the raised promenade floor (+0.18) is the datum.
- **The chamfer.** PL-XIV prints 3.9592; the 16.56 / 10.90 octagon gives 4.002.
- **The rooms.** Only Physiologie and Optique are named: optique is read as physique, and the two unnamed rooms as électricité and météorologie, in no known order. Partitions are straightened to the plan's two directions, within its ±0.15. The walls' 0.25 is [estimated]. The +x wall's extra opening at 4.46–4.91 (probably the door onto the terrace) is not built, and PL-XIX Fig. 3's second door, drawn 1.1–1.25 wide, is built 0.89.
- **Not built:** the stairs (the little stair's and the campanile stair's openings and room are left), the 8 inclined lightning rods on the balcony (two a face, about 3.4 long, 38–41 degrees out, PL-XIX Figs 3, 6, 9), the Decauville track (0.53 gauge, centreline 7.34 out, PL-XIX Fig. 6) and the Mangin projectors, the 3rd floor's boutiques, buvette and étalages (PL-XIX Fig. 9), the furniture, the entretoise girders inside the pavilion's walls, the cupola's inner floor (0.792 × 2.44), the lantern's optics.
- **Superseded:** §6.4's element assignments for "5.750", "1.700" and "2.686"; §12.2's "The cupola is bulbous" and the top terrace's "1.00" railing; §12.3's lantern bullets and its "Not built" contrefiches and fan; §23.3's "the four contrefiches … hidden in the solid apartment" and "The dome keeps its own section".

### 29.4 The flag and its gear (2026-09-26)

Built in `summit.ts` (`FLAG_SIZES`, `FLAG_SIZE`, `FLAG_GEAR`, `flagHoist`, the gear in `flagGear`) and `flag.ts` (the cloth, and the pose the page flies it by); PL-XIX Fig. 4 read at full resolution, 103 px/m on its own "5.50" and "3.00". Tests: `tests/eiffelFlag.test.ts`.

- **The size: the plate's and the text's disagree.** PL-XIX Fig. 4 draws the flag on the rod, dimensioned "5.50" along the fly and "3.00" along the hoist [sourced drawing]. The text's account of 31 March 1889: « M. Eiffel hissa lui-même le drapeau national, mesurant 7,50 m de long et 4,50 m de large » (p. 311, quoting *Le Champ de Mars* of 6 April 1889) [sourced]. The model flies the PLATE's by default (`FLAG_SIZE = FLAG_SIZES.plate`): the plate draws flag, pulley and rod as one figure, and the ceremony's flag need not be the one that flew through the Exposition. The text's is the other entry of `FLAG_SIZES`, one word away. Open.
- **The gear.** Fig. 4 labels a « Poulie de manœuvre du drapeau » just under the points' spring and a « Corde sans fin du drapeau » drawn down the rod on the flag's side to the socket's head, and the text: the rod « porte le pavillon national » (p. 80) [sourced]. The pulley's centre is built 0.15 under the points' spring and the flag's head 0.39 under the pulley [measured Fig. 4]; the sheave Ø 0.10 on an axle between two cheeks from a collar round the rod, the cord Ø 0.012, and a second sheave 0.20 over the socket's head that closes the endless cord [estimated: the plate draws the cord to the socket and no further]. The cord's two runs hang 0.02 and 0.12 off the rod's foot radius, on the -x side; the flag is bent on the outer run by two clips, its hoist edge 0.02 beyond it.
- **The cloth.** A flat 24 × 12 grid in the rod's plane (`cloth.flag`, not merged, not jittered), its `uv` 0 at the hoist to 1 at the fly. Bleu, blanc, rouge in equal thirds, bleu at the hoist [sourced: the national flag; colours estimated]. It flies toward -x, the tower's north-east, down the prevailing south-westerly [estimated].
- **The motion is the page's, and a pure function of time** (`flagPose`): each row laid out from its hoist point by its segments' headings — the wind's direction, a seeded swing of ±0.17 rad, and a travelling wave growing from the hoist to the fly, 0.35 of the fly long, at 1.2–1.7 Hz with the gusts — so no horizontal edge changes length, no vertical one stretches more than 0.21%, and the fly droops by up to 0.70 m (the plate's size; 0.96 m the text's) in the lulls, and swings up to 1.02 m (1.39 m) off the rod's plane. Three seeded gusts swing the strength 0.42–0.98. `?still` shows t = 0; the capture probe's `setClock(t)` lands on exactly the pose any run shows at t.
- **Clearances** (tested at every 0.1 s for ten minutes, both sizes): no point of the cloth ever comes round past its own hoist line toward the rod, and nothing of the summit but the clips comes within 1.4 cm of that line anywhere in the flag's height band (the cord's outer run, the nearest); the cloth's lowest point stays 2.8 m (the plate's size; 1.0 m the text's) over the lower sheave.
- **Not built:** the flag's own hoist rope and toggles (the clips stand for them), the cord's turns round the sheaves.

## 30. The 72 names, lettered (2026-09-26)

Compiled for `savants.ts`, `letters.ts` and `namesLettering` in `platforms.ts` from PL-XIX Fig. 1 (the plate's name list and its S.E. elevation, as §15.1 read them), checked against the secondary sources and photographs below. Tags as in §0. Tests: `tests/eiffelNames.test.ts`.

| Key | Source | URL |
|---|---|---|
| BARRAL | G. Barral, *Le Panthéon scientifique de la tour Eiffel* (1892): Eiffel's words p. 4, the letters p. 19, the sides p. 21 (secondary; read through the two encyclopaedia lists, which cite it) | — |
| WP-72-FR | French Wikipedia, "Savants dont le nom est inscrit sur la tour Eiffel" (its table's inscribed-name column; the sides after Barral p. 21) | https://fr.wikipedia.org/wiki/Savants_dont_le_nom_est_inscrit_sur_la_tour_Eiffel |
| WP-72-EN | English Wikipedia, "List of names on the Eiffel Tower" ("Name appearing" column, locations NW01–NE18) | https://en.wikipedia.org/wiki/List_of_names_on_the_Eiffel_Tower |
| PH-SE | Commons, "Names on southeast side of the Eiffel Tower, Paris 2011.jpg" (7064 × 376 panorama) and "Augustin-Louis Cauchy on southeast side of the Eiffel Tower, Paris 2011.jpg" | https://commons.wikimedia.org/wiki/File:Names_on_southeast_side_of_the_Eiffel_Tower,_Paris_2011.jpg |
| PH-NE | Commons, "Tour eiffel savants nord est.jpg" | https://commons.wikimedia.org/wiki/File:Tour_eiffel_savants_nord_est.jpg |
| PH-SW | Commons, "Savants tour eiffel grenelle.jpg" | https://commons.wikimedia.org/wiki/File:Savants_tour_eiffel_grenelle.jpg |
| PH-NW | Commons, "Tour Eiffel vue depuis Pont Iéna Paris 12.jpg" (the N.W. face's 18 panels) | https://commons.wikimedia.org/wiki/File:Tour_Eiffel_vue_depuis_Pont_I%C3%A9na_Paris_12.jpg |

### 30.1 Readings

- **The words.** « j'ai décidé d'inscrire en lettres d'or sur la grande frise du premier étage et à la place d'honneur, les noms des plus grands savants qui ont honoré la France depuis 1789 jusqu'à nos jours » (Eiffel, 20 February 1889, BARRAL p. 4) [sourced secondary]. « Capitales, dorées, en relief, de 60 cm de haut » (WP-72-FR after BARRAL p. 19) [sourced secondary]; the book gives no letter height, material or face.
- **The height, measured.** On PH-SE the pilasters stand 390 px apart (3.8825) and the capitals are 60 px tall: 0.60 [measured]. The same panorama gives the names' widths in cap heights: MORIN 3.33, HAUY 2.9, COMBES 4.08, THENARD 5.0 [measured]; the glyphs are set to them (3.47, 2.95, 4.43, 5.20 at the default tracking).
- **The faces.** PL-XIX's list is headed by compass, « N.O. », « O.S. », « S.E. », « E.N. », and its elevation confirms the S.E. list [sourced]. BARRAL p. 21 (by way of WP-72-FR) gives Trocadéro (NW) Seguin … Chaptal, Grenelle (SW) Jamin … Sturm, École militaire (SE) Cauchy … Monge, La Bourdonnais (NE) Petiet … Lamé, and WP-72-EN agrees [sourced secondary]; PH-SE, PH-NE, PH-SW and PH-NW show those lists on those faces [observed]. The research's two notes disagreed on which face the plate confirms (`eiffel-research.md` §5.3: S.E.; `notes-platforms.md` §2d: N.O., "the other assignments OCR-ambiguous"); every source above puts every list where §5.3 put it, so the question is closed.
- **The order** is left to right seen from outside the face [observed PH-SE: … MORIN HAUY COMBES THENARD ARAGO POISSON …; PH-NE ends … PELOUZE CARNOT LAME; PH-SW begins JAMIN GAY-LUSSAC FIZEAU SCHNEIDER LE CHATELIER …; PH-NW reads SEGUIN … CHAPTAL; WP-72-EN numbers each side 01–18 in the same order].
- **The spelling** is what is cast, not what the plate prints. The tower carries **no accents**: HAUY, THENARD, LAME are legible on PH-SE and PH-NE, and both encyclopaedias' inscribed-name columns give AMPERE, BELANGER, GOUIN too [observed; sourced secondary]; the plate's list prints Haüy, Thénard, Lamé, Ampère, Bélanger, Goüin. The plate's « Couchy » is **CAUCHY** on the tower (PH-SE's close-up) [observed], a slip of the plate. The OCR's « Lechatelier », « Leverrier » and « Caü » are LE CHATELIER, LE VERRIER (two words) and CAIL.
- **The letterform.** Plain sans-serif capitals of even weight: a round C and O, a flat-topped A, a straight-legged R, stems about a seventh of the cap height [observed PH-SE, PH-SW]. These are the 1986–87 restoration's letters (the names were painted over early in the 20th century); no 1889 photograph read resolves a letter, so the model follows the restoration.
- **Long names** are condensed and tracked tight to fill their panel, the short ones spaced wide [observed PH-SW: LE CHATELIER and GAY-LUSSAC run pilaster to pilaster].

### 30.2 What is built

- **The text** (`SAVANTS`, `savants.ts`): the four lists as cast, keyed by `FACES`' compass, left to right from outside.
- **The glyphs** (`letters.ts`): A–Z, the hyphen and the space, each built from convex pieces — stems, bars, strokes with horizontal ends, and elliptical ring segments of at most 18 degrees — at cap height 1; no font is read or embedded. Weights and widths [estimated, set to PH-SE]. No accented glyphs: the tower has none, and a character outside the alphabet is refused by name.
- **The fit** (`setLine`, `LETTERING`): cap height 0.60, centred on the plaque and kept 0.06 inside its ends; 0.20 of the cap height between letters, tightened to 0.08 for a long name and then condensed across, never below 0.70 [estimated rule]. 17 of the 72 are tracked tighter and 7 condensed as well: LE CHATELIER 0.778, GAY-LUSSAC 0.858, PERDONNET and POLONCEAU 0.906, CLAPEYRON 0.924, BECQUEREL 0.958, LE VERRIER 0.984 [derived].
- **The letters**: 0.025 proud [estimated], seated 0.005 into the plaque. In the graph each glyph is extruded once and copied onto its 491 letters (`namesLetters`: `copyToPoints` with `sourceGroupAttr`/`targetGroupAttr`, per-letter `rot` and a non-uniform `scale` for the condense); `namesLettering` lists the same solids for inspection, and the test holds the cook to them point for point.
- **The plaques** move from the names class (gilt) to the platforms class, built with the skirt's ornament (`skirtOrnament`, `namePlaque`): painted iron, so the gilt letters read against them as they do on the tower. Same 3.2825 × 0.80 × 0.03, now carrying their normals.
- **Every depth**: the names class goes from 864 triangles (the plaques) to 52,668 (the letters), the platforms class gains the plaques' 864: +53,532 in all, on the plain depth 505,366 → 558,898 [measured]. The cook's cost is within run-to-run noise (plain 516–586 ms at HEAD against 547–571 with the letters, interleaved; `?laced` and `?rivets` swing by more than a second between runs on a busy machine) [measured]. Building every letter as its own prism instead cost about 250 ms on the plain depth, which is why they are copies.

### 30.3 Disagreements and open points

- **Weight and spacing.** PH-NW's letters read lighter than the model's (stems nearer a tenth of the cap height than a seventh) and more widely spaced; the glyphs follow PH-SE's heavier reading. A lighter weight is a change to `letters.ts`' four stroke constants and the S's spine.
- **1889 or restored.** The letterform and the absence of accents are read on the restored frieze; if the 1889 letters differed, nothing read here shows it.
- **Relief and plaque.** How far the letters stand proud, and whether the panels were a separate plate or the skirt itself, are not recorded; the model keeps the plaques (§15.2) and paints them with the iron. The frieze had its own paint contract [sourced secondary: the research's paint notes]; its colour is not modelled beyond the iron's.
- **Superseded:** §10.6's "COUCHY" as the tower's spelling; §15.2's "The names class stays at 864".

---

## 31. The ground: the machine room, the plinths, the supports, the foundations (2026-09-26)

Read from E1900-TXT pp. 85–104 (the foundations, the soubassements, the supports), pp. 88, 96, 193, 199–202 and 207 (the machine room), text pages read on their images where the OCR garbles a number; and PL-II, PL-III (Figs 2–6), PL-IV (Figs 1, 5–8, 13–27), PL-V (Figs 5–6, 11–19), PL-VI (Figs 1, 13–19), PL-XX Fig. 4 and PL-XXI's pile 3 inset, at full resolution. `ground.ts` builds what is under the ground and carries every number with its tag.

**The datum.** The model's ground is one plane at the tower centre's 33.50, y 0 (§0). The Champ de Mars round the piles stood higher: pile 2's walls are « arasés à la cote +35, niveau du sol définitif du Champ-de-Mars » [sourced p. 87], pile 3's are printed at « (35.08) », the piles' floor and the lifts' and stairs' rez-de-chaussée, y 1.58 [sourced PL-V, PL-XX]; PL-XVIII Fig. 3 prints the ground at the centre « (33.50) ». The model keeps its flat ground: everything under it is placed at its printed cote, and what the plates carry up to the higher ground is cut off just under the model's (`CAP`, 0.03 under y 0), where the ground plane hides it until the page's section view opens it.

### 31.1 The machine room under pile 3, its flue and its chimney

- **The floor is 30.50, y −3.00** [sourced p. 88 on its image, « relevé jusqu'à la cote + 30,50 »; PL-III Fig. 4 « Sol général des Machines (30.50) », PL-V Figs 5–6, PL-XX Fig. 4, PL-XXI], as `lifts.ts` already had it; the chaufferie and the coal store 30.00 [sourced PL-III Fig. 4, PL-XXI « Chaufferie (30,00) »]. The research's « +23.50 » for the basement (Fig. 144, p. 164) is the OCR's: the image reads « Sous-Sol (29.50) » (36.880 − 3.41 − 3.97 = 29.50), and it is the Roux wheel's pit in piles 2 and 4, not this room [sourced; derived].
- **The walls**, one box round the pile, 26.08 square outside [sourced PL-III Fig. 4], faces at x 35.62 / 61.70 and z −61.70 / −35.62 [derived from PL-III Fig. 3's « 0.75 + 2.75 » outside the sommiers' lines and « 6.83 + 0.75 » inside, drawn for pile 2 and the same here by Fig. 4's Nota]: 1.50 at the base, 1.10, 0.75 at the top, on a 1.80 footing from 27.10 to 29.00, in lifts of « 2.63 », « 2.30 » and « 1.15 » under the top, so 1.50 to 31.63 and 1.10 to 33.93 [sourced PL-V « Coupe PQ », Figs 5–6; p. 88 « 1,50 m à la base et 0,75 m au sommet » on its image]. Their top, 35.08, is over the model's ground: they stop 0.25 under it, under the pedestal's skirt, which the model sinks 0.16 into its ground, so the 0.75 lift is not built.
- **The plant**, as massing where PL-III Fig. 4 draws it at 1:200 (±0.3–0.5 m) and at the printed cotes of its beds: four Collet-Niclausse boilers in two brick-set pairs along the +z wall with their Ø 0.90 × 2.00 drums and the flue chamber behind [sourced p. 201–202]; the chaufferie behind its parting wall and door « 1.87 » [sourced PL-IV Fig. 14]; the coal store in the W corner with its Decauville track [sourced p. 202; route estimated]; the two Quillacq pump-engines (Wheelock and Girard in tandem), head to tail along the pile's diagonal, their flywheels in the pits Fig. 4 draws under them [sourced; the pits' floor, 28.50 like the condenser's « Fosse du Condenseur (28.50) », estimated]; the Edoux's two Worthington pumps and their condensers; the two Gramme dynamos on one bed between their two compound engines; the Weyher condenser; the 4 hp gas engine and its draught fan, 1889 only [sourced p. 202, 207; PL-III Fig. 4 « Moteur à Gaz (30.36) », « Ventilat^r (30.43) »]; Darnay's condensate tank 2.50 × 0.80 × 1.00, placed [estimated]; the discharge reservoir Ré1 under chequer plate in the E corner, bottom 28.15 [sourced], stopped short of the second engine's flywheel pit. Sizes not printed are [estimated] in `PLANT`. The flywheels are drawn 3.20 across against a pit about 4.5 long, which the model's room, 1.44 lower-ceilinged than the real one, cannot hold; the second engine is taken 0.6 up its axis so its pit clears the parting wall; the first lighting engine 0.2 in, off the wall.
- **The Otis runs through the room**: its motor girders' bed blocks « (30.38) » at (54.0, −54.0) [sourced PL-III Fig. 4] are where `lifts.ts` stands them (its −3.3 against −3.12, inside its ±0.5), and its car track's girders reach 4.4 under the floor; both stand in pits the floor is left open over [measured on the cooked lifts].
- **The glazed cover** was the room's ceiling at ground level, girders and footbridges at 34.94 with a roof-light, 37,784 kg [sourced PL-IV Figs 13–14, PL-XXI « Passerelle (34.94) »; p. 96's « ^7.784 » read as 3 by p. 207's itemised 38,099] — not the 57.8 t of the research. It is over the model's ground and not built; 1889's visitors crossed it to the Otis landing at 37.06.
- **The flue**, a vaulted culvert 1.30 × 1.70, walls and vault 0.35, invert 0.15 [sourced p. 202, PL-IV Figs 16–20], « 116m23 » from the wall's outer face [sourced PL-IV Fig. 15]: out of the +z wall on x 51.1, along the pile 3 – pile 4 centre line, round pile 4's corner and WSW to the chimney [measured PL-III Fig. 2 at 1:1000: the polyline 117.0, 116.7 to the chimney's outer face]. Built as a box culvert, level at y −2.15 (cote 31.35, 0.28 under its sill, 31.63 = 35.08 − 1.15 − 2.30, derived) so its vault stays under the model's ground, with its two manholes [sourced Figs 16–17; the second placed at Fig. 15's midpoint].
- **The chimney**, « dissimulée à droite de la pile 4 », round brick [sourced p. 202], at (99.0, 49.0) ± 1.5 [measured PL-III Fig. 2]: 17.23 over its footing as in 1889, 5.08 + 6.05 + 6.10 [sourced PL-IV Fig. 15], the last lift ending in a corbelled, crenellated crown « 2.36 » high [sourced PL-IV Fig. 21], 2.98 across [derived: 2.30 + 2 × 0.34]; the outlet 1.60, the printed 2.01 m² being a 1.60 circle (the text's « 1,69 » is not) [derived]. Its base shaft's top, « G », is taken at the model's ground, so 12.15 stands clear. PL-III Fig. 2's « Cheminée de 12m30 » matches neither 12.15 nor 17.23. The mound it stood in, and its raise of 1.50 by 1900 when the draught fan went (« 5,00 / 6,13 / 7,60 », 18.73; the OCR's « 1,30 » is 1,50) [sourced p. 202 on its image], are not built.
- **What it costs**: the foundations class 3,848 triangles, the plant 2,040 in the machinery class [measured]; the module cooks alone in about 25 ms, inside the full cook's run-to-run noise.

### 31.2 The plinths as built (PL-V Figs 11–19)

- **What they are**: a hollow iron frame — four trussed girders 2.80 deep on the perimeter walls, inclined « fermettes » 5.40 high at about 1.10, 41,123 kg a pile — clad in cast artificial stone « à gros bossages » by E. Dubos et Cie, the courses « en dehors du boudin » 3.00 high, and a cement « gorge » 2.40 high dragged on site over hoops on the fermettes, « presque au contact des faces des arbalétriers » [sourced E1900-TXT p. 95, read on the page image: the OCR's « 2,00 » is 3,00]. The model's skirt (§24, `PEDESTAL_SKIRT`) already is the hollow shell; the frame inside it is not built.
- **The gorge** replaces PL-I's five steps (§24), which are that plate's schematic of it. PL-V draws a stretched cavetto, nearly level where it leaves the fillet and steepening to 45 degrees, a bead, then a nosing [sourced drawing Figs 15–18]; traced on Fig. 17 (« Coupe IJ », 1:100), the set-back from the foot at heights over the plinth's foot: 1.98 at 3.33, 2.30 at 3.36, 2.64 at 3.44, 2.97 at 3.55, 3.31 at 3.70, 3.65 at 3.90, 3.99 at 4.14, 4.33 at 4.44, 4.66 at 5.00, 4.83 at 5.13, 5.00 at 5.32 [measured], « 2,088 + 2,965 » at the top on the outer faces and « 1,022 + 1,281 » on the inner [sourced Figs 17–18]. PL-VII draws the same concave sweep (§24). `PEDESTAL.tiers` carries it as eleven battered tiers between the fillet (3.14) and the top (5.55): PL-V's heights scaled to the model's band (×1.164), its set-backs from 3.70 up, run in from the fillet's 2.13 below that, the inner faces receding in proportion to 2.30 [derived]; the bead's 0.3 at 4.45–4.9 is left out and the sweep carried smooth across it. At the top the plinth stops 0.16 outside the model upright's horizontal section.
- **The inner corner**: « l'angle le plus près du centre de la Tour est disposé suivant une courbe, le long de laquelle règne un banc » [sourced p. 95, on the page image]. The bench's front, the « Banc » line, is an arc of radius 3.29 tangent to both inner faces' foot, the « Seuil » 0.70 in front of it, concentric [measured PL-V Fig. 12 at 58.6 px/m, the arcs concentric to about 1 px]; the arc stays concentric up the plinth as the faces recede (`PEDESTAL.corner`; `pedestalFaces` now builds each tier between two loops, the square with its corner on the arc, and the rings and coping between them). The sill « 0.70 » × « 0.10 » and the seat « 0.48 » over it [sourced Fig. 19], run back 0.45 under the battered face, which stands for its concave back [estimated]; between the two near piers, whose bases reach 0.13 past the arc's ends.
- **The courses** [sourced drawing PL-V Fig. 15; measured at 58.4 and 104 px/m]: a plain base course and two courses of rusticated blocks, « 0.717 / 0.681 / 0.681 » over the plinth's 2.08; the blocks' faces 0.50 high at 0.87–1.39 and 1.52–2.04 over the foot, 1.53 long with 0.15 joints, the courses staggered, the end blocks at the outer corners about 0.98 on the lower course and 1.40 on the upper, 0.06 proud [measured], all scaled to the model's 2.00 block (`PEDESTAL_DRESS`, `pedestalDressing` in `platforms.ts`). On the inner faces they are cut back to the arch's two piers, the door and the curved corner, as Fig. 16 draws them.
- **The doors**, one on each inner face, « 2.58 » clear on the leg's centre line [sourced PL-V Fig. 16], with an iron grille [sourced]: drawn as a plate 1.90 high, 0.02 proud [estimated], in the platforms class.

**Disagreements and open points (§31.2):**

- **The plinth stands 1.58 low.** PL-V puts its foot on the piles' floor, « (35.08) », in Figs 15–19, and prints its height « 3.00 », « 0.30 », « 2.10 », « 5.400 », so its top is 40.48, y 6.98 [sourced; confirmed by the independent re-read]; PL-XX's ridge at the inner corner, read in §24, is 6.89. The model's plinth stands on its flat ground, y 0 to 5.55: PL-I's and PL-VII's 5.45–5.74 (§24) are the plinth's own height over its foot, entered as heights over the centre's 33.50 [derived]. Its profile agrees with PL-V to about 0.3 once its foot is its own ground. Raising it means raising the ground round the piles (§31), and it would move the arch's piers and ends (`firstFloor.ts`) with it: left for a decision.
- **The arch's socles.** PL-V Fig. 16 draws two socles in front of each inner face, « 3.77 » along it and « 1.80 » out, their caps overhanging « 0.52 », centred about 44.0 and 58.97 from the axis [sourced; measured]. The model's piers (§17, §24, `PIER` in `firstFloor.ts`, from PL-VII) are 1.93 square at their base, centred at 42.30 and 57.30. Not changed here.
- **The plinth's foot square**: PL-V Fig. 12 prints the masonry « 23.76 », « 25.56 » with the socles' projection, against the model's 24.28 (62.453 − 38.17). Placing PL-V's 23.76 on the same outer foot puts the inner foot at 38.69 [derived]; the model keeps 38.17, at the arch pier's base (§24).

### 31.3 The supports: stones, shoes, anchors (PL-IV Figs 7–8, PL-VI)

- **The stack**, along each upright's axis and square to it [sourced PL-VI Fig. 1, « 54°35'26" »; p. 102]: two courses of Château-Landon stone (« pierres d'appui »), the cast-iron sabot B, the shims, the cast-steel contre-sabot A, the upright. Its axis is the upright's; the sabot's sides are square to the tower's faces seen along the axis, its bolt diagonal on the lean line [sourced PL-VI Figs 1, 7–10].
- **The stones**: each course **0.50** thick [sourced PL-IV Figs 7–8, PL-VI Fig. 1 « 0,50 » twice, and p. 87 on its image, where the OCR reads « 0,30 »]; 9.88 m³ a support against the printed « 9,845 m³ » [derived]. Both are irregular **octagons**, not the text's « hexagonales » [sourced PL-IV Fig. 8]: the lower 4.10 along the lean line × 4.00 across, its faces square to the lean 0.97 long and along it 1.63; the upper 3.00 × 3.15, 0.75 and 1.036 (the text's « 4,00 » and « 3,00 » are one of each pair). The upper course's top centre is the « Centre des sommiers (36.00) » [sourced PL-XXXI; PL-IV Fig. 7's massif plus 1.00 of stone closes on it to 0.01, derived]. Château-Landon's best beds, 1,235 kg/cm² [sourced p. 87]. Built centred on the axis; Fig. 7's offset of the lower course on the massif's face is left out [estimated].
- **The sabot B**, cast iron, 5,782 kg [sourced p. 102]: « 1,800 » across its flats, corners rounded (the diagonals « 2,150 », « 2,160 » give r 0.47), « 0,915 » high [sourced PL-VI]; built as a 0.20 flange at the full square and a 1.50 body [estimated from Fig. 1's section]. Its pocket, « Vide pour le passage du vérin », 0.783 square, and the jack's 0.650 × 0.485 opening in one side are inside it and not drawn.
- **The shims**, 0.050 [sourced « en supposant des cales de 50 mm »], 1.10 across [estimated]; **the contre-sabot A**, cast steel, 2,551 kg [sourced p. 102]: its ledge 0.125 and a 0.010 step, a rounded rhombus 1.200 along the lean line × 1.375 across [sourced PL-VI Fig. 12], drawn 1.5 % larger so the whole of the upright's end lies on it — item 8's box as built, whose fins' outer corners overhang the printed rhombus by 4–5 mm [measured; `tests/eiffelSupports.test.ts`]; its spigot into B and its head inside the upright are hidden and not drawn.
- **1.10 from the stone to the iron**: « 1,100 », PL-VI Fig. 8's chain 200 + 715 + 50 + 125 + 10 [sourced], so the upright's dressed end was at about 36.90. **The model's uprights run down to the sommiers' centre itself** — PL-XXXI's line, the supports' node at y 2.50, where panel 1's members also land — so the stack is built under the model's upright, its ledge meeting the box's end exactly, and everything under it (the stones here, the massifs in §31.4) stands 1.10 down the upright's axis — 0.90 lower and 0.64 further out — from the plates' cotes [derived]. One constant, `SUPPORT.stack`, carries the offset; cutting the uprights' first 1.10 (`builtup.ts`, `legs.ts`) would put it all at its printed cote.
- **The anchors**: two bolts a support, 32 in all [sourced p. 87; p. 97 « Pose des tirants 8 » a pile], Ø 0.10 × 7.80, parallel to the axis on the lean line « 1,47 » apart (« 0,599 » either side in plan) [sourced PL-VI Fig. 1, PL-IV], through holes at B's corners; anchored 6.20 down the axis at « (30,947) » under cast-iron shoes 0.625 × 0.35 × 0.30 on a pair of double-T bars « 3m00 » (912 kg a pile, p. 97) [sourced], each bolt in a cast-iron sleeve of bore 0.20 (1,700 kg a pile) [sourced], drawn 0.30 outside; not needed for the tower's stability, only in the cantilevered erection [sourced p. 87]. Their tops rise 1.60 up the axis from the stone (6.20 + 1.60 = 7.80), through the forged stirrup's seat, the « sabot supérieur » 0.10 high and a nut 0.20 high × 0.22 across its flats [sourced PL-VI Figs 13–16]; the rod stands 0.46 over the stirrup, where Figs 1 and 13 draw 0.50–0.56 (the 7.80 governs). The stirrup's V (20 mm plate, 0.74 wide), the two « Gousset de 500 × 8 » it is riveted to on the upright and the lower nuts are not drawn: only the stirrup's seat, 0.34 × 0.30 × 0.02 [estimated]. The bolts pass through the stones and the sabot, whose holes are not drawn.
- **The jacks**: two of 800 t for sixteen supports, piston Ø 0.43, body Ø 0.62 × 0.41, proof-tested at 600 atm, slid in « par une ouverture », their pump « sur un chariot pour la rendre transportable » [sourced PL-VI Figs 17–19, p. 102; the OCR's « 0,4) » is 0,43], the load settled at last on the shims (« régler définitivement les cales », p. 117), and no figure draws one in place. None stood in a pocket once the tower was up [derived]: **none is built**.
- **The skirt round them**: the pedestal's shell (§24, `PEDESTAL_SKIRT`) is 0.20 thick, the cast facing's 0.15 (p. 95 prints « 15 m », a slip) and its relief [sourced], down from 0.40, which reached the c support's lower stone.
- **What it costs**: 7,936 triangles of iron (machinery), 896 of stone (masonry), 3,584 buried (foundations: the anchors' lower rods, sleeves, shoes and bars), at every depth [measured].

### 31.4 The foundations, and the section that shows them (PL-II to PL-V)

- **The massifs**, 16, one under each upright's stones [sourced pp. 86–93; PL-III Figs 3–6, PL-IV Figs 1, 5–7, 25–27]: Souppes rubble in cement mortar, a truncated pyramid with its long axis on the tower's diagonal, extending out from the stones. In the diagonal's vertical plane: a vertical front face 1.22 inside the support point (1.255 at piles 1 and 4) up to « 4,91 » over the base (33.91); the top face square to the upright, carrying the stones, to the peak « 7,46 » over the base (36.46; « 8.500 », 36.50, at piles 1 and 4); the rear face parallel to the leg down to the base, « 8,90 » long there (« 9.610 ») [sourced Figs 7, 27; derived; the rear face's printed 7,47 and 6,05 agree]. The base at 29.00 under piles 2 and 3, 28.00 under 1 and 4, which start a metre lower on their caissons [sourced pp. 87, 92]. Across the diagonal 5.00 to 31.00, 4.60 to 33.00, 4.00 above: the « redans » [sourced Figs 5, 6, 25]. The printed profile plus the stones' 1.00 closes on the sommiers' 36.00 to 0.01 [derived]; the model's top face is the lower stone's underside, square to the axis, so the stones sit flush on it and the printed heights hold to 0.035. The courses, level low and fanning square to the pressure line higher up, are not drawn.
- **The footings** under piles 2 and 3: cement concrete « 10 m sur 6 », 2.00 deep on the gravel, 0.20 before the front face and 0.90 past the rear toe [sourced p. 86, Fig. 7], their bottoms 27.09–27.33 [sourced PL-II Figs 4, 7], taken at 27.25.
- **The lift massif A**, the inner one under upright a [sourced p. 87, « Massif A » on PL-IV], was built round the lift's cage and pit (pile 2's on a footing « 14 m sur 7,40 » with a 5.20 pit, PL-IV Fig. 4; piles 1 and 4 kept at 6.00 on T-irons and brick vaults) [sourced pp. 86, 92–93]. Here it takes the rule like the other three, the 10 × 6 footing too under piles 2 and 3: its pit, cage walls, enlargement and the « 194 m³ » added for the lifts (p. 96) are not built [estimated]. The lifts' tracks and pits, which the model runs 4.4 under the ground, stand clear of it [measured on the cooked tower].
- **The offset**: the massifs, like the stones they carry (§31.3), stand 1.10 down their upright's axis from their printed cotes; the walls, the caissons' neighbours in plan, the machine room and the flue are at theirs. And the model's plinth stands on its own ground, 1.58 lower than PL-V's (§31.2), so a massif's peak, at its printed height over the stones, would come out through the plinth's battered block: each massif is cut back 0.03 inside the skirt's outer faces (`skirtPlanes`) [derived], its cut faces drawn as plates.
- **The caissons**, under piles 1 and 4 only, one under each massif [sourced pp. 88–93; PL-II Figs 10, 12; PL-IV Figs 23, 27, 31]: 15.24 × 6.00 « avec coins arrondis », the first built, pile 4's N°1, 14.24 [sourced p. 90]; the corners' radius 1.0 from the printed « Surface du Caisson 90,60 m q » (15.24 × 6.00 − (4 − π) = 90.58; 84.60 for the short one; the tables' 90.40 is a misprint, their concrete over its depth giving 90.60) [sourced; derived]; their inner end 0.20 before the massif's front face, toward the centre [sourced Fig. 27]. Which under which massif is read off the cotes the plans print under each (PL-II Figs 10, 12, PL-IV Fig. 23, drawn x right, z down as `PILES` lays them out): pile 4 A N°3 (edge 22.34), B N°4 (21.72), C N°2 (21.81), D N°1 (23.38, the short one, « 14.00 », « (23.58) »); pile 1 A N°3 (22.22), B N°4 (21.99), C N°2 (21.55), D N°1 (21.80) [sourced; the edges from the tables pp. 92–93, read on the page images]. The concrete from the « fond définitif », 0.20 over the edge, to the « arasé à la cote + 28 » [sourced]. In 1889 each was solid concrete, the working chamber filled too [sourced p. 92, « Caisson rempli de béton »], inside its iron shell from the edge, 3.00 of wall and two « hausses » of 1.00 [sourced pp. 91–92], drawn 0.03 thick in the machinery class. The shafts and airlocks went from caisson to caisson and were taken away; the two test wells (Ø 2.00, one a pile) are not built [estimated].
- **The walls** of piles 1, 2 and 4: the same 26.08 box as pile 3's, 0.75 thick, on piers between arches of « 5.55 » springing at 33.28 [sourced PL-V, PL-III Fig. 3, p. 87]. The arches spring above the model's ground, so only the piers are built, from 29.00 or 28.00 [sourced]: the arcaded faces' printed run « 4.40 | 5.55 | 1.20 | 5.55 | 2.70 | 4.98 | 1.70 » (26.08) gives them, the 1.20 and the 2.70, on every face from its end at the tower's centre [sourced run; which end it starts from estimated]; where a face is carried by a massif instead (its « 7.22 » arches and « 2.30 » piers) a pier that would run into the massif is left out: 18 are built. The room's walls, floors and pits under pile 3 run into the massifs that stand in its corners and out through its walls, bonded masonry of one class; nothing else of the ground does (tested).
- **The earthing**: two cast-iron pipes a pile, about 20 m, Ø 0.30, 3 m under the platform and a metre under the Seine's level, between the massifs, one end turned up to the ground and wired to the iron [sourced p. 86], so at 26.00 [derived: 29.00 − 3]; in two trenches about 14 apart, « 18.00 » long, from the leg's middle toward the +z face, 13 degrees off square to it [sourced PL-II Fig. 7, pile 3; measured], pile 2's the same mirrored across the tower's axis, toward its own +z face [measured PL-II Fig. 4]; under piles 2 and 3 only (1 and 4 draw none; their test wells served, pp. 89–90). Each turned up just outside the wall, clear of the flue [estimated].
- **The section view** (`?section`, and the panel's "section" box; `section.ts`): the plane PL-XX's section is drawn on, « Coupe verticale suivant la diagonale de la Pile 1 (Nord) à la Pile 3 (Sud) », x + z = 0 in the render. Pile 4's half is kept — its caissons, the flue and the chimney whole — and piles 1 and 3 are cut down their diagonals: pile 1's caissons and massifs in half, pile 3's machine room through the middle. The ground over pile 2's half is taken away, and the camera may drop to look up under the kept ground. PL-XX shows pile 2 beyond its cut; the page keeps pile 4 instead, for its caissons and the chimney [estimated choice]. A piece that crosses the ground (the lift tracks under piles 1 and 3) is kept whole, so it hangs into the opened side. The cut is geometry, made once on the CPU when the view is first opened, not a clipping plane: the occlusion pass draws its own prepass with one override material, which knows no material's clipping planes and would keep the opened ground in it. The foundations class is cut whole, the ground plane too, and of the machinery and masonry classes only what lies under the ground.
- **What it costs**: the massifs, caissons' concrete, piers and earthing 4,320 triangles in the foundations class, the caissons' shells 1,536 in machinery, at every depth [measured]; the section's cut is made on the page once, when first opened.

## 33. The plates laid over the model: seven figures registered (2026-09-26)

The plate overlay puts an orthographic camera on a figure's projection and lays the scan over the model. **It is an audit tool on the dev server, not a feature of the page, by the owner's decision of 2026-09-26**: `npm run examples` with `?plate=<id>` (and `&opacity=`) opens it, its panel section saves the frame to a PNG, and a build drops it entirely (`plateTool.ts` imports it only under `import.meta.hot`; checked by building the pages into a scratch directory with NODE_ENV unset and set to "development" and finding no trace of it; `import.meta.env.DEV` had kept it under the latter). The scans are ETH-Bibliothek Zürich's copy of the album (Rar 9704), served by e-rara's IIIF image server (https://doi.org/10.3931/e-rara-28271) and fetched live by the tool, only the figure's region, at 2400 px on its long side (the server answers any origin, `Access-Control-Allow-Origin: *`, checked 2026-09-26, so the scan is a WebGL texture). None is stored or hosted here; the same decision closes that question. The registration table, its fit and the plate cameras (`plates.ts`) hold no image, and are what an overlay of the model's own redrawn figures would reuse.

**Method.** Each figure carries control points picked on the full-resolution scan: a pixel and what it is in the view's metres — a printed cote or a node line fixes the height, a dimension chain's tick or an upright's axis the distance from the tower's axis, a point on the axis both. An affine map from page pixels to metres is fitted by least squares, one axis at a time; a control marked `check` is reported, not fitted. Affine, not a similarity, because the plates are not isotropic (§24.1) and the scans are not square to their pages. The residuals are the drawing's against the model's numbers, in metres; `tests/eiffelPlates.test.ts` holds each figure to a stated tolerance and to its printed scale (the scans run 11.7 px per millimetre of paper).

| Id | Figure | View | Controls fitted on | rms / max (m) | px/m |
|---|---|---|---|---|---|
| I-1 | PL-I Fig. 1, élévation, 1:1000 | elevation, NW (unlabelled) | the printed floor cotes on both sides of the axis, the ground outside the feet, the rod's top; the ground chain 25.334 / 74.238 / 25.334, the rod on the axis | 0.97 / 1.70 | 11.72 × 11.70 |
| XXXI-d | PL-XXXI, diagramme de l'élévation, 1:1000 | elevation, NW (unlabelled) | NODES' widths and heights at XXVIII, XXIII, XVII, XI, I; the sommiers' line; the axis | 0.35 / 0.71 | 11.75 × 11.92 |
| XI-1 | PL-XI Fig. 1, arc décoratif, pile 1, 1:500 | elevation, NW (« Face 1, ornementée », pile 1 on the left) | the node grid 6.40–50.40, the uprights' axes at nodes, the girder's posts at k × 3.8825, the crown on 39.40 | 0.05 / 0.15 | 23.86 × 23.99 |
| XIX-1 | PL-XIX Fig. 1, 1er étage du côté de l'École militaire, 1:200 | elevation, SE (PILIER N°3 left, N°2 right) | node XXIII's 57.40, the grande poutre's foot 50.40, panel 6's top 68.40; the poutre de l'arc's posts, the gallery's piers on 7.765 | 0.04 / 0.07 | 59.20 × 59.38 |
| XVIII-3 | PL-XVIII Fig. 3, 1er étage, coupe horizontale, 1:250 | plan, up −z, cut at 59.1 | the corner columns at ±35.3475 (« 70.69 »), 13 pier pairs on the 7.765 bays, the pendulum at the centre | 0.07 / 0.21 | 46.91 × 47.18 |
| XIX-7 | PL-XIX Fig. 7, plan du 2e étage, 1:200 | plan, up −z, cut at 117.2 | the covered gallery's outer post line, half 18.40 (the chain closing on « 36m80 ») | 0.05 / 0.14 | 59.13 × 59.25 |
| XIX-3 | PL-XIX Fig. 3, 3e étage, élévation, 1:200 | elevation, NW (unlabelled; its plans put the Seine at the bottom) | 264.9, 276.13, the balcony chain 278.71 / 280.98 / 285.48; the corner uprights ±5.0, the montants ±2.5, the gallery's faces ±8.28 | 0.03 / 0.07 | 60.00 × 58.99 |

**What the residuals say** [measured]:

- **PL-I's lower 58 m are drawn short**, as §24.1 found on the Gallica scan: from the ground to the 1st floor it runs 11.2 px/m against 11.8 above, so a single map leaves the ground 1.4–1.7 m high, the 1st floor 1.4 m low and the 3rd 1.2 m high, the same on both sides of the axis. Its « Sol au centre » line is drawn 0.9 m under the ground outside the feet. Picked on one side of the axis only, the uneven scale came out of the fit as a 0.5° tilt (1.8 m between the two ends of one floor line); an independent re-pick found it, and every floor is now taken on both sides. The overlay shows the figure as drawn.
- **PL-XXXI's diagram** alternates ±0.6 m in height node to node (11.7–12.1 px/m), and its top is drawn about 1 m tall (panel 29's 11.23 over 136 px; the terraces +0.7 and +1.1 as checks).
- **PL-XIX Fig. 1 crosses the book's fold** at x ≈ 4430 px: right of it the scan stands 0.55–0.75 m inboard (the two piers there are checks), so the fit holds the figure's left 83 %.
- **PL-XIX Fig. 1's arcade chain** « 8.70 » (« 4.90 » + « 3.80 », with « 1.15 » and « 0.50 ») stands 0.57–0.61 m over the model at every tick: its base is 0.50 above the gallery floor (the « 0.50 » below it reaches the floor at 56.47), where the model starts the chain at the gallery floor, 56.40, so the plate puts the arcade's crown about 65.7 against the model's 65.10. Not changed here; a follow-up for the platforms.
- **PL-XIX Fig. 7 draws no line at `PLATFORMS.second`'s 37.63** (its second digit read as estimated, `spec.ts`): the covered gallery's posts close on « 36m80 » and the text's gutter edge is 37.90; 37.63 falls 0.415 outside the one and 0.135 inside the other.
- **PL-XIX Fig. 7's uprights at node XVII** are pictorial boxes whose centres sit 0.4–0.7 inside NODES' 15.852 (their outer edges near it): checks only.
- **PL-XI Fig. 1's uprights** lean 0.512 and 0.518 px per px against the model's 0.503, so its inner axis drifts 0.13 by 28.40; its extrados crown reads 43.44 against the model's 43.32.

**Not registered.** PL-VII draws the faces « en rabattement », rotated into the page with heights along the inclined face (§0), so no orthographic camera on the model reproduces it: the face's slope changes at every kinked node.

## 32. The erection, 1887–89: every piece dated, and the page's scrubber (2026-09-26)

Read from E1900-TXT pp. 86–123 (the foundations, § 7 « Montage des deux premiers étages », § 8–9, § 10 « Dates relatives aux diverses phases de montage », the labour accounts), p. 228 and p. 311, every date with a digit that matters re-read on the page image; Fig. 123 (p. 112), the book's own height-and-weight diagram of the erection; PL-XXIV and PL-XXV; and the thirteen photogravures (« Épreuves en taille douce », canvases 496–508, e-rara page ids 8976422–8976434). `chronology.ts` holds the timeline and the rules, `scrub.ts` the page's half, `tests/eiffelBuild.test.ts` the checks.

### 32.1 The timeline

Days are counted from **26 Jan 1887**, « Les travaux furent inaugurés, le 26 janvier 1887, par le commencement des fouilles de la pile 2 » [sourced p. 86].

| Date | What | Source |
|---|---|---|
| 26 Jan – 30 Jun 1887 | The foundations: « commencé le 26 janvier 1887, a été terminé le 30 juin suivant »; pile 2 excavated from 26 Jan, its masonry « commencée le 4 mars et terminée le 10 avril »; pile 3 excavated 29 Jan – 8 Mar, its masonry 9 Mar – end April; pile 4 on compressed-air caissons from « les premiers jours de février » (photogravure 1, April 1887), « L'ensemble du travail fut terminé le 16 juin 1887 »; pile 1 on caissons too, its masonry done « dans les derniers jours de juin » | [sourced pp. 86–94] |
| June 1887 | The cast-iron shoes set, « terminée dans le courant de juin » | [sourced p. 102] |
| 1 Jul 1887 | « C'est le 1er juillet 1887 que commença ce montage », on all four piles « au fur et à mesure des livraisons », with 22 m shear legs | [sourced p. 102] |
| 18 Jul 1887 | Pile 4's first three tronçons, « dont la hauteur dépassait le milieu du premier panneau » (photogravure 3) | [sourced p. 103] |
| 2 Sep 1887 | The first creeper crane, at pile 3 | [sourced p. 103, on the image: the OCR reads « pile } »] |
| 10 Oct 1887 | « la hauteur de 28 m correspondant à l'entretoise limitant le panneau 2 ... fut atteinte le 10 Octobre », 900 t and 98,000 rivets in place | [sourced p. 103] |
| 4 Dec 1887 | « Fin du montage des quatre premiers panneaux » | [sourced p. 112] |
| 18 Dec 1887 – 1 Mar 1888 | The 1st floor's girders, begun with the « Poutres de l'arc » (Fig. 123) | [sourced p. 112] |
| 14 Jan 1888 | Photogravure 5, « prise du 1er étage »: the legs at the 1st floor | [the date sourced; the height it implies estimated] |
| 1 Apr 1888 | « Achèvement de la première plate-forme »; « c. Commencement du montage au-dessus du premier étage. 1er avril 1888 » | [sourced p. 112] |
| 7 May – 31 Aug 1888 | « Le montage des arcs décoratifs s'est fait du 7 mai au 31 août » | [sourced p. 112, on the image: the OCR's « 3 mai » is wrong] |
| 14 Aug 1888 | « Fin du montage du deuxième étage » | [sourced p. 112] |
| 23 Sep 1888 – 4 Jan 1889 | The soubassements' ironwork; their facing « terminé seulement en mai 1889 » | [sourced pp. 95–96] |
| 30 Nov 1888 | « Fin du montage de la plate-forme intermédiaire » | [sourced p. 112] |
| 24 Feb 1889 | « Fin du montage du troisième étage » | [sourced p. 112] |
| 31 Mar 1889 | « Arrivée au sommet »; « Le dimanche 31 mars 1889 ... M. Eiffel hissa lui-même le drapeau national » | [sourced pp. 112, 311] |
| 15 Apr 1889 | « Fin du montage » | [sourced p. 112] |
| 15 May 1889 | The first visitors, « Du 15 au 31 mai 1889 » | [sourced p. 228] |
| 1 Jun 1889 | « 15 avril au 1er juin 1889 (achèvement de la rivure) » | [sourced p. 113] |
| 19 Jan – 19 Jun 1889 | The lifts: Otis erected « à partir du 5 janvier 1889 » to 13 June, Roux, Combaluzier et Lepape 19 January to 8 June (p. 113; p. 118 has « au 2 juin »), Édoux 20 February to 2 June, the machines and pumps « du 11 février 1889 au 10 avril »; into service, the Roux « les 26 mai et 2 juin », Otis « le 4 juin par le pilier Nord, et le 19 juin par le pilier Sud », Édoux on 13 June | [sourced pp. 113, 118] |

**Fig. 123 settles the heights.** Its levels are « au-dessus des appuis », above the support stones' centres at cote 36.00, so y = h + 2.50 [derived §0], and on that datum every period of the § 10 table ends on a node of PL-XXXI or a floor to the centimetre: 47.90 → **50.40** (XXIV) on 4 Dec 1887, +7.00 → **57.40** (XXIII) on 1 Apr 1888, +58.10 → **115.50** (XVII) on 14 Aug, +80.20 → **195.70** (the landing, 195.93) on 30 Nov, +80.42 → **276.12** (the 3rd floor) on 24 Feb 1889, +24.38 → **300.50** (the top terrace) on 31 Mar [sourced Fig. 123, read on the image; derived]. They are heights of the FINISHED section; the erection ran ahead of them above the 1st floor (« le montage simultané des montants et des poutres de la première plate-forme », p. 117).

### 32.2 The rule: the erection front, and what a piece is

- **The front** (`FRONT`): the day the top of the placed iron reached height y, linear between stops [the stops sourced as tagged in 32.1; linear between them estimated]: (2.50, 1 Jul 1887), (11.9, 18 Jul), (28.4, 10 Oct), (50.4, 4 Dec), (57.4, 14 Jan 1888), (57.63, 1 Apr), (115.5, 14 Aug), (195.93, 30 Nov), (276.13, 24 Feb 1889), (300.515 and the rod's 312.275, 31 Mar). Linear between stops is what the book's own pace gives: « Montage d'un panneau au-dessous du premier étage .. 40 jours. — entre le premier et le deuxième étage. 30 — entre le deuxième et la plate-forme intermédiaire. 15 — au-delà, jusqu'au troisième étage. 7 » [sourced p. 113]. Nothing rises over the 1st floor between 14 Jan and 1 Apr 1888, while the girders are built and joined between the legs; the § 10 table then prints « Commencement du montage au-dessus du premier étage. 1er avril 1888 » [sourced p. 112].
- **All four legs alike.** The book dates no pile apart: pile 4 was PHOTOGRAPHED on 18 July, not begun, and pile 3's crane of 2 September came « une fois les premiers tronçons placés » [sourced p. 103], so the four legs share one front. (A first pass started pile 4 on 18 July; the text does not support it.)
- **A piece is dated by its TOP**: it goes up once the iron under it is up, and the front is then where its top is, so on the day the front reaches y nothing of the iron stands above y — the test holds this at every stop [derived].
- **The 1st floor's girders**, between the legs at 43–60 m (and the belt they run through in the legs): 18 Dec 1887 to 1 Mar 1888, out from the legs, the middle of a face last, never after 1 Mar and never before the leg beside them reached their height [dates sourced; the order estimated: the girders were built on the face scaffolds from both legs, p. 108].
- **The arches**: 7 May – 31 Aug 1888, out from the legs, the crowns last: « La partie des arcs placée entre les grands échafaudages et les pylônes, a été montée en porte à faux », the middle on the scaffold « pendant l'assemblage des poutres du deuxième étage » [sourced p. 117; the order derived from it].
- **What a piece is.** The graph merges each class into one mesh, and a piece is a connected component of the drawn index buffer: a whole member where the module welds one (a lattice box, a gusset, a baluster), one flat face of a member where the module gives every face its own points (a prism's walls, most of the lattice's skins) [measured: about 2 triangles a component in the uprights and girders, 12–16 in the bracing, the masonry and the glass]. A member's faces share its top, so they go up together; its foot, a face of its own, may go up a few days before it. A component longer than 15 m AND of more than 16 triangles — a sweep: a rail, a helical stair — is dated triangle by triangle, so it grows with the erection; a long flat face is not, since half a face would show [derived].
- **The uprights went up in tronçons**, « les tronçons successifs », 4.50 long below the 2nd floor and 6.00 above (spec.ts `SPLICE`). The model draws an upright a panel at a time, up to 13.5 m, so an upright's piece is dated as the tronçon at its foot: the front at its foot plus a tronçon, or its top if lower (`datedHeight`). Dated by its top, a whole panel's upright would wait for the panel's end while the struts at mid-panel hung in the air beside it [derived]. The price: on a stop's day the uprights stand up to a tronçon over the front (to 17.69 m on 18 Jul 1887, where photogravure 3 has « past mid-panel 1 »).
- **Nothing hangs in the air.** In a leg or the shaft every other piece waits for the upright piece covering its foot (a foot within 0.3 m over a node rests on the node), so no strut or tie is ever drawn above the uprights beside it; `tests/eiffelBuild.test.ts` holds that every 5 days to 31 Mar 1889 [derived; measured].
- **Granularity reached: per piece**, finer than per panel per pile, and per triangle on the long pieces. Days are whole: a piece dated within a day is up at that day's end.

### 32.3 The rest: foundations, fit-out, lifts

- **Foundations and support stones**, bottom up, per pile: pile 2 26 Jan – 10 Apr, pile 3 29 Jan – 30 Apr, pile 4 1 Feb – 16 Jun, pile 1 1 Feb – 30 Jun [sourced as in 32.1; pile 1's start estimated with pile 4's].
- **The soubassements** (the masonry class above the support stones under the legs' own squares, and the platforms' dress in the plinths' ring: the grilles, the stairs' first steps): 23 Sep 1888 to 15 May 1889, bottom up [sourced window, the order estimated].
- **The machine room's chimney and walls above ground, and its plant**: with the machines, « du 11 février 1889 au 10 avril » [sourced p. 113 for the machines; the chimney's date estimated with them].
- **The 1st floor's fit-out** (the platforms over the deck, the glass, the silvered crescents, the names, the gas globes, cabochons and balusters), by face and bottom up: the gallery's arcades are not up on 21 Aug 1888 and are up, unroofed, on 26 Dec 1888 (photogravures 8, 9), so the window opens on 1 Oct 1888 [estimated]; the restaurants « montés à partir du mois de janvier 1889. On commença par ceux des faces Paris et Grenelle ; on continua par celui du Trocadéro ; puis, le 15 avril, après la démolition du monte-charges ... celui du côté de l'École Militaire » [sourced p. 118, read on the image: the OCR has « 13 avril »]. Windows by face: NE Paris and SW Grenelle 1 Oct 1888 – 15 Apr 1889, NW Trocadéro to 30 Apr, SE École Militaire 15 Apr – 15 May 1889 [the starts sourced or estimated as said; the ends estimated]. The names and the glazing are undated in the book [estimated with the rest].
- **The 2nd floor's and the landing's fit-out**: from the platform's day to 15 Apr 1889; **the 3rd floor's**: 24 Feb to 15 May 1889 (« on se servit de la chèvre ... pour ... monter tous les matériaux destinés à l'aménagement de cette plate-forme », p. 118) [estimated].
- **The stairs from the ground to the 1st floor**: « ne furent montés que vers le mois de novembre ; jusque-là, la circulation se faisait par un escalier en bois établi le long des poutres d'ascenseurs. A partir du premier étage, les escaliers en hélice étaient mis en place au fur et à mesure de l'avancement du montage » [sourced p. 118]; the year is not printed, and 1888 is taken [estimated: the legs reached the floor in January 1888]. Above the 1st floor the stairs follow the front.
- **The lifts' fixed machinery**, bottom up in its line's window: Otis (piles 1 and 3) « commença le 5 janvier 1889 » to 13 June, Roux, Combaluzier et Lepape (piles 2 and 4) 19 Jan – 8 Jun [sourced p. 113; p. 118 prints 2 June], Édoux (the shaft) 20 Feb – 2 Jun [sourced p. 118], the machines and pumps under the ground 11 Feb – 10 Apr [sourced p. 113]. **The cars, chains and moving parts** appear on the day their line went into service; which Roux pile opened first, 26 May or 2 June, is not said: Ouest is taken first [estimated].
- **The flag** on 31 Mar 1889 [sourced p. 311]. The scrubber ends on 19 Jun 1889, when the last lift ran.

### 32.4 The rivets: with their iron, and the site's at the book's pace

**A head comes with its iron.** A rivet's own height does not date it: the plate it sits on can be dated weeks later than the front passed the head (a piece is dated by its top), and an arch's rivets by the arches' own window. So each head is dated by the surfaces it sits on, the latest of every class triangle within 2 cm of its seat (`hostDays`) [derived]; that is a shop head's day, and a site head's earliest. At `?rivets`, 872 of 1,208,860 heads (0.07 %) find no surface that near and fall back to the front at their height [measured]. `tests/eiffelBuild.test.ts` finds the latest surface within 2 cm of a sample of heads by brute force and holds `hostDays` to it exactly.

**The site heads keep the book's pace.** The book counts the rivets driven on the Champ de Mars by period (spec.ts `COUNTS.rivetsSiteByPeriod`, p. 113, re-read on the image: 189,580 / 235,809 / 283,898 / 162,184 / 100,739 / 50,868 / 27,768, summing to 1,050,846) and 98,000 at 28 m (p. 103). The model's site heads (`rivetClass` share > 0) are taken in the order their iron went up, and the k-th of N is driven on the day the book's running total reached k/N of 1,050,846, never before its iron (`siteRivetDays`). So the model's site riveting keeps the book's pace whatever its own count. Measured at `?rivets`: of 349,456 site heads, 32,590 are driven by 10 Oct 1887 (9.33 %; the book's 98,000 is 9.33 %), and 19,584 (5.6 %) wait for their iron rather than the pace [measured].

### 32.5 What it costs [measured, Node, this machine]

Nothing in the cook: the graph is unchanged, and the default page runs none of this. `?build` stages the drawn meshes once at load:

| Depth | Triangles staged | Staging the meshes | Dating and ordering the instances | Tables kept |
|---|---|---|---|---|
| plain | 645,826 | 0.28 s | 1,188 fittings, 1 ms | 16 KB |
| `?laced` | 3,891,114 | 1.1–1.4 s | 1,188 fittings, 1 ms | 25 KB |
| `?rivets` | 3,891,114 | 1.1 s | 1,208,860 heads, 2.7 s (2.5 s of it the search for their iron) | about 45 KB |

In the browser at `?rivets&build` the page reports the whole staging as 3.0 s and 46 KB (« dated »), after a 10.3 s cook [measured, this machine].

The index buffers are replaced by reordered copies of the same size, and each batch's per-head arrays — the packed seats, turns and sizes (rivetPack.ts), or the matrices under `?cpuRivets` — are permuted in place before their first upload, so the lasting memory is the tables: one (day, count) pair per day on which anything of a mesh or batch went up. The search for the heads' iron holds a map of the heads by 0.6 m cell while it runs. A day's frame is then a binary search per mesh and a `drawRange` or instance `count`, and the shadow map is redrawn only when the day changes. The page prints the staging's time and tables as « dated ».

### 32.6 Disagreements and open points

- **Period b's height**: the § 10 table prints 14.20 m, Fig. 123 7.00; 7.00 lands on node XXIII and 14.20 lands on nothing, so the figure is taken.
- **January–March 1888**: « monter pendant chacun des mois de janvier, février et mars, 650 t de fer » (p. 117) against the § 10 table's 1,797 t for the whole 3.5 months of period b; the dates here follow the table.
- **The riveting peak** « en août 1889 » (p. 113, so printed on the image) is after the riveting ended; read as August 1888. Not used.
- **The landing**: the table closes the intermediate platform on 30 Nov 1888, p. 119 has the men « arrivé à l'étage intermédiaire, le 20 décembre ». The table is taken.
- **The rivet periods** start b on 4 Dec and e on 1 Dec where the tonnage table uses 18 Dec and 30 Nov; the rivet schedule follows the rivet table.
- **The legs above the 1st floor**: the § 10 table begins them on 1 Apr 1888, and the front here follows it; the research's reading of photogravure 7 (15 May 1888) put the legs' tops at about node XX, 90.4, where the front gives 76 m (about node XXI). The printed date is taken over the measured print.
- **The Roux lifts' end**: p. 113 closes their erection on 8 June, p. 118 on 2 June; 8 June is taken, and which of the two lines went into service first, 26 May or 2 June, is not said (Ouest is taken first).
- **The arches where the inner arches meet at a** stand, in the model, where the double pylon's top stood; those pieces wait for the pylons to come down (§32.7) [derived from the geometry; the book finishes the arches on 31 Aug, after the pylons].
- **The section view** (section.ts) swaps the foundations', the machinery's and the masonry's meshes for a cut of them; under `?build` the cut is drawn whole, whatever the day. The staged geometry is kept as it was, and shows again when the section is closed.
- **The legs' junction with the girders** is not dated (« Quand il fut terminé, on procéda au raccord de ces poutres avec les montants », p. 108); photogravure 6 (26 Mar 1888) shows the girders continuous from leg to leg. The model has nothing to show for the junction itself.
- **What the rule cannot tell apart.** Dating is by class and position, so a class that mixes periods is dated by where its pieces stand: a restaurant's floor structure under the 1st floor's deck goes up with the deck (1 Apr 1888), not with the restaurant (1889); a platforms piece standing in a leg below the 1st floor is taken for the ground stairs.

### 32.7 The temporary works: the pylons, their sand boxes and shoes, the girders' scaffolds (2026-09-26)

Read from PL-XXV (« Montage de la partie inférieure. Pylônes et échafaudages », Figs 1–18, read on the 8720 px image), PL-XXIV's text, and text pp. 103–108, 115–117. `erection.ts` builds them; `?build` (`Detail.build`) puts them out as `works.pylons`, `works.bearings`, `works.scaffolds` and `works.decks`, each laid out in one quadrant's frame and copied to the four by the quadrant turns. Nothing of the tower changes: its class outputs are byte-identical with and without them (`tests/eiffelErection.test.ts`).

- **The pylons.** « quatre pylônes pyramidaux semblables ... dont deux accolés étaient placés sous l'arête médiane, et deux séparés placés sous les deux autres arêtes » (p. 103): a double under the inner upright a and a single under each of b and d, 16 pylons as 12 structures [sourced]. Each « en forme de pyramide quadrangulaire avec deux faces verticales. Sa base était de 8,50 m de côté et sa hauteur de 27,40 m », posts « équarries de 0,27 m », « 7 rangées de moises de 0,25x0,12 m », crosses « de 0,22x0,22 m » (p. 104) [sourced]. The plate: the foot 8.463 square and the posts 4.2315 apart, axis to axis; the double's foot 17.456 = 2 × 8.463 + 0.530; each pyramid's top about 1.10 square, the double's 5.800 × 1.100 cap planking on outriggers from its last tier; the top at (60.91), y 27.41; Fig. 13's rows from a first one 0.49 up, then 7.095, 6.40 to a doubled « Joint » (13.985 and 14.60), 4.50, 4.15, 4.16 to the top, summing to 27.41 [sourced, read to ±0.05; a first pass misread the rows and the double's top, corrected by the verification]. Eight posts to a pyramid, on its eight piles (« 8 par pylône », p. 103), converging on the top so the two faces under the upright stand vertical, each spliced at the joint [derived]; the moises stand 5 cm off the posts, their packing, since a raking post drifts 7 cm across a board's depth; the crosses stop short of the posts, further at the corner where the two vertical faces' crosses, both inside, meet, and a stub under 2 m is left out [estimated]. The piles in the ground (Ø 0.33, 6 m at piles 2 and 3, 9 m at 1 and 4) and the plank floor that joined a leg's pylons (« y compris le plancher reliant les pylônes », p. 104) are not drawn. The model's ground is one plane, so the pylons at piles 1 and 4, whose ground was 0.75 higher (« Sol (34.25) », printed 8.246 and 17.022 there), take piles 2 and 3's figures and stand 0.75 taller [derived; §31].
- **Where.** The double's planking is centred under a's prop, at y 29.52, where the median shoe's outer edge just meets the upright's underside [derived]; its pyramids' end faces stand 0.65 in from under the planking, on its outriggers, since otherwise its outer feet would stand on the singles', which the plate draws apart [estimated]. The singles are centred under b's and d's props at y 30.57, where a lateral table clears the entretoise of node XXVI (1.20 wide, spec.ts `ENTRETOISE`) by 3 cm: a metre inside the node, as PL-XXV Fig. 1 puts the singles' corners [derived; the plate measured by the verification, ±0.6]. At the node itself, the first pass's height, the tables and consoles sank into the node's bracing and belt.
- **The bearings.** On each top a sand box, « cylindres en tôle de 0,50 m de hauteur et de 0,40 m de diamètre » (two on the double, on its planking), and on it the temporary shoe (p. 104). Under a, « une table ... de 1,65 m sur 1,03 m ... maintenue par six fortes consoles ... de 1,33 m de hauteur » [sourced]: the upright leans 54° in the diagonal plane, 1.41 m up for every metre along it, so the table's short side lies along the slope (a rise of 1.45, what 1.33 m consoles fill; the long side would need 2.3), the consoles in the diagonal's vertical planes [derived]. Under b and d, PL-XXV Fig. 9 draws a table 0.920 × 0.908, its sides along the upright's faces, on four consoles against those faces; the text's « 0,877 m sur 0,908 m ... 3 consoles » reads the upright's own 0.877 face [sourced Fig. 9 as the verification read it]. The four stand in the faces' vertical planes 0.20 either side of the table's centre, over its inner three quarters, the outer corner lying under the bracing that springs from the node [derived from the model]. Every console runs from the table to 5 mm under the upright, capped at 1.33. The oak piston standing proud of each box (the stack about 0.63 on the plate) is not drawn.
- **The scaffolds.** « quatre échafaudages semblables, un dans chaque face de la Tour. Ils avaient 41 m de hauteur et se composaient de neuf montants verticaux de 25x25, espacés de 7,50 m dans un sens et de 7,75 m dans l'autre ... croix de Saint-André formées par des bois de 0,22 m x 0,11 m ... sept cours de moises de 0,25 m x 0,12 m. Des contrefiches ... permettaient de donner à la plate-forme de montage 28,50 m de longueur sur 22,40 m de largeur. Enfin une autre série de contrefiches ... soutenaient un cintre, qui servit plus tard à mettre en place la partie centrale des arcs décoratifs » (pp. 107–108) [sourced]. The plate stands them at (35.10), y 1.60, the rows 0.50 over it, then 7.20, 7.20, 7.20 to the joint (22.10, doubled 0.50 over), 7.20, 6.40 [sourced Figs 17–18], each post spliced at the joint; the deck at y 42.60 [derived], 0.80 under the decorative girder's foot (43.40) it carried. The posts run 22.10 to 37.10 from the axis and ±7.75 along the face [measured Fig. 1, ±0.5]; the deck ±14.25 along it and, across, 4.90 inside the inner row and 2.50 outside the outer, 17.20 to 39.60 [measured Fig. 18; Fig. 1's « 19.30 » would put its inner edge at 17.80]. The deck's struts spring from the outer posts' faces over the last row; the centring is a rib of eight straight timbers 5 cm under the arch's intrados (ARCH, in the leaning face plane) over the middle 21 m, each outer post carrying its own third of it on three struts from its own heights [estimated from Fig. 17].
- **Their days** (chronology.ts `WORKS`). A piece of the works is dated by its FOOT within its kind's window, so the posts go up first and every moise, cross and strut after the posts under it; the upper lengths of the spliced posts after the lower. The pylons « élevés » while the legs were built out to 27 m (PL-XXIV's text), 1 Aug – 5 Oct 1887 [estimated]; the bearings with the tronçon they are riveted under (from node XXVI, up when the front passed 32.90: 22 Oct 1887) [estimated]; the sand boxes out « aussitôt que les poutres du deuxième étage furent assemblées », and the pylons demolished at once (p. 115): the bearings to 1 Aug and the pylons to 10 Aug 1888, standing on photogravure 7 (15 May), gone on 8 (21 Aug) [the order sourced; the days estimated]. The scaffolds « élevés en même temps que les pylônes » yet still going up on photogravure 4 (7 Dec 1887): 1 Oct – 17 Dec 1887, finished for the girders begun on them on 18 Dec [the end sourced; the start estimated]; down 20 Aug 1888. The decks come off on 7 May 1888, when the arches are begun, since in the model the arches' crowns pass where the deck stood [derived from the model; the book dates no deck coming off, and has the crowns built on the scaffold itself, p. 117].
- **Measured against the steel and against themselves** (`tests/eiffelErection.test.ts`). No sample of the iron that went up before a kind came down lies inside any of its solids — the timber, and the bearings' boxes, tables and consoles (4 mm of contact allowed) — with a control block and a control plate round an upright that find its iron; the arches' pieces where the inner arches meet over the double's top wait for the pylons to come down (chronology.ts) [derived]. No timber passes through timber (every block's axis and four lines sampled against the rest). Every sand box stands on a cap.
- **What it costs** [measured, Node]: 37,632 triangles of timber (the pylons 25,104, the scaffolds 11,904, the decks 624) and 6,224 of iron (the boxes and shoes), only under `?build`; the plain cook is the same with them and without, within its noise.

### 32.8 The creeper cranes (2026-09-26)

Read from PL-XXIV (« Diagramme du montage. — Grue », Figs 1–7, read on the 8720 px image) and text pp. 102–107, 110–111, 115–118. `cranes.ts` builds each crane once, where it first stands, as its own output `works.crane.<name>`, and publishes `CRANE_RUNS` and `cranePose(run, day)`; the page moves each crane to its pose on the day (scrub.ts), as it moves the lifts' cars. The page only moves a crane, it does not turn it, so each keeps one bearing for its whole run.

- **The crane.** « une grue ... d'une force de 3.000 kg » (p. 105), in practice 4 t, « 13.000 kg » empty (p. 115) [sourced]. PL-XXIV Figs 2–4 (1:100): the platform (U) 4.60 across; the pivot mast (J) 3.85 under the platform and « 4.535 » over it; the jib (L), « Flèche en tôle et cornière articulée sur le pivot, pouvant ainsi s'abaisser ou se relever », drawn at « Portée maximum 12m00 », « Hauteur sous flèche 10m40 »; its ties (M) from the mast's head; the winch (S) on the jib's heel about 1.2 from the pivot; the hotte (D), an inverted truncated pyramid, hanging under the platform to the chassis (C) that clasps the two lift girders (B), « 3.80 » apart, over « 6.535 » of their length, its hinge « 2.00 » up the track from the pivot [sourced where printed; measured ±0.1 otherwise; the members' sizes estimated]. The chassis is drawn from the hotte's foot up the track at the leg's slope where the crane first stands; it keeps that slope as it climbs (the track steepens from 54.6° to 77° above the 1st floor), since the page only moves it [derived]. 476 triangles a crane.
- **Where they rode.** On the legs, « les deux grandes poutres inclinées suivant la même direction que l'arbalétrier » that became the lift girders (p. 105), ON them: the pivot 2.00 out from the lifts' rail line (lifts.ts `RAIL_OFFSET`, now exported), so the chassis' hinge lies on the girders as Fig. 2 draws it [derived]; its platform 4.30 (`OVER_NODE`) over the last finished node under the front, so the hotte hangs clear of the node's struts; « L'opération du relevage de la grue durait environ 18 heures » (p. 107), so a panel a day at most [the rule estimated]. The jib toward the tower's axis, raised to a 9.0 reach so it stays inside the leg as the leg leans in over it [estimated]. The Roux legs' girders stop at node XXII in the model; the cranes of piles 2 and 4 ride on above it where the model draws no runway [derived].
- **The upper cranes.** Over the 2nd floor, « Le montage du panneau 13 et d'une partie du panneau 14 fut opéré avec la disposition des grues employée aux panneaux inférieurs, en hissant celles-ci au sommet des poutres d'ascenseurs qui dépassaient le niveau de la plate-forme » (p. 117) [sourced]: the leg cranes stand on the Otis girders' tops, 9.9 over the floor (lifts.ts `OTIS`), about the 10 m PL-XXIV Fig. 1 draws [measured]. Then « à l'aide des grues des piles 2 et 4, qui s'arrêtaient à cette hauteur, les deux grues qui devaient monter jusqu'au sommet » went onto the central post of the Édoux lift (p. 117): so piles 1 and 3's climbed on, their chassis made for the Otis girders' 3.80 (p. 110), « D'axe en axe des grues 6.30 » either side of the post (Fig. 7), on the 1–3 diagonal as Fig. 7 draws them (its « Seine » arrow orients it), facing out [sourced; the orientation read by the verification]. The day, 15 Sep 1888, and piles 2 and 4's last day, 1 Oct, « les deux grues inutiles » taken down (p. 115), are estimated; p. 115 has that team go on to the arches, which p. 112 dates 7 May – 31 Aug, so the book does not agree with itself. Over the shaft's nodes the plan bracing is deeper, so the post cranes' platforms stand 4.95 over the node [estimated].
- **Over the 3rd floor.** « Au-dessus du troisième étage, les grues ne pouvant plus orienter, l'une d'elles fut démolie et, avec celle qui restait, on monta les fers de la partie supérieure, qui furent mis en place à l'aide de chèvres » (pp. 117–118) [sourced]: pile 3's comes down on 24 Feb 1889, pile 1's stands on the 3rd floor to the end of the erection, 15 Apr [estimated]. The chèvres, the 22 m shear legs of the first months (p. 102), the steam hoists and the working floors under each crane (p. 107) are not drawn.
- **The first crane** at pile 3 on 2 Sep 1887, « à partir de la base »; the others « à partir du deuxième panneau » (p. 105), the shear legs having taken those legs to the top of panel 2 (p. 103), so from 10 Oct 1887 [the day estimated].
- **Measured against the steel** (`tests/eiffelCranes.test.ts`, the whole crane, every 20 days of every crane, 6.6 M samples of the iron standing that day): nothing while the cranes climb the legs to the 2nd floor. Over it, the leg cranes stand among the plan bracing and bands of panels 12–13 that went up round them (5,140 samples, girders), which the real cranes worked over; the post cranes' jibs cross panel 29's corner uprights and bracing at their last station (238), and the stair's flights (443); the one left over the 3rd floor stands in the rooms (2,348, summit), which the model dates with the iron but p. 118 has fitted after it came down (« On se servit de la chèvre ... pour démonter la grue et monter tous les matériaux destinés à l'aménagement de cette plate-forme »). The test bounds each and holds the arches, the horizontals and the gussets to none. A first pass, before the verification, rode the cranes under their girders with the jib at full reach, through the lift girders and upright a.
- **What it costs** [measured, Node]: six crane outputs of 476 triangles each; the cook is within its noise.
