"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { IconSearch } from "@tabler/icons-react";

import { Chip } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Specialty } from "@/data/types";

const PRICE_BANDS = [
  { label: "Up to ₦15,000", value: "15000" },
  { label: "Up to ₦20,000", value: "20000" },
  { label: "Up to ₦25,000", value: "25000" },
];

const SESSION_TYPES = [
  { label: "In-person", value: "in_person" },
  { label: "Virtual", value: "virtual" },
];

const SORT_OPTIONS = [
  { label: "Recommended", value: "recommended" },
  { label: "Price: low to high", value: "price_asc" },
  { label: "Price: high to low", value: "price_desc" },
  { label: "Most experienced", value: "experience" },
];

const FILTER_KEYS = ["query", "specialty", "location", "priceMax", "sessionType"] as const;

export function SearchFilters({
  specialties,
  resultCount,
}: {
  specialties: Specialty[];
  resultCount: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function push(params: URLSearchParams) {
    const qs = params.toString();
    router.push(`/search${qs ? `?${qs}` : ""}`);
  }

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    push(params);
  }

  const query = searchParams.get("query") ?? "";
  const specialtyName = searchParams.get("specialty") ?? "";
  const location = searchParams.get("location") ?? "";
  const priceMax = searchParams.get("priceMax") ?? "";
  const sessionType = searchParams.get("sessionType") ?? "";
  const sort = searchParams.get("sort") ?? "recommended";

  const [queryDraft, setQueryDraft] = useState(query);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setParam("query", queryDraft.trim());
  }

  function removeFilter(key: string) {
    if (key === "query") setQueryDraft("");
    setParam(key, "");
  }

  function clearAll() {
    const params = new URLSearchParams(searchParams.toString());
    FILTER_KEYS.forEach((k) => params.delete(k));
    setQueryDraft("");
    push(params);
  }

  const activeFilters: { key: string; label: string }[] = [];
  if (query) activeFilters.push({ key: "query", label: `“${query}”` });
  if (specialtyName) activeFilters.push({ key: "specialty", label: specialtyName });
  if (location)
    activeFilters.push({ key: "location", label: location === "Virtual" ? "Virtual only" : location });
  if (priceMax)
    activeFilters.push({ key: "priceMax", label: `Up to ₦${Number(priceMax).toLocaleString("en-NG")}` });
  if (sessionType)
    activeFilters.push({
      key: "sessionType",
      label: sessionType === "in_person" ? "In-person" : "Virtual",
    });

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={handleSearchSubmit} className="relative max-w-md">
        <IconSearch
          size={16}
          stroke={2}
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          type="search"
          value={queryDraft}
          onChange={(e) => setQueryDraft(e.target.value)}
          placeholder="Search by name or specialty"
          aria-label="Search therapists"
          className="rounded-full pl-9"
        />
      </form>

      <div className="flex flex-wrap items-center gap-2">
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
          value={location || "any"}
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
          value={priceMax || "any"}
          onValueChange={(v) => setParam("priceMax", v === "any" ? "" : v)}
        >
          <SelectTrigger size="sm" className="rounded-full" aria-label="Filter by price range">
            <SelectValue placeholder="Any price" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any price</SelectItem>
            {PRICE_BANDS.map((band) => (
              <SelectItem key={band.value} value={band.value}>
                {band.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={sessionType || "any"}
          onValueChange={(v) => setParam("sessionType", v === "any" ? "" : v)}
        >
          <SelectTrigger size="sm" className="rounded-full" aria-label="Filter by session type">
            <SelectValue placeholder="Any session type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any session type</SelectItem>
            {SESSION_TYPES.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {activeFilters.map((filter) => (
            <Chip key={filter.key} variant="filled" onRemove={() => removeFilter(filter.key)}>
              {filter.label}
            </Chip>
          ))}
          <button
            type="button"
            onClick={clearAll}
            className="text-xs font-medium text-rust-dark hover:underline"
          >
            Clear all
          </button>
        </div>
      )}

      <div className="mt-1 flex items-center justify-between gap-3 border-b border-border pb-2">
        <span className="font-serif text-base text-charcoal">
          {resultCount} verified {resultCount === 1 ? "therapist" : "therapists"}
        </span>
        <Select
          value={sort}
          onValueChange={(v) => setParam("sort", v === "recommended" ? "" : v)}
        >
          <SelectTrigger size="sm" className="w-auto gap-2" aria-label="Sort results">
            <span className="text-muted-foreground">Sort ·</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
