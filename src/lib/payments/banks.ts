import "server-only";

import { unstable_cache } from "next/cache";

import { isFlutterwaveConfigured, listBanks } from "@/lib/payments/flutterwave";
import { FALLBACK_BANKS, type NigerianBank } from "@/lib/payments/nigerian-banks";

const loadLiveBanks = unstable_cache(
  async (): Promise<NigerianBank[]> => {
    const banks = await listBanks();
    return banks.sort((a, b) => a.name.localeCompare(b.name));
  },
  ["flutterwave-banks-ng"],
  { revalidate: 24 * 60 * 60 }
);

/**
 * Nigerian banks with the codes Flutterwave uses for account checks and
 * transfers: the live list (cached a day) when Flutterwave is set up,
 * otherwise the fallback of banks with standard CBN codes.
 */
export async function getBanks(): Promise<NigerianBank[]> {
  if (!isFlutterwaveConfigured()) return FALLBACK_BANKS;
  try {
    const live = await loadLiveBanks();
    return live.length > 0 ? live : FALLBACK_BANKS;
  } catch {
    return FALLBACK_BANKS;
  }
}
