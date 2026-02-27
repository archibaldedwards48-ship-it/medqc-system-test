import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  FileText,
  ShieldCheck,
  TrendingUp,
  Upload,
} from "lucide-react";
import { useLocation } from "wouter";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = ["#3b82f6", "#f59e0b", "#ef4444", "#10b981"];

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { data: stats, isLoading: statsLoading } = trpc.statistics.getQcStatistics.useQuery({});
  const { data: recentStats } = trpc.statistics.getRecentStats.useQuery({ days: 30 });
  const { data: recentQc, isLoading: recentLoading } = trpc.qc.list.useQuery({
    page: 1,
    pageSize: 5,
  });


  const passRate = stats?.passRate ?? 0;

  const statCards = [
    {
      title: "质控总数",
      value: statsLoading ? null : (stats?.total ?? 0),
      icon: ShieldCheck,
      color: "text-blue-600",
      bg: "bg-blue-50",
      desc: "全部记录",
    },
    {
      title: "质控合格率",
      value: statsLoading ? null : `${passRate}%`,
      icon: CheckCircle2,
      color: "text-green-600",
      bg: "bg-green-50",
      desc: `合格 ${stats?.pass ?? 0} 条`,
    },
    {
      title: "不合格数",
      value: statsLoading ? null : (stats?.fail ?? 0),
      icon: AlertTriangle,
      color: "text-amber-600",
      bg: "bg-amber-50",
      desc: "需要处理",
    },
    {
      title: "平均质控分",
      value: statsLoading ? null : (stats?.averageScore ?? 0),
      icon: ClipboardList,
      color: "text-purple-600",
      bg: "bg-purple-50",
      desc: "满分100分",
    },
  ];

  const issueTypeData: { name: string; value: number }[] = [];
  const trendData = recentStats
    ? Object.entries(recentStats).map(([date, data]: [string, any]) => ({
        date,
        count: data.total ?? 0,
        passRate: data.passRate ?? 0,
      }))
    : [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">总览看板</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            实时质控数据与系统状态
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/records")}
          >
            <Upload className="w-4 h-4 mr-1.5" />
            上传病历
          </Button>
          <Button size="sm" onClick={() => navigate("/qc")}>
            <ShieldCheck className="w-4 h-4 mr-1.5" />
            执行质控
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Card key={card.title} className="border-border/60">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{card.title}</p>
                  {card.value === null ? (
                    <Skeleton className="h-7 w-16 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold mt-1 text-foreground">
                      {card.value}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {card.desc}
                  </p>
                </div>
                <div className={`p-2 rounded-lg ${card.bg}`}>
                  <card.icon className={`w-5 h-5 ${card.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Trend chart */}
        <Card className="lg:col-span-2 border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              质控趋势（近30天）
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trendData}>
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
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    dot={false}
                    name="质控数"
                  />
                  <Line
                    type="monotone"
                    dataKey="passRate"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                    name="合格率%"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                暂无趋势数据
              </div>
            )}
          </CardContent>
        </Card>

        {/* Issue type pie */}
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              问题类型分布
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : issueTypeData.length > 0 ? (
              <div className="space-y-1">
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie
                      data={issueTypeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={65}
                      dataKey="value"
                    >
                      {issueTypeData.map((_, index) => (
                        <Cell
                          key={index}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: "6px",
                        fontSize: "12px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1">
                  {issueTypeData.slice(0, 4).map((item, index) => (
                    <div
                      key={item.name}
                      className="flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ background: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-muted-foreground">{item.name}</span>
                      </div>
                      <span className="font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                暂无问题数据
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent QC results */}
      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              最近质控记录
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-primary"
              onClick={() => navigate("/qc")}
            >
              查看全部
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : recentQc?.results && recentQc.results.length > 0 ? (
            <div className="space-y-2">
              {recentQc.results.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/qc-results/${item.id}`)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        item.isQualified ? "bg-green-500" : "bg-red-500"
                      }`}

                    />
                    <span className="text-sm font-medium truncate">
                      {item.medicalRecordId ?? item.id}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {item.qcMode}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-semibold">
                      {item.totalScore ?? 0}分
                    </span>
                    <Badge
                      variant={item.isQualified ? "default" : "destructive"}
                      className="text-xs"
                    >
                      {item.isQualified ? "合格" : "不合格"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground text-sm">
              暂无质控记录，
              <button
                className="text-primary hover:underline"
                onClick={() => navigate("/qc")}
              >
                立即执行质控
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
