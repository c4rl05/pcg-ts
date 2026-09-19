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
| vault crown at the inner pilasters | 8.940 | 65.34 | [sourced PL-XIII Figs 28, 31]: the vault rises 0.24 inward and drains outward [derived] |
| palmette crest over each crown | ~10.0–10.4 | ~66.5 | [estimated, PL-XIX at 80 px/m] |
| flag masts, one per pier | top ~12.2 | ~68.6 | E1900-TXT « mâts de 8,00 m de hauteur portant des drapeaux » [sourced]; top [estimated, PL-XIX] |

**Arches and vaults.**

- **Small arches.** Intrados radius **1.538**, rib 0.200 deep [sourced PL-XIII Fig. 11], semicircular [estimated from the drawing].
- **Vault axis.** Each bay is roofed by its own vault, running back from the face with its axis perpendicular to it [sourced PL-XIII, E1900-TXT: « la toiture de chaque arceau »].
- **Valley gutters.** They sit over the piers, **0.730** wide [sourced PL-XIII].
- **Gable profile.** The outer arc fits a semi-ellipse with half-span (7.765 − 0.73) / 2 = 3.5175 and rise about 2.65 [estimated fit on PL-XIII Fig. 26; 8.70 − 6.05 = 2.65, derived]. PL-XIII prints radii 3.0675 (Fig. 11) and 3.3675 (Fig. 26) for these arcs, with 1.950 between the crowns on Fig. 26 [sourced]; the fit does not use them.
- **Crown band.** Between the inner arc and the outer arc runs a band **1.75** deep at the crown [sourced PL-XIX]; E1900-TXT says « un croissant, dont la hauteur au sommet est de 2,00 m » [sourced].
- **Roofing.** « La couverture de la galerie est en zinc ondulé reposant sur un voligeage qui lui-même prend appui sur cinq petites fermes en fer comprises dans la profondeur de l'arcade » [sourced E1900-TXT].

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

**Taller ornaments, not modelled.**

- The Russe's clock frontispiece finial, about 10.4 above the floor [estimated: an estimated apex + a printed 2.60, PL-XXIX Fig. 9].
- The Français' 1889 crest finial, about 8.7 [estimated, PL-XXIX Fig. 1, "pendant l'Exposition de 1889"].

### 10.5 Balustrades

| where | height | posts | tag |
|---|---|---|---|
| 1st-floor gallery, outer edge | **1.150**: 0.150 plinth + 0.890 + 0.050 channel, a wooden handrail on top | cast-iron pilasters **180** wide every **1.74125** (half a small arch), the columns taking the other stations | [sourced PL-XIII Figs 11, 19, 20]. Infill: « 5 balustres en terre cuite dans chaque intervalle de 1.74125 » [sourced] |
| 1st floor, round the central void ("Balcon") | not printed on the plates read | – | modelled as the gallery's [estimated] |
| 2nd-floor gallery, outer edge | **1.150** = 0.150 + 0.900 + 0.100 | the gallery posts (§10.7), X panels 834.22 wide between them | [sourced PL-13bis Fig. 93] |
| 3rd floor | the glazed room's **1.200** plate parapet (« Garde-corps de la galerie du 3me étage »), with glazing above it to 2.43 | – | [sourced PL-XIV Figs 2, 7] |
| Eiffel's balcony, 2.58 above the 3rd floor | **1.000**, three round bars | – | [sourced PL-XIV Fig. 7; PL-XIX Fig. 3] |

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

**What stood on the platform.**

- The 1900 album shows a **Buffet** of about 12.0 × 7.5, two decagonal customer tents about 7 across, and a photographer's cabin on a raised "Plateforme de l'abri (151.85)" [sourced labels, PL-XIX Fig. 7; sizes estimated]. These may postdate 1889.
- **Le Figaro's 1889 printing pavilion** is not on the plates. A secondary source describes a two-part kiosk of pine and pitch-pine with glazed walls, near the north pile's lift, with no dimensions [sourced WOW-FIG].

### 10.8 The 3rd floor (PL-XIV, PL-XIX)

