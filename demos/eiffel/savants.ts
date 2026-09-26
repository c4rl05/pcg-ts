/**
 * The 72 names on the first-floor frieze, 18 to a face, as the tower
 * carries them: the text of each panel, left to right as seen from outside
 * the face.
 *
 * « j'ai décidé d'inscrire en lettres d'or sur la grande frise du premier
 * étage et à la place d'honneur, les noms des plus grands savants qui ont
 * honoré la France depuis 1789 jusqu'à nos jours » (Eiffel, 20 Feb. 1889,
 * quoted by G. Barral, *Le Panthéon scientifique de la tour Eiffel*, 1892,
 * p. 4) [sourced secondary]. Capitals, gilded, in relief, about 0.60 tall
 * (Barral p. 19) [sourced secondary]; the book gives no letter height.
 *
 * THE LISTS are Eiffel's (PL-XIX Fig. 1, « Noms des savants inscrits sur les
 * faces de la Tour », 18 panels a face) [sourced], read against Barral p. 21
 * (by way of the French and English encyclopaedia lists, which cite it)
 * and photographs of the faces:
 * - WHICH FACE. The plate's headers name the faces by compass, « N.O. »,
 *   « O.S. », « S.E. », « E.N. »; its elevation (Fig. 1) confirms the S.E.
 *   list [sourced]. Barral's four sides agree with all four: Trocadéro
 *   (north-west), Grenelle (south-west), École militaire (south-east), La
 *   Bourdonnais (north-east) [sourced secondary], and so do the photographs
 *   of all four faces (Commons' "Names on southeast side of the Eiffel
 *   Tower, Paris 2011", "Tour eiffel savants nord est", "Savants tour
 *   eiffel grenelle", "Tour Eiffel vue depuis Pont Iéna Paris 12")
 *   [observed].
 * - THE ORDER is left to right seen from outside the face [observed: S.E.
 *   reads MORIN HAUY COMBES THENARD ARAGO POISSON..., N.E. ends PELOUZE
 *   CARNOT LAME, S.W. begins JAMIN GAY-LUSSAC FIZEAU SCHNEIDER LE
 *   CHATELIER, N.W. reads SEGUIN LALANDE ... CHAPTAL; PL-XIX's S.E.
 *   elevation reads the same way].
 * - THE SPELLING is what is cast, which is not always what the plate
 *   prints. The tower carries NO accents: HAUY, THENARD, AMPERE, BELANGER,
 *   GOUIN, LAME, where the plate's list prints Haüy, Thénard, Ampère,
 *   Bélanger, Goüin, Lamé [observed on the photographs: HAUY, THENARD,
 *   LAME; the encyclopaedias' "name appearing" columns agree for all 72].
 *   The plate's « Couchy » is CAUCHY on the tower [observed: the close-up
 *   "Augustin-Louis Cauchy on southeast side of the Eiffel Tower"]: a
 *   slip of the plate's engraver, as the list is Cauchy's. « Lechatelier »
 *   and « Leverrier » in the plate's OCR are LE CHATELIER and LE VERRIER
 *   on the tower, two words [observed for LE CHATELIER]; « Caü » is the
 *   OCR's reading of CAIL.
 * The names were painted over early in the 20th century and restored in
 * 1986-87; the photographs show the restoration, which the lists above
 * (1889's plate, 1892's Barral) match name for name.
 *
 * Keyed by `FACES`' compass (spec.ts), which carries each face to its
 * quadrant; tests/eiffelNames.test.ts holds the lists to this comment.
 */
export const SAVANTS: Readonly<Record<"NW" | "SW" | "SE" | "NE", readonly string[]>> = {
  /** Trocadéro side, PL-XIX « N.O. ». */
  NW: [
    "SEGUIN",
    "LALANDE",
    "TRESCA",
    "PONCELET",
    "BRESSE",
    "LAGRANGE",
    "BELANGER",
    "CUVIER",
    "LAPLACE",
    "DULONG",
    "CHASLES",
    "LAVOISIER",
    "AMPERE",
    "CHEVREUL",
    "FLACHAT",
    "NAVIER",
    "LEGENDRE",
    "CHAPTAL",
  ],
  /** Grenelle side, PL-XIX « O.S. ». */
  SW: [
    "JAMIN",
    "GAY-LUSSAC",
    "FIZEAU",
    "SCHNEIDER",
    "LE CHATELIER",
    "BERTHIER",
    "BARRAL",
    "DE DION",
    "GOUIN",
    "JOUSSELIN",
    "BROCA",
    "BECQUEREL",
    "CORIOLIS",
    "CAIL",
    "TRIGER",
    "GIFFARD",
    "PERRIER",
    "STURM",
  ],
  /** École militaire (Champ-de-Mars) side, PL-XIX « S.E. », the face its elevation draws. */
  SE: [
    "CAUCHY",
    "BELGRAND",
    "REGNAULT",
    "FRESNEL",
    "DE PRONY",
    "VICAT",
    "EBELMEN",
    "COULOMB",
    "POINSOT",
    "FOUCAULT",
    "DELAUNAY",
    "MORIN",
    "HAUY",
    "COMBES",
    "THENARD",
    "ARAGO",
    "POISSON",
    "MONGE",
  ],
  /** La Bourdonnais (Paris) side, PL-XIX « E.N. ». */
  NE: [
    "PETIET",
    "DAGUERRE",
    "WURTZ",
    "LE VERRIER",
    "PERDONNET",
    "DELAMBRE",
    "MALUS",
    "BREGUET",
    "POLONCEAU",
    "DUMAS",
    "CLAPEYRON",
    "BORDA",
    "FOURIER",
    "BICHAT",
    "SAUVAGE",
    "PELOUZE",
    "CARNOT",
    "LAME",
  ],
};
