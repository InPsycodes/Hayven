"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

const config: ChartConfig = {
  mean: { label: "Mean effectiveness", color: "var(--chart-1)" },
};

export function ReinforcerEffectivenessChart({ data }: { data: { name: string; mean: number; uses: number }[] }) {
  return (
    <ChartContainer config={config} className="aspect-auto h-48 w-full">
      <BarChart data={data} layout="vertical" margin={{ left: 16 }}>
        <CartesianGrid horizontal={false} />
        <XAxis type="number" domain={[0, 5]} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={100} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value, _name, item) => `${value} / 5 (${item.payload.uses} uses)`}
            />
          }
        />
        <Bar dataKey="mean" fill="var(--color-mean)" radius={2} animationDuration={300} animationEasing="ease-out" />
      </BarChart>
    </ChartContainer>
  );
}
