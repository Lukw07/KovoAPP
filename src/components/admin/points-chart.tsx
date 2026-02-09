"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

interface PointsStatsData {
  totalPoints: number;
  totalTransactions: number;
  categoryData: { category: string; points: number }[];
  dailyData: { date: string; points: number }[];
}

const PIE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4"];

export function PointsChart({ data }: { data: PointsStatsData }) {
  const hasData = data.totalTransactions > 0;

  if (!hasData) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-foreground-muted">
        Žádné body uděleny v tomto měsíci
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex gap-6">
        <div className="rounded-lg bg-blue-50 dark:bg-blue-900/30 px-4 py-2">
          <p className="text-xs text-blue-600 dark:text-blue-400">Celkem bodů</p>
          <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{data.totalPoints}</p>
        </div>
        <div className="rounded-lg bg-green-50 dark:bg-green-900/30 px-4 py-2">
          <p className="text-xs text-green-600 dark:text-green-400">Transakcí</p>
          <p className="text-xl font-bold text-green-700 dark:text-green-300">{data.totalTransactions}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Category Pie */}
        {data.categoryData.length > 0 && (
          <div>
            <h4 className="mb-2 text-sm font-medium text-foreground-secondary">
              Dle kategorie
            </h4>
            <div className="h-56 w-full min-w-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.categoryData}
                    dataKey="points"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {data.categoryData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={PIE_COLORS[i % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Daily Bar Chart */}
        {data.dailyData.length > 0 && (
          <div>
            <h4 className="mb-2 text-sm font-medium text-foreground-secondary">
              Dle dnů
            </h4>
            <div className="h-56 w-full min-w-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.dailyData}
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "var(--chart-axis)" }}
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
                    formatter={(value) => [`${value}`, "Body"]}
                  />
                  <Bar
                    dataKey="points"
                    fill="#3b82f6"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
