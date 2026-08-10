"use client";

import { CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from "recharts";

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { formatShortDate } from "@/data/format";

const config: ChartConfig = {
  percent: { label: "% independent", color: "var(--chart-1)" },
};

export function SkillAcquisitionChart({
  data,
  masteryThreshold,
}: {
  data: { date: string; percent: number | null }[];
  masteryThreshold?: number | null;
}) {
  return (
    <ChartContainer config={config} className="aspect-auto h-48 w-full">
      <LineChart data={data}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="date" tickFormatter={(d) => formatShortDate(d)} tickLine={false} axisLine={false} />
        <YAxis domain={[0, 100]} tickLine={false} axisLine={false} width={30} />
        {masteryThreshold != null && (
          <ReferenceLine y={masteryThreshold} stroke="var(--chart-3)" strokeDasharray="4 4" />
        )}
        <ChartTooltip content={<ChartTooltipContent labelFormatter={(d) => formatShortDate(String(d))} />} />
        <Line
          dataKey="percent"
          stroke="var(--color-percent)"
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
