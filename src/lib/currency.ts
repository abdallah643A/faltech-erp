/**
 * Format a number as SAR currency with commas.
 * Handles large numbers (>1B) correctly.
 */
export function formatSAR(amount: number | null | undefined): string {
  const val = amount ?? 0;
  return val.toLocaleString('en-SA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Short format: 1.2M, 500K, etc. */
export function formatSARShort(amount: number | null | undefined): string {
  const val = amount ?? 0;
  if (Math.abs(val) >= 1e9) return (val / 1e9).toFixed(2) + 'B';
  if (Math.abs(val) >= 1e6) return (val / 1e6).toFixed(2) + 'M';
  if (Math.abs(val) >= 1e3) return (val / 1e3).toFixed(1) + 'K';
  return val.toLocaleString('en-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
