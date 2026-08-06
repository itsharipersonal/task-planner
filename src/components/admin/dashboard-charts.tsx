"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CATEGORY_REGISTRY } from "@/lib/challenges/registry";

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

type DashboardChartsProps = {
  dau: { day: string; count: number }[];
  completion: { status: string; count: number }[];
  xpDistribution: { bucket: string; count: number }[];
  topCategories: { category_id: string; count: number }[];
  userGrowth: { month: string; count: number }[];
};

export function DashboardCharts(props: DashboardChartsProps) {
  const categoryData = props.topCategories.map((c) => ({
    name: CATEGORY_REGISTRY[c.category_id]?.glyph ?? c.category_id.slice(0, 3),
    count: c.count,
    id: c.category_id,
  }));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard title="Daily Active Users">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={props.dau}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
            <YAxis tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
            <Tooltip contentStyle={{ fontSize: 11, fontFamily: "monospace" }} />
            <Line type="monotone" dataKey="count" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Challenge Completion">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={props.completion}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="status" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
            <YAxis tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
            <Tooltip contentStyle={{ fontSize: 11, fontFamily: "monospace" }} />
            <Bar dataKey="count" fill="var(--chart-2)" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="XP Distribution">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={props.xpDistribution}
              dataKey="count"
              nameKey="bucket"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label={({ name }) => String(name)}
            >
              {props.xpDistribution.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ fontSize: 11, fontFamily: "monospace" }} />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Top Categories">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={categoryData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis type="number" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
            <YAxis type="category" dataKey="name" width={40} tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
            <Tooltip contentStyle={{ fontSize: 11, fontFamily: "monospace" }} />
            <Bar dataKey="count" fill="var(--chart-4)" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="User Growth" className="lg:col-span-2">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={props.userGrowth}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
            <YAxis tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
            <Tooltip contentStyle={{ fontSize: 11, fontFamily: "monospace" }} />
            <Bar dataKey="count" fill="var(--chart-5)" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

function ChartCard({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