- **The gallery is inside the glazing.** The whole outline is labelled "Paroi vitrée", an octagon **16.560** across the flats with **10.90** straight sides and 45° chamfers [sourced PL-XIX Fig. 9; PL-XIV Fig. 8: 2 × 5.450].
- **Its floor.** Inside it runs the "Galerie promenade (309.83)", **3.250** wide, round the 10.00 m core at (309.63) [sourced PL-XIV Fig. 2]. WOW-3F quotes Eiffel: a closed room 16.50 wide, 251 m² [sourced, secondary].
- **The ceiling** is the floor of Eiffel's open balcony at 309.63 + **2.58** = 312.21 [sourced PL-XIX Fig. 3; derived]. The balcony overhangs the glass by about 0.5 [estimated].
- **What 18.65 measures is not clear.** Nothing on these plates dimensions PL-I's 18.65 × 18.65 "côté extérieur". The balcony would be about 17.5 across [estimated]. So no plate shows what stands at the edge of an 18.65 deck.

### 10.9 What `platforms.ts` builds from this

- **1st-floor decks.** The platform ring stops 2.60 inside the column axis. The gallery ring below it has its top at z 56.40 and reaches 0.50 past the axis. It is 2.60 wide all round: the 4.00 width at the leg zones (§10.2) is left out.
- **The arcade** as in §10.3, per face:
  - 28 columns and 10 plate piers;
  - 18 small arches of 6 facets each;
  - 9 vaults, a semi-ellipse 3.5175 × 2.65 with a constant crown of 8.70 (the 0.24 inward rise left out);
  - 9 crests and 10 masts.
- **The four pavilions** from one massing (§10.4). The walls rise to the arcade's valley gutter, 4.82 above the floor [derived: 56.40 + 6.05 − 57.63], within the printed 4.61–5.03. The vaults are the arcade's, extended. The lanterns have their eave at 7.537 and their ridge at 8.237. The model has no compass: its layout copies PL-XVIII as drawn, with the render's top view (x right, z down) as the plate.
- **Balustrades** as in §10.5: rails and posts only, no infill. The 3rd floor gets none of its own.
- **The 2nd-floor covered gallery** with its attic band.
- **The skirt** as one plane leaning in 0.50. That is less than the consoles' ~0.9 [estimated], so its foot clears the legs' outer uprights at the corners. The foot is at node XXIV (z 50.40), where the leg kinks and the upright's mitred skin reaches 34.66 from the axis; the panel's inner face is at 34.77 there [measured on the cooked mesh by slicing its triangles; derived].
- **The cross girders** between the legs as 4-panel N-trusses, parallelograms that lean with the legs [the form estimated].
- **Not built:**
  - the inner arcade;
  - the terrace level and its steps;
  - the basements, joists and consoles;
  - the names band;
  - the per-building ornaments;
  - anything on the 2nd platform but its gallery.

### 10.10 Disagreements and open points

