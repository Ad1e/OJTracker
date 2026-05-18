// ─── Decimal Precision Utilities ─────────────────────────────────────────────
// Using decimal.js for precise financial calculations and percentages.
// This avoids JavaScript floating-point errors (e.g., 0.1 + 0.2 !== 0.3).
// ─────────────────────────────────────────────────────────────────────────────

import Decimal from "decimal.js";

// Configure Decimal.js for financial precision (4 decimal places)
Decimal.set({
  precision: 20,      // Internal precision for calculations
  rounding: 1,        // ROUND_HALF_UP (standard rounding)
  toExpNeg: -20,      // Exponent for negative numbers
  toExpPos: 20,       // Exponent for positive numbers
});

/**
 * Sum an array of numbers with perfect precision.
 * @example sumDecimal([0.1, 0.2, 0.3]) → Decimal("0.6")
 */
export function sumDecimal(
  numbers: (number | string | Decimal)[]
): Decimal {
  return numbers.reduce<Decimal>(
    (sum, num) => sum.plus(new Decimal(num)),
    new Decimal(0)
  );
}

/**
 * Calculate average of numbers with perfect precision.
 * @example averageDecimal([5.5, 6.5, 7.0]) → Decimal("6.33...")
 */
export function averageDecimal(
  numbers: (number | string | Decimal)[]
): Decimal {
  if (numbers.length === 0) return new Decimal(0);
  return sumDecimal(numbers).dividedBy(new Decimal(numbers.length));
}

/**
 * Calculate percentage of value relative to total, rounded to 2 decimal places.
 * @example percentDecimal(50, 100) → Decimal("50.00")
 */
export function percentDecimal(
  value: number | string | Decimal,
  total: number | string | Decimal
): Decimal {
  const totalDec = new Decimal(total);
  if (totalDec.equals(0)) return new Decimal(0);
  return new Decimal(value)
    .dividedBy(totalDec)
    .times(100)
    .toDecimalPlaces(2);
}

/**
 * Calculate progress as a percentage (capped at 100).
 * @example progressPercent(450, 500) → Decimal("90")
 */
export function progressPercent(
  completed: number | string | Decimal,
  target: number | string | Decimal
): Decimal {
  const progress = percentDecimal(completed, target);
  return progress.greaterThan(100) ? new Decimal(100) : progress;
}

/**
 * Subtract one value from another with precision.
 * @example subtractDecimal(10, 3.5) → Decimal("6.50")
 */
export function subtractDecimal(
  minuend: number | string | Decimal,
  subtrahend: number | string | Decimal
): Decimal {
  return new Decimal(minuend).minus(new Decimal(subtrahend));
}

/**
 * Multiply two values with precision.
 * @example multiplyDecimal(9.5, 8) → Decimal("76")
 */
export function multiplyDecimal(
  a: number | string | Decimal,
  b: number | string | Decimal
): Decimal {
  return new Decimal(a).times(new Decimal(b));
}

/**
 * Divide two values with precision, rounded to 2 decimal places.
 * @example divideDecimal(100, 3) → Decimal("33.33")
 */
export function divideDecimal(
  dividend: number | string | Decimal,
  divisor: number | string | Decimal,
  decimalPlaces: number = 2
): Decimal {
  const divisorDec = new Decimal(divisor);
  if (divisorDec.equals(0)) {
    throw new Error("Division by zero");
  }
  return new Decimal(dividend)
    .dividedBy(divisorDec)
    .toDecimalPlaces(decimalPlaces);
}

/**
 * Round a Decimal to a specific number of decimal places.
 * @example roundDecimal(3.14159, 2) → Decimal("3.14")
 */
export function roundDecimal(
  value: number | string | Decimal,
  places: number = 2
): Decimal {
  return new Decimal(value).toDecimalPlaces(places);
}

/**
 * Check if a value equals zero.
 * @example isZero(new Decimal(0)) → true
 */
export function isZero(value: number | string | Decimal): boolean {
  return new Decimal(value).equals(0);
}

/**
 * Convert Decimal to fixed-point string (for display).
 * @example toFixedString(new Decimal("99.5"), 2) → "99.50"
 */
export function toFixedString(
  value: number | string | Decimal,
  places: number = 2
): string {
  return new Decimal(value).toDecimalPlaces(places).toString();
}
