"use client";

import { useTheme } from "next-themes";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { dayNames } from "@/lib/countries";

// Design palette
const COLORS = {
  light: {
    primary: "#201D1D",
    secondary: "#646262",
    tertiary: "#9A9898",
    muted: "#E5E5E5",
    destructive: "#DC2626",
    warning: "#D97706",
    success: "#16A34A",
  },
  dark: {
    primary: "#FDFCFC",
    secondary: "#9A9898",
    tertiary: "#646262",
    muted: "#2A2A2A",
    destructive: "#EF4444",
    warning: "#F59E0B",
    success: "#22C55E",
  },
};

// Colors for pie charts
const PIE_COLORS = ["#201D1D", "#646262", "#9A9898", "#D97706", "#DC2626", "#16A34A", "#8B5CF6", "#EC4899"];
const PIE_COLORS_DARK = ["#FDFCFC", "#9A9898", "#646262", "#F59E0B", "#EF4444", "#22C55E", "#A78BFA", "#F472B6"];

// Subject type colors
const TYPE_COLORS: Record<string, string> = {
  cours: "#201D1D",
  td: "#D97706",
  tp: "#16A34A",
  projet: "#8B5CF6",
  autre: "#9A9898",
};

const TYPE_COLORS_DARK: Record<string, string> = {
  cours: "#FDFCFC",
  td: "#F59E0B",
  tp: "#22C55E",
  projet: "#A78BFA",
  autre: "#646262",
};

interface DashboardChartsProps {
  roomUtilization: Array<{ id: string; name: string; usedSlots: number; capacity: number | null }>;
  teacherWorkload: Array<{ id: string; name: string; assignedHours: number; maxHours: number; percentage: number }>;
  subjectData: Array<{ name: string; hours: number }>;
  completionRate: number;
  roomSlotsByDay?: Array<{ dayOfWeek: number; roomId: string; roomName: string; count: number }>;
  subjectTypeBreakdown?: Array<{ name: string; value: number }>;
  weeklyHoursDistribution?: Array<{ name: string; value: number }>;
}

