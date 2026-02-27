import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";
import { toast } from "sonner";
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Flag,
  ShieldCheck,
} from "lucide-react";

// ─── 常量 ────────────────────────────────────────────────────
const SEVERITY_CONFIG = {
  critical: { label: "严重", color: "bg-red-100 text-red-700 border-red-200" },
  major:    { label: "重要", color: "bg-amber-100 text-amber-700 border-amber-200" },
  minor:    { label: "轻微", color: "bg-blue-100 text-blue-700 border-blue-200" },
} as const;

const CHECKER_LABELS: Record<string, string> = {
  completeness:     "完整性",
  format:           "格式规范",
  duplicate:        "重复检查",
  cross_document:   "跨文档一致",
  content_rule:     "内涵规则",
};

const DEDUCTIONS: Record<string, number> = {
  critical: 30,
  major: 15,
  minor: 5,
};

// ─── 工具函数 ─────────────────────────────────────────────────
// 高亮错别字的函数
function HighlightTypos({ text, typos }: { text: string; typos: Array<{ wrong: string; correct: string; position?: number; category?: string }> }) {
  if (!typos || typos.length === 0) return <span>{text}</span>;

  let parts: (string | { wrong: string; correct: string })[] = [text];

  for (const typo of typos) {
    const newParts: (string | { wrong: string; correct: string })[] = [];
    for (const part of parts) {
      if (typeof part === "string") {
        const regex = new RegExp(typo.wrong, "g");
        const split = part.split(regex);
        split.forEach((s, i) => {
          if (s) newParts.push(s);
          if (i < split.length - 1) newParts.push({ wrong: typo.wrong, correct: typo.correct });
        });
      } else {
        newParts.push(part);
      }
    }
    parts = newParts;
  }

  return (
    <TooltipProvider>
      {parts.map((part, idx) => {
        if (typeof part === "string") return <span key={idx}>{part}</span>;
        return (
          <Tooltip key={idx}>
            <TooltipTrigger asChild>
              <span className="underline decoration-red-500 decoration-wavy cursor-help">{part.wrong}</span>
            </TooltipTrigger>
            <TooltipContent>
              <p>建议修改为：<strong>{part.correct}</strong></p>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </TooltipProvider>
  );
}

function calcCheckerScores(issues: Array<{ type: string; severity: string }>) {
  const deductionMap: Record<string, number> = {};
  for (const issue of issues) {
    const d = DEDUCTIONS[issue.severity] ?? 5;
    deductionMap[issue.type] = (deductionMap[issue.type] ?? 0) + d;
  }
  const checkerTypes = Object.keys(CHECKER_LABELS);
  return checkerTypes.map((type) => ({
    checker: CHECKER_LABELS[type] ?? type,
    score: Math.max(0, 100 - (deductionMap[type] ?? 0)),
    fullMark: 100,
  }));
}

// ─── 主组件 ───────────────────────────────────────────────────
export default function QcDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const resultId = parseInt(id ?? "0", 10);

  // 筛选状态
  const [filterType, setFilterType] = useState<string>("all");

  // 假阳性反馈弹窗
  const [feedbackIssue, setFeedbackIssue] = useState<{
    issueId: string;
    checkerType: string;
    message: string;
  } | null>(null);
  const [feedbackType, setFeedbackType] = useState<"false_positive" | "confirmed" | "suggestion">("false_positive");
  const [feedbackNote, setFeedbackNote] = useState("");

  // 数据查询
  const { data: result, isLoading } = trpc.qc.getResult.useQuery(
    { id: resultId },
    { enabled: resultId > 0 }
  );

  // 获取错别字检测结果
  const { data: typos = [] } = trpc.qc.checkTypos.useQuery(
    { recordId: result?.medicalRecordId ?? 0 },
    { enabled: !!result?.medicalRecordId }
  );

  // 提交反馈
  const submitFeedback = trpc.feedback.submit.useMutation({
    onSuccess: () => {
      toast.success("反馈已提交");
      setFeedbackIssue(null);
      setFeedbackNote("");
    },
    onError: (e) => toast.error(e.message),
  });

  if (!resultId) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        无效的质控结果 ID
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-muted-foreground">
        <XCircle className="w-12 h-12 text-destructive" />
        <p>质控结果不存在或已被删除</p>
        <Button variant="outline" onClick={() => navigate("/qc")}>
          <ArrowLeft className="w-4 h-4 mr-2" />返回质控列表
        </Button>
      </div>
    );
  }

  const issues = (result as any).issues ?? [];
  const totalScore = parseFloat(result.totalScore ?? "0");
  const isQualified = result.isQualified;
  const radarData = calcCheckerScores(issues);

  // 筛选问题
  const filteredIssues = filterType === "all"
    ? issues
    : issues.filter((i: any) => i.type === filterType);

  // 按 severity 分组
  const criticalIssues = filteredIssues.filter((i: any) => i.severity === "critical");
  const majorIssues    = filteredIssues.filter((i: any) => i.severity === "major");
  const minorIssues    = filteredIssues.filter((i: any) => i.severity === "minor");

  const issueTypes: string[] = [...new Set<string>(issues.map((i: any) => i.type as string))];

  const chartConfig = {
    score: { label: "得分", color: "hsl(var(--chart-1))" },
  };

  return (
    <div className="p-6 space-y-6">
      {/* 顶部导航 */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/qc")}>
          <ArrowLeft className="w-4 h-4 mr-1" />返回
        </Button>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-semibold">质控详情</h1>
          <span className="text-muted-foreground text-sm">#{result.id}</span>
        </div>
      </div>

      {/* 得分概览卡 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="col-span-2 sm:col-span-1">
          <CardContent className="pt-6 text-center">
            <div className={`text-5xl font-bold mb-1 ${totalScore >= 80 ? "text-green-600" : totalScore >= 60 ? "text-amber-600" : "text-red-600"}`}>
              {Math.round(totalScore)}
            </div>
            <div className="text-sm text-muted-foreground">综合得分</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            {isQualified
              ? <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-1" />
              : <XCircle className="w-8 h-8 text-red-600 mx-auto mb-1" />}
            <div className="text-sm font-medium">{isQualified ? "合格" : "不合格"}</div>
            <div className="text-xs text-muted-foreground">质控结论</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-red-600 mb-1">{criticalIssues.length}</div>
            <div className="text-xs text-muted-foreground">严重问题</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-amber-600 mb-1">{majorIssues.length + minorIssues.length}</div>
            <div className="text-xs text-muted-foreground">一般问题</div>
          </CardContent>
        </Card>
      </div>

      {/* 雷达图 + 问题筛选 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 雷达图 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">各维度得分</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-64">
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="checker" tick={{ fontSize: 12 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Radar
                  name="得分"
                  dataKey="score"
                  stroke="hsl(var(--chart-1))"
                  fill="hsl(var(--chart-1))"
                  fillOpacity={0.3}
                />
              </RadarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* 问题分布统计 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">问题分布</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {issueTypes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
                <CheckCircle2 className="w-10 h-10 text-green-500" />
                <p className="text-sm">未发现任何质控问题</p>
              </div>
            ) : (
              issueTypes.map((type) => {
                const typeIssues = issues.filter((i: any) => i.type === type);
                const score = Math.max(0, 100 - typeIssues.reduce((s: number, i: any) => s + (DEDUCTIONS[i.severity] ?? 5), 0));
                return (
                  <div key={type} className="flex items-center gap-3">
                    <div className="w-24 text-sm text-muted-foreground shrink-0">
                      {CHECKER_LABELS[type] ?? type}
                    </div>
                    <div className="flex-1 bg-muted rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${score >= 80 ? "bg-green-500" : score >= 60 ? "bg-amber-500" : "bg-red-500"}`}
                        style={{ width: `${score}%` }}
                      />
                    </div>
                    <div className="w-10 text-right text-sm font-medium">{score}</div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* 问题列表 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">
            问题列表
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              共 {filteredIssues.length} 条
            </span>
          </CardTitle>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="全部类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类型</SelectItem>
              {issueTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {CHECKER_LABELS[type] ?? type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="space-y-3">
          {filteredIssues.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-2" />
              <p>该筛选条件下无问题</p>
            </div>
          ) : (
            [
              { label: "严重问题", items: criticalIssues.filter((i: any) => filterType === "all" || i.type === filterType), severity: "critical" },
              { label: "重要问题", items: majorIssues.filter((i: any) => filterType === "all" || i.type === filterType), severity: "major" },
              { label: "轻微问题", items: minorIssues.filter((i: any) => filterType === "all" || i.type === filterType), severity: "minor" },
            ]
              .filter((g) => g.items.length > 0)
              .map((group) => (
                <div key={group.severity}>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className={`w-4 h-4 ${group.severity === "critical" ? "text-red-500" : group.severity === "major" ? "text-amber-500" : "text-blue-500"}`} />
                    <span className="text-sm font-medium">{group.label}</span>
                    <Badge variant="outline" className="text-xs">{group.items.length}</Badge>
                  </div>
                  <div className="space-y-2 ml-6">
                    {group.items.map((issue: any, idx: number) => (
                      <div key={idx} className={`rounded-lg border p-3 text-sm ${SEVERITY_CONFIG[issue.severity as 'critical' | 'major' | 'minor']?.color ?? ""}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="font-medium mb-1">
                              {/* 显示错别字标注 */}
                              <HighlightTypos
                                text={issue.message}
                                typos={typos ?? []}
                              />
                            </div>
                            {issue.suggestion && (
                              <div className="text-xs opacity-75">💡 {issue.suggestion}</div>
                            )}
                            {issue.ruleId && (
                              <div className="text-xs opacity-60 mt-1">规则：{issue.ruleId}</div>
                            )}
                          </div>
                          {user && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="shrink-0 h-7 text-xs"
                              onClick={() => setFeedbackIssue({
                                issueId: issue.ruleId ?? `issue-${idx}`,
                                checkerType: issue.type,
                                message: issue.message,
                              })}
                            >
                              <Flag className="w-3 h-3 mr-1" />标记
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
          )}
        </CardContent>
      </Card>

      {/* 假阳性反馈弹窗 */}
      <Dialog open={!!feedbackIssue} onOpenChange={(open) => !open && setFeedbackIssue(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>提交质控反馈</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
              {feedbackIssue?.message}
            </div>
            <div className="space-y-2">
              <Label>反馈类型</Label>
              <Select value={feedbackType} onValueChange={(v) => setFeedbackType(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="false_positive">假阳性（误报）</SelectItem>
                  <SelectItem value="confirmed">确认问题</SelectItem>
                  <SelectItem value="suggestion">改进建议</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>备注（可选）</Label>
              <Textarea
                placeholder="请说明原因或提供补充信息..."
                value={feedbackNote}
                onChange={(e) => setFeedbackNote(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFeedbackIssue(null)}>取消</Button>
            <Button
              onClick={() => {
                if (!feedbackIssue) return;
                submitFeedback.mutate({
                  recordId: result.medicalRecordId ?? 0,
                  checkerType: feedbackIssue.checkerType,
                  issueId: feedbackIssue.issueId,
                  feedbackType,
                  note: feedbackNote || undefined,
                });
              }}
              disabled={submitFeedback.isPending}
            >
              {submitFeedback.isPending ? "提交中..." : "提交反馈"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
