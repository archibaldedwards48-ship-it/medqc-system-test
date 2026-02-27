import { useState } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle2, Plus, Search, XCircle } from "lucide-react";

export default function SpotCheck() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [recordId, setRecordId] = useState("");
  const [reason, setReason] = useState("");

  const utils = trpc.useUtils();
  const canCreate = user?.role === "qc_staff" || user?.role === "admin";

  const { data, isLoading } = trpc.spotCheck.list.useQuery({ page, pageSize: 20 });

  const { data: records } = trpc.records.list.useQuery({ page: 1, pageSize: 100 });


  const createMutation = trpc.spotCheck.create.useMutation({
    onSuccess: () => {
      toast.success("抽查记录已创建");
      setShowCreate(false);
      setRecordId("");
      utils.spotCheck.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const spotChecks = data?.spotChecks ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);
  const allRecords = records?.records ?? [];

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">抽查管理</h1>
          <p className="text-sm text-muted-foreground mt-0.5">共 {total} 条抽查记录</p>
        </div>
        {canCreate && (
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            新建抽查
          </Button>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "总抽查数", value: total, color: "text-blue-600" },
          {
            label: "合格数",
            value: spotChecks.filter((s: any) => s.isQualified).length,
            color: "text-green-600",
          },
          {
            label: "不合格数",
            value: spotChecks.filter((s: any) => !s.isQualified).length,
            color: "text-red-600",
          },
        ].map((s) => (
          <Card key={s.label} className="border-border/60">
            <CardContent className="p-4 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{s.label}</span>
              <span className={`text-2xl font-bold ${s.color}`}>{s.value}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card className="border-border/60">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>ID</TableHead>
                <TableHead>病历 ID</TableHead>
                <TableHead>质控模式</TableHead>
                <TableHead>总分</TableHead>
                <TableHead>结果</TableHead>
                <TableHead>抽查时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : spotChecks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    暂无抽查记录
                  </TableCell>
                </TableRow>
              ) : (
                spotChecks.map((sc: any) => (
                  <TableRow key={sc.id} className="hover:bg-muted/30">
                    <TableCell className="text-muted-foreground text-sm">{sc.id}</TableCell>
                    <TableCell className="font-medium">{sc.medicalRecordId ?? "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{sc.qcMode}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className={`font-semibold ${
                        parseFloat(sc.totalScore ?? "0") >= 80
                          ? "text-green-600"
                          : parseFloat(sc.totalScore ?? "0") >= 60
                          ? "text-amber-600"
                          : "text-red-600"
                      }`}>
                        {sc.totalScore ?? "-"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {sc.isQualified ? (
                        <div className="flex items-center gap-1 text-green-600 text-sm">
                          <CheckCircle2 className="w-3.5 h-3.5" />合格
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-red-600 text-sm">
                          <XCircle className="w-3.5 h-3.5" />不合格
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(sc.createdAt).toLocaleString("zh-CN")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>第 {page} / {totalPages} 页</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>下一页</Button>
          </div>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>新建抽查</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>选择病历 *</Label>
              <Select value={recordId} onValueChange={setRecordId}>
                <SelectTrigger>
                  <SelectValue placeholder="请选择病历" />
                </SelectTrigger>
                <SelectContent>
                  {allRecords.map((r: any) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      {r.patientName} (ID: {r.id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>抽查原因（可选）</Label>
              <input
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="填写抽查原因..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>取消</Button>
            <Button
              disabled={!recordId || createMutation.isPending}
              onClick={() => createMutation.mutate({
                recordId: parseInt(recordId),
                reason: reason || undefined,
              })}
            >
              {createMutation.isPending ? "创建中..." : "创建抽查"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
