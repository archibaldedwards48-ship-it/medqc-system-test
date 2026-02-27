import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Play,
  ShieldCheck,
  XCircle,
} from "lucide-react";

const SEVERITY_CONFIG = {
  critical: { label: "严重", variant: "destructive" as const, color: "text-red-600" },
  major: { label: "重要", variant: "default" as const, color: "text-amber-600" },
  minor: { label: "轻微", variant: "secondary" as const, color: "text-blue-600" },
};

const MODE_OPTIONS = [
  { value: "auto", label: "自动模式" },
  { value: "manual", label: "手动模式" },
  { value: "ai", label: "AI 模式" },
];

export default function QcExecution() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [page, setPage] = useState(1);
  const [selectedRecordId, setSelectedRecordId] = useState<number | null>(null);
  const [qcMode, setQcMode] = useState<"auto" | "manual" | "ai">("auto");
  const [qcResult, setQcResult] = useState<any>(null);
  const [showResult, setShowResult] = useState(false);

  const canExecute = user?.role === "qc_staff" || user?.role === "admin";

  const { data: records, isLoading: recordsLoading } = trpc.records.list.useQuery({
    page,
    pageSize: 20,
  });

  const { data: qcList, isLoading: qcLoading } = trpc.qc.list.useQuery({
    page: 1,
    pageSize: 20,
  });

  const executeMutation = trpc.qc.execute.useMutation({
    onSuccess: (data) => {
      setQcResult(data);
      setShowResult(true);
      navigate(`/qc-results/${data.id}`);
      toast.success(`质控完成，得分 ${data.totalScore} 分`);
    },
    onError: (e) => toast.error(e.message),
  });

  const allRecords = records?.records ?? [];
  const allQcResults = qcList?.results ?? [];

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">质控执行</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            选择病历并执行质控检查
          </p>
        </div>
      </div>

      <Tabs defaultValue="execute">
        <TabsList>
          <TabsTrigger value="execute">执行质控</TabsTrigger>
          <TabsTrigger value="history">质控记录</TabsTrigger>
        </TabsList>

        {/* Execute tab */}
        <TabsContent value="execute" className="space-y-4 mt-4">
          {!canExecute && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              仅质控员或管理员可执行质控操作
            </div>
          )}

          {/* Mode selector */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">质控设置</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">质控模式：</span>
                <Select
                  value={qcMode}
                  onValueChange={(v) => setQcMode(v as any)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODE_OPTIONS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedRecordId && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">已选病历 ID：</span>
                  <Badge variant="outline">{selectedRecordId}</Badge>
                  <Button
                    size="sm"
                    disabled={!canExecute || executeMutation.isPending}
                    onClick={() =>
                      executeMutation.mutate({
                        recordId: selectedRecordId,
                        mode: qcMode,
                      })
                    }
                  >
                    <Play className="w-3.5 h-3.5 mr-1.5" />
                    {executeMutation.isPending ? "执行中..." : "执行质控"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Records table */}
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">选择病历</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-12"></TableHead>
                    <TableHead>患者姓名</TableHead>
                    <TableHead>病历类型</TableHead>
                    <TableHead>创建时间</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recordsLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 5 }).map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : allRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-sm">
                        暂无病历，请先在"病历管理"页面创建
                      </TableCell>
                    </TableRow>
                  ) : (
                    allRecords.map((record: any) => (
                      <TableRow
                        key={record.id}
                        className={`cursor-pointer transition-colors ${
                          selectedRecordId === record.id
                            ? "bg-primary/5 border-l-2 border-l-primary"
                            : "hover:bg-muted/40"
                        }`}
                        onClick={() => setSelectedRecordId(record.id)}
                      >
                        <TableCell className="text-center">
                          <div
                            className={`w-4 h-4 rounded-full border-2 mx-auto transition-colors ${
                              selectedRecordId === record.id
                                ? "border-primary bg-primary"
                                : "border-muted-foreground/30"
                            }`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{record.patientName}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {record.recordType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(record.createdAt).toLocaleDateString("zh-CN")}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!canExecute || executeMutation.isPending}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRecordId(record.id);
                              executeMutation.mutate({
                                recordId: record.id,
                                mode: qcMode,
                              });
                            }}
                          >
                            <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                            质控
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History tab */}
        <TabsContent value="history" className="mt-4">
          <Card className="border-border/60">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>病历 ID</TableHead>
                    <TableHead>质控模式</TableHead>
                    <TableHead>总分</TableHead>
                    <TableHead>结果</TableHead>
                    <TableHead>时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {qcLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 5 }).map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : allQcResults.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-sm">
                        暂无质控记录
                      </TableCell>
                    </TableRow>
                  ) : (
                    allQcResults.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {item.medicalRecordId ?? "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {item.qcMode}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`font-semibold ${
                              parseFloat(item.totalScore ?? "0") >= 80
                                ? "text-green-600"
                                : parseFloat(item.totalScore ?? "0") >= 60
                                ? "text-amber-600"
                                : "text-red-600"
                            }`}
                          >
                            {item.totalScore ?? "-"}
                          </span>
                        </TableCell>
                        <TableCell>
                          {item.isQualified ? (
                            <div className="flex items-center gap-1 text-green-600 text-sm">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              合格
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-red-600 text-sm">
                              <XCircle className="w-3.5 h-3.5" />
                              不合格
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(item.createdAt).toLocaleString("zh-CN")}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* QC Result Dialog */}
      <Dialog open={showResult} onOpenChange={setShowResult}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              质控结果报告
            </DialogTitle>
          </DialogHeader>
          {qcResult && (
            <div className="space-y-5 py-2">
              {/* Score overview */}
              <div className="flex items-center gap-6 p-4 bg-muted/40 rounded-lg">
                <div className="text-center">
                  <div
                    className={`text-4xl font-bold ${
                      qcResult.totalScore >= 80
                        ? "text-green-600"
                        : qcResult.totalScore >= 60
                        ? "text-amber-600"
                        : "text-red-600"
                    }`}
                  >
                    {qcResult.totalScore}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">总分</div>
                </div>
                <div className="flex-1">
                  <Progress
                    value={qcResult.totalScore}
                    className="h-3"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>0</span>
                    <span>100</span>
                  </div>
                </div>
                <Badge
                  variant={qcResult.status === "pass" ? "default" : "destructive"}
                  className="text-sm px-3 py-1"
                >
                  {qcResult.status === "pass" ? "合格" : "不合格"}
                </Badge>
              </div>

              {/* Dimension scores */}
              {qcResult.scores && Object.keys(qcResult.scores).length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-3">各维度得分</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(qcResult.scores).map(([key, score]: [string, any]) => (
                      <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                        <span className="text-sm text-muted-foreground capitalize">
                          {key}
                        </span>
                        <span className="font-semibold">{score}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Issues */}
              {qcResult.issues && qcResult.issues.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-3">
                    发现问题（{qcResult.issues.length} 项）
                  </h4>
                  <div className="space-y-2">
                    {qcResult.issues.map((issue: any, i: number) => {
                      const cfg = SEVERITY_CONFIG[issue.severity as keyof typeof SEVERITY_CONFIG];
                      return (
                        <div
                          key={i}
                          className="p-3 border rounded-lg space-y-1"
                        >
                          <div className="flex items-center gap-2">
                            <Badge variant={cfg?.variant ?? "secondary"} className="text-xs">
                              {cfg?.label ?? issue.severity}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {issue.type}
                            </span>
                          </div>
                          <p className="text-sm">{issue.message}</p>
                          {issue.suggestion && (
                            <p className="text-xs text-muted-foreground">
                              建议：{issue.suggestion}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {qcResult.issues?.length === 0 && (
                <div className="flex items-center gap-2 text-green-600 p-4 bg-green-50 rounded-lg">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-sm font-medium">未发现质控问题，病历质量优秀</span>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
