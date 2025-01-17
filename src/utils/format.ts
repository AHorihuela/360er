/**
 * Formats a score to one decimal place for display
 * @param score The raw score value
 * @param includeDenominator Whether to include the "/5.0" suffix (defaults to false)
 * @param maxScore Optional maximum score value (defaults to 5)
 * @returns Formatted score string (e.g., "3.7" or "3.7/5.0")
 */
export function formatScore(score: number, includeDenominator: boolean = false, maxScore: number = 5): string {
  const roundedScore = Number((Math.round(score * 10) / 10).toFixed(1));
  return includeDenominator ? `${roundedScore}/${maxScore.toFixed(1)}` : roundedScore.toString();
}

/**
 * Formats a raw score to one decimal place without the max score
 * @param score The raw score value
 * @returns Formatted score string (e.g., "3.7")
 */
export function formatRawScore(score: number): string {
  return Number((Math.round(score * 10) / 10).toFixed(1)).toString();
} 