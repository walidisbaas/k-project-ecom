"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { IntentCount } from "@/types";

const INTENT_COLORS: Record<string, string> = {
  WISMO: "#2563EB",
  RETURN: "#EF4444",
  EXCHANGE: "#F59E0B",
  CANCEL: "#6B7280",
  ORDER_PROBLEM: "#DC2626",
  PRODUCT_QUESTION: "#10B981",
  GENERAL: "#8B5CF6",
};

interface IntentChartProps {
  data: IntentCount[];
}

export function IntentChart({ data }: IntentChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-mk-text-muted text-sm">
        No data yet
      </div>
    );
  }

  const chartData = data.map((d) => ({
    name: d.intent,
    value: d.count,
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          outerRadius={80}
          dataKey="value"
          label={({ name, percent }) =>
            `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`
          }
          labelLine={false}
        >
          {chartData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={INTENT_COLORS[entry.name] ?? "#9CA3AF"}
            />
          ))}
        </Pie>
        <Tooltip
          formatter={(value, name) => [
            `${value} emails`,
            String(name),
          ]}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
