/** Coordinates are normalized to the ORIGINAL artwork, not a regenerated atlas. */
export type Point = readonly [number, number]
export type Polygon = readonly Point[]
export type LandscapeAnimation = { scene: keyof typeof landscapeCompositions; frames?: string[]; frameRegion?: [number, number, number, number]; duration?: number }
export type Composition = {
  middle: Polygon
  foreground: readonly Polygon[]
  water: readonly Polygon[]
  foliage: readonly Polygon[]
}

const below = (...edge: Point[]): Polygon => [...edge, [1, 1], [0, 1]]

export const landscapeCompositions = {
  "beach-dunes": {
    middle: below([0, .44], [.18, .42], [.36, .46], [.58, .48], [1, .49]),
    foreground: [below([0, .59], [.15, .69], [.32, .77], [.56, .86], [.79, .92], [1, .95])],
    water: [[[.04, .48], [1, .50], [1, .79], [.75, .71], [.48, .63], [.22, .55]]],
    foliage: [below([0, .62], [.15, .72], [.32, .81], [.56, .89], [.79, .95], [1, .98])],
  },
  "beach-boardwalk": {
    middle: below([0, .35], [.13, .38], [.27, .40], [.42, .41], [.56, .43], [1, .43]),
    foreground: [below([0, .46], [.12, .52], [.22, .54], [.32, .66], [.50, .76], [.73, .85], [1, .94])],
    water: [[[.30, .46], [1, .46], [1, .72], [.75, .65], [.51, .56]]],
    // The boardwalk, posts and rails remain rigid. Only the side grasses move.
    foliage: [
      [[0, .68], [.045, .73], [.055, .85], [.12, 1], [0, 1]],
      [[.30, .56], [.42, .61], [.54, .67], [.71, .71], [.87, .79], [1, .81], [1, .91], [.83, .86], [.69, .80], [.55, .75], [.41, .69], [.31, .63]],
    ],
  },
  "lakefront-city": {
    middle: below([0, .47], [.12, .40], [.20, .43], [.31, .41], [.31, .30], [.33, .30], [.34, .43], [.47, .42], [.47, .25], [.49, .25], [.49, .13], [.51, .13], [.51, .43], [.62, .43], [.62, .30], [.66, .30], [.66, .43], [.74, .39], [.78, .46], [.87, .38], [.90, .43], [1, .40]),
    foreground: [[[0, 0], [.34, 0], [.31, .08], [.25, .12], [.22, .21], [.16, .27], [.10, .42], [.09, .61], [.04, .66], [.04, .82], [.13, 1], [0, 1]]],
    water: [[[.20, .56], [1, .54], [1, 1], [.70, .96], [.47, .80], [.29, .68]]],
    foliage: [[[0, 0], [.33, 0], [.27, .13], [.20, .22], [.11, .34], [0, .34]]],
  },
  "prairie-clouds": {
    middle: below([0, .47], [.22, .49], [.43, .47], [.67, .49], [.82, .46], [1, .47]),
    foreground: [below([0, .64], [.12, .65], [.23, .68], [.38, .66], [.56, .68], [.76, .70], [1, .74])],
    water: [],
    foliage: [
      [[.30, .63], [.64, .68], [1, .73], [1, 1], [.37, 1], [.28, .93], [.36, .84], [.28, .75]],
      [[0, .62], [.12, .66], [.22, .76], [.12, .79], [.08, .84], [0, .76]],
      [[.89, .49], [.95, .47], [1, .49], [1, .57], [.87, .56]],
      [[.58, .54], [.63, .54], [.66, .59], [.56, .60]],
    ],
  },
  "backyard-sunset": {
    middle: below([0, .48], [.28, .47], [.49, .48], [.61, .41], [.67, .45], [.83, .43], [1, .47]),
    foreground: [[[0, 0], [.54, 0], [.46, .12], [.35, .22], [.28, .32], [.12, .43], [.11, .62], [0, .68]], below([0, .70], [.20, .69], [.32, .65], [.46, .69], [.65, .71], [1, .76])],
    water: [[[.29, .48], [.55, .49], [.47, .54], [.31, .55]]],
    foliage: [[[.06, 0], [.51, 0], [.42, .16], [.26, .28], [.11, .32]]],
  },
  "coastal-town": {
    middle: below([0, .35], [.16, .24], [.29, .31], [.42, .38], [.56, .46], [.65, .49], [1, .48]),
    foreground: [[[0, .12], [.13, .19], [.16, .33], [.08, .40], [.09, .58], [.23, .72], [.36, .88], [.55, 1], [0, 1]]],
    water: [[[.67, .52], [.90, .52], [1, .59], [1, 1], [.56, 1], [.42, .77], [.37, .65]]],
    foliage: [[[0, .12], [.11, .19], [.14, .29], [.08, .35], [0, .32]]],
  },
  "lakeside-marina": {
    middle: below([0, .54], [.19, .49], [.42, .47], [.64, .46], [.79, .50], [1, .42]),
    foreground: [[[0, .04], [.12, .13], [.10, .23], [.16, .27], [.10, .35], [.13, .52], [.29, .55], [.43, .65], [.45, .72], [.16, .85], [.18, 1], [0, 1]]],
    water: [[[.49, .54], [.78, .54], [.96, .56], [1, .72], [1, 1], [.45, 1], [.45, .73]]],
    foliage: [[[0, .06], [.10, .13], [.08, .21], [.13, .27], [.09, .33], [0, .32]]],
  },
  "beach-after-rain": {
    middle: below([0, .43], [.15, .44], [.29, .48], [.42, .46], [.51, .48], [.63, .50], [.80, .48], [1, .50]),
    foreground: [below([0, .55], [.10, .58], [.14, .66], [.24, .71], [.29, .82], [.48, .86], [.62, 1], [1, 1])],
    water: [[[.36, .55], [1, .54], [1, .86], [.65, .80], [.49, .73], [.26, .66]]],
    foliage: [],
  },
} satisfies Record<string, Composition>

/** Exactly matches CSS object-fit: cover / object-position, with no overscan. */
export function coverPlacement(width: number, height: number, imageWidth: number, imageHeight: number, position: string) {
  const [fx, fy] = position.split(/\s+/).map((value) => parseFloat(value) / 100)
  const scale = Math.max(width / imageWidth, height / imageHeight)
  const fullWidth = imageWidth * scale
  const fullHeight = imageHeight * scale
  return { scale, width: fullWidth, height: fullHeight, left: (width - fullWidth) * fx, top: (height - fullHeight) * fy }
}
