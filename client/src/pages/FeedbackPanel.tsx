import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Flag, CheckCircle2, MessageSquare, ChevronLeft, ChevronRight } from "lucide-react";

// ─── 常量 ────────────────────────────────────────────────────
const CHECKER_LABELS: Record<string, string> = {
  completeness:   "完整性",
  format:         "格式规范",
  duplicate:      "重复检查",
  cross_document: "跨文档一致",
  content_rule:   "内涵规则",
};

const FEEDBACK_CONFIG = {
  false_positive: { label: "假阳性", color: "bg-red-100 text-red-700 border-red-200" },
  confirmed:      { label: "已确认", color: "bg-green-100 text-green-700 border-green-200" },
  suggestion:     { label: "建议",   color: "bg-blue-100 text-blue-700 border-blue-200" },
} as const;

// ─── 主组件 ───────────────────────────────────────────────────
export default function FeedbackPanel() {
  const { user } = useAuth();
  const [checkerType, setCheckerType] = useState<string>("all");
  const [feedbackType, setFeedbackType] = useState<string>("all");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  // 权限检查
  const canView = user?.role === "admin" || user?.role === "qc_staff";

  // 统计数据（全量）
  const { data: fpData } = trpc.feedback.list.useQuery(
    { feedbackType: "false_positive", pageSize: 1 },
    { enabled: canView }
  );
  const { data: cfData } = trpc.feedback.list.useQuery(
    { feedbackType: "confirmed", pageSize: 1 },
    { enabled: canView }
  );
  const { data: sgData } = trpc.feedback.list.useQuery(
    { feedbackType: "suggestion", pageSize: 1 },
    { enabled: canView }
  );

  // 分页列表
  const { data: listData, isLoading } = trpc.feedback.list.useQuery(
    {
      checkerType: checkerType === "all" ? undefined : checkerType,
      feedbackType: feedbackType === "all" ? undefined : (feedbackType as any),
      page,
      pageSize: PAGE_SIZE,
    },
    { enabled: canView }
  );

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
        <Flag className="w-12 h-12 opacity-30" />
        <p className="text-sm">仅管理员和质控人员可访问此页面</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center gap-2">
        <Flag className="w-5 h-5 text-primary" />
        <h1 className="text-xl font-semibold">反馈管理</h1>
        <span className="text-sm text-muted-foreground">质控问题反馈汇总</span>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <Flag className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{fpData?.total ?? "—"}</div>
              <div className="text-xs text-muted-foreground">假阳性反馈</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{cfData?.total ?? "—"}</div>
              <div className="text-xs text-muted-foreground">已确认问题</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{sgData?.total ?? "—"}</div>
              <div className="text-xs text-muted-foreground">改进建议</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 筛选栏 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3 flex-wrap">
            <CardTitle className="text-base">反馈列表</CardTitle>
            <div className="flex items-center gap-2 ml-auto flex-wrap">
              <Select value={checkerType} onValueChange={(v) => { setCheckerType(v); setPage(1); }}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="全部检查器" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部检查器</SelectItem>
                  {Object.entries(CHECKER_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={feedbackType} onValueChange={(v) => { setFeedbackType(v); setPage(1); }}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="全部类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部类型</SelectItem>
                  <SelectItem value="false_positive">假阳性</SelectItem>
                  <SelectItem value="confirmed">已确认</SelectItem>
                  <SelectItem value="suggestion">建议</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : !listData?.items.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <Flag className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">暂无反馈记录</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>检查器</TableHead>
                    <TableHead>问题 ID</TableHead>
                    <TableHead>反馈类型</TableHead>
                    <TableHead>备注</TableHead>
                    <TableHead>提交时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {listData.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {CHECKER_LABELS[item.checkerType] ?? item.checkerType}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground max-w-40 truncate">
                        {item.issueId}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${FEEDBACK_CONFIG[item.feedbackType as keyof typeof FEEDBACK_CONFIG]?.color ?? ""}`}>
                          {FEEDBACK_CONFIG[item.feedbackType as keyof typeof FEEDBACK_CONFIG]?.label ?? item.feedbackType}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-48 truncate">
                        {item.note ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(item.createdAt).toLocaleString("zh-CN", {
                          month: "2-digit", day: "2-digit",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* 分页 */}
              {listData.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <span className="text-sm text-muted-foreground">
                    共 {listData.total} 条，第 {page}/{listData.totalPages} 页
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline" size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage(p => p - 1)}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline" size="sm"
                      disabled={page >= listData.totalPages}
                      onClick={() => setPage(p => p + 1)}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
