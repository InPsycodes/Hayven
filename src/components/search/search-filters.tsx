"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { Chip } from "@/components/ui/chip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Specialty } from "@/data/types";

const PRICE_BANDS = [
  { label: "Any price", value: "" },
  { label: "Up to ₦15,000", value: "15000" },
  { label: "Up to ₦20,000", value: "20000" },
  { label: "Up to ₦25,000", value: "25000" },
];

const SESSION_TYPES = [
  { label: "Any session type", value: "" },
  { label: "In-person", value: "in_person" },
  { label: "Virtual", value: "virtual" },
];

// Availability is a demo-only affordance -- the mock data model doesn't carry
// a day/time preference field to filter against, so this reflects the visual
// spec without pretending to filter results.
const AVAILABILITY_OPTIONS = [
  { label: "Any availability", value: "" },
  { label: "Weekdays", value: "weekdays" },
  { label: "Evenings", value: "evenings" },
  { label: "Weekends", value: "weekends" },
  { label: "Flexible", value: "flexible" },
];

export function SearchFilters({ specialties }: { specialties: Specialty[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/search?${params.toString()}`);
  }

  const query = searchParams.get("query") ?? "";
  const specialtyName = searchParams.get("specialty") ?? "";
  const activeSpecialty = specialties.find((s) => s.name === specialtyName);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {query && (
        <Chip variant="filled" onRemove={() => setParam("query", "")}>
          &ldquo;{query}&rdquo;
        </Chip>
      )}
      {activeSpecialty && (
        <Chip variant="filled" onRemove={() => setParam("specialty", "")}>
          {activeSpecialty.name}
        </Chip>
      )}

      <Select value={specialtyName} onValueChange={(v) => setParam("specialty", v)}>
        <SelectTrigger size="sm" className="rounded-full" aria-label="Filter by specialty">
          <SelectValue placeholder="Specialty" />
        </SelectTrigger>
        <SelectContent>
          {specialties.map((s) => (
            <SelectItem key={s.id} value={s.name}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("location") || "any"}
        onValueChange={(v) => setParam("location", v === "any" ? "" : v)}
      >
        <SelectTrigger size="sm" className="rounded-full" aria-label="Filter by location">
          <SelectValue placeholder="Location" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="any">Any location</SelectItem>
          <SelectItem value="Lagos">Lagos</SelectItem>
          <SelectItem value="Virtual">Virtual only</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("priceMax") || "any"}
        onValueChange={(v) => setParam("priceMax", v === "any" ? "" : v)}
      >
        <SelectTrigger size="sm" className="rounded-full" aria-label="Filter by price range">
          <SelectValue placeholder="Price range" />
        </SelectTrigger>
        <SelectContent>
          {PRICE_BANDS.map((band) => (
            <SelectItem key={band.value || "any"} value={band.value || "any"}>
              {band.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select defaultValue="any">
        <SelectTrigger size="sm" className="rounded-full" aria-label="Filter by availability">
          <SelectValue placeholder="Availability" />
        </SelectTrigger>
        <SelectContent>
          {AVAILABILITY_OPTIONS.map((opt) => (
            <SelectItem key={opt.value || "any"} value={opt.value || "any"}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("sessionType") || "any"}
        onValueChange={(v) => setParam("sessionType", v === "any" ? "" : v)}
      >
        <SelectTrigger size="sm" className="rounded-full" aria-label="Filter by session type">
          <SelectValue placeholder="Session type" />
        </SelectTrigger>
        <SelectContent>
          {SESSION_TYPES.map((opt) => (
            <SelectItem key={opt.value || "any"} value={opt.value || "any"}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
