import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { FileText, Plus, Search, Trash2, Eye, ShieldCheck } from "lucide-react";
import { useLocation } from "wouter";

const RECORD_TYPES = [
  { value: "inpatient", label: "住院病历" },
  { value: "outpatient", label: "门诊病历" },
  { value: "emergency", label: "急诊病历" },
  { value: "surgery", label: "手术记录" },
];

export default function Records() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [showCreate, setShowCreate] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [viewRecord, setViewRecord] = useState<any>(null);

  const [form, setForm] = useState({
    patientName: "",
    recordType: "inpatient",
    content: "",
    fileName: "",
  });

  const utils = trpc.useUtils();

  const { data, isLoading } = search
    ? trpc.records.search.useQuery({ query: search, page, pageSize: 20 })
    : trpc.records.list.useQuery({
        page,
        pageSize: 20,
        recordType: typeFilter === "all" ? undefined : typeFilter,
      });

  // F2: Fetch QC results
  const { data: qcListData } = trpc.qc.list.useQuery({ page: 1, pageSize: 100 });
  const qcResults = (qcListData as any)?.results ?? [];

  const createMutation = trpc.records.create.useMutation({
    onSuccess: () => {
      toast.success("病历创建成功");
      setShowCreate(false);
      setForm({ patientName: "", recordType: "inpatient", content: "", fileName: "" });
      utils.records.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.records.delete.useMutation({
    onSuccess: () => {
      toast.success("病历已删除");
      setDeleteId(null);
      utils.records.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const records = (data as any)?.records ?? (data as any)?.results ?? [];
  const total = (data as any)?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  const recordTypeLabel = (type: string) =>
    RECORD_TYPES.find((t) => t.value === type)?.label ?? type;

  const canCreate = user?.role === "admin" || user?.role === "doctor";
  const canDelete = user?.role === "admin";

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">病历管理</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            共 {total} 份病历
          </p>
        </div>
        {canCreate && (
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            新建病历
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索患者姓名..."
            className="pl-9"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setSearch(searchInput);
                setPage(1);
              }
            }}
          />
        </div>
        <Select
          value={typeFilter}
          onValueChange={(v) => { setTypeFilter(v); setPage(1); }}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="病历类型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部类型</SelectItem>
            {RECORD_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-border/60">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-12 text-center">ID</TableHead>
                <TableHead>患者姓名</TableHead>
                <TableHead>病历类型</TableHead>
                <TableHead>入院日期</TableHead>
                <TableHead>出院日期</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead>质控状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    暂无病历数据
                  </TableCell>
                </TableRow>
              ) : (
                records.map((record: any) => (
                  <TableRow key={record.id} className="group">
                    <TableCell className="text-center text-muted-foreground text-sm">
                      {record.id}
                    </TableCell>
                    <TableCell className="font-medium">{record.patientName}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {recordTypeLabel(record.recordType)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {record.admissionDate
                        ? new Date(record.admissionDate).toLocaleDateString("zh-CN")
                        : "-"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {record.dischargeDate
                        ? new Date(record.dischargeDate).toLocaleDateString("zh-CN")
                        : "-"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(record.createdAt).toLocaleDateString("zh-CN")}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const qcResult = qcResults.find((r: any) => r.medicalRecordId === record.id);
                        if (!qcResult) {
                          return <Badge variant="secondary" className="text-xs">待质控</Badge>;
                        }
                        return qcResult.isQualified ? (
                          <Badge className="bg-green-100 text-green-800 text-xs">合格</Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800 text-xs">不合格</Badge>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => setViewRecord(record)}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-primary"
                          onClick={() => navigate(`/qc?recordId=${record.id}`)}
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                        </Button>
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-destructive"
                            onClick={() => setDeleteId(record.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
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
          <span>第 {page} / {totalPages} 页，共 {total} 条</span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              上一页
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              下一页
            </Button>
          </div>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>新建病历</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>患者姓名 *</Label>
              <Input
                placeholder="请输入患者姓名"
                value={form.patientName}
                onChange={(e) => setForm({ ...form, patientName: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>病历类型 *</Label>
              <Select
                value={form.recordType}
                onValueChange={(v) => setForm({ ...form, recordType: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RECORD_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>病历内容 *</Label>
              <Textarea
                placeholder="请输入病历内容..."
                rows={6}
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>文件名</Label>
              <Input
                placeholder="可选"
                value={form.fileName}
                onChange={(e) => setForm({ ...form, fileName: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              取消
            </Button>
            <Button
              disabled={!form.patientName || !form.content || createMutation.isPending}
              onClick={() => createMutation.mutate(form)}
            >
              {createMutation.isPending ? "创建中..." : "创建"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewRecord} onOpenChange={() => setViewRecord(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              病历详情 — {viewRecord?.patientName}
            </DialogTitle>
          </DialogHeader>
          {viewRecord && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">病历类型：</span>
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {recordTypeLabel(viewRecord.recordType)}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">创建时间：</span>
                  <span className="ml-1">
                    {new Date(viewRecord.createdAt).toLocaleString("zh-CN")}
                  </span>
                </div>
                {viewRecord.admissionDate && (
                  <div>
                    <span className="text-muted-foreground">入院日期：</span>
                    <span className="ml-1">
                      {new Date(viewRecord.admissionDate).toLocaleDateString("zh-CN")}
                    </span>
                  </div>
                )}
                {viewRecord.dischargeDate && (
                  <div>
                    <span className="text-muted-foreground">出院日期：</span>
                    <span className="ml-1">
                      {new Date(viewRecord.dischargeDate).toLocaleDateString("zh-CN")}
                    </span>
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">病历内容：</p>
                <pre className="text-sm bg-muted/50 rounded-lg p-4 whitespace-pre-wrap font-mono leading-relaxed max-h-80 overflow-y-auto">
                  {viewRecord.content}
                </pre>
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  onClick={() => {
                    setViewRecord(null);
                    navigate(`/qc?recordId=${viewRecord.id}`);
                  }}
                >
                  <ShieldCheck className="w-4 h-4 mr-1.5" />
                  执行质控
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              此操作不可撤销，病历及相关质控记录将被永久删除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
