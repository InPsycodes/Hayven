"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatShortDate } from "@/data/format";

const LINE_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-5)"];

export function GoalProgressChart({
  data,
  goals,
}: {
  data: { date: string; [goalId: string]: string | number | null }[];
  goals: { id: string; title: string }[];
}) {
  const config: ChartConfig = Object.fromEntries(
    goals.map((goal, index) => [goal.id, { label: goal.title, color: LINE_COLORS[index % LINE_COLORS.length] }])
  );

  return (
    <ChartContainer config={config} className="aspect-auto h-60 w-full">
      <LineChart data={data}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="date" tickFormatter={(d) => formatShortDate(String(d))} tickLine={false} axisLine={false} />
        <YAxis domain={[0, 100]} tickLine={false} axisLine={false} width={30} />
        <ChartTooltip content={<ChartTooltipContent labelFormatter={(d) => formatShortDate(String(d))} />} />
        <ChartLegend content={<ChartLegendContent className="flex-wrap gap-x-4 gap-y-1 text-xs" />} />
        {goals.map((goal, index) => (
          <Line
            key={goal.id}
            dataKey={goal.id}
            name={goal.title}
            stroke={LINE_COLORS[index % LINE_COLORS.length]}
            strokeWidth={2}
            dot
            connectNulls={false}
            animationDuration={300}
            animationEasing="ease-out"
          />
        ))}
      </LineChart>
    </ChartContainer>
  );
}
