"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { SplitAuthPanel } from "@/components/shared/split-auth-panel";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CONCERN_OPTIONS } from "@/data/concern-mapping";

export default function NeedsAssessmentPage() {
  const router = useRouter();
  const [concern, setConcern] = useState<string>("");
  const [sessionType, setSessionType] = useState<string>("no_preference");
  const [budgetMax, setBudgetMax] = useState<string>("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const option = CONCERN_OPTIONS.find((o) => o.value === concern);
    const params = new URLSearchParams();
    if (option) params.set("specialty", option.specialtyName);
    if (sessionType !== "no_preference") params.set("sessionType", sessionType);
    if (budgetMax) params.set("priceMax", budgetMax);
    router.push(`/search?${params.toString()}`);
  }

  return (
    <main className="flex min-h-screen flex-col md:flex-row">
      <SplitAuthPanel
        eyebrow="Matching quiz"
        tagline="Let us help you get the best help you need."
        subtext="Your child, your choice."
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label>What&apos;s the primary concern?</Label>
            <Select value={concern} onValueChange={setConcern}>
              <SelectTrigger className="w-full" aria-label="What's the primary concern?">
                <SelectValue placeholder="Select what best fits" />
              </SelectTrigger>
              <SelectContent>
                {CONCERN_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Session type preference</Label>
            <Select value={sessionType} onValueChange={setSessionType}>
              <SelectTrigger className="w-full" aria-label="Session type preference">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no_preference">No preference</SelectItem>
                <SelectItem value="in_person">In-person</SelectItem>
                <SelectItem value="virtual">Virtual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Budget (max per session)</Label>
            <Select value={budgetMax} onValueChange={setBudgetMax}>
              <SelectTrigger className="w-full" aria-label="Budget (max per session)">
                <SelectValue placeholder="Any budget" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15000">Up to ₦15,000</SelectItem>
                <SelectItem value="20000">Up to ₦20,000</SelectItem>
                <SelectItem value="25000">Up to ₦25,000</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" variant="accent" size="lg" disabled={!concern} className="w-full">
            Show my matches
          </Button>
        </form>
      </SplitAuthPanel>
    </main>
  );
}
