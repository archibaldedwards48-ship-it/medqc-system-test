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
import { BookOpen, Plus, Search } from "lucide-react";

const TERM_CATEGORIES = [
  { value: "diagnosis", label: "诊断术语" },
  { value: "symptom", label: "症状体征" },
  { value: "procedure", label: "手术操作" },
  { value: "drug", label: "药品术语" },
  { value: "anatomy", label: "解剖部位" },
  { value: "lab", label: "检验检查" },
  { value: "abbreviation", label: "缩写" },
  { value: "typo", label: "错别字映射" },
];

export default function Terminology() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    term: "",
    standardName: "",
    category: "diagnosis",
    description: "",
    synonyms: "",
  });

  const utils = trpc.useUtils();
  const isAdmin = user?.role === "admin";

  const { data, isLoading } = search
    ? trpc.terminology.search.useQuery({ query: search, page, pageSize: 20 })
    : trpc.terminology.list.useQuery({
        page,
        pageSize: 20,
        category: categoryFilter === "all" ? undefined : categoryFilter,
      });

  const createMutation = trpc.terminology.create.useMutation({
    onSuccess: () => {
      toast.success("术语已添加");
      setShowCreate(false);
      setForm({ term: "", standardName: "", category: "diagnosis", description: "", synonyms: "" });
      utils.terminology.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const terminologies = (data as any)?.terminologies ?? (data as any)?.results ?? [];
  const total = (data as any)?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  const catLabel = (cat: string) =>
    TERM_CATEGORIES.find((c) => c.value === cat)?.label ?? cat;

  const parseJsonField = (val: any): string[] => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    try { return JSON.parse(val); } catch { return [String(val)]; }
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">医学术语库</h1>
          <p className="text-sm text-muted-foreground mt-0.5">共 {total} 条术语</p>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            添加术语
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索术语..."
            className="pl-9"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { setSearch(searchInput); setPage(1); }
            }}
          />
        </div>
        <Select
          value={categoryFilter}
          onValueChange={(v) => { setCategoryFilter(v); setPage(1); }}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="术语分类" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部分类</SelectItem>
            {TERM_CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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
                <TableHead>术语</TableHead>
                <TableHead>标准名称</TableHead>
                <TableHead>分类</TableHead>
                <TableHead>同义词</TableHead>
                <TableHead>描述</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : terminologies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    暂无术语数据
                  </TableCell>
                </TableRow>
              ) : (
                terminologies.map((term: any) => {
                  const synonymList = parseJsonField(term.synonyms);
                  return (
                    <TableRow key={term.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">{term.term}</TableCell>
                      <TableCell>
                        <span className="text-primary font-medium">{term.standardName}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {catLabel(term.category)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {synonymList.slice(0, 3).map((s: string, i: number) => (
                            <Badge key={i} variant="secondary" className="text-xs">{s}</Badge>
                          ))}
                          {synonymList.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{synonymList.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                        {term.description ?? "-"}
                      </TableCell>
                    </TableRow>
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
            <DialogTitle>添加医学术语</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>术语 *</Label>
                <Input value={form.term} onChange={e => setForm({ ...form, term: e.target.value })} placeholder="原始术语" />
              </div>
              <div className="space-y-1.5">
                <Label>标准名称 *</Label>
                <Input value={form.standardName} onChange={e => setForm({ ...form, standardName: e.target.value })} placeholder="标准化名称" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>分类 *</Label>
              <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TERM_CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>同义词（每行一个）</Label>
              <Textarea rows={3} value={form.synonyms} onChange={e => setForm({ ...form, synonyms: e.target.value })} placeholder="每行一个同义词..." />
            </div>
            <div className="space-y-1.5">
              <Label>描述</Label>
              <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="术语说明" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>取消</Button>
            <Button
              disabled={!form.term || !form.standardName || createMutation.isPending}
              onClick={() => createMutation.mutate({
                term: form.term,
                standardName: form.standardName,
                category: form.category,
                description: form.description || undefined,
                synonyms: form.synonyms
                  ? form.synonyms.split("\n").filter(Boolean)
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