export function DashboardCharts({
  roomUtilization,
  teacherWorkload,
  subjectData,
  completionRate,
  roomSlotsByDay,
  subjectTypeBreakdown,
  weeklyHoursDistribution,
}: DashboardChartsProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const palette = isDark ? COLORS.dark : COLORS.light;

  // 1. Weekly Room Utilization Bar Chart
  const weeklyRoomData = (() => {
    if (!roomSlotsByDay || roomSlotsByDay.length === 0) {
      return roomUtilization.slice(0, 6).map((r) => ({
        name: r.name,
        utilisation: r.usedSlots,
      }));
    }
    const dayMap = new Map<number, number>();
    for (const r of roomSlotsByDay) {
      dayMap.set(r.dayOfWeek, (dayMap.get(r.dayOfWeek) || 0) + r.count);
    }
    return Array.from(dayMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([day, count]) => ({
        name: dayNames[day] || `Jour ${day}`,
        utilisation: count,
      }));
  })();

  // 2. Teacher Workload Distribution Pie Chart
  const workloadDistribution = (() => {
    let underloaded = 0;
    let normal = 0;
    let overloaded = 0;
    for (const t of teacherWorkload) {
      if (t.percentage < 50) underloaded++;
      else if (t.percentage <= 80) normal++;
      else overloaded++;
    }
    return [
      { name: "Sous-chargé", value: underloaded },
      { name: "Normal", value: normal },
      { name: "Surchargé", value: overloaded },
    ].filter((d) => d.value > 0);
  })();

  // 3. Subject Hours Distribution (horizontal bar)
  const subjectChartData = subjectData
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 10)
    .map((s) => ({
      name: s.name.length > 20 ? s.name.slice(0, 20) + "…" : s.name,
      heures: s.hours,
    }));

  // 4. Completion progress data
  const completionData = [
    { name: "Complété", value: completionRate },
    { name: "Restant", value: 100 - completionRate },
  ];

  // 5. Weekly hours distribution (pie chart)
  const weeklyHoursData = weeklyHoursDistribution && weeklyHoursDistribution.length > 0
    ? weeklyHoursDistribution
    : [];

  // 6. Subject type breakdown (pie chart)
  const subjectTypeData = subjectTypeBreakdown && subjectTypeBreakdown.length > 0
    ? subjectTypeBreakdown
    : [];

  const chartFont = {
    fontFamily: "'Sarasa Mono SC', 'Liberation Mono', 'DejaVu Sans Mono', monospace",
  };

  const tooltipStyle = {
    backgroundColor: isDark ? "#111111" : "#FFFFFF",
    border: `1px solid ${isDark ? "#2A2A2A" : "#E5E5E5"}`,
    color: isDark ? "#FDFCFC" : "#201D1D",
    fontSize: "11px",
    fontFamily: chartFont.fontFamily,
  };

  return (
    <div className="space-y-8">
      <p className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC]">Analytique</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Room Utilization */}
        <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-6">
          <p className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC] mb-4">
            Utilisation des salles
          </p>
          {weeklyRoomData.length === 0 ? (
            <p className="text-xs text-[#9A9898] py-8 text-center">Aucune donnée disponible</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={weeklyRoomData} style={chartFont}>
                <CartesianGrid strokeDasharray="3 3" stroke={palette.muted} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: palette.secondary, fontSize: 10 }}
                  axisLine={{ stroke: palette.muted }}
                  tickLine={{ stroke: palette.muted }}
                />
                <YAxis
                  tick={{ fill: palette.secondary, fontSize: 10 }}
                  axisLine={{ stroke: palette.muted }}
                  tickLine={{ stroke: palette.muted }}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{ fill: isDark ? "rgba(253,252,252,0.05)" : "rgba(32,29,29,0.05)" }}
                />
                <Bar dataKey="utilisation" fill={palette.primary} radius={[0, 0, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Teacher Workload Distribution */}
        <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-6">
          <p className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC] mb-4">
            Charge des enseignants
          </p>
          {workloadDistribution.length === 0 ? (
            <p className="text-xs text-[#9A9898] py-8 text-center">Aucun enseignant configuré</p>
          ) : (
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart style={chartFont}>
                  <Pie
                    data={workloadDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    stroke={isDark ? "#111111" : "#FFFFFF"}
                    strokeWidth={2}
                  >
                    {workloadDistribution.map((entry) => {
                      let color = palette.primary;
                      if (entry.name === "Sous-chargé") color = palette.tertiary;
                      if (entry.name === "Normal") color = palette.primary;
                      if (entry.name === "Surchargé") color = palette.destructive;
                      return <Cell key={entry.name} fill={color} />;
                    })}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend
                    wrapperStyle={{ fontSize: "10px", fontFamily: chartFont.fontFamily, color: palette.secondary }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* ═══ NEW: Weekly Hours Distribution Pie Chart ═══ */}
        <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-6">
          <p className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC] mb-4">
            Répartition des heures par jour
          </p>
          {weeklyHoursData.length === 0 ? (
            <p className="text-xs text-[#9A9898] py-8 text-center">Aucune donnée disponible</p>
          ) : (
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart style={chartFont}>
                  <Pie
                    data={weeklyHoursData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    stroke={isDark ? "#111111" : "#FFFFFF"}
                    strokeWidth={2}
                  >
                    {weeklyHoursData.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={isDark ? PIE_COLORS_DARK[index % PIE_COLORS_DARK.length] : PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: number) => [`${value}h`, "Heures"]}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: "10px", fontFamily: chartFont.fontFamily, color: palette.secondary }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* ═══ NEW: Subject Type Breakdown Pie Chart ═══ */}
        <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-6">
          <p className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC] mb-4">
            Types de matières
          </p>
          {subjectTypeData.length === 0 ? (
            <p className="text-xs text-[#9A9898] py-8 text-center">Aucune matière configurée</p>
          ) : (
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart style={chartFont}>
                  <Pie
                    data={subjectTypeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    stroke={isDark ? "#111111" : "#FFFFFF"}
                    strokeWidth={2}
                  >
                    {subjectTypeData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={isDark ? TYPE_COLORS_DARK[entry.name] || "#646262" : TYPE_COLORS[entry.name] || "#9A9898"}
                      />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend
                    wrapperStyle={{ fontSize: "10px", fontFamily: chartFont.fontFamily, color: palette.secondary }}
                    formatter={(value: string) => {
                      const labels: Record<string, string> = {
                        cours: "Cours",
                        td: "TD",
                        tp: "TP",
                        projet: "Projet",
                        autre: "Autre",
                      };
                      return labels[value] || value;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Subject Hours Distribution */}
        <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-6">
          <p className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC] mb-4">
            Heures par matière
          </p>
          {subjectChartData.length === 0 ? (
            <p className="text-xs text-[#9A9898] py-8 text-center">Aucune matière configurée</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={subjectChartData}
                layout="vertical"
                style={chartFont}
                margin={{ left: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={palette.muted} />
                <XAxis
                  type="number"
                  tick={{ fill: palette.secondary, fontSize: 10 }}
                  axisLine={{ stroke: palette.muted }}
                  tickLine={{ stroke: palette.muted }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={100}
                  tick={{ fill: palette.secondary, fontSize: 9 }}
                  axisLine={{ stroke: palette.muted }}
                  tickLine={{ stroke: palette.muted }}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="heures" fill={palette.secondary} radius={[0, 0, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Timetable Completion Progress */}
        <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-6">
          <p className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC] mb-4">
            Complétion des emplois du temps
          </p>
          <div className="flex items-center justify-center py-4">
            <div className="relative">
              <ResponsiveContainer width={200} height={200}>
                <PieChart style={chartFont}>
                  <Pie
                    data={completionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    startAngle={90}
                    endAngle={-270}
                    paddingAngle={0}
                    dataKey="value"
                    stroke="none"
                  >
                    <Cell fill={palette.primary} />
                    <Cell fill={isDark ? "#2A2A2A" : "#E5E5E5"} />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-3xl font-bold text-[#201D1D] dark:text-[#FDFCFC]">
                    {completionRate}%
                  </p>
                  <p className="text-[10px] text-[#9A9898]">complété</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
