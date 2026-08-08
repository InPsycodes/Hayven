"use client";

import { CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from "recharts";

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { formatShortDate } from "@/data/format";

const config: ChartConfig = {
  value: { label: "Per hour", color: "var(--chart-1)" },
};

export function BehaviourFrequencyChart({
  data,
  direction,
  baselineValue,
}: {
  data: { date: string; value: number | null }[];
  direction: string;
  baselineValue?: number | null;
}) {
  return (
    <div>
      <ChartContainer config={config} className="aspect-auto h-48 w-full">
        <LineChart data={data}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="date" tickFormatter={(d) => formatShortDate(d)} tickLine={false} axisLine={false} />
          <YAxis tickLine={false} axisLine={false} width={30} />
          {baselineValue != null && (
            <ReferenceLine y={baselineValue} stroke="var(--chart-4)" strokeDasharray="4 4" />
          )}
          <ChartTooltip content={<ChartTooltipContent labelFormatter={(d) => formatShortDate(String(d))} />} />
          <Line dataKey="value" stroke="var(--color-value)" strokeWidth={2} dot connectNulls={false} />
        </LineChart>
      </ChartContainer>
      <p className="mt-1 text-[11px] text-muted-foreground">
        {direction === "decrease" ? "Lower is better" : "Higher is better"}, normalised per hour.
      </p>
    </div>
  );
}
