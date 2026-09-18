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
    - Box about **0.80–0.82 m square** [derived from the web widths]. PL-VII prints member widths "800", "822.8", "876.99", "877" beside the arbalétriers [sourced].
  - **Panels 6–11** (sections XVIII–XXIII, "au-dessous du 2e Étage"): a closed box.
    - 4 angles "Corn. 100×100×12".
    - Webs "866×8…11" (a) and "854×11…15" (b, c, d).
    - Cover strips "200×8…14".
    - About **0.87 m square** [derived].
    - Section areas at XVIII: a 43,136, b 55,664, c 56,308 mm² [sourced]. Faces 3, 8, 9 and 15 have manholes ("trous d'homme") [sourced].
  - **Panels 12–17** (sections XII–XVII): closed boxes about **500 × 500** [sourced: dimensioned "500" on the section drawings].
  - **Panels 18–28** (sections I–XI, "au-dessus du 2e Étage"): open 500 mm sections [sourced].
    - c is an L-shaped box (two 500 plates at 90° with 100×100 angles).
    - The merged b/d is an I/T section 500 deep. PL-XXXI: "Surf. de 1 bd 20400" mm² [sourced].
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
- **Depth.** Official: 7 m (TE-FOUND) [sourced]. Deepest (N and W, Seine side) ≤ 15 m (TS-FR) [sourced]. Compressed-air caissons "to a depth of 22 m" (WP-EN) [sourced]. THESIS "36 meters of deep Masonry" is a **misreading** of the 36.00 m support-centre altitude [derived].
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
- **Gallery (outer platform).** "Côté extérieur 18m65, Surface 350 mètres carrés" (PL-I) [sourced]. WP-FR 18.65 m and 350 m² [sourced]. Official today 250 m² for the lower (enclosed) level (TE-KF) [sourced].
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
| Rivets | **2,500,000** | TE-KF, TE-HIST, TS-FR, WP-EN, THESIS [sourced] |
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
