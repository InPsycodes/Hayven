// Client-safe. The fallback bank list, used until Flutterwave's live list
// (GET /banks/NG, see banks.ts) can be loaded. Only banks identified by
// their standard CBN codes, which Flutterwave uses too; fintech banks
// (Kuda, Moniepoint, OPay, PalmPay and others) have provider-specific codes,
// so they come from the live list only rather than from a guess here.

export interface NigerianBank {
  name: string;
  code: string;
}

export const FALLBACK_BANKS: NigerianBank[] = [
  { name: "Access Bank", code: "044" },
  { name: "Citibank Nigeria", code: "023" },
  { name: "Ecobank Nigeria", code: "050" },
  { name: "Fidelity Bank", code: "070" },
  { name: "First Bank of Nigeria", code: "011" },
  { name: "First City Monument Bank (FCMB)", code: "214" },
  { name: "Guaranty Trust Bank (GTBank)", code: "058" },
  { name: "Heritage Bank", code: "030" },
  { name: "Keystone Bank", code: "082" },
  { name: "Polaris Bank", code: "076" },
  { name: "Providus Bank", code: "101" },
  { name: "Stanbic IBTC Bank", code: "221" },
  { name: "Standard Chartered Bank", code: "068" },
  { name: "Sterling Bank", code: "232" },
  { name: "Union Bank of Nigeria", code: "032" },
  { name: "United Bank For Africa (UBA)", code: "033" },
  { name: "Unity Bank", code: "215" },
  { name: "Wema Bank", code: "035" },
  { name: "Zenith Bank", code: "057" },
];

/** A bank's name from a list, or null when the code isn't in it. */
export function bankNameIn(banks: NigerianBank[], code: string | null | undefined): string | null {
  if (!code) return null;
  return banks.find((b) => b.code === code)?.name ?? null;
}
