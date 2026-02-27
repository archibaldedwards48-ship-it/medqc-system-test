import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { FileText, Download, Eye } from "lucide-react";

export default function Reports() {
  const [selectedResultId, setSelectedResultId] = useState<number | null>(null);
  const [showReport, setShowReport] = useState(false);

  const { data: qcList, isLoading } = trpc.qc.list.useQuery({ page: 1, pageSize: 50 });

  const { data: report, isLoading: reportLoading } = trpc.report.generate.useQuery(
    { resultId: selectedResultId! },
    { enabled: !!selectedResultId && showReport }
  );

  const results = qcList?.results ?? [];

  const handleViewReport = (id: number) => {
    setSelectedResultId(id);
    setShowReport(true);
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">质控报告</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            基于质控结果生成结构化报告
          </p>
        </div>
      </div>

      {/* QC results list */}
      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            质控结果列表（点击生成报告）
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : results.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              暂无质控结果，请先执行质控
            </div>
          ) : (
            <div className="divide-y">
              {results.map((item: any) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        item.isQualified ? "bg-green-500" : "bg-red-500"
                      }`}
                    />
                    <div>
                      <div className="text-sm font-medium">
                        质控 #{item.id} — 病历 {item.medicalRecordId ?? "-"}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {new Date(item.createdAt).toLocaleString("zh-CN")} ·{" "}
                        {item.qcMode}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">
                      {item.totalScore ?? "-"} 分
                    </span>
                    <Badge
                      variant={item.isQualified ? "default" : "destructive"}
                      className="text-xs"
                    >
                      {item.isQualified ? "合格" : "不合格"}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7"
                      onClick={() => handleViewReport(item.id)}
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      查看报告
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Report Dialog */}
      <Dialog open={showReport} onOpenChange={setShowReport}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              质控报告 #{selectedResultId}
            </DialogTitle>
          </DialogHeader>
          {reportLoading ? (
            <div className="space-y-4 py-4">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : report ? (
            <div className="space-y-5 py-2">
              {/* Header info */}
              <div className="grid grid-cols-2 gap-3 p-4 bg-muted/40 rounded-lg text-sm">
                <div>
                  <span className="text-muted-foreground">报告 ID：</span>
                  <span className="font-medium ml-1">{(report as any).id ?? selectedResultId}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">生成时间：</span>
                  <span className="ml-1">
                    {(report as any).timestamp
                      ? new Date((report as any).timestamp).toLocaleString("zh-CN")
                      : new Date().toLocaleString("zh-CN")}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">总分：</span>
                  <span className="font-bold text-lg ml-1">
                    {(report as any).totalScore ?? "-"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">质控结论：</span>
                  <Badge
                    variant={(report as any).isQualified ? "default" : "destructive"}
                    className="ml-1"
                  >
                    {(report as any).isQualified ? "合格" : "不合格"}
                  </Badge>
                </div>
              </div>

              {/* Summary */}
              {(report as any).summary && (
                <div>
                  <h4 className="text-sm font-medium mb-2">质控摘要</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {(report as any).summary}
                  </p>
                </div>
              )}

              {/* Issues */}
              {(report as any).issues && (report as any).issues.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-3">
                    问题清单（{(report as any).issues.length} 项）
                  </h4>
                  <div className="space-y-2">
                    {(report as any).issues.map((issue: any, i: number) => (
                      <div key={i} className="p-3 border rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge
                            variant={
                              issue.severity === "critical"
                                ? "destructive"
                                : issue.severity === "major"
                                ? "default"
                                : "secondary"
                            }
                            className="text-xs"
                          >
                            {issue.severity === "critical"
                              ? "严重"
                              : issue.severity === "major"
                              ? "重要"
                              : "轻微"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{issue.type}</span>
                        </div>
                        <p className="text-sm">{issue.message}</p>
                        {issue.suggestion && (
                          <p className="text-xs text-muted-foreground mt-1">
                            建议：{issue.suggestion}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {(report as any).recommendations && (report as any).recommendations.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">改进建议</h4>
                  <ul className="space-y-1">
                    {(report as any).recommendations.map((rec: string, i: number) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Raw JSON fallback */}
              {!(report as any).summary && !(report as any).issues && (
                <pre className="text-xs bg-muted/50 rounded-lg p-4 overflow-auto max-h-64 font-mono">
                  {JSON.stringify(report, null, 2)}
                </pre>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const blob = new Blob([JSON.stringify(report, null, 2)], {
                      type: "application/json",
                    });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `qc-report-${selectedResultId}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                    toast.success("报告已下载");
                  }}
                >
                  <Download className="w-4 h-4 mr-1.5" />
                  下载 JSON
                </Button>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground text-sm">
              报告生成失败，请重试
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
