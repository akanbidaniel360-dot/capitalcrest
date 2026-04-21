/**
 * Format an account number for display in groups of 4 digits.
 * Returns the full account number, e.g. `1234 5678 9012 3456`.
 */
export function maskAccountNumber(acct: string | null | undefined): string {
  if (!acct) return "•••• •••• •••• ••••";
  return acct.replace(/\s+/g, "").replace(/(.{4})/g, "$1 ").trim();
}

/** Compact form showing last 4 only, e.g. `••1234` */
export function maskShort(acct: string | null | undefined): string {
  if (!acct) return "••••";
  return `••${acct.slice(-4)}`;
}
