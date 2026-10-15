"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { bankNameIn, type NigerianBank } from "@/lib/payments/nigerian-banks";
import { updateBankDetails, type FormState } from "@/lib/therapist/actions";
import type { BankDetails } from "@/lib/payouts/queries";

const initialState: FormState = {};

export function TherapistBankCard({ current, banks }: { current: BankDetails | null; banks: NigerianBank[] }) {
  const [state, formAction, isPending] = useActionState(updateBankDetails, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-sm bg-card p-5 ring-1 ring-foreground/10">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-heading text-base text-charcoal">Payout bank account</h2>
        <StatusBadge tone={current ? "sage" : "error"}>{current ? "On file" : "Missing"}</StatusBadge>
      </div>
      <p className="-mt-1 text-xs text-muted-foreground">
        Where Hayven sends your earnings. We verify it with your bank before saving. Until this is set, your
        profile won&apos;t appear in search.
      </p>

      {current && (
        <p className="rounded-sm bg-inset px-3 py-2 text-xs text-charcoal">
          Currently: <span className="font-medium">{current.accountName}</span> ·{" "}
          {bankNameIn(banks, current.bankCode) ?? current.bankCode} · {current.accountNumberMasked}
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Select name="bankCode" defaultValue={current?.bankCode || undefined}>
          <SelectTrigger className="sm:w-56" aria-label="Bank">
            <SelectValue placeholder="Select your bank" />
          </SelectTrigger>
          <SelectContent>
            {banks.map((b) => (
              <SelectItem key={b.code} value={b.code}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          name="accountNumber"
          inputMode="numeric"
          maxLength={10}
          placeholder="10-digit account number"
          aria-label="Account number"
          className="sm:w-52"
        />
      </div>

      {state.error && <p className="text-sm text-error-text">{state.error}</p>}
      {!state.error && state !== initialState && (
        <p className="fade-in text-sm text-success-text">Bank account verified and saved.</p>
      )}

      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? "Verifying..." : current ? "Update account" : "Verify & save"}
      </Button>
    </form>
  );
}
