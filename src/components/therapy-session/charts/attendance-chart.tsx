"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { formatShortDate } from "@/data/format";

const config: ChartConfig = {
  sessions: { label: "Sessions", color: "var(--chart-1)" },
};

export function AttendanceChart({ data }: { data: { weekStart: string; sessions: number; minutes: number }[] }) {
  return (
    <ChartContainer config={config} className="aspect-auto h-48 w-full">
      <BarChart data={data}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="weekStart" tickFormatter={(d) => formatShortDate(d)} tickLine={false} axisLine={false} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={30} />
        <ChartTooltip content={<ChartTooltipContent labelFormatter={(d) => formatShortDate(String(d))} />} />
        <Bar dataKey="sessions" fill="var(--color-sessions)" radius={2} animationDuration={800} animationEasing="ease-out" />
      </BarChart>
    </ChartContainer>
  );
}
