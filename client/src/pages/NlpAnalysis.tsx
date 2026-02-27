import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Brain, Play, Zap } from "lucide-react";

export default function NlpAnalysis() {
  const [content, setContent] = useState("");
  const [selectedRecordId, setSelectedRecordId] = useState<string>("none");
  const [result, setResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("entities");

  const { data: records } = trpc.records.list.useQuery({ page: 1, pageSize: 100 });

  const processMutation = trpc.nlp.process.useMutation({
    onSuccess: (data) => {
      setResult(data);
      toast.success("NLP 分析完成");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleAnalyze = () => {
    if (selectedRecordId !== "none") {
      processMutation.mutate({ recordId: parseInt(selectedRecordId) });
    } else if (content.trim()) {
      processMutation.mutate({ content: content.trim() });
    } else {
      toast.warning("请输入病历内容或选择病历");
    }
  };

  const allRecords = records?.records ?? [];

  const renderEntityList = (entities: any[]) => {
    if (!entities || entities.length === 0) {
      return <p className="text-sm text-muted-foreground">未识别到实体</p>;
    }
    return (
      <div className="flex flex-wrap gap-2">
        {entities.map((e: any, i: number) => (
          <Badge key={i} variant="secondary" className="text-xs">
            {typeof e === "string" ? e : e.text ?? e.value ?? JSON.stringify(e)}
          </Badge>
        ))}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">NLP 分析</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            自然语言处理 · 病历结构化解析
          </p>
        </div>
      </div>

      {/* Input area */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" />
            输入来源
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground shrink-0">选择已有病历：</span>
            <Select
              value={selectedRecordId}
              onValueChange={(v) => {
                setSelectedRecordId(v);
                if (v !== "none") setContent("");
              }}
            >
              <SelectTrigger className="w-64">
                <SelectValue placeholder="选择病历（可选）" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">不选择，使用下方文本</SelectItem>
                {allRecords.map((r: any) => (
                  <SelectItem key={r.id} value={String(r.id)}>
                    {r.patientName} (ID: {r.id})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedRecordId === "none" && (
            <div className="space-y-1.5">
              <span className="text-sm text-muted-foreground">或直接输入病历文本：</span>
              <Textarea
                placeholder="请输入病历内容进行 NLP 分析..."
                rows={6}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="font-mono text-sm"
              />
            </div>
          )}

          <Button
            onClick={handleAnalyze}
            disabled={processMutation.isPending || (selectedRecordId === "none" && !content.trim())}
          >
            <Play className="w-4 h-4 mr-1.5" />
            {processMutation.isPending ? "分析中..." : "开始分析"}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {processMutation.isPending && (
        <Card className="border-border/60">
          <CardContent className="p-6 space-y-3">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      )}

      {result && !processMutation.isPending && (
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              分析结果
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="entities">实体识别</TabsTrigger>
                <TabsTrigger value="sections">章节解析</TabsTrigger>
                <TabsTrigger value="indicators">指标提取</TabsTrigger>
                <TabsTrigger value="raw">原始数据</TabsTrigger>
              </TabsList>

              <TabsContent value="entities" className="space-y-4">
                {result.entities ? (
                  <div className="space-y-4">
                    {Object.entries(result.entities).map(([type, items]: [string, any]) => (
                      <div key={type}>
                        <h4 className="text-sm font-medium mb-2 capitalize">
                          {type === "diagnoses" ? "诊断"
                            : type === "symptoms" ? "症状"
                            : type === "medications" ? "药物"
                            : type === "procedures" ? "操作"
                            : type === "labResults" ? "检验结果"
                            : type}
                        </h4>
                        {renderEntityList(Array.isArray(items) ? items : [])}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">无实体数据</p>
                )}
              </TabsContent>

              <TabsContent value="sections" className="space-y-3">
                {result.sections ? (
                  Object.entries(result.sections).map(([section, text]: [string, any]) => (
                    <div key={section} className="border rounded-lg p-3">
                      <h4 className="text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
                        {section === "chiefComplaint" ? "主诉"
                          : section === "presentIllness" ? "现病史"
                          : section === "pastHistory" ? "既往史"
                          : section === "physicalExam" ? "体格检查"
                          : section === "diagnosis" ? "诊断"
                          : section === "treatment" ? "治疗"
                          : section}
                      </h4>
                      <p className="text-sm">{String(text) || "-"}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">无章节数据</p>
                )}
              </TabsContent>

              <TabsContent value="indicators" className="space-y-2">
                {result.indicators && result.indicators.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {result.indicators.map((ind: any, i: number) => (
                      <div key={i} className="border rounded-lg p-3 text-sm">
                        <div className="font-medium">{ind.name ?? ind.type ?? "指标"}</div>
                        <div className="text-muted-foreground mt-0.5">
                          {ind.value ?? "-"} {ind.unit ?? ""}
                        </div>
                        {ind.isAbnormal && (
                          <Badge variant="destructive" className="text-xs mt-1">异常</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">未提取到指标数据</p>
                )}
              </TabsContent>

              <TabsContent value="raw">
                <pre className="text-xs bg-muted/50 rounded-lg p-4 overflow-auto max-h-80 font-mono">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
