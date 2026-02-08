"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface AbsenceStat {
  type: string;
  label: string;
  count: number;
  days: number;
}

const COLORS: Record<string, string> = {
  VACATION: "#3b82f6",
  SICK_DAY: "#ef4444",
  DOCTOR: "#f59e0b",
  PERSONAL_DAY: "#8b5cf6",
  HOME_OFFICE: "#10b981",
};

export function AbsenceChart({ data }: { data: AbsenceStat[] }) {
  const hasData = data.some((d) => d.count > 0);

  if (!hasData) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-foreground-muted">
        Žádné absence v tomto měsíci
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: "var(--chart-axis)" }}
            axisLine={{ stroke: "var(--chart-grid)" }}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 12, fill: "var(--chart-axis)" }}
            axisLine={{ stroke: "var(--chart-grid)" }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--chart-tooltip-bg)",
              border: "1px solid var(--chart-tooltip-border)",
              borderRadius: "8px",
              fontSize: "13px",
              color: "var(--chart-tooltip-text)",
            }}
            formatter={(value, name) => {
              if (name === "count") return [`${value}`, "Počet žádostí"];
              return [`${value}`, "Dnů"];
            }}
          />
          <Bar dataKey="count" name="count" radius={[6, 6, 0, 0]}>
            {data.map((entry) => (
              <Cell
                key={entry.type}
                fill={COLORS[entry.type] ?? "#94a3b8"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
