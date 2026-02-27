import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Activity, Download, TrendingUp } from "lucide-react";
import { toast } from "sonner";

export default function Statistics() {
  const [groupBy, setGroupBy] = useState<"day" | "week" | "month">("day");
  const [days, setDays] = useState(30);

  const [dateRange] = useState(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    return { start, end };
  });

  const { data: overview, isLoading: overviewLoading } =
    trpc.statistics.getQcStatistics.useQuery({});

  const { data: trend, isLoading: trendLoading } =
    trpc.statistics.getTrendAnalysis.useQuery({
      startDate: dateRange.start,
      endDate: dateRange.end,
      groupBy,
    });

  const { data: recentStats, isLoading: recentLoading } =
    trpc.statistics.getRecentStats.useQuery({ days });

  const trendChartData = useMemo(() => {
    if (!trend?.trend) return [];
    return Object.entries(trend.trend).map(([date, data]: [string, any]) => ({
      date,
      total: data.total ?? 0,
      pass: data.pass ?? 0,
      fail: data.fail ?? 0,
      passRate: data.total > 0 ? Math.round((data.pass / data.total) * 100) : 0,
      avgScore: data.avgScore ?? 0,
    }));
  }, [trend]);

  const recentChartData = useMemo(() => {
    if (!recentStats) return [];
    return Object.entries(recentStats)
      .slice(-14)
      .map(([date, data]: [string, any]) => ({
        date: date.slice(5),
        count: data.total ?? 0,
        passRate: data.passRate ?? 0,
      }));
  }, [recentStats]);

  const handleExport = () => {
    toast.info("导出功能开发中");
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">统计分析</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            质控数据趋势与分布分析
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="w-4 h-4 mr-1.5" />
          导出报告
        </Button>
      </div>

      {/* Overview KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {overviewLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="border-border/60">
                <CardContent className="p-4">
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))
          : [
              { label: "质控总数", value: overview?.total ?? 0, unit: "条" },
              { label: "合格率", value: `${overview?.passRate ?? 0}%`, unit: "" },
              { label: "平均分", value: overview?.averageScore ?? 0, unit: "分" },
              { label: "不合格数", value: overview?.fail ?? 0, unit: "条" },
            ].map((kpi) => (
              <Card key={kpi.label} className="border-border/60">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                  <p className="text-2xl font-bold mt-1">
                    {kpi.value}
                    <span className="text-sm font-normal text-muted-foreground ml-1">
                      {kpi.unit}
                    </span>
                  </p>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Trend controls */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">时间范围：</span>
        {[
          { label: "近7天", value: 7 },
          { label: "近30天", value: 30 },
          { label: "近90天", value: 90 },
        ].map((opt) => (
          <Button
            key={opt.value}
            variant={days === opt.value ? "default" : "outline"}
            size="sm"
            onClick={() => setDays(opt.value)}
          >
            {opt.label}
          </Button>
        ))}
        <Select
          value={groupBy}
          onValueChange={(v) => setGroupBy(v as any)}
        >
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">按天</SelectItem>
            <SelectItem value="week">按周</SelectItem>
            <SelectItem value="month">按月</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Trend chart */}
      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            质控数量趋势
          </CardTitle>
        </CardHeader>
        <CardContent>
          {trendLoading ? (
            <Skeleton className="h-56 w-full" />
          ) : trendChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={trendChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "6px",
                    fontSize: "12px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Bar dataKey="pass" name="合格" fill="var(--chart-1)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="fail" name="不合格" fill="var(--destructive)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">
              暂无趋势数据
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pass rate trend */}
      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            合格率趋势（近14天）
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : recentChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={recentChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "6px",
                    fontSize: "12px",
                  }}
                  formatter={(v: any) => [`${v}%`, "合格率"]}
                />
                <Line
                  type="monotone"
                  dataKey="passRate"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#10b981" }}
                  name="合格率"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
              暂无数据
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trend data table */}
      {trendChartData.length > 0 && (
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">明细数据</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">
                      日期
                    </th>
                    <th className="text-right px-4 py-2.5 text-muted-foreground font-medium">
                      总数
                    </th>
                    <th className="text-right px-4 py-2.5 text-muted-foreground font-medium">
                      合格
                    </th>
                    <th className="text-right px-4 py-2.5 text-muted-foreground font-medium">
                      不合格
                    </th>
                    <th className="text-right px-4 py-2.5 text-muted-foreground font-medium">
                      合格率
                    </th>
                    <th className="text-right px-4 py-2.5 text-muted-foreground font-medium">
                      平均分
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {trendChartData.map((row) => (
                    <tr key={row.date} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-2.5 font-medium">{row.date}</td>
                      <td className="px-4 py-2.5 text-right">{row.total}</td>
                      <td className="px-4 py-2.5 text-right text-green-600">{row.pass}</td>
                      <td className="px-4 py-2.5 text-right text-red-600">{row.fail}</td>
                      <td className="px-4 py-2.5 text-right">
                        <Badge
                          variant={row.passRate >= 80 ? "default" : "destructive"}
                          className="text-xs"
                        >
                          {row.passRate}%
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium">{row.avgScore}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
