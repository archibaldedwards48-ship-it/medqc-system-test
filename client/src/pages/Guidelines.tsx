import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Stethoscope, Search, Eye } from "lucide-react";
import { Streamdown } from "streamdown";

export default function Guidelines() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [viewItem, setViewItem] = useState<any>(null);

  // Guidelines stored in qc_configs with configType='clinical_guideline'
  const { data, isLoading } = trpc.config.getByType.useQuery({ type: "clinical_guideline" });

  const configs = (data as any) ?? [];

  const filtered = search
    ? configs.filter((c: any) =>
        c.configKey.toLowerCase().includes(search.toLowerCase()) ||
        c.description?.toLowerCase().includes(search.toLowerCase())
      )
    : configs;

  const parseValue = (val: string) => {
    try { return JSON.parse(val); } catch { return { content: val }; }
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">临床指南</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            共 {filtered.length} 条临床指南
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索指南名称..."
            className="pl-9"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") setSearch(searchInput);
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
                <TableHead>指南名称</TableHead>
                <TableHead>疾病分类</TableHead>
                <TableHead>版本</TableHead>
                <TableHead>描述</TableHead>
                <TableHead className="w-16">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    <Stethoscope className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    {configs.length === 0
                      ? "暂无临床指南数据，请在系统配置中添加 clinical_guideline 类型配置"
                      : "未找到匹配的指南"}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((cfg: any) => {
                  const val = parseValue(cfg.configValue);
                  return (
                    <TableRow key={cfg.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">{cfg.configKey}</TableCell>
                      <TableCell>
                        {val.diseaseCategory && (
                          <Badge variant="secondary" className="text-xs">
                            {val.diseaseCategory}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {val.version ?? "-"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                        {cfg.description ?? val.summary ?? "-"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => setViewItem(cfg)}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-primary" />
              {viewItem?.configKey}
            </DialogTitle>
          </DialogHeader>
          {viewItem && (
            <div className="py-2">
              {(() => {
                const val = parseValue(viewItem.configValue);
                return (
                  <div className="space-y-4">
                    {val.content ? (
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        <Streamdown>{val.content}</Streamdown>
                      </div>
                    ) : (
                      <pre className="text-xs bg-muted/50 rounded-lg p-4 overflow-auto font-mono">
                        {JSON.stringify(val, null, 2)}
                      </pre>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
