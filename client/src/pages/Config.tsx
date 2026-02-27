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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Settings, Plus, Edit, Info } from "lucide-react";

const CONFIG_TYPES = [
  { value: "qc_threshold", label: "质控阈值" },
  { value: "lab_reference", label: "检验参考范围" },
  { value: "clinical_guideline", label: "临床指南" },
  { value: "soap_template", label: "SOAP 病历模板" },
  { value: "disease_staging", label: "疾病分期分型" },
  { value: "nursing_pathway", label: "护理路径" },
  { value: "system", label: "系统配置" },
];

export default function Config() {
  const { user } = useAuth();
  const [typeFilter, setTypeFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState({
    configType: "system",
    configKey: "",
    configValue: "",
    description: "",
  });

  const utils = trpc.useUtils();
  const isAdmin = user?.role === "admin";

  const { data, isLoading } = trpc.config.list.useQuery({
    type: typeFilter === "all" ? undefined : typeFilter,
  });

  const { data: sysInfo } = trpc.config.getSystemInfo.useQuery();

  const createMutation = trpc.config.create.useMutation({
    onSuccess: () => {
      toast.success("配置项已创建");
      setShowCreate(false);
      setForm({ configType: "system", configKey: "", configValue: "", description: "" });
      utils.config.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.config.update.useMutation({
    onSuccess: () => {
      toast.success("配置已更新");
      setEditItem(null);
      utils.config.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const configs = (data as any)?.configs ?? data ?? [];

  const typeLabel = (type: string) =>
    CONFIG_TYPES.find((t) => t.value === type)?.label ?? type;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">系统配置</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            管理质控规则、参考范围等系统参数
          </p>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            新增配置
          </Button>
        )}
      </div>

      {/* System Info */}
      {sysInfo && (
        <Card className="border-border/60 bg-muted/30">
          <CardContent className="p-4 flex items-center gap-3">
            <Info className="w-4 h-4 text-primary shrink-0" />
            <div className="text-sm text-muted-foreground">
              系统版本：<span className="font-medium text-foreground">{(sysInfo as any).version ?? "1.0.0"}</span>
              {" · "}
              配置项总数：<span className="font-medium text-foreground">{(sysInfo as any).configCount ?? configs.length}</span>
              {" · "}
              规则总数：<span className="font-medium text-foreground">{(sysInfo as any).ruleCount ?? "-"}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter */}
      <div className="flex gap-3">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="配置类型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部类型</SelectItem>
            {CONFIG_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
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
                <TableHead>配置键</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>配置值</TableHead>
                <TableHead>描述</TableHead>
                <TableHead>状态</TableHead>
                {isAdmin && <TableHead className="w-16">操作</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: isAdmin ? 6 : 5 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : configs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 6 : 5} className="text-center py-12 text-muted-foreground">
                    <Settings className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    暂无配置项
                  </TableCell>
                </TableRow>
              ) : (
                configs.map((cfg: any) => (
                  <TableRow key={cfg.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-sm font-medium">{cfg.configKey}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{typeLabel(cfg.configType)}</Badge>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <span className="text-sm font-mono truncate block max-w-[200px]">
                        {String(cfg.configValue).slice(0, 80)}
                        {String(cfg.configValue).length > 80 ? "..." : ""}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {cfg.description ?? "-"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={cfg.status === "active" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {cfg.status === "active" ? "启用" : "停用"}
                      </Badge>
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => {
                            setEditItem(cfg);
                          }}
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>新增配置项</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>配置类型 *</Label>
              <Select value={form.configType} onValueChange={v => setForm({ ...form, configType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONFIG_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>配置键 *</Label>
              <Input
                value={form.configKey}
                onChange={e => setForm({ ...form, configKey: e.target.value })}
                placeholder="如：qc.score.threshold"
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label>配置值 *</Label>
              <Textarea
                rows={3}
                value={form.configValue}
                onChange={e => setForm({ ...form, configValue: e.target.value })}
                placeholder="配置值（支持 JSON 格式）"
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label>描述</Label>
              <Input
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="配置项说明"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>取消</Button>
            <Button
              disabled={!form.configKey || !form.configValue || createMutation.isPending}
              onClick={() => createMutation.mutate(form)}
            >
              {createMutation.isPending ? "创建中..." : "创建"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={() => setEditItem(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>编辑配置项</DialogTitle>
          </DialogHeader>
          {editItem && (
            <div className="space-y-4 py-2">
              <div className="p-3 bg-muted/40 rounded-lg text-sm">
                <span className="text-muted-foreground">配置键：</span>
                <span className="font-mono font-medium ml-1">{editItem.configKey}</span>
              </div>
              <div className="space-y-1.5">
                <Label>配置值 *</Label>
                <Textarea
                  rows={4}
                  defaultValue={editItem.configValue}
                  onChange={e => setEditItem({ ...editItem, configValue: e.target.value })}
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label>描述</Label>
                <Input
                  defaultValue={editItem.description ?? ""}
                  onChange={e => setEditItem({ ...editItem, description: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>取消</Button>
            <Button
              disabled={updateMutation.isPending}
              onClick={() => updateMutation.mutate({
                id: editItem.id,
                configValue: editItem.configValue,
                description: editItem.description,
              })}
            >
              {updateMutation.isPending ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
