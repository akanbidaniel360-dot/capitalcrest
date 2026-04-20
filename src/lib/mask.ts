/**
 * Mask an account number for display, showing only the last 4 digits.
 * Always renders as `**** **** **** 1234`.
 */
export function maskAccountNumber(acct: string | null | undefined): string {
  if (!acct) return "**** **** **** ****";
  const last4 = acct.slice(-4).padStart(4, "*");
  return `**** **** **** ${last4}`;
}

/** Show last 4 only — compact form, e.g. `••1234` */
export function maskShort(acct: string | null | undefined): string {
  if (!acct) return "••••";
  return `••${acct.slice(-4)}`;
}
