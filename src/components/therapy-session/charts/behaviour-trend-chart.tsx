"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { formatShortDate } from "@/data/format";

const config: ChartConfig = {
  value: { label: "Raw value", color: "var(--chart-2)" },
  rollingAverage: { label: "3-session average", color: "var(--chart-1)" },
};

export function BehaviourTrendChart({
  data,
}: {
  data: { date: string; value: number | null; rollingAverage: number | null }[];
}) {
  return (
    <ChartContainer config={config} className="aspect-auto h-48 w-full">
      <LineChart data={data}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="date" tickFormatter={(d) => formatShortDate(d)} tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} width={30} />
        <ChartTooltip content={<ChartTooltipContent labelFormatter={(d) => formatShortDate(String(d))} />} />
        <Line
          dataKey="value"
          stroke="var(--color-value)"
          strokeWidth={1}
          dot={false}
          connectNulls={false}
          animationDuration={800}
          animationEasing="ease-out"
        />
        <Line
          dataKey="rollingAverage"
          stroke="var(--color-rollingAverage)"
          strokeWidth={2}
          dot
          connectNulls={false}
          animationDuration={800}
          animationEasing="ease-out"
        />
      </LineChart>
    </ChartContainer>
  );
}
