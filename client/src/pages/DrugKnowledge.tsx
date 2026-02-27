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
import { Pill, Plus, Search, ChevronDown, ChevronRight } from "lucide-react";

export default function DrugKnowledge() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    drugName: "",
    genericName: "",
    category: "",
    maxDailyDose: "",
    unit: "",
    contraindications: "",
    interactions: "",
    sideEffects: "",
  });

  const utils = trpc.useUtils();
  const isAdmin = user?.role === "admin";

  const { data, isLoading } = search
    ? trpc.drugs.search.useQuery({ query: search, page, pageSize: 20 })
    : trpc.drugs.list.useQuery({ page, pageSize: 20 });

  const createMutation = trpc.drugs.create.useMutation({
    onSuccess: () => {
      toast.success("药品信息已添加");
      setShowCreate(false);
      setForm({ drugName: "", genericName: "", category: "", maxDailyDose: "", unit: "", contraindications: "", interactions: "", sideEffects: "" });
      utils.drugs.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const drugs = (data as any)?.drugs ?? (data as any)?.results ?? [];
  const total = (data as any)?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  const parseJsonField = (val: any): string[] => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    try { return JSON.parse(val); } catch { return [String(val)]; }
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">药品知识库</h1>
          <p className="text-sm text-muted-foreground mt-0.5">共 {total} 种药品</p>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            添加药品
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索药品名称..."
            className="pl-9"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { setSearch(searchInput); setPage(1); }
            }}
          />
        </div>
        {search && (
          <Button variant="outline" size="sm" onClick={() => { setSearch(""); setSearchInput(""); }}>
            清除
          </Button>
        )}
      </div>

      {/* Table */}
      <Card className="border-border/60">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-8"></TableHead>
                <TableHead>药品名称</TableHead>
                <TableHead>通用名</TableHead>
                <TableHead>分类</TableHead>
                <TableHead>最大日剂量</TableHead>
                <TableHead>禁忌症</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : drugs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    <Pill className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    暂无药品数据
                  </TableCell>
                </TableRow>
              ) : (
                drugs.map((drug: any) => {
                  const contraList = parseJsonField(drug.contraindications);
                  const interList = parseJsonField(drug.interactions);
                  const sideList = parseJsonField(drug.sideEffects);
                  const isExpanded = expandedId === drug.id;
                  return (
                    <>
                      <TableRow
                        key={drug.id}
                        className="cursor-pointer hover:bg-muted/40"
                        onClick={() => setExpandedId(isExpanded ? null : drug.id)}
                      >
                        <TableCell className="text-muted-foreground">
                          {isExpanded
                            ? <ChevronDown className="w-3.5 h-3.5" />
                            : <ChevronRight className="w-3.5 h-3.5" />}
                        </TableCell>
                        <TableCell className="font-medium">{drug.drugName}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {drug.genericName ?? "-"}
                        </TableCell>
                        <TableCell>
                          {drug.category && (
                            <Badge variant="secondary" className="text-xs">{drug.category}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {drug.maxDailyDose
                            ? `${drug.maxDailyDose} ${drug.unit ?? ""}`
                            : "-"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {contraList.length > 0
                            ? `${contraList.length} 项`
                            : "-"}
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow key={`${drug.id}-detail`} className="bg-muted/20">
                          <TableCell colSpan={6} className="py-3 px-6">
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground mb-1.5 font-medium">禁忌症</p>
                                {contraList.length > 0 ? (
                                  <ul className="space-y-1">
                                    {contraList.map((c, i) => (
                                      <li key={i} className="flex items-start gap-1.5">
                                        <span className="text-red-500 mt-0.5">•</span>
                                        <span>{c}</span>
                                      </li>
                                    ))}
                                  </ul>
                                ) : <span className="text-muted-foreground">无</span>}
                              </div>
                              <div>
                                <p className="text-muted-foreground mb-1.5 font-medium">药物相互作用</p>
                                {interList.length > 0 ? (
                                  <ul className="space-y-1">
                                    {interList.map((c, i) => (
                                      <li key={i} className="flex items-start gap-1.5">
                                        <span className="text-amber-500 mt-0.5">•</span>
                                        <span>{c}</span>
                                      </li>
                                    ))}
                                  </ul>
                                ) : <span className="text-muted-foreground">无</span>}
                              </div>
                              <div>
                                <p className="text-muted-foreground mb-1.5 font-medium">不良反应</p>
                                {sideList.length > 0 ? (
                                  <ul className="space-y-1">
                                    {sideList.map((c, i) => (
                                      <li key={i} className="flex items-start gap-1.5">
                                        <span className="text-blue-500 mt-0.5">•</span>
                                        <span>{c}</span>
                                      </li>
                                    ))}
                                  </ul>
                                ) : <span className="text-muted-foreground">无</span>}
                              </div>
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
          <span>第 {page} / {totalPages} 页，共 {total} 条</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>下一页</Button>
          </div>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>添加药品</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>药品名称 *</Label>
                <Input value={form.drugName} onChange={e => setForm({ ...form, drugName: e.target.value })} placeholder="商品名" />
              </div>
              <div className="space-y-1.5">
                <Label>通用名</Label>
                <Input value={form.genericName} onChange={e => setForm({ ...form, genericName: e.target.value })} placeholder="通用名" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>分类</Label>
                <Input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="如：抗生素" />
              </div>
              <div className="space-y-1.5">
                <Label>最大日剂量</Label>
                <Input value={form.maxDailyDose} onChange={e => setForm({ ...form, maxDailyDose: e.target.value })} placeholder="数值" />
              </div>
              <div className="space-y-1.5">
                <Label>单位</Label>
                <Input value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} placeholder="mg/g/ml" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>禁忌症（每行一条）</Label>
              <Textarea rows={3} value={form.contraindications} onChange={e => setForm({ ...form, contraindications: e.target.value })} placeholder="每行一条禁忌症..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>取消</Button>
            <Button
              disabled={!form.drugName || createMutation.isPending}
              onClick={() => createMutation.mutate({
                drugName: form.drugName,
                genericName: form.genericName || undefined,
                category: form.category || undefined,
                maxDailyDose: form.maxDailyDose || undefined,
                unit: form.unit || undefined,
                contraindications: form.contraindications
                  ? form.contraindications.split("\n").filter(Boolean)
                  : undefined,
              })}
            >
              {createMutation.isPending ? "添加中..." : "添加"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