- **Gallery floor.** 89.90 (PL-XIX) against 89.93 (PL-XVIII), a 3 cm difference. The drop is 1.23 (PL-XIX, PL-XVI, one E1900-TXT passage) against 1.20 (another E1900-TXT passage).
- **Terrace width.** 1.52 (PL-XVIII) against 1.6865 (PL-XXX).
- **Central void.** 29.00 with cut corners and bowed balconies (E1900-TXT) against the 28.245 square derived from PL-I's 4,200 m².
- **Pavilion depth.** 14.9975 (three plans) against 14.9075 (Français Fig. 4). **Russe length:** 23.295 against "21m295" on Fig. 11. **Russe height:** 8.27 against "8.67" on Fig. 12.
- **Français rear bays in 1889.** Terraces (E1900-TXT, which says they were covered « depuis l'Exposition ») against Fig. 1's ~5 m wall with arched gables.
- **The names.** They are on the skirt (§10.6), but `firstFloor.ts` puts its frieze plaques on the grande poutre, which the skirt hides.
- **The 3rd floor's 18.65** (PL-I) is not explained by any plate read (§10.8).

---

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
- **The Roux track curves at its top.** A straight 54.6° run would be 56.05 / 0.815 = 68.8 long, against the printed 66.60. That is consistent with a steeper top part, about 72° over the last 12 m or so [derived; only the total is printed].

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
- **The level floors do not fit the curved part.** On a 54.6° track a level deck 4.67 long rises 6.6 m from end to end over the rail. The model's car dips its inner end at most 1.1 into the girders' trough and floats the rest. Above node XXIV the slope reaches about 70° and a rigid car can no longer sit level, so the model's cars all stand below XXIV [estimated moment].

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
  - Otis: from z 0 to 125.63.
  - Roux: from z 0 to 68.4.
- **Cars.** One per leg, lower floors at 30 (Ouest), 42 (Sud), 12 (Est) and 22 (Nord) [estimated moment]. Each is two level decks stepped up the slope, a chassis along the rails, and a hanger under the lower deck's outer end.
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
- **Not built:**
  - the machinery, cylinders and pulleys of the inclined lifts;
  - the Edoux cables, top pulleys and distribution gear;
  - e3's « escalier de raccord » and the stairs above the 3rd floor;
  - the openings the lifts need in the decks of `platforms.ts`: the 1st and 2nd floors and the landing are solid there, so tracks, posts and stairs pass through them.

### 11.8 Disagreements and open points

- **Rail line below the 1st floor.** The plate reading gives 3.3; the clearance of the girders' feet requires at least 4.2 (§11.3). The model uses 4.2.
- **Ground stair width.** 1.00 (PL-XX, PL-XXVIII) against 1.20 between hand rails (E1900-TXT).
- **Riser.** 0.16 (E1900-TXT) against 7.8555 / 45 = 0.175 for three 15-riser flights per repeat (the model) [derived].
- **Leg numbering.** One E1900-TXT passage swaps 2 and 4.
- **e3's diameter.** 1.68 (PL-XX label) against 1.70–1.75 (auctioned sections).
- **The Edoux central post.** "890 × 600" or "800 × 600".

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
- **18.65.** At the 3rd floor the glass, the parapet, the edge beam, the console tips and the balcony railing all stand at 16.56. Nothing on any plate is 18.65 wide: Plate I's own strokes reach 17.6–17.7 [measured]. §10.8's open point is answered this far: whatever PL-I's "côté extérieur 18m65" measured, it is not drawn.

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
- **18.65** stays unexplained. Nothing is built at that width.
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
| Plan bracing: H′, H, K, E, F, G | Figs 13–15 (XVI–XII): H′ from the middle of the long girder B to A's centre; on the opposite long girder B′ the K bracket, a stub along the other diagonal and two short struts parallel to the faces back to B′, its apex 1.7–2.2 in from B′; H there only dashed. Fig. 18 (XI; X alike): H′ from c to A's centre; H from the opposite c through the lozenge's side C′ to the K bracket 1.3 inside it. Figs 19–20 (VIII–VI): E from c to the lozenge's side, F on to the centre; H from the opposite c to that side. Fig. 21 (V–II): E from c to the centre; H as before. Fig. 22 (I, 28-29): E from c to the centre; at the opposite corner two "G" off the two faces, 1.9 in, meeting at a chamfer, and H from c to it. Every figure leaves one half of the second diagonal open: toward c_TR in Figs 13–18, the other half in Figs 19–22 | not built | built on the second diagonal (x = −z), the plates' open half mapped onto the Edoux's car run (the lower car's, s > 0, up to X; the upper car's, s < 0, from VIII up: plate (X, Y) → model (x, −z)). What still meets the Edoux is cut at it (`EDOUX_PLAN`): H′ frames into the NORD cylinders and the central post at XVI–X, K into the SUD outboard guide post, E/F into that post and the central post, the G frame and H at I and top28 into the NORD outboard post. 145 girders a tower (97 before) | pattern [sourced]; K's reach, G's offset [measured]; the mapping [derived] |
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
- **Plan bracing** (from its own re-read): K's apex (1.7–2.2 in from B′, 4.2–5.5 from the axis) lands on or inside the model's SUD outboard guide post (5.15 out), and at XII near the lower car's run, so K frames into the post; Fig. 22's G frame stands around the NORD outboard post and inside the upper car's run at top28, so G and H stop there. H in Figs 13–15 is dashed only and not built. The girders stay flat trusses in one plane (B/F are "300" wide boxes with "treillis en plats >< sur les faces horizontales"); the lozenge side cut by the upper car's run at IV–II is unchanged.
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
  - the "2 Goussets 1.130 x 10" at the crossing;
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
| The arch member's end | PL-XI: the iron ends at **3.42** (±0.05), at PL-VII's shaft top. PL-VII: it enters the collar at **4.36** (as the pier is drawn; 4.58 by the rabattement rule). PL-I: meets the collar's top at **3.96 / 4.27** (the fin audit 3.91 / 4.02). Within 2° of vertical below 4.4 (PL-XI) to 5.7 (PL-VII). | 2.95 | the collar's top **4.30**, 1.25 under the pedestal's top; the arc is 0.5° off vertical there. The iron's hidden metre inside the stone is not built. | [measured] |
| The pier (PL-VII, from the ground; tops as drawn / by the rabattement) | plinth + base 1.09 / 1.66, 1.81–1.93 wide, flaring 0.50 toward the opening; rusticated shaft 3.05 / 3.41, 1.35 at the margins and 1.51 over the bosses; neck band and fillet 3.37 / 3.69, 1.31–1.43; capital block 3.92 / 4.19, 1.57; flared neck 4.24 / 4.47, 0.70; collar 4.36 / 4.58, 0.86–0.90. PL-I puts the capital about 1 m lower (a 65 px pier). | base 0.75, shaft 2.20, capital 2.75, collar 2.95 | base 1.07 (1.93), shaft 3.01 (1.50), band 3.32 (1.37), capital 3.87 (1.60), neck 4.00 (0.72), collar 4.30 (0.90); the collar reaches down past the member's tilted end, whose lowest corner is at 4.03 | [measured], ×0.986 to the collar |
| The bracket | Ties top down: PL-XI **12.48 / 11.50 / 9.05** (fin: 12.51 / 11.50 / 9.07); PL-VII **12.65 / 11.48 / 9.20** (fin: 12.45 / 11.32 / 9.13). All are referenced to the node line 6.40 or panel 1's mid line 11.90, a few metres off. The top tie is 0.6 above that mid line, not on it. The strut leaves the upright at the lowest tie's node and meets the arch at **6.62 / 6.66** (fin: 6.70 / 6.74). | 11.90 / 11.00 / 8.55, strut to 6.00 | **12.52 / 11.45 / 9.11**, strut to **6.68** (the means) | [measured] |
| Terrace balustrade | PL-XVIII Fig. 3 (63.0 / 63.3 px/m on 70.69): on every face it runs to the gallery's mid-bay columns at **±15.53** (ends at ±15.48–15.67), each end turning back to a post. Français and Russe: broken over the centre bay, ±3.88, with two curved flights down to the gallery. **Bar and Théâtre: unbroken.** Printed « 2.60 » to the gallery's column axis (measured 2.52–2.70) and « 1.52 » from the pavilion's front. | ±3.88 → ±11.65 on every face, its axis 2.76 in (0.16 behind the step) | ±15.53, broken over ±3.8825 on faces 2 (−z, Français) and 3 (−x, Russe), unbroken on 1 (+x, Bar) and 0 (+z); its outer face flush with the step's, axis 2.65 in | [measured] |
| Lift openings, 1st deck | PL-XVI Fig. 9 (« plancher entre les arbalétriers », 1:500 on its 16.35) and Fig. 10's joists. A slot on the leg's diagonal from the V at corner a, with edges on t − \|s\| = 23.9 (0.8 past a's axis), to an end member at **32.25 ± 0.3** (1.5 short of the leg's centre). Its sides are girders at **±2.70** (5.24 clear) from 26.6 to 31.3, chamfered to ±1.9 at the end. The leg's interior is otherwise a joisted floor. PL-XVIII Fig. 3 puts every station, Otis and Roux alike, at t 24.5–32.5 with the car within ±2.2. | solid: the Otis and Roux tracks crossed it in all four legs | open in all four legs: the V in three steps from 24.6, ±2.62 from 26.52 to 31.30, ±1.90 to 32.10 | [measured] |
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
- **PL-XI's 3.42 is the iron's own end, about a metre inside the stone.** It is not built. Its hidden metre would sit inside the collar and capital.
- **The 2nd floor's opening begins 0.5 nearer a than the plate's header.** It runs from 10.30 where the plate has 10.765, into the unjoisted triangle. The reason is that the model's rail line there is `lifts.ts`'s estimate: its track crosses the floor from 10.38. The neck stands at ±2.02, the girders' flanges plus 0.035, where the plate's deck meets their webs at ±1.90. Both openings leave their chamfers decked and step their V's.
- **No car is placed at either floor.** `lifts.ts` builds its cars level for the 54.6° run below node XXIV only. The openings were therefore checked against the tracks and the parked cars. In plan the cars (3.169 and 3.27 wide) fit the 5.24 and 5.33 clear widths. A car's swept path through the steeper panel 6 is not modelled.
- **The +z face** is drawn on PL-XVIII as the Théâtre that replaced the Restaurant Flamand after 1889. Its unbroken balustrade is carried back to 1889 [estimated].
- **Superseded:**
  - §17.1's end, pier and bracket heights, and §17.2's pedestal bullets;
  - §18.1's pedestals row and its terrace-balustrade extent;
  - §18.2's `PEDESTAL` bullet. `PEDESTAL.inner` and `.innerTop` are gone; the tiers replace them.
