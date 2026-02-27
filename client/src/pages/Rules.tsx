import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ClipboardList, Plus } from "lucide-react";

const CATEGORIES = [
  { value: "completeness", label: "完整性" },
  { value: "timeliness", label: "及时性" },
  { value: "consistency", label: "一致性" },
  { value: "formatting", label: "格式规范" },
  { value: "medication_safety", label: "用药安全" },
  { value: "diagnosis", label: "诊断" },
  { value: "logic", label: "逻辑" },
];

const STATUS_CONFIG = {
  active: { label: "已发布", variant: "default" as const },
  draft: { label: "草稿", variant: "secondary" as const },
  inactive: { label: "已禁用", variant: "outline" as const },
};

const SEVERITY_CONFIG = {
  critical: { label: "严重", variant: "destructive" as const },
  major: { label: "重要", variant: "default" as const },
  minor: { label: "轻微", variant: "secondary" as const },
};

export default function Rules() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const [form, setForm] = useState({
    ruleId: "",
    name: "",
    category: "completeness",
    description: "",
    condition: "",
    severity: "major" as "critical" | "major" | "minor",
    status: "draft" as "active" | "inactive" | "draft",
  });

  const utils = trpc.useUtils();
  const isAdmin = user?.role === "admin";

  const { data, isLoading } = trpc.rules.list.useQuery({
    page,
    pageSize: 20,
    category: categoryFilter === "all" ? undefined : categoryFilter,
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  const createMutation = trpc.rules.create.useMutation({
    onSuccess: () => {
      toast.success("规则创建成功");
      setShowCreate(false);
      setForm({
        ruleId: "",
        name: "",
        category: "completeness",
        description: "",
        condition: "",
        severity: "major",
        status: "draft",
      });
      utils.rules.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.rules.update.useMutation({
    onSuccess: () => {
      toast.success("规则已更新");
      utils.rules.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const rules = data?.rules ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  const categoryLabel = (cat: string) =>
    CATEGORIES.find((c) => c.value === cat)?.label ?? cat;

  const statusCounts = {
    active: rules.filter((r: any) => r.status === "active").length,
    draft: rules.filter((r: any) => r.status === "draft").length,
    inactive: rules.filter((r: any) => r.status === "inactive").length,
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">规则库</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            共 {total} 条质控规则
          </p>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            新建规则
          </Button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "已发布", count: statusCounts.active, color: "text-green-600 bg-green-50" },
          { label: "草稿", count: statusCounts.draft, color: "text-amber-600 bg-amber-50" },
          { label: "已禁用", count: statusCounts.inactive, color: "text-muted-foreground bg-muted" },
        ].map((s) => (
          <Card key={s.label} className="border-border/60">
            <CardContent className="p-4 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{s.label}</span>
              <span className={`text-xl font-bold px-2 py-0.5 rounded ${s.color}`}>
                {s.count}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Select
          value={categoryFilter}
          onValueChange={(v) => { setCategoryFilter(v); setPage(1); }}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="规则分类" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部分类</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={statusFilter}
          onValueChange={(v) => { setStatusFilter(v); setPage(1); }}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="active">已发布</SelectItem>
            <SelectItem value="draft">草稿</SelectItem>
            <SelectItem value="inactive">已禁用</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-border/60">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>规则 ID</TableHead>
                <TableHead>规则名称</TableHead>
                <TableHead>分类</TableHead>
                <TableHead>严重程度</TableHead>
                <TableHead>状态</TableHead>
                {isAdmin && <TableHead className="text-right">操作</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: isAdmin ? 6 : 5 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : rules.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={isAdmin ? 6 : 5}
                    className="text-center py-12 text-muted-foreground"
                  >
                    <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    暂无规则数据
                  </TableCell>
                </TableRow>
              ) : (
                rules.map((rule: any) => {
                  const statusCfg = STATUS_CONFIG[rule.status as keyof typeof STATUS_CONFIG];
                  const severityCfg = SEVERITY_CONFIG[rule.severity as keyof typeof SEVERITY_CONFIG];
                  const isExpanded = expandedId === rule.id;
                  return (
                    <>
                      <TableRow
                        key={rule.id}
                        className="cursor-pointer hover:bg-muted/40"
                        onClick={() => setExpandedId(isExpanded ? null : rule.id)}
                      >
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {rule.ruleId}
                        </TableCell>
                        <TableCell className="font-medium">{rule.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {categoryLabel(rule.category)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={severityCfg?.variant ?? "secondary"}
                            className="text-xs"
                          >
                            {severityCfg?.label ?? rule.severity}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={statusCfg?.variant ?? "secondary"}
                            className="text-xs"
                          >
                            {statusCfg?.label ?? rule.status}
                          </Badge>
                        </TableCell>
                        {isAdmin && (
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {rule.status === "draft" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateMutation.mutate({
                                      id: rule.id,
                                      status: "active",
                                    });
                                  }}
                                >
                                  发布
                                </Button>
                              )}
                              {rule.status === "active" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs text-muted-foreground"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateMutation.mutate({
                                      id: rule.id,
                                      status: "inactive",
                                    });
                                  }}
                                >
                                  禁用
                                </Button>
                              )}
                              {rule.status === "inactive" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateMutation.mutate({
                                      id: rule.id,
                                      status: "active",
                                    });
                                  }}
                                >
                                  启用
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                      {isExpanded && (
                        <TableRow key={`${rule.id}-detail`} className="bg-muted/20">
                          <TableCell colSpan={isAdmin ? 6 : 5} className="py-3 px-6">
                            <div className="space-y-2 text-sm">
                              {rule.description && (
                                <div>
                                  <span className="text-muted-foreground">描述：</span>
                                  {rule.description}
                                </div>
                              )}
                              {rule.condition && (
                                <div>
                                  <span className="text-muted-foreground">条件：</span>
                                  <code className="ml-1 bg-muted px-1.5 py-0.5 rounded text-xs font-mono">
                                    {rule.condition}
                                  </code>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })
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
            <DialogTitle>新建质控规则</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>规则 ID *</Label>
                <Input
                  placeholder="如 QC-001"
                  value={form.ruleId}
                  onChange={(e) => setForm({ ...form, ruleId: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>规则名称 *</Label>
                <Input
                  placeholder="规则名称"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>分类 *</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm({ ...form, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>严重程度 *</Label>
                <Select
                  value={form.severity}
                  onValueChange={(v) => setForm({ ...form, severity: v as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">严重</SelectItem>
                    <SelectItem value="major">重要</SelectItem>
                    <SelectItem value="minor">轻微</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>规则描述</Label>
              <Input
                placeholder="规则说明"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>触发条件 *</Label>
              <Textarea
                placeholder="规则触发条件表达式"
                rows={3}
                value={form.condition}
                onChange={(e) => setForm({ ...form, condition: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              取消
            </Button>
            <Button
              disabled={
                !form.ruleId ||
                !form.name ||
                !form.condition ||
                createMutation.isPending
              }
              onClick={() => createMutation.mutate(form)}
            >
              {createMutation.isPending ? "创建中..." : "创建规则"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
