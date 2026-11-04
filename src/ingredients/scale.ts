/**
 * World scale: how big one real centimetre is in scene units.
 *
 * Think of it as the document size of the whole project. Every ingredient is
 * built at its real size (a 3.5 cm strawberry, a 22 cm loaf) and this one
 * number turns centimetres into scene units.
 *
 * Where the number comes from: the default apple's longest side measures
 * 2.095944 scene units, and the apple's spec says it is 8 cm wide. So
 * 2.095944 / 8 = 0.262. The apple keeps the size it always had, and every
 * other ingredient is measured against it.
 */
export const UNITS_PER_CM = 2.095944 / 8;

/** Centimetres to scene units. */
export function cmToUnits(cm: number): number {
  return cm * UNITS_PER_CM;
}

/** Scene units to centimetres (for checks and reports). */
export function unitsToCm(units: number): number {
  return units / UNITS_PER_CM;
}
