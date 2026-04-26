export const CURRENCIES = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "NGN", symbol: "₦", name: "Nigerian Naira" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
  { code: "ZAR", symbol: "R", name: "South African Rand" },
  { code: "GHS", symbol: "₵", name: "Ghanaian Cedi" },
  { code: "KES", symbol: "KSh", name: "Kenyan Shilling" },
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
] as const;

export const COUNTRIES = [
  "United States", "Nigeria", "United Kingdom", "Germany", "France",
  "Canada", "South Africa", "Ghana", "Kenya", "India",
] as const;

export function getCurrencySymbol(code: string): string {
  return CURRENCIES.find((c) => c.code === code)?.symbol ?? code;
}

export function formatCurrency(amount: number, currency: string): string {
  const symbol = getCurrencySymbol(currency);
  return `${symbol}${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export const CONVERSION_FEE_RATE = 0.005; // 0.5% spread

export function convertAmount(amount: number, rate: number): number {
  return amount * rate * (1 - CONVERSION_FEE_RATE);
}

/**
 * Convert an amount between two currencies using a USD-hub rates table.
 * `rates` rows look like { from_currency, to_currency, rate }.
 * No conversion fee applied — used for display equivalents.
 */
export function convertWithRates(
  amount: number,
  from: string,
  to: string,
  rates: { from_currency: string; to_currency: string; rate: number | string }[],
): number {
  if (!amount || from === to) return amount;

  const findRate = (a: string, b: string) => {
    const r = rates.find((x) => x.from_currency === a && x.to_currency === b);
    if (r) return Number(r.rate);
    const inv = rates.find((x) => x.from_currency === b && x.to_currency === a);
    if (inv && Number(inv.rate) !== 0) return 1 / Number(inv.rate);
    return null;
  };

  // Direct
  const direct = findRate(from, to);
  if (direct !== null) return amount * direct;

  // Via USD hub
  const toUsd = findRate(from, "USD");
  const fromUsd = findRate("USD", to);
  if (toUsd !== null && fromUsd !== null) return amount * toUsd * fromUsd;

  return 0;
}
