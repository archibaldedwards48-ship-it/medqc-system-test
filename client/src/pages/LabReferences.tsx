import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { FlaskConical, Search } from "lucide-react";

export default function LabReferences() {
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  // Lab references are stored in qc_configs with configType='lab_reference'
  const { data, isLoading } = trpc.config.getByType.useQuery({ type: "lab_reference" });

  const configs = (data as any) ?? [];

  const filtered = search
    ? configs.filter((c: any) =>
        c.configKey.toLowerCase().includes(search.toLowerCase()) ||
        c.description?.toLowerCase().includes(search.toLowerCase())
      )
    : configs;

  const parseValue = (val: string) => {
    try { return JSON.parse(val); } catch { return { raw: val }; }
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">检验参考范围</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            共 {filtered.length} 项检验指标
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索指标名称..."
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
                <TableHead>指标名称</TableHead>
                <TableHead>参考范围</TableHead>
                <TableHead>危急值（低）</TableHead>
                <TableHead>危急值（高）</TableHead>
                <TableHead>单位</TableHead>
                <TableHead>临床意义</TableHead>
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
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    <FlaskConical className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    {configs.length === 0
                      ? "暂无检验参考范围数据，请在系统配置中添加 lab_reference 类型配置"
                      : "未找到匹配的指标"}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((cfg: any) => {
                  const val = parseValue(cfg.configValue);
                  return (
                    <TableRow key={cfg.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">{cfg.configKey}</TableCell>
                      <TableCell className="text-sm">
                        {val.minValue !== undefined && val.maxValue !== undefined
                          ? `${val.minValue} – ${val.maxValue}`
                          : val.referenceRange ?? cfg.configValue.slice(0, 40)}
                      </TableCell>
                      <TableCell>
                        {val.criticalLow !== undefined ? (
                          <span className="text-red-600 font-medium text-sm">
                            &lt; {val.criticalLow}
                          </span>
                        ) : "-"}
                      </TableCell>
                      <TableCell>
                        {val.criticalHigh !== undefined ? (
                          <span className="text-red-600 font-medium text-sm">
                            &gt; {val.criticalHigh}
                          </span>
                        ) : "-"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {val.unit ?? "-"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs">
                        {val.clinicalSignificance ?? cfg.description ?? "-"}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
