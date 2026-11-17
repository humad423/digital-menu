// Kept free of imports so the tests can load it directly.

/**
 * A coordinate for a seller who works from home: kept to two decimals, about a kilometre, so it places
 * the store in its area for nearby customers without pointing at the house. Others are kept as given.
 */
export function areaLocation(value: number, hidden: boolean): number {
  return hidden ? Math.round(value * 100) / 100 : value
}
