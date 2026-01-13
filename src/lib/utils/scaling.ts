import Decimal from 'decimal.js';

/**
 * Scales up a Decimal by a given number of decimals and truncates it
 * according to the maximum precision.
 *
 * @param amount - The Decimal to scale and truncate.
 * @param decimals - The total number of decimals for the asset.
 * @param maxPrecision - The maximum allowed precision.
 * @returns A Decimal instance representing the scaled and truncated value.
 */
export function scaleUpAndTruncateToInt(amount: Decimal, decimals: number, maxPrecision: number): Decimal {
  const priceInt = amount.mul(new Decimal(10).pow(decimals));
  const truncateFactor = new Decimal(10).pow(decimals - maxPrecision);
  return priceInt.div(truncateFactor).floor().mul(truncateFactor);
}

/**
 * Calculates the order quantity respecting the base asset's max_precision and scaling up decimals.
 * Assumes that the quantityInQuote and the price are not scaled up.
 *
 * @param quantityInQuote - The order value in the quote asset in Decimal. Should not be scaled up.
 * @param price - The price of the asset in Decimal. Should not be scaled up.
 * @param baseDecimals - The number of decimals for the base asset.
 * @param baseMaxPrecision - The maximum allowed precision for the base asset.
 * @returns A scaled up base quantity respecting the max precision as Decimal
 */
export function calculateBaseQuantity(
  quantityInQuote: Decimal,
  price: Decimal,
  baseDecimals: number,
  baseMaxPrecision: number
): Decimal {
  const quantityInBase = quantityInQuote.div(price);
  let scaledQuantity = quantityInBase.mul(new Decimal(10).pow(baseDecimals));
  const truncateFactor = new Decimal(10).pow(baseDecimals - baseMaxPrecision);
  return scaledQuantity.div(truncateFactor).ceil().mul(truncateFactor);
}
